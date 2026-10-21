import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(content: string, filename: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

export function downloadJson(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  downloadText(content, filename, 'application/json');
}

export function downloadCsv(headers: string[], rows: (string | number | boolean | null)[][], filename: string): void {
  const csvContent = Papa.unparse({
    fields: headers,
    data: rows,
  });
  downloadText(csvContent, filename, 'text/csv;charset=utf-8');
}

export function downloadXlsx(
  sheets: { name: string; headers: string[]; rows: (string | number | boolean | null)[][] }[],
  filename: string
): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const sheetData = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto-fit column widths
    const colWidths = sheet.headers.map((header, colIndex) => {
      let maxLen = header ? header.toString().length : 10;
      for (let r = 0; r < Math.min(sheet.rows.length, 50); r++) {
        const val = sheet.rows[r]?.[colIndex];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, val.toString().length);
        }
      }
      return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });
    ws['!cols'] = colWidths;

    const safeName = sheet.name.replace(/[*?:/[\]]/g, '').slice(0, 31) || 'Sheet1';
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
