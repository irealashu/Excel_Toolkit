import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { DataPreviewTable } from './DataPreviewTable';
import { WorkbookData } from '../../registry/types';
import { cloneSampleWorkbook } from '../../core/files/sampleData';
import { parseWorkbookFile } from '../../core/files/parseWorkbook';
import { downloadCsv, downloadXlsx } from '../../core/files/downloadBlob';
import { compareTables, joinTables, mergeTablesStack } from '../../core/transforms';

type CompareMode = 'diff' | 'join' | 'merge';

function mapToolToMode(toolId?: string): CompareMode {
  if (toolId === 'table-joiner') return 'join';
  if (toolId === 'workbook-merger') return 'merge';
  return 'diff';
}

function createSampleModifiedWorkbook(): WorkbookData {
  const wb = cloneSampleWorkbook(0);
  wb.fileName = 'Company_Sales_Q3_Revised.xlsx';
  const rows = wb.sheets[0].rows;
  // Modify price/revenue on row 2
  if (rows[1]) {
    rows[1][5] = 395;
    rows[1][6] = 4740;
    rows[1][7] = 'Completed';
  }
  // Remove last row and add a new order
  rows.pop();
  rows.push(['ORD-9033', 'Orion BioLabs', 'North America', 'Analytics Suite', 6, 2400, 14400, 'Processing']);
  wb.sheets[0].totalRows = rows.length;
  return wb;
}

interface ComparisonWorkspaceProps {
  initialToolId?: string;
}

export const ComparisonWorkspace: React.FC<ComparisonWorkspaceProps> = ({ initialToolId }) => {
  const [mode, setMode] = useState<CompareMode>(() => mapToolToMode(initialToolId));

  // Datasets for Diff & Join
  const [wbA, setWbA] = useState<WorkbookData | null>(() => cloneSampleWorkbook(0));
  const [wbB, setWbB] = useState<WorkbookData | null>(() =>
    initialToolId === 'table-joiner' ? cloneSampleWorkbook(1) : createSampleModifiedWorkbook()
  );

  // Diff config
  const [useKeyDiff, setUseKeyDiff] = useState(true);
  const [diffKeyA, setDiffKeyA] = useState(0);
  const [diffKeyB, setDiffKeyB] = useState(0);
  const [onlyShowChanges, setOnlyShowChanges] = useState(false);

  // Join config
  const [joinType, setJoinType] = useState<'inner' | 'left' | 'full'>('left');
  const [joinKeyA, setJoinKeyA] = useState(1); // Customer_Name
  const [joinKeyB, setJoinKeyB] = useState(1); // Company_Name

  // Merger state
  const [mergeList, setMergeList] = useState<WorkbookData[]>(() => [
    cloneSampleWorkbook(0),
    createSampleModifiedWorkbook(),
  ]);
  const [mergeIncludeSource, setMergeIncludeSource] = useState(true);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const mergeFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = mapToolToMode(initialToolId);
    setMode(next);
    if (next === 'join') {
      setWbA(cloneSampleWorkbook(0));
      setWbB(cloneSampleWorkbook(1));
      setJoinKeyA(1);
      setJoinKeyB(1);
    } else if (next === 'diff') {
      setWbA(cloneSampleWorkbook(0));
      setWbB(createSampleModifiedWorkbook());
      setDiffKeyA(0);
      setDiffKeyB(0);
    }
  }, [initialToolId]);

  const sheetA = wbA ? wbA.sheets[wbA.activeSheetIndex] || wbA.sheets[0] : null;
  const sheetB = wbB ? wbB.sheets[wbB.activeSheetIndex] || wbB.sheets[0] : null;

  const diffResult = useMemo(() => {
    if (!sheetA || !sheetB) return null;
    return compareTables(
      sheetA.headers,
      sheetA.rows,
      sheetB.headers,
      sheetB.rows,
      useKeyDiff ? Math.min(diffKeyA, sheetA.headers.length - 1) : undefined,
      useKeyDiff ? Math.min(diffKeyB, sheetB.headers.length - 1) : undefined
    );
  }, [sheetA, sheetB, useKeyDiff, diffKeyA, diffKeyB]);

  const joinResult = useMemo(() => {
    if (!sheetA || !sheetB) return null;
    return joinTables(
      sheetA.headers,
      sheetA.rows,
      sheetB.headers,
      sheetB.rows,
      Math.min(joinKeyA, Math.max(0, sheetA.headers.length - 1)),
      Math.min(joinKeyB, Math.max(0, sheetB.headers.length - 1)),
      joinType
    );
  }, [sheetA, sheetB, joinKeyA, joinKeyB, joinType]);

  const mergedStack = useMemo(() => {
    const tables = mergeList.map((wb, idx) => {
      const sheet = wb.sheets[wb.activeSheetIndex] || wb.sheets[0];
      return {
        name: `${wb.fileName.replace(/\.[^/.]+$/, '')}_${sheet.name}_${idx + 1}`,
        headers: sheet.headers,
        rows: sheet.rows,
      };
    });
    return mergeTablesStack(tables, mergeIncludeSource);
  }, [mergeList, mergeIncludeSource]);

  const handleExportDiffCsv = () => {
    if (!diffResult || !sheetA) return;
    const headers = ['Diff_Status', 'Row_A', 'Row_B', ...sheetA.headers];
    const rows = diffResult.diffRows.map((d) => [
      d.status.toUpperCase(),
      d.rowNumA ?? '',
      d.rowNumB ?? '',
      ...d.cells.map((c) => {
        if (d.status === 'modified' && c.isDifferent) {
          return `${c.valA ?? ''} -> ${c.valB ?? ''}`;
        }
        return c.valB ?? c.valA ?? '';
      }),
    ]);
    downloadCsv(headers, rows, 'workbook_diff_report.csv');
  };

  const handleAddMergeFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setMergeError(null);
    const loaded: WorkbookData[] = [];
    try {
      for (const file of Array.from(files)) {
        const wb = await parseWorkbookFile(file);
        loaded.push(wb);
      }
      setMergeList((prev) => [...prev, ...loaded]);
    } catch (err: unknown) {
      setMergeError(err instanceof Error ? err.message : 'Failed to parse one of the selected files.');
    } finally {
      if (mergeFileRef.current) mergeFileRef.current.value = '';
    }
  };

  const handleExportMultiSheetXlsx = () => {
    const sheets = mergeList.map((wb, i) => {
      const s = wb.sheets[wb.activeSheetIndex] || wb.sheets[0];
      return {
        name: `${s.name}_${i + 1}`.slice(0, 31),
        headers: s.headers,
        rows: s.rows,
      };
    });
    downloadXlsx(sheets, 'merged_multi_sheet_workbook.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-1">
          {(
            [
              { id: 'diff', label: 'Workbook Diff' },
              { id: 'join', label: 'Table Joiner (VLOOKUP)' },
              { id: 'merge', label: 'Multi-File Merger' },
            ] as { id: CompareMode; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === item.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === 'diff' && (
          <button
            type="button"
            onClick={() => {
              setWbA(cloneSampleWorkbook(0));
              setWbB(createSampleModifiedWorkbook());
            }}
            className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Load Sample Revision Diff
          </button>
        )}
        {mode === 'join' && (
          <button
            type="button"
            onClick={() => {
              setWbA(cloneSampleWorkbook(0));
              setWbB(cloneSampleWorkbook(1));
              setJoinKeyA(1);
              setJoinKeyB(1);
            }}
            className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Load Sample Orders + Contacts Join
          </button>
        )}
      </div>

      {/* DIFF & JOIN DUAL DROPZONES */}
      {(mode === 'diff' || mode === 'join') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dataset A (Baseline / Left Table)
            </span>
            <FileDropzone
              currentWorkbook={wbA}
              onWorkbookLoaded={setWbA}
              onClear={() => setWbA(null)}
              title="Drop Dataset A"
              subtitle="Baseline spreadsheet or left join table"
              defaultSampleSheetIndex={0}
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dataset B (Comparison / Right Table)
            </span>
            <FileDropzone
              currentWorkbook={wbB}
              onWorkbookLoaded={setWbB}
              onClear={() => setWbB(null)}
              title="Drop Dataset B"
              subtitle="Updated spreadsheet or lookup table"
              defaultSampleSheetIndex={mode === 'join' ? 1 : 0}
            />
          </div>
        </div>
      )}

      {/* MODE 1: DIFF */}
      {mode === 'diff' && sheetA && sheetB && diffResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useKeyDiff}
                  onChange={(e) => setUseKeyDiff(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Match rows by key column</span>
              </label>

              {useKeyDiff && (
                <>
                  <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span>Key A</span>
                    <select
                      value={Math.min(diffKeyA, sheetA.headers.length - 1)}
                      onChange={(e) => setDiffKeyA(Number(e.target.value))}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-slate-900 dark:text-slate-100"
                    >
                      {sheetA.headers.map((h, i) => (
                        <option key={h + i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span>Key B</span>
                    <select
                      value={Math.min(diffKeyB, sheetB.headers.length - 1)}
                      onChange={(e) => setDiffKeyB(Number(e.target.value))}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-slate-900 dark:text-slate-100"
                    >
                      {sheetB.headers.map((h, i) => (
                        <option key={h + i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyShowChanges}
                  onChange={(e) => setOnlyShowChanges(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Show changes only</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <span className="text-emerald-700 dark:text-emerald-400">+{diffResult.addedCount} added</span>
              <span className="text-rose-600 dark:text-rose-400">-{diffResult.removedCount} removed</span>
              <span className="text-amber-600 dark:text-amber-400">~{diffResult.modifiedCount} modified</span>
              <span className="text-slate-500">{diffResult.identicalCount} identical</span>
              <button
                type="button"
                onClick={handleExportDiffCsv}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 font-sans font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Diff CSV</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                <thead className="bg-slate-50 dark:bg-[#0d1219] sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-display font-semibold text-slate-600 dark:text-slate-300">
                      Status
                    </th>
                    {sheetA.headers.map((h, i) => (
                      <th
                        key={h + i}
                        className="px-3 py-2.5 text-left font-display font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono tabular-nums">
                  {diffResult.diffRows
                    .filter((row) => !onlyShowChanges || row.status !== 'identical')
                    .map((row, idx) => {
                      const rowBg =
                        row.status === 'added'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/25'
                          : row.status === 'removed'
                          ? 'bg-rose-50/70 dark:bg-rose-950/25'
                          : row.status === 'modified'
                          ? 'bg-amber-50/60 dark:bg-amber-950/20'
                          : '';
                      const statusColor =
                        row.status === 'added'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : row.status === 'removed'
                          ? 'text-rose-600 dark:text-rose-400'
                          : row.status === 'modified'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-400';

                      return (
                        <tr key={idx} className={rowBg}>
                          <td className={`px-3 py-2 font-semibold uppercase whitespace-nowrap ${statusColor}`}>
                            {row.status}
                          </td>
                          {row.cells.slice(0, sheetA.headers.length).map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-slate-800 dark:text-slate-200">
                              {row.status === 'modified' && cell.isDifferent ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="line-through text-rose-600 dark:text-rose-400">
                                    {String(cell.valA ?? '')}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {String(cell.valB ?? '')}
                                  </span>
                                </span>
                              ) : row.status === 'removed' ? (
                                <span className="text-rose-700 dark:text-rose-300">{String(cell.valA ?? '—')}</span>
                              ) : (
                                String(cell.valB ?? cell.valA ?? '—')
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
        </div>
      )}

      {/* MODE 2: JOIN */}
      {mode === 'join' && sheetA && sheetB && joinResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <label className="space-y-1 text-slate-600 dark:text-slate-300">
              <span>Join Strategy</span>
              <select
                value={joinType}
                onChange={(e) => setJoinType(e.target.value as 'inner' | 'left' | 'full')}
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
              >
                <option value="left">Left Outer Join (Keep all rows in A)</option>
                <option value="inner">Inner Join (Matching keys only)</option>
                <option value="full">Full Outer Join (All rows from A & B)</option>
              </select>
            </label>
            <label className="space-y-1 text-slate-600 dark:text-slate-300">
              <span>Match Key in Dataset A</span>
              <select
                value={Math.min(joinKeyA, Math.max(0, sheetA.headers.length - 1))}
                onChange={(e) => setJoinKeyA(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
              >
                {sheetA.headers.map((h, i) => (
                  <option key={h + i} value={i}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-slate-600 dark:text-slate-300">
              <span>Match Key in Dataset B</span>
              <select
                value={Math.min(joinKeyB, Math.max(0, sheetB.headers.length - 1))}
                onChange={(e) => setJoinKeyB(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
              >
                {sheetB.headers.map((h, i) => (
                  <option key={h + i} value={i}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <DataPreviewTable
            headers={joinResult.headers}
            rows={joinResult.rows}
            title={`Joined Result (${joinType.toUpperCase()} JOIN)`}
            filename={`joined_${joinType}`}
          />
        </div>
      )}

      {/* MODE 3: MULTI-FILE WORKBOOK MERGER */}
      {mode === 'merge' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  Queued Workbooks to Merge ({mergeList.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stack matching rows into a unified master table or bundle all files into a multi-sheet .xlsx workbook.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={mergeFileRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.tsv,.json"
                  onChange={(e) => handleAddMergeFiles(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mergeFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Add Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMergeList((prev) => [...prev, cloneSampleWorkbook(0)])}
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Sample Sheet</span>
                </button>
                <button
                  type="button"
                  disabled={mergeList.length === 0}
                  onClick={handleExportMultiSheetXlsx}
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-40 px-3.5 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Multi-Sheet XLSX</span>
                </button>
              </div>
            </div>

            {mergeError && (
              <div role="alert" className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300">
                {mergeError}
              </div>
            )}

            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
              {mergeList.map((wb, idx) => {
                const s = wb.sheets[wb.activeSheetIndex] || wb.sheets[0];
                return (
                  <div key={wb.fileName + idx} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-slate-400 tabular-nums">{idx + 1}.</span>
                      <span className="font-medium text-slate-900 dark:text-white truncate">{wb.fileName}</span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                        {s.totalRows} rows · {s.totalCols} cols
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {wb.sheets.length > 1 && (
                        <select
                          aria-label={`Select sheet for ${wb.fileName}`}
                          value={wb.activeSheetIndex}
                          onChange={(e) => {
                            const sheetIdx = Number(e.target.value);
                            setMergeList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, activeSheetIndex: sheetIdx } : item))
                            );
                          }}
                          className="h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-slate-200"
                        >
                          {wb.sheets.map((sh, sIdx) => (
                            <option key={sh.name + sIdx} value={sIdx}>
                              {sh.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => setMergeList((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Remove ${wb.fileName}`}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={mergeIncludeSource}
                onChange={(e) => setMergeIncludeSource(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              <span>Add Source_Sheet column when stacking rows into one master table</span>
            </label>
          </div>

          {mergeList.length > 0 && (
            <DataPreviewTable
              headers={mergedStack.headers}
              rows={mergedStack.rows}
              title="Stacked Master Table Preview"
              filename="stacked_merged_table"
            />
          )}
        </div>
      )}
    </div>
  );
};
