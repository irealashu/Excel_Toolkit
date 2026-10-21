import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SheetData, WorkbookData } from '../../registry/types';

export async function parseWorkbookFile(file: File): Promise<WorkbookData> {
  const fileName = file.name;
  const fileSizeBytes = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    return parseDelimitedText(file, ext === 'tsv' ? '\t' : undefined);
  }

  if (ext === 'json') {
    return parseJsonFile(file);
  }

  // Parse Excel workbook (.xlsx, .xls, .xlsm, .xlsb)
  const buffer = await file.arrayBuffer();
  const startTime = performance.now();
  const wb = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellFormula: true,
    raw: false,
  });

  const sheets: SheetData[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    // Convert sheet to array of arrays
    const rawData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
      header: 1,
      defval: null,
      blankrows: true,
    });

    if (rawData.length === 0) {
      sheets.push({
        name: sheetName,
        headers: ['Column 1'],
        rows: [],
        totalRows: 0,
        totalCols: 1,
      });
      continue;
    }

    const firstRow = rawData[0] || [];
    let headers: string[] = [];
    const maxCols = Math.max(...rawData.map((r) => (Array.isArray(r) ? r.length : 0)), 1);

    headers = Array.from({ length: maxCols }, (_, idx) => {
      const val = firstRow[idx];
      return val !== null && val !== undefined && String(val).trim() !== ''
        ? String(val).trim()
        : `Column ${idx + 1}`;
    });

    const rows = rawData.slice(1).map((r) => {
      const rowArr = Array.isArray(r) ? r : [];
      return Array.from({ length: maxCols }, (_, idx) => (rowArr[idx] !== undefined ? rowArr[idx] : null));
    });

    sheets.push({
      name: sheetName,
      headers,
      rows,
      totalRows: rows.length,
      totalCols: headers.length,
    });
  }

  return {
    fileName,
    fileSizeBytes,
    activeSheetIndex: 0,
    sheets: sheets.length > 0 ? sheets : [{ name: 'Sheet1', headers: ['Column 1'], rows: [], totalRows: 0, totalCols: 1 }],
    metadata: {
      author: (wb.Props && ((wb.Props as any).Author || (wb.Props as any).Creator)) || undefined,
      created: (wb.Props as any)?.Created ? String((wb.Props as any).Created) : undefined,
      modified: (wb.Props as any)?.Modified ? String((wb.Props as any).Modified) : undefined,
      application: (wb.Props as any)?.Application || undefined,
      hasMacros: wb.Workbook?.Names?.some((n) => n.Name.includes('macro')) || ext === 'xlsm',
    },
  };
}

async function parseDelimitedText(file: File, delimiter?: string): Promise<WorkbookData> {
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse<(string | number | null)[]>(text, {
      delimiter: delimiter,
      dynamicTyping: true,
      skipEmptyLines: false,
      complete: (results) => {
        const rawData = results.data;
        if (!rawData || rawData.length === 0) {
          return resolve({
            fileName: file.name,
            fileSizeBytes: file.size,
            activeSheetIndex: 0,
            sheets: [{ name: 'Sheet1', headers: ['Column 1'], rows: [], totalRows: 0, totalCols: 1 }],
          });
        }

        const maxCols = Math.max(...rawData.map((r) => (Array.isArray(r) ? r.length : 0)), 1);
        const firstRow = rawData[0] || [];

        const headers = Array.from({ length: maxCols }, (_, idx) => {
          const val = firstRow[idx];
          return val !== null && val !== undefined && String(val).trim() !== ''
            ? String(val).trim()
            : `Column ${idx + 1}`;
        });

        const rows = rawData.slice(1).map((r) => {
          const rowArr = Array.isArray(r) ? r : [];
          return Array.from({ length: maxCols }, (_, idx) => (rowArr[idx] !== undefined ? rowArr[idx] : null));
        });

        resolve({
          fileName: file.name,
          fileSizeBytes: file.size,
          activeSheetIndex: 0,
          sheets: [
            {
              name: file.name.replace(/\.[^/.]+$/, '').slice(0, 31) || 'Sheet1',
              headers,
              rows,
              totalRows: rows.length,
              totalCols: headers.length,
            },
          ],
        });
      },
      error: (err: any) => reject(new Error(err.message || 'Failed to parse CSV/TSV file')),
    });
  });
}

async function parseJsonFile(file: File): Promise<WorkbookData> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    throw new Error('Invalid JSON syntax: ' + err.message);
  }

  let items: Record<string, any>[] = [];
  if (Array.isArray(parsed)) {
    items = parsed.filter((item) => typeof item === 'object' && item !== null);
  } else if (typeof parsed === 'object' && parsed !== null) {
    // If it's a wrapper object like { data: [...] } or { items: [...] }
    const keys = Object.keys(parsed);
    const arrayKey = keys.find((k) => Array.isArray((parsed as any)[k]));
    if (arrayKey) {
      items = (parsed as any)[arrayKey];
    } else {
      items = [parsed as Record<string, any>];
    }
  }

  if (items.length === 0) {
    return {
      fileName: file.name,
      fileSizeBytes: file.size,
      activeSheetIndex: 0,
      sheets: [{ name: 'JSON_Data', headers: ['Key', 'Value'], rows: [], totalRows: 0, totalCols: 2 }],
    };
  }

  // Collect all unique keys
  const headerSet = new Set<string>();
  items.forEach((item) => {
    Object.keys(item).forEach((k) => headerSet.add(k));
  });
  const headers = Array.from(headerSet);

  const rows = items.map((item) =>
    headers.map((h) => {
      const val = item[h];
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    })
  );

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    activeSheetIndex: 0,
    sheets: [
      {
        name: 'JSON_Data',
        headers: headers.length > 0 ? headers : ['Key'],
        rows,
        totalRows: rows.length,
        totalCols: headers.length,
      },
    ],
  };
}
