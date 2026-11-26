import React from 'react';

const FORMAT_ROWS = [
  { format: 'Excel Modern (.xlsx)', read: 'Full', write: 'Full', notes: 'Multi-sheet workbooks, column widths, metadata, and OpenXML inspection.' },
  { format: 'Excel Legacy (.xls)', read: 'Full', write: 'Via .xlsx', notes: 'BIFF binary workbooks parsed locally and upgraded cleanly to .xlsx.' },
  { format: 'Excel Macro-Enabled (.xlsm)', read: 'Full (Safe)', write: 'Sanitized .xlsx', notes: 'Reads sheets safely without running VBA; strips vbaProject.bin on sanitize.' },
  { format: 'Excel Binary (.xlsb)', read: 'Full', write: 'Via .xlsx', notes: 'Binary sheets parsed locally into standard tabular views.' },
  { format: 'CSV (.csv)', read: 'Full', write: 'Full', notes: 'RFC 4180 compliant quoting, custom delimiters (, ; | tab), UTF-8 safe.' },
  { format: 'TSV (.tsv)', read: 'Full', write: 'Full', notes: 'Tab-separated values for direct Excel/Sheets clipboard & CLI pipelines.' },
  { format: 'JSON & JSONL (.json, .jsonl)', read: 'Full', write: 'Full', notes: 'Arrays of objects, nested JSON stringification, and streaming NDJSON lines.' },
  { format: 'Markdown Tables (.md)', read: 'Full', write: 'Full', notes: 'GitHub-Flavored Markdown (GFM) pipe tables parsed and generated bidirectionally.' },
  { format: 'SQL Inserts & DDL (.sql)', read: 'Export', write: 'Full', notes: 'PostgreSQL, MySQL, and SQLite dialects with inferred NUMERIC/TEXT schemas.' },
  { format: 'HTML Tables (.html)', read: 'Full', write: 'Full', notes: 'DOMParser extraction with <script>/<style> stripping and escaped export.' },
  { format: 'YAML (.yaml, .yml)', read: 'Full', write: 'Full', notes: 'Safe js-yaml parsing and 2-space indented serialization.' },
  { format: 'XML (.xml)', read: 'Full', write: 'Full', notes: 'Repeated element/attribute extraction and custom root/row tag export.' },
  { format: 'LaTeX Booktabs (.tex)', read: 'Export', write: 'Full', notes: 'Academic tabular + booktabs markup with automatic special-character escaping.' },
  { format: 'iCalendar (.ics)', read: 'Export', write: 'Full', notes: 'RFC 5545 VEVENT calendar files with ISO date parsing and skipped-row warnings.' },
  { format: 'vCard 3.0 (.vcf)', read: 'Export', write: 'Full', notes: 'Multi-contact address book files with name, organization, email, and phone.' },
];

export const FormatSupportPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Format Support Matrix
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          All listed parsers and generators execute natively inside your browser without external services.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead className="bg-slate-50 dark:bg-[#0d1219] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-display font-semibold">Format</th>
                <th className="px-4 py-3 text-left font-display font-semibold">Import / Read</th>
                <th className="px-4 py-3 text-left font-display font-semibold">Export / Write</th>
                <th className="px-4 py-3 text-left font-display font-semibold">Implementation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {FORMAT_ROWS.map((row) => (
                <tr key={row.format} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{row.format}</td>
                  <td className="px-4 py-3 font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{row.read}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.write}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
