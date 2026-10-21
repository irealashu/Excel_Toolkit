import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export interface SecurityInspectionReport {
  fileName: string;
  fileSizeBytes: number;
  isZipArchive: boolean;
  hasVbaMacros: boolean;
  vbaProjectFile?: string;
  hasExternalLinks: boolean;
  hiddenSheets: string[];
  allSheets: { name: string; isHidden: boolean }[];
  metadata: {
    creator?: string;
    lastModifiedBy?: string;
    created?: string;
    modified?: string;
    application?: string;
    company?: string;
  };
  zipEntries: {
    path: string;
    compressedSize: number;
    uncompressedSize: number;
    isSuspicious: boolean;
  }[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  findings: string[];
}

export async function inspectWorkbookSecurity(file: File): Promise<SecurityInspectionReport> {
  const buffer = await file.arrayBuffer();
  let zip: JSZip | null = null;
  let isZip = false;

  const findings: string[] = [];
  let hasVbaMacros = false;
  let vbaProjectFile: string | undefined;
  let hasExternalLinks = false;
  const zipEntries: SecurityInspectionReport['zipEntries'] = [];

  try {
    zip = await JSZip.loadAsync(buffer);
    isZip = true;

    // Iterate through zip entries
    zip.forEach((relativePath, entry) => {
      const isSuspicious =
        relativePath.includes('vbaProject.bin') ||
        relativePath.endsWith('.exe') ||
        relativePath.endsWith('.dll') ||
        relativePath.includes('macros');

      if (relativePath.includes('vbaProject.bin')) {
        hasVbaMacros = true;
        vbaProjectFile = relativePath;
        findings.push('Workbook contains compiled VBA macro binary (vbaProject.bin). Macros can execute local code.');
      }

      if (relativePath.includes('externalLinks')) {
        hasExternalLinks = true;
        findings.push('Workbook references external workbooks or web links.');
      }

      zipEntries.push({
        path: relativePath,
        compressedSize: (entry as any)._data?.compressedSize || 0,
        uncompressedSize: (entry as any)._data?.uncompressedSize || 0,
        isSuspicious,
      });
    });
  } catch {
    isZip = false;
  }

  // Parse with SheetJS to inspect sheets and metadata
  let allSheets: { name: string; isHidden: boolean }[] = [];
  const hiddenSheets: string[] = [];
  let metadata: SecurityInspectionReport['metadata'] = {};

  try {
    const wb = XLSX.read(buffer, { type: 'array', bookVBA: true });

    if (wb.Workbook && wb.Workbook.Sheets) {
      allSheets = wb.Workbook.Sheets.map((s, idx) => {
        const isHidden = s.Hidden === 1 || s.Hidden === 2;
        const name = wb.SheetNames[idx] || `Sheet${idx + 1}`;
        if (isHidden) hiddenSheets.push(name);
        return { name, isHidden };
      });
    } else {
      allSheets = (wb.SheetNames || []).map((name) => ({ name, isHidden: false }));
    }

    if (hiddenSheets.length > 0) {
      findings.push(`Contains ${hiddenSheets.length} hidden or very hidden worksheet(s): ${hiddenSheets.join(', ')}`);
    }

    const p = (wb.Props as any) || {};
    metadata = {
      creator: p.Author || p.Creator,
      lastModifiedBy: p.LastAuthor,
      created: p.Created ? String(p.Created) : undefined,
      modified: p.Modified ? String(p.Modified) : undefined,
      application: p.Application,
      company: p.Company,
    };

    if (metadata.creator || metadata.company) {
      findings.push(`Identified personal metadata: Creator "${metadata.creator || 'N/A'}", Org "${metadata.company || 'N/A'}".`);
    }
  } catch (err: any) {
    findings.push('File could not be parsed as standard open-xml spreadsheet.');
  }

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (hasVbaMacros) {
    riskLevel = 'HIGH';
  } else if (hasExternalLinks || hiddenSheets.length > 0) {
    riskLevel = 'MEDIUM';
  }

  if (findings.length === 0) {
    findings.push('No suspicious binaries, macros, or hidden content detected. Safe standard open spreadsheet.');
  }

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    isZipArchive: isZip,
    hasVbaMacros,
    vbaProjectFile,
    hasExternalLinks,
    hiddenSheets,
    allSheets,
    metadata,
    zipEntries,
    riskLevel,
    findings,
  };
}

export async function stripWorkbookMetadataAndMacros(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  // Read workbook without VBA
  const wb = XLSX.read(buffer, { type: 'array' });

  // Clear metadata
  (wb.Props as any) = {
    Author: '',
    Title: '',
    Subject: '',
    Company: '',
    Application: 'Excel Toolkit Sanitizer',
  };

  // Re-write clean XLSX
  const cleanArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([cleanArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
