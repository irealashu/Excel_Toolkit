export function detectFormat(fileName: string, mimeType?: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['xlsx', 'xlsm', 'xlsb', 'xls'].includes(ext)) {
    return ext.toUpperCase();
  }
  if (['csv', 'tsv', 'txt'].includes(ext)) {
    return ext.toUpperCase();
  }
  if (['json', 'jsonl'].includes(ext)) {
    return 'JSON';
  }
  if (['xml'].includes(ext)) return 'XML';
  if (['yaml', 'yml'].includes(ext)) return 'YAML';
  if (['md', 'markdown'].includes(ext)) return 'MARKDOWN';
  if (['html', 'htm'].includes(ext)) return 'HTML';
  if (['sql'].includes(ext)) return 'SQL';

  if (mimeType?.includes('spreadsheetml') || mimeType?.includes('excel')) return 'XLSX';
  if (mimeType?.includes('csv')) return 'CSV';
  if (mimeType?.includes('json')) return 'JSON';

  return ext ? ext.toUpperCase() : 'UNKNOWN';
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
