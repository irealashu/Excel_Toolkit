import React, { useState } from 'react';
import { GitCompare, Plus, Minus, Edit3, Link2, Check, Download, FileSpreadsheet } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { DataPreviewTable } from './DataPreviewTable';
import { compareTables, joinTables, DiffRow } from '../../core/transforms';
import { downloadCsv, downloadXlsx } from '../../core/files/downloadBlob';
import { SAMPLE_WORKBOOK } from '../../core/files/sampleData';
import { WorkbookData } from '../../registry/types';

export const ComparisonWorkspace: React.FC = () => {
  const [workbookA, setWorkbookA] = useState<WorkbookData | null>(SAMPLE_WORKBOOK);
  const [workbookB, setWorkbookB] = useState<WorkbookData | null>(() => {
    // Clone and alter slightly for deterministic comparison
    const cloned = JSON.parse(JSON.stringify(SAMPLE_WORKBOOK)) as WorkbookData;
    cloned.fileName = 'Company_Sales_Q3_Updated.xlsx';
    // Modify a cell, delete an order, add an order
    const sheet0 = cloned.sheets[0];
    sheet0.rows[0][6] = 7200; // modified total revenue
    sheet0.rows.splice(4, 1); // removed row
    sheet0.rows.push(['ORD-9099', 'NextGen BioCorp', 'Europe', 'Cloud Software', 10, 500, 5000, 'Processing']); // added row
    sheet0.totalRows = sheet0.rows.length;
    return cloned;
  });

  const [mode, setMode] = useState<'diff' | 'join'>('diff');
  const [joinType, setJoinType] = useState<'inner' | 'left' | 'full'>('left');
  const [keyColA, setKeyColA] = useState<number>(0);
  const [keyColB, setKeyColB] = useState<number>(0);

  const sheetA = workbookA ? workbookA.sheets[workbookA.activeSheetIndex] || workbookA.sheets[0] : null;
  const sheetB = workbookB ? workbookB.sheets[workbookB.activeSheetIndex] || workbookB.sheets[0] : null;

  const headersA = sheetA ? sheetA.headers : [];
  const rowsA = sheetA ? sheetA.rows : [];
  const headersB = sheetB ? sheetB.headers : [];
  const rowsB = sheetB ? sheetB.rows : [];

  // Computed diff
  const diffResult = React.useMemo(() => {
    if (!sheetA || !sheetB) return null;
    return compareTables(headersA, rowsA, headersB, rowsB, keyColA, keyColB);
  }, [sheetA, sheetB, headersA, rowsA, headersB, rowsB, keyColA, keyColB]);

  // Computed join
  const joinResult = React.useMemo(() => {
    if (!sheetA || !sheetB || mode !== 'join') return null;
    return joinTables(headersA, rowsA, headersB, rowsB, keyColA, keyColB, joinType);
  }, [sheetA, sheetB, headersA, rowsA, headersB, rowsB, keyColA, keyColB, joinType, mode]);

  return (
    <div className="space-y-6">
      {/* 1. Dual File Uploaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Workbook A (Original)</h4>
          <FileDropzone
            currentWorkbook={workbookA}
            onWorkbookLoaded={setWorkbookA}
            onClear={() => setWorkbookA(null)}
            title="Drop Base Spreadsheet (File A)"
          />
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Workbook B (Target / Comparison)</h4>
          <FileDropzone
            currentWorkbook={workbookB}
            onWorkbookLoaded={setWorkbookB}
            onClear={() => setWorkbookB(null)}
            title="Drop Modified Spreadsheet (File B)"
          />
        </div>
      </div>

      {/* 2. Mode Selector & Key Configuration */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMode('diff')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'diff'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                  : 'border border-slate-800 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Side-by-Side Diff</span>
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'join'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                  : 'border border-slate-800 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>SQL / Table Joiner</span>
            </button>
          </div>

          {/* Key match column selectors */}
          {headersA.length > 0 && headersB.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center space-x-1.5">
                <span>Key Col A:</span>
                <select
                  value={keyColA}
                  onChange={(e) => setKeyColA(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  {headersA.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <span>=</span>

              <div className="flex items-center space-x-1.5">
                <span>Key Col B:</span>
                <select
                  value={keyColB}
                  onChange={(e) => setKeyColB(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  {headersB.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {mode === 'join' && (
                <div className="flex items-center space-x-1.5 ml-2">
                  <span>Join Type:</span>
                  <select
                    value={joinType}
                    onChange={(e) => setJoinType(e.target.value as any)}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                  >
                    <option value="inner">Inner Join (Matched only)</option>
                    <option value="left">Left Join (All A + matching B)</option>
                    <option value="full">Full Outer Join (All A & B)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Diff statistics summary */}
        {diffResult && mode === 'diff' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
              <Plus className="h-3.5 w-3.5" />
              <span>{diffResult.addedCount} Added</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1 text-rose-400 font-medium">
              <Minus className="h-3.5 w-3.5" />
              <span>{diffResult.removedCount} Removed</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1 text-amber-400 font-medium">
              <Edit3 className="h-3.5 w-3.5" />
              <span>{diffResult.modifiedCount} Modified</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{diffResult.identicalCount} Unchanged</span>
          </div>
        )}
      </div>

      {/* 3. Diff View or Join Table */}
      {mode === 'diff' && diffResult && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Discrepancy & Comparison Matrix
            </h4>
            <span className="text-xs text-slate-400">{diffResult.diffRows.length} total compared rows</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-slate-800 text-xs font-mono">
              <thead className="bg-slate-950 sticky top-0 z-10">
                <tr>
                  <th className="w-20 px-3 py-2 text-center text-slate-400 border-r border-slate-800">Status</th>
                  <th className="w-16 px-3 py-2 text-center text-slate-400 border-r border-slate-800">Row</th>
                  {headersA.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-slate-300 border-r border-slate-800 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {diffResult.diffRows.map((dRow, idx) => {
                  let badgeBg = 'bg-slate-800 text-slate-400';
                  if (dRow.status === 'added') badgeBg = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                  if (dRow.status === 'removed') badgeBg = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
                  if (dRow.status === 'modified') badgeBg = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-center border-r border-slate-800">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badgeBg}`}>
                          {dRow.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500 border-r border-slate-800">
                        {dRow.rowNumA || dRow.rowNumB}
                      </td>
                      {dRow.cells.slice(0, headersA.length).map((c, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-2 whitespace-nowrap border-r border-slate-800/40 ${
                            c.isDifferent
                              ? 'bg-amber-950/40 text-amber-200 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {c.valA !== undefined && c.valB !== undefined && c.isDifferent ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="line-through text-rose-400 opacity-80">{String(c.valA)}</span>
                              <span>→</span>
                              <span className="text-emerald-400">{String(c.valB)}</span>
                            </div>
                          ) : (
                            String(c.valA ?? c.valB ?? '')
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'join' && joinResult && (
        <DataPreviewTable
          headers={joinResult.headers}
          rows={joinResult.rows}
          title={`Joined Table (${joinType.toUpperCase()} JOIN)`}
          filename="joined_spreadsheet_dataset"
        />
      )}
    </div>
  );
};
