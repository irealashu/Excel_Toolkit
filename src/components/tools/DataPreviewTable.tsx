import React, { useState, useMemo } from 'react';
import { Search, Download, Copy, Check, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import { downloadCsv, downloadJson, downloadXlsx } from '../../core/files/downloadBlob';

interface DataPreviewTableProps {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  title?: string;
  filename?: string;
  badge?: string;
  maxInitialRows?: number;
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  headers,
  rows,
  title = 'Data Preview',
  filename = 'exported_data',
  badge,
  maxInitialRows = 25,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(maxInitialRows);
  const [copied, setCopied] = useState(false);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + pageSize);

  const handleCopy = () => {
    const tsv = [headers.join('\t'), ...rows.map((r) => r.map((c) => (c !== null && c !== undefined ? String(c) : '')).join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXlsx = () => {
    downloadXlsx([{ name: 'Data', headers, rows }], `${filename}.xlsx`);
  };

  const handleDownloadCsv = () => {
    downloadCsv(headers, rows, `${filename}.csv`);
  };

  const handleDownloadJson = () => {
    const jsonObjects = rows.map((r) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h || `col_${i + 1}`] = r[i] ?? null;
      });
      return obj;
    });
    downloadJson(jsonObjects, `${filename}.json`);
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          {badge && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              {badge}
            </span>
          )}
          <span className="text-xs text-slate-400">
            ({filteredRows.length.toLocaleString()} rows • {headers.length} columns)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search inside table */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search in table..."
              className="h-8 rounded-lg border border-slate-700 bg-slate-800/80 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="Copy all rows as TSV for spreadsheet paste"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <button
            onClick={handleDownloadXlsx}
            className="flex items-center space-x-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 text-xs font-medium text-white shadow-sm transition-colors"
            title="Download formatted Excel workbook"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>XLSX</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center space-x-1.5 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 text-xs font-medium text-slate-200 transition-colors"
            title="Download CSV"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table viewport */}
      <div className="overflow-x-auto max-h-[500px] border-b border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
          <thead className="bg-slate-950 sticky top-0 z-10 select-none shadow-sm">
            <tr>
              <th className="w-12 px-3 py-2 text-center font-mono font-medium text-slate-500 border-r border-slate-800 bg-slate-950">
                #
              </th>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3 py-2.5 font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap border-r border-slate-800/80"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50 font-mono">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="py-8 text-center text-slate-500 text-xs">
                  {searchQuery ? 'No rows match your search filter.' : 'Table is empty.'}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => {
                const absoluteRowIndex = pageStart + rIdx + 1;
                return (
                  <tr key={rIdx} className="hover:bg-slate-800/50 transition-colors">
                    <td className="w-12 px-3 py-2 text-center text-slate-500 border-r border-slate-800 select-none bg-slate-950/20">
                      {absoluteRowIndex}
                    </td>
                    {headers.map((_, cIdx) => {
                      const val = row[cIdx];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={cIdx}
                          className={`px-3 py-2 text-slate-300 whitespace-nowrap border-r border-slate-800/40 max-w-xs truncate ${
                            isNum ? 'text-right' : 'text-left'
                          }`}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-slate-600 italic">null</span>
                          ) : typeof val === 'boolean' ? (
                            <span className={val ? 'text-emerald-400' : 'text-rose-400'}>{String(val)}</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/60 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2">
            Showing {filteredRows.length > 0 ? pageStart + 1 : 0} to{' '}
            {Math.min(pageStart + pageSize, filteredRows.length)} of {filteredRows.length.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
