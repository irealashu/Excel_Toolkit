import React, { useState, useMemo, useEffect } from 'react';
import { Search, Copy, Check, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { downloadCsv, downloadJson, downloadXlsx } from '../../core/files/downloadBlob';

interface DataPreviewTableProps {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  title?: string;
  filename?: string;
  maxInitialRows?: number;
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  headers,
  rows,
  title = 'Data Preview',
  filename = 'exported_data',
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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const pageStart = (currentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + pageSize);

  const handleCopy = () => {
    const tsv = [
      headers.join('\t'),
      ...filteredRows.map((r) => r.map((c) => (c !== null && c !== undefined ? String(c) : '')).join('\t')),
    ].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const jsonObjects = filteredRows.map((r) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h || `col_${i + 1}`] = r[i] ?? null;
      });
      return obj;
    });
    downloadJson(jsonObjects, `${filename}.json`);
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-[#0d1219]">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {filteredRows.length.toLocaleString()} rows · {headers.length} columns
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter table rows"
              placeholder="Filter rows..."
              className="h-8 w-44 sm:w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy TSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => downloadCsv(headers, filteredRows, `${filename}.csv`)}
            className="flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => downloadXlsx([{ name: 'Data', headers, rows: filteredRows }], `${filename}.xlsx`)}
            className="flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-3 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export XLSX</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[520px]">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          <thead className="bg-slate-50 dark:bg-[#0d1219] sticky top-0 z-10">
            <tr>
              <th className="w-12 px-3 py-2.5 text-center font-mono font-medium text-slate-400 border-r border-slate-200 dark:border-slate-800">
                #
              </th>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3.5 py-2.5 text-left font-display font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap border-r border-slate-200/70 dark:border-slate-800/80 last:border-r-0"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono tabular-nums">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="py-12 text-center font-sans text-slate-500">
                  {searchQuery ? 'No rows match the current filter.' : 'This dataset contains no rows.'}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => {
                const absoluteRowIndex = pageStart + rIdx + 1;
                return (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="w-12 px-3 py-2 text-center text-slate-400 border-r border-slate-200/70 dark:border-slate-800/80 select-none bg-slate-50/40 dark:bg-slate-950/20">
                      {absoluteRowIndex}
                    </td>
                    {headers.map((_, cIdx) => {
                      const val = row[cIdx];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={cIdx}
                          className={`px-3.5 py-2 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-100 dark:border-slate-800/50 last:border-r-0 max-w-xs truncate ${
                            isNum ? 'text-right' : 'text-left'
                          }`}
                        >
                          {val === null || val === undefined || val === '' ? (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          ) : typeof val === 'boolean' ? (
                            <span className={val ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {String(val)}
                            </span>
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

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50/70 dark:bg-[#0d1219] text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Rows per page"
              className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <span className="tabular-nums">
            Showing {filteredRows.length > 0 ? pageStart + 1 : 0}–
            {Math.min(pageStart + pageSize, filteredRows.length)} of {filteredRows.length.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
