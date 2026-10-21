import React from 'react';
import { FileCheck, Check, AlertCircle, X } from 'lucide-react';

export const FormatSupportPage: React.FC = () => {
  const formats = [
    { ext: '.xlsx', name: 'Excel OpenXML Workbook', read: 'Full', write: 'Full', note: 'Standard modern format. Supports multi-sheet, formulas, styles.' },
    { ext: '.xls', name: 'Excel 97-2004 Binary', read: 'Full', write: 'Partial', note: 'Legacy binary BIFF8 format parsing supported.' },
    { ext: '.xlsm', name: 'Excel Macro-Enabled Workbook', read: 'Full', write: 'Full (Macro-free)', note: 'VBA macro inspection supported. Macro execution is strictly blocked.' },
    { ext: '.csv', name: 'Comma Separated Values', read: 'Full', write: 'Full', note: 'RFC 4180 compliant with auto-delimiter detection and Unicode.' },
    { ext: '.tsv', name: 'Tab Separated Values', read: 'Full', write: 'Full', note: 'Tabular text parsing with clipboard paste compatibility.' },
    { ext: '.json', name: 'JavaScript Object Notation', read: 'Full', write: 'Full', note: 'Array of objects or 2D matrix transformation.' },
    { ext: '.md', name: 'Markdown Tables', read: 'Full', write: 'Full', note: 'GitHub-Flavored Markdown (GFM) pipe table syntax.' },
    { ext: '.sql', name: 'SQL INSERT Statements', read: 'Full', write: 'Full', note: 'Generates CREATE TABLE and batched INSERT statements.' },
    { ext: '.html', name: 'HTML Tables', read: 'Full', write: 'Full', note: 'Table DOM extraction and responsive HTML generation.' },
    { ext: '.yaml', name: 'YAML Document', read: 'Full', write: 'Full', note: 'Tabular array to structured YAML serialization.' },
    { ext: '.tex', name: 'LaTeX Tabular & Booktabs', read: 'N/A', write: 'Full', note: 'Academic tabular LaTeX syntax with escaped characters.' },
    { ext: '.ics', name: 'iCalendar Events', read: 'N/A', write: 'Full', note: 'RFC 5545 calendar event generation from tabular dates.' },
    { ext: '.vcf', name: 'vCard 3.0 Contacts', read: 'N/A', write: 'Full', note: 'Standard address book contact cards from table rows.' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Supported Format Matrix</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Honest accounting of all browser-side read and export capabilities across spreadsheet formats.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
          <thead className="bg-slate-950 font-semibold text-slate-300">
            <tr>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-center">Read / Import</th>
              <th className="px-4 py-3 text-center">Write / Export</th>
              <th className="px-4 py-3">Capabilities &amp; Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
            {formats.map((f, i) => (
              <tr key={i} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 font-mono font-bold text-emerald-400">{f.ext}</td>
                <td className="px-4 py-3 font-medium text-white">{f.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {f.read}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {f.write}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
