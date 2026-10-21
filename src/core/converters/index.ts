import * as yaml from 'js-yaml';
import Papa from 'papaparse';

export function tableToMarkdown(headers: string[], rows: (string | number | boolean | null)[][]): string {
  if (headers.length === 0) return '';

  const cleanHeaders = headers.map((h) => String(h || '').replace(/\|/g, '\\|').trim());
  const headerLine = `| ${cleanHeaders.join(' | ')} |`;
  const separatorLine = `| ${cleanHeaders.map(() => '---').join(' | ')} |`;

  const dataLines = rows.map((row) => {
    const cells = headers.map((_, i) => {
      const val = row[i];
      if (val === null || val === undefined) return '';
      return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
    });
    return `| ${cells.join(' | ')} |`;
  });

  return [headerLine, separatorLine, ...dataLines].join('\n');
}

export function markdownToTable(markdown: string): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  const lines = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (lines.length === 0) {
    return { headers: ['Col1'], rows: [] };
  }

  // First line is header
  const rawHeaders = lines[0]
    .slice(1, -1)
    .split('|')
    .map((s) => s.trim());

  // Second line is usually separator (e.g. |---|---|)
  let dataLines = lines.slice(1);
  if (dataLines.length > 0 && /^[|:\s-]+$/.test(dataLines[0])) {
    dataLines = dataLines.slice(1);
  }

  const rows = dataLines.map((line) => {
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((s) => s.trim());

    return rawHeaders.map((_, i) => (cells[i] !== undefined && cells[i] !== '' ? cells[i] : null));
  });

  return { headers: rawHeaders, rows };
}

export function tableToSql(
  tableName: string,
  headers: string[],
  rows: (string | number | boolean | null)[][],
  dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres',
  includeCreateTable = true
): string {
  const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'imported_data';
  const cleanHeaders = headers.map((h, i) =>
    (h || `col_${i + 1}`).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
  );

  const lines: string[] = [];

  if (includeCreateTable) {
    const colDefs = cleanHeaders.map((col) => {
      return `  "${col}" TEXT`;
    });
    lines.push(`CREATE TABLE IF NOT EXISTS "${safeTableName}" (\n${colDefs.join(',\n')}\n);\n`);
  }

  if (rows.length === 0) return lines.join('\n');

  const escapeVal = (val: string | number | boolean | null) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    const str = String(val).replace(/'/g, "''");
    return `'${str}'`;
  };

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valueTuples = chunk.map((r) => {
      const vals = cleanHeaders.map((_, idx) => escapeVal(r[idx] ?? null));
      return `(${vals.join(', ')})`;
    });

    lines.push(
      `INSERT INTO "${safeTableName}" (${cleanHeaders.map((h) => `"${h}"`).join(', ')})\nVALUES\n  ${valueTuples.join(',\n  ')};`
    );
  }

  return lines.join('\n\n');
}

export function tableToHtml(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const headerHtml = `  <thead>\n    <tr>\n${headers.map((h) => `      <th class="border px-4 py-2 bg-slate-100 text-left">${escapeHtml(h)}</th>`).join('\n')}\n    </tr>\n  </thead>`;

  const rowsHtml = rows
    .map((row) => {
      const cells = headers
        .map((_, i) => {
          const val = row[i];
          const text = val !== null && val !== undefined ? String(val) : '';
          return `      <td class="border px-4 py-2">${escapeHtml(text)}</td>`;
        })
        .join('\n');
      return `    <tr>\n${cells}\n    </tr>`;
    })
    .join('\n');

  return `<table class="min-w-full border-collapse border border-slate-300 text-sm">\n${headerHtml}\n  <tbody>\n${rowsHtml}\n  </tbody>\n</table>`;
}

export function htmlToTable(html: string): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table');

  if (!table) {
    throw new Error('No <table> element found in provided HTML');
  }

  const thElements = Array.from(table.querySelectorAll('thead th, tr th'));
  let headers: string[] = [];

  if (thElements.length > 0) {
    headers = thElements.map((th, i) => th.textContent?.trim() || `Column ${i + 1}`);
  }

  const allTrs = Array.from(table.querySelectorAll('tbody tr, tr')) as HTMLTableRowElement[];
  const trElements = allTrs.filter((tr) => !tr.querySelector('th') || thElements.length === 0);

  const rows: (string | number | boolean | null)[][] = [];

  trElements.forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll('td, th')) as HTMLElement[];
    if (cells.length === 0) return;

    if (headers.length === 0) {
      headers = cells.map((c, i) => c.textContent?.trim() || `Column ${i + 1}`);
      return;
    }

    const rowData = headers.map((_, i) => {
      const cell = cells[i];
      return cell ? cell.textContent?.trim() || null : null;
    });
    rows.push(rowData);
  });

  return { headers: headers.length > 0 ? headers : ['Column 1'], rows };
}

export function tableToYaml(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const data = rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[h || `col_${i + 1}`] = row[i] ?? null;
    });
    return obj;
  });

  return yaml.dump(data, { indent: 2, lineWidth: -1 });
}

export function yamlToTable(yamlStr: string): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  const parsed = yaml.load(yamlStr);
  if (!parsed) return { headers: ['Column 1'], rows: [] };

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const headerSet = new Set<string>();

  items.forEach((item) => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach((k) => headerSet.add(k));
    }
  });

  const headers = Array.from(headerSet);
  const rows = items.map((item) => {
    if (typeof item !== 'object' || item === null) return [String(item)];
    return headers.map((h) => {
      const val = item[h];
      return val !== undefined && val !== null ? val : null;
    });
  });

  return { headers: headers.length > 0 ? headers : ['Data'], rows };
}

export function tableToLatex(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  caption = 'Exported Spreadsheet Data',
  label = 'tab:spreadsheet_data'
): string {
  const numCols = headers.length;
  const colAlign = Array(numCols).fill('l').join(' ');

  const escapeLatex = (str: string) => {
    return str
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([&%$#_{}])/g, '\\$1')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');
  };

  const headerRow = headers.map((h) => `\\textbf{${escapeLatex(h)}}`).join(' & ') + ' \\\\ \\midrule';

  const bodyRows = rows.map((row) => {
    const cells = headers.map((_, i) => {
      const val = row[i];
      return val !== null && val !== undefined ? escapeLatex(String(val)) : '';
    });
    return cells.join(' & ') + ' \\\\';
  });

  return [
    '\\begin{table}[htbp]',
    '  \\centering',
    `  \\caption{${escapeLatex(caption)}}`,
    `  \\label{${label}}`,
    `  \\begin{tabular}{${colAlign}}`,
    '    \\toprule',
    `    ${headerRow}`,
    ...bodyRows.map((r) => `    ${r}`),
    '    \\bottomrule',
    '  \\end{tabular}',
    '\\end{table}',
  ].join('\n');
}

export function tableToIcs(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  colMap: { title: number; startDate: number; endDate?: number; description?: number; location?: number }
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Excel Toolkit//Client Event Calendar//EN',
    'CALSCALE:GREGORIAN',
  ];

  rows.forEach((row, idx) => {
    const title = String(row[colMap.title] ?? `Event ${idx + 1}`);
    const rawStart = row[colMap.startDate];
    if (!rawStart) return;

    const startDate = new Date(String(rawStart));
    if (isNaN(startDate.getTime())) return;

    const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const startStr = formatIcsDate(startDate);
    const endDate = colMap.endDate && row[colMap.endDate] ? new Date(String(row[colMap.endDate])) : new Date(startDate.getTime() + 3600000);
    const endStr = formatIcsDate(isNaN(endDate.getTime()) ? new Date(startDate.getTime() + 3600000) : endDate);

    const desc = colMap.description ? String(row[colMap.description] ?? '') : '';
    const loc = colMap.location ? String(row[colMap.location] ?? '') : '';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:evt-${Date.now()}-${idx}@exceltoolkit.local`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(`SUMMARY:${title.replace(/,/g, '\\,')}`);
    if (desc) lines.push(`DESCRIPTION:${desc.replace(/,/g, '\\,')}`);
    if (loc) lines.push(`LOCATION:${loc.replace(/,/g, '\\,')}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function tableToVCard(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  colMap: { name: number; email?: number; phone?: number; org?: number; title?: number }
): string {
  const vcards: string[] = [];

  rows.forEach((row) => {
    const name = String(row[colMap.name] ?? '').trim();
    if (!name) return;

    const email = colMap.email ? String(row[colMap.email] ?? '').trim() : '';
    const phone = colMap.phone ? String(row[colMap.phone] ?? '').trim() : '';
    const org = colMap.org ? String(row[colMap.org] ?? '').trim() : '';
    const title = colMap.title ? String(row[colMap.title] ?? '').trim() : '';

    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `N:;${name};;;`,
    ];
    if (org) lines.push(`ORG:${org}`);
    if (title) lines.push(`TITLE:${title}`);
    if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
    lines.push('END:VCARD');

    vcards.push(lines.join('\r\n'));
  });

  return vcards.join('\r\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
