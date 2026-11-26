import * as yaml from 'js-yaml';
import Papa from 'papaparse';

export type CellValue = string | number | boolean | null;

export function tableToCsv(headers: string[], rows: CellValue[][], delimiter = ','): string {
  return Papa.unparse(
    {
      fields: headers,
      data: rows,
    },
    { delimiter }
  );
}

export function csvToTable(csvText: string, delimiter?: string): { headers: string[]; rows: CellValue[][] } {
  const parsed = Papa.parse<CellValue[]>(csvText.trim(), {
    delimiter,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const data = parsed.data;
  if (!data || data.length === 0) return { headers: ['Column 1'], rows: [] };
  const maxCols = Math.max(...data.map((r) => (Array.isArray(r) ? r.length : 0)), 1);
  const headers = Array.from({ length: maxCols }, (_, i) => {
    const val = data[0]?.[i];
    return val !== null && val !== undefined && String(val).trim() !== '' ? String(val).trim() : `Column ${i + 1}`;
  });
  const rows = data.slice(1).map((r) => Array.from({ length: maxCols }, (_, i) => (r[i] !== undefined ? r[i] : null)));
  return { headers, rows };
}

export function tableToTsv(headers: string[], rows: CellValue[][]): string {
  return tableToCsv(headers, rows, '\t');
}

export function tableToJson(headers: string[], rows: CellValue[][], pretty = true): string {
  const objArray = rows.map((r) => {
    const obj: Record<string, CellValue> = {};
    headers.forEach((h, i) => {
      obj[h || `col_${i + 1}`] = r[i] ?? null;
    });
    return obj;
  });
  return JSON.stringify(objArray, null, pretty ? 2 : 0);
}

export function tableToJsonLines(headers: string[], rows: CellValue[][]): string {
  return rows
    .map((r) => {
      const obj: Record<string, CellValue> = {};
      headers.forEach((h, i) => {
        obj[h || `col_${i + 1}`] = r[i] ?? null;
      });
      return JSON.stringify(obj);
    })
    .join('\n');
}

export function jsonToTable(jsonText: string): { headers: string[]; rows: CellValue[][] } {
  const trimmed = jsonText.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Attempt JSON Lines (NDJSON)
    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
    parsed = lines.map((l) => JSON.parse(l));
  }

  let items: Record<string, unknown>[] = [];
  if (Array.isArray(parsed)) {
    items = parsed.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const arrKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    if (arrKey && Array.isArray(obj[arrKey])) {
      items = (obj[arrKey] as unknown[]).filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null);
    } else {
      items = [obj];
    }
  }

  if (items.length === 0) return { headers: ['Column 1'], rows: [] };
  const headerSet = new Set<string>();
  items.forEach((item) => Object.keys(item).forEach((k) => headerSet.add(k)));
  const headers = Array.from(headerSet);
  const rows: CellValue[][] = items.map((item) =>
    headers.map((h) => {
      const val = item[h];
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return val as CellValue;
    })
  );
  return { headers, rows };
}

export function tableToMarkdown(headers: string[], rows: CellValue[][]): string {
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

export function markdownToTable(markdown: string): { headers: string[]; rows: CellValue[][] } {
  const lines = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|'));

  if (lines.length === 0) {
    return { headers: ['Column 1'], rows: [] };
  }

  const splitRow = (line: string) => {
    const stripped = line.replace(/^\|/, '').replace(/\|$/, '');
    return stripped.split('|').map((s) => s.trim());
  };

  const rawHeaders = splitRow(lines[0]).map((h, i) => h || `Column ${i + 1}`);

  let dataLines = lines.slice(1);
  if (dataLines.length > 0 && /^[|:\s-]+$/.test(dataLines[0])) {
    dataLines = dataLines.slice(1);
  }

  const rows: CellValue[][] = dataLines.map((line) => {
    const cells = splitRow(line);
    return rawHeaders.map((_, i) => {
      const c = cells[i];
      if (c === undefined || c === '') return null;
      const num = Number(c);
      return !isNaN(num) && c !== '' ? num : c;
    });
  });

  return { headers: rawHeaders, rows };
}

export function tableToSql(
  tableName: string,
  headers: string[],
  rows: CellValue[][],
  dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres',
  includeCreateTable = true
): string {
  const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'imported_data';
  const cleanHeaders = headers.map((h, i) =>
    (h || `col_${i + 1}`).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
  );

  const q = (ident: string) => (dialect === 'mysql' ? `\`${ident}\`` : `"${ident}"`);
  const lines: string[] = [];

  if (includeCreateTable) {
    const colDefs = cleanHeaders.map((col, idx) => {
      const sampleNums = rows.slice(0, 20).map((r) => r[idx]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      const allNumeric = sampleNums.length > 0 && sampleNums.every((v) => typeof v === 'number' || !isNaN(Number(v)));
      const sqlType = allNumeric ? (dialect === 'sqlite' ? 'REAL' : 'NUMERIC') : 'TEXT';
      return `  ${q(col)} ${sqlType}`;
    });
    lines.push(`CREATE TABLE IF NOT EXISTS ${q(safeTableName)} (\n${colDefs.join(',\n')}\n);`);
  }

  if (rows.length === 0) return lines.join('\n');

  const escapeVal = (val: CellValue) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
    if (typeof val === 'boolean') return dialect === 'sqlite' ? (val ? '1' : '0') : val ? 'TRUE' : 'FALSE';
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
      `INSERT INTO ${q(safeTableName)} (${cleanHeaders.map((h) => q(h)).join(', ')})\nVALUES\n  ${valueTuples.join(',\n  ')};`
    );
  }

  return lines.join('\n\n');
}

export function tableToHtml(headers: string[], rows: CellValue[][]): string {
  const headerHtml = `  <thead>\n    <tr>\n${headers.map((h) => `      <th>${escapeHtml(h)}</th>`).join('\n')}\n    </tr>\n  </thead>`;

  const rowsHtml = rows
    .map((row) => {
      const cells = headers
        .map((_, i) => {
          const val = row[i];
          const text = val !== null && val !== undefined ? String(val) : '';
          return `      <td>${escapeHtml(text)}</td>`;
        })
        .join('\n');
      return `    <tr>\n${cells}\n    </tr>`;
    })
    .join('\n');

  return `<table>\n${headerHtml}\n  <tbody>\n${rowsHtml}\n  </tbody>\n</table>`;
}

export function htmlToTable(html: string): { headers: string[]; rows: CellValue[][] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // Strip any script/style elements defensively
  doc.querySelectorAll('script, style').forEach((el) => el.remove());

  const table = doc.querySelector('table');
  if (!table) {
    throw new Error('No <table> element found in provided HTML.');
  }

  const allTrs = Array.from(table.querySelectorAll('tr'));
  if (allTrs.length === 0) return { headers: ['Column 1'], rows: [] };

  let headers: string[] = [];
  const rows: CellValue[][] = [];

  allTrs.forEach((tr, rowIndex) => {
    const cells = Array.from(tr.querySelectorAll('th, td'));
    if (cells.length === 0) return;

    const isHeaderRow = rowIndex === 0 && (tr.querySelectorAll('th').length > 0 || headers.length === 0);
    if (isHeaderRow && headers.length === 0) {
      headers = cells.map((c, i) => c.textContent?.trim() || `Column ${i + 1}`);
      return;
    }

    const rowData: CellValue[] = headers.map((_, i) => {
      const text = cells[i]?.textContent?.trim() ?? '';
      if (text === '') return null;
      const num = Number(text);
      return !isNaN(num) ? num : text;
    });
    rows.push(rowData);
  });

  return { headers: headers.length > 0 ? headers : ['Column 1'], rows };
}

export function tableToYaml(headers: string[], rows: CellValue[][]): string {
  const data = rows.map((row) => {
    const obj: Record<string, CellValue> = {};
    headers.forEach((h, i) => {
      obj[h || `col_${i + 1}`] = row[i] ?? null;
    });
    return obj;
  });

  return yaml.dump(data, { indent: 2, lineWidth: -1 });
}

export function yamlToTable(yamlStr: string): { headers: string[]; rows: CellValue[][] } {
  const parsed = yaml.load(yamlStr);
  if (!parsed) return { headers: ['Column 1'], rows: [] };

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const headerSet = new Set<string>();

  items.forEach((item) => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item as Record<string, unknown>).forEach((k) => headerSet.add(k));
    }
  });

  const headers = Array.from(headerSet);
  const rows: CellValue[][] = items.map((item) => {
    if (typeof item !== 'object' || item === null) return [String(item)];
    const rec = item as Record<string, unknown>;
    return headers.map((h) => {
      const val = rec[h];
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return val as CellValue;
    });
  });

  return { headers: headers.length > 0 ? headers : ['Data'], rows };
}

function sanitizeXmlTag(name: string, fallback: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^[^a-zA-Z_]+/, '');
  return cleaned || fallback;
}

export function tableToXml(headers: string[], rows: CellValue[][], rootTag = 'records', rowTag = 'record'): string {
  const safeRoot = sanitizeXmlTag(rootTag, 'records');
  const safeRow = sanitizeXmlTag(rowTag, 'record');
  const tags = headers.map((h, i) => sanitizeXmlTag(h, `col_${i + 1}`));

  const rowXml = rows.map((row) => {
    const fields = tags
      .map((tag, i) => {
        const val = row[i];
        const str = val === null || val === undefined ? '' : escapeXml(String(val));
        return `    <${tag}>${str}</${tag}>`;
      })
      .join('\n');
    return `  <${safeRow}>\n${fields}\n  </${safeRow}>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${safeRoot}>\n${rowXml.join('\n')}\n</${safeRoot}>`;
}

export function xmlToTable(xmlStr: string): { headers: string[]; rows: CellValue[][] } {
  const trimmed = xmlStr.trim();
  // Pure regex/stack-safe parser that works both in browser DOM and Node unit tests
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'application/xml');
    const parseErr = doc.querySelector('parsererror');
    if (parseErr) {
      throw new Error('Invalid XML syntax.');
    }
    const root = doc.documentElement;
    const children = Array.from(root.children);
    if (children.length === 0) return { headers: ['Value'], rows: [[root.textContent?.trim() || null]] };

    const headerSet = new Set<string>();
    const records: Record<string, CellValue>[] = children.map((child) => {
      const rec: Record<string, CellValue> = {};
      Array.from(child.attributes).forEach((attr) => {
        const key = `@${attr.name}`;
        headerSet.add(key);
        rec[key] = attr.value;
      });
      Array.from(child.children).forEach((field) => {
        const key = field.tagName;
        headerSet.add(key);
        const text = field.textContent?.trim() ?? '';
        const num = Number(text);
        rec[key] = text === '' ? null : !isNaN(num) ? num : text;
      });
      return rec;
    });

    const headers = Array.from(headerSet);
    const rows = records.map((rec) => headers.map((h) => rec[h] ?? null));
    return { headers: headers.length > 0 ? headers : ['Column 1'], rows };
  }

  // Fallback for Node test environment without DOMParser
  const recordMatches = [...trimmed.matchAll(/<([a-zA-Z_][\w-]*)>\s*([\s\S]*?)\s*<\/\1>/g)];
  const innerBlock = recordMatches[0]?.[2] ?? trimmed;
  const rowBlocks = [...innerBlock.matchAll(/<([a-zA-Z_][\w-]*)>([\s\S]*?)<\/\1>/g)];
  const headerSet = new Set<string>();
  const records: Record<string, CellValue>[] = [];

  for (const match of rowBlocks) {
    const body = match[2];
    const fields = [...body.matchAll(/<([a-zA-Z_][\w-]*)>([\s\S]*?)<\/\1>/g)];
    if (fields.length === 0) continue;
    const rec: Record<string, CellValue> = {};
    for (const f of fields) {
      headerSet.add(f[1]);
      const val = unescapeXml(f[2].trim());
      const num = Number(val);
      rec[f[1]] = val === '' ? null : !isNaN(num) ? num : val;
    }
    records.push(rec);
  }

  const headers = Array.from(headerSet);
  const rows = records.map((r) => headers.map((h) => r[h] ?? null));
  return { headers: headers.length > 0 ? headers : ['Column 1'], rows };
}

export function tableToLatex(
  headers: string[],
  rows: CellValue[][],
  caption = 'Exported Spreadsheet Data',
  label = 'tab:spreadsheet_data'
): string {
  const numCols = headers.length;
  const colAlign = Array(numCols).fill('l').join(' ');

  const escapeLatex = (str: string) =>
    str
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([&%$#_{}])/g, '\\$1')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');

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
  rows: CellValue[][],
  colMap: { title: number; startDate: number; endDate?: number; description?: number; location?: number }
): { content: string; eventCount: number; skippedCount: number } {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Excel Toolkit//Client Event Calendar//EN',
    'CALSCALE:GREGORIAN',
  ];

  let eventCount = 0;
  let skippedCount = 0;

  const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  rows.forEach((row, idx) => {
    const title = String(row[colMap.title] ?? `Event ${idx + 1}`).trim();
    const rawStart = row[colMap.startDate];
    if (!rawStart) {
      skippedCount++;
      return;
    }

    const startDate = new Date(String(rawStart));
    if (isNaN(startDate.getTime())) {
      skippedCount++;
      return;
    }

    const startStr = formatIcsDate(startDate);
    const rawEnd = colMap.endDate !== undefined ? row[colMap.endDate] : null;
    const parsedEnd = rawEnd ? new Date(String(rawEnd)) : null;
    const endDate = parsedEnd && !isNaN(parsedEnd.getTime()) ? parsedEnd : new Date(startDate.getTime() + 3600000);
    const endStr = formatIcsDate(endDate);

    const desc = colMap.description !== undefined ? String(row[colMap.description] ?? '').trim() : '';
    const loc = colMap.location !== undefined ? String(row[colMap.location] ?? '').trim() : '';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:evt-${idx + 1}@exceltoolkit.local`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(`SUMMARY:${title.replace(/,/g, '\\,')}`);
    if (desc) lines.push(`DESCRIPTION:${desc.replace(/,/g, '\\,')}`);
    if (loc) lines.push(`LOCATION:${loc.replace(/,/g, '\\,')}`);
    lines.push('END:VEVENT');
    eventCount++;
  });

  lines.push('END:VCALENDAR');
  return { content: lines.join('\r\n'), eventCount, skippedCount };
}

export function tableToVCard(
  headers: string[],
  rows: CellValue[][],
  colMap: { name: number; email?: number; phone?: number; org?: number; title?: number }
): { content: string; contactCount: number } {
  const vcards: string[] = [];

  rows.forEach((row) => {
    const name = String(row[colMap.name] ?? '').trim();
    if (!name) return;

    const email = colMap.email !== undefined ? String(row[colMap.email] ?? '').trim() : '';
    const phone = colMap.phone !== undefined ? String(row[colMap.phone] ?? '').trim() : '';
    const org = colMap.org !== undefined ? String(row[colMap.org] ?? '').trim() : '';
    const title = colMap.title !== undefined ? String(row[colMap.title] ?? '').trim() : '';

    const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `N:;${name};;;`];
    if (org) lines.push(`ORG:${org}`);
    if (title) lines.push(`TITLE:${title}`);
    if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
    lines.push('END:VCARD');

    vcards.push(lines.join('\r\n'));
  });

  return { content: vcards.join('\r\n'), contactCount: vcards.length };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}
