import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SheetData, WorkbookData } from '../../registry/types';
import { htmlToTable, jsonToTable, markdownToTable, xmlToTable, yamlToTable } from '../converters';

export async function parseWorkbookFile(file: File): Promise<WorkbookData> {
  const fileName = file.name;
  const fileSizeBytes = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    return parseDelimitedText(file, ext === 'tsv' ? '\t' : undefined);
  }

  if (ext === 'json' || ext === 'jsonl') {
    const text = await file.text();
    const { headers, rows } = jsonToTable(text);
    return singleSheetWorkbook(fileName, fileSizeBytes, 'JSON_Data', headers, rows);
  }

  if (ext === 'md' || ext === 'markdown') {
    const text = await file.text();
    const { headers, rows } = markdownToTable(text);
    return singleSheetWorkbook(fileName, fileSizeBytes, 'Markdown_Table', headers, rows);
  }

  if (ext === 'html' || ext === 'htm') {
    const text = await file.text();
    const { headers, rows } = htmlToTable(text);
    return singleSheetWorkbook(fileName, fileSizeBytes, 'HTML_Table', headers, rows);
  }

  if (ext === 'yaml' || ext === 'yml') {
    const text = await file.text();
    const { headers, rows } = yamlToTable(text);
    return singleSheetWorkbook(fileName, fileSizeBytes, 'YAML_Data', headers, rows);
  }

  if (ext === 'xml') {
    const text = await file.text();
    const { headers, rows } = xmlToTable(text);
    return singleSheetWorkbook(fileName, fileSizeBytes, 'XML_Data', headers, rows);
  }

  // Parse Excel workbook (.xlsx, .xls, .xlsm, .xlsb, .ods)
  const buffer = await file.arrayBuffer();
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
    const maxCols = Math.max(...rawData.map((r) => (Array.isArray(r) ? r.length : 0)), 1);

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

    sheets.push({
      name: sheetName,
      headers,
      rows,
      totalRows: rows.length,
      totalCols: headers.length,
    });
  }

  const props = (wb.Props as Record<string, unknown>) || {};
  return {
    fileName,
    fileSizeBytes,
    activeSheetIndex: 0,
    sheets: sheets.length > 0 ? sheets : [{ name: 'Sheet1', headers: ['Column 1'], rows: [], totalRows: 0, totalCols: 1 }],
    metadata: {
      author: (props.Author || props.Creator) ? String(props.Author || props.Creator) : undefined,
      created: props.Created ? String(props.Created) : undefined,
      modified: props.Modified ? String(props.Modified) : undefined,
      application: props.Application ? String(props.Application) : undefined,
      hasMacros: wb.Workbook?.Names?.some((n) => n.Name.includes('macro')) || ext === 'xlsm',
    },
  };
}

function singleSheetWorkbook(
  fileName: string,
  fileSizeBytes: number,
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null)[][]
): WorkbookData {
  return {
    fileName,
    fileSizeBytes,
    activeSheetIndex: 0,
    sheets: [
      {
        name: sheetName,
        headers,
        rows,
        totalRows: rows.length,
        totalCols: headers.length,
      },
    ],
  };
}

async function parseDelimitedText(file: File, delimiter?: string): Promise<WorkbookData> {
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse<(string | number | null)[]>(text, {
      delimiter,
      dynamicTyping: true,
      skipEmptyLines: false,
      complete: (results) => {
        const rawData = results.data;
        if (!rawData || rawData.length === 0) {
          return resolve(singleSheetWorkbook(file.name, file.size, 'Sheet1', ['Column 1'], []));
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

        const sheetName = file.name.replace(/\.[^/.]+$/, '').slice(0, 31) || 'Sheet1';
        resolve(singleSheetWorkbook(file.name, file.size, sheetName, headers, rows));
      },
      error: (err: Error) => reject(new Error(err.message || 'Failed to parse CSV/TSV file')),
    });
  });
}
