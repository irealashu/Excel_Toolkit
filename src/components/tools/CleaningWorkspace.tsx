import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Download, CheckCircle2 } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { DataPreviewTable } from './DataPreviewTable';
import { WorkbookData } from '../../registry/types';
import { cloneSampleWorkbook } from '../../core/files/sampleData';
import { downloadJson } from '../../core/files/downloadBlob';
import {
  combineColumns,
  FilterOperator,
  filterRows,
  findAndReplace,
  profileData,
  removeBlankColumns,
  removeBlankRows,
  removeDuplicates,
  sortRows,
  splitColumn,
  transposeTable,
  trimWhitespace,
  unpivotTable,
} from '../../core/transforms';

type CleanTab = 'dedupe' | 'whitespace' | 'split' | 'sort' | 'replace' | 'transpose' | 'profile';

function mapToolToTab(toolId?: string): CleanTab {
  switch (toolId) {
    case 'remove-duplicates':
      return 'dedupe';
    case 'whitespace-trimmer':
    case 'blank-rows-columns':
      return 'whitespace';
    case 'split-combine-columns':
      return 'split';
    case 'sort-filter-transform':
      return 'sort';
    case 'find-and-replace':
      return 'replace';
    case 'transpose-unpivot':
      return 'transpose';
    case 'data-profiler':
      return 'profile';
    default:
      return 'dedupe';
  }
}

const TABS: { id: CleanTab; label: string }[] = [
  { id: 'dedupe', label: 'Duplicates' },
  { id: 'whitespace', label: 'Whitespace & Blanks' },
  { id: 'split', label: 'Split & Combine' },
  { id: 'sort', label: 'Sort & Filter' },
  { id: 'replace', label: 'Find & Replace' },
  { id: 'transpose', label: 'Transpose & Unpivot' },
  { id: 'profile', label: 'Data Profiler' },
];

interface CleaningWorkspaceProps {
  initialToolId?: string;
}

export const CleaningWorkspace: React.FC<CleaningWorkspaceProps> = ({ initialToolId }) => {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(() => cloneSampleWorkbook(0));
  const [activeTab, setActiveTab] = useState<CleanTab>(() => mapToolToTab(initialToolId));

  // Working copy of active sheet so destructive operations (whitespace/blanks/split/replace) can be chained or reset
  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;
  const [workingHeaders, setWorkingHeaders] = useState<string[]>(() => activeSheet?.headers || []);
  const [workingRows, setWorkingRows] = useState<(string | number | boolean | null)[][]>(() => activeSheet?.rows || []);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Sync working table whenever workbook or active sheet index changes
  useEffect(() => {
    if (activeSheet) {
      setWorkingHeaders([...activeSheet.headers]);
      setWorkingRows(activeSheet.rows.map((r) => [...r]));
      setStatusNotice(null);
      setDedupeKeyCols([]);
      setCombineCols([0, 1].filter((i) => i < activeSheet.headers.length));
      setUnpivotIdCols(activeSheet.headers.length > 0 ? [0] : []);
    } else {
      setWorkingHeaders([]);
      setWorkingRows([]);
    }
  }, [workbook, workbook?.activeSheetIndex]);

  useEffect(() => {
    setActiveTab(mapToolToTab(initialToolId));
  }, [initialToolId]);

  // Dedupe state
  const [dedupeKeyCols, setDedupeKeyCols] = useState<number[]>([]);
  const [dedupeCaseSensitive, setDedupeCaseSensitive] = useState(false);
  const [dedupeKeep, setDedupeKeep] = useState<'first' | 'last'>('first');
  const [dedupeTrim, setDedupeTrim] = useState(true);
  const [showRemovedRows, setShowRemovedRows] = useState(false);

  // Whitespace / blanks state
  const [collapseInnerSpaces, setCollapseInnerSpaces] = useState(true);
  const [blankThreshold, setBlankThreshold] = useState<number>(1.0);

  // Split / Combine state
  const [splitCombineMode, setSplitCombineMode] = useState<'split' | 'combine'>('split');
  const [splitColIdx, setSplitColIdx] = useState(1);
  const [splitDelimiter, setSplitDelimiter] = useState(' ');
  const [splitNewNames, setSplitNewNames] = useState('Part_1, Part_2');
  const [combineCols, setCombineCols] = useState<number[]>([0, 1]);
  const [combineSeparator, setCombineSeparator] = useState(' - ');
  const [combineNewName, setCombineNewName] = useState('Combined_Field');
  const [combineRemoveOriginals, setCombineRemoveOriginals] = useState(false);

  // Sort & Filter state
  const [sortColIdx, setSortColIdx] = useState(0);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterColIdx, setFilterColIdx] = useState(2);
  const [filterOp, setFilterOp] = useState<FilterOperator>('contains');
  const [filterValue, setFilterValue] = useState('');

  // Find & Replace state
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [replaceColIdx, setReplaceColIdx] = useState<number>(-1);
  const [replaceMatchCase, setReplaceMatchCase] = useState(false);
  const [replaceExact, setReplaceExact] = useState(false);
  const [replaceRegex, setReplaceRegex] = useState(false);

  // Transpose & Unpivot state
  const [matrixMode, setMatrixMode] = useState<'transpose' | 'unpivot'>('transpose');
  const [unpivotIdCols, setUnpivotIdCols] = useState<number[]>([0]);
  const [unpivotVarName, setUnpivotVarName] = useState('Metric');
  const [unpivotValName, setUnpivotValName] = useState('Value');

  const notify = (msg: string) => {
    setStatusNotice(msg);
  };

  const resetToOriginal = () => {
    if (!activeSheet) return;
    setWorkingHeaders([...activeSheet.headers]);
    setWorkingRows(activeSheet.rows.map((r) => [...r]));
    notify('Restored original sheet data.');
  };

  // Live computed results for declarative tabs
  const dedupeResult = useMemo(() => {
    if (workingHeaders.length === 0) return null;
    return removeDuplicates(workingHeaders, workingRows, {
      keyColumns: dedupeKeyCols,
      caseSensitive: dedupeCaseSensitive,
      keep: dedupeKeep,
      trimBeforeCompare: dedupeTrim,
    });
  }, [workingHeaders, workingRows, dedupeKeyCols, dedupeCaseSensitive, dedupeKeep, dedupeTrim]);

  const sortFilterRows = useMemo(() => {
    let rows = workingRows;
    if (filterValue.trim() !== '' || filterOp === 'is_blank' || filterOp === 'is_not_blank') {
      rows = filterRows(rows, [{ colIndex: filterColIdx, operator: filterOp, value: filterValue }]);
    }
    return sortRows(rows, sortColIdx, sortDir);
  }, [workingRows, sortColIdx, sortDir, filterColIdx, filterOp, filterValue]);

  const matrixResult = useMemo(() => {
    if (workingHeaders.length === 0) return { headers: [], rows: [] };
    if (matrixMode === 'transpose') {
      return transposeTable(workingHeaders, workingRows);
    }
    return unpivotTable(workingHeaders, workingRows, unpivotIdCols, unpivotVarName || 'Metric', unpivotValName || 'Value');
  }, [workingHeaders, workingRows, matrixMode, unpivotIdCols, unpivotVarName, unpivotValName]);

  const columnProfiles = useMemo(() => {
    if (workingHeaders.length === 0) return [];
    return profileData(workingHeaders, workingRows);
  }, [workingHeaders, workingRows]);

  const toggleIndex = (list: number[], idx: number, setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    setter(list.includes(idx) ? list.filter((i) => i !== idx) : [...list, idx].sort((a, b) => a - b));
  };

  // Actions
  const applyTrim = () => {
    const cleaned = trimWhitespace(workingRows, collapseInnerSpaces);
    setWorkingRows(cleaned);
    notify(`Trimmed whitespace across ${cleaned.length} rows.`);
  };

  const applyRemoveBlankRows = () => {
    const before = workingRows.length;
    const cleaned = removeBlankRows(workingRows, blankThreshold);
    setWorkingRows(cleaned);
    notify(`Removed ${before - cleaned.length} blank row(s).`);
  };

  const applyRemoveBlankCols = () => {
    const before = workingHeaders.length;
    const res = removeBlankColumns(workingHeaders, workingRows);
    setWorkingHeaders(res.headers);
    setWorkingRows(res.rows);
    notify(`Removed ${before - res.headers.length} empty column(s).`);
  };

  const applySplit = () => {
    const names = splitNewNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length < 2) {
      notify('Enter at least two comma-separated column names.');
      return;
    }
    const safeIdx = Math.min(splitColIdx, Math.max(0, workingHeaders.length - 1));
    const res = splitColumn(workingHeaders, workingRows, safeIdx, splitDelimiter, names);
    setWorkingHeaders(res.headers);
    setWorkingRows(res.rows);
    notify(`Split "${workingHeaders[safeIdx]}" into ${names.length} columns.`);
  };

  const applyCombine = () => {
    if (combineCols.length < 2) {
      notify('Select at least two columns to combine.');
      return;
    }
    const res = combineColumns(
      workingHeaders,
      workingRows,
      combineCols,
      combineSeparator,
      combineNewName.trim() || 'Combined',
      combineRemoveOriginals
    );
    setWorkingHeaders(res.headers);
    setWorkingRows(res.rows);
    notify(`Combined ${combineCols.length} columns into "${combineNewName.trim() || 'Combined'}".`);
  };

  const applyFindReplace = () => {
    if (!findText) {
      notify('Enter a search pattern first.');
      return;
    }
    const res = findAndReplace(workingRows, findText, replaceText, {
      targetColIndex: replaceColIdx === -1 ? undefined : replaceColIdx,
      matchCase: replaceMatchCase,
      exactMatch: replaceExact,
      useRegex: replaceRegex,
    });
    setWorkingRows(res.rows);
    notify(`Replaced ${res.replacementCount} match(es) across table.`);
  };

  const applyDedupeToWorking = () => {
    if (!dedupeResult) return;
    setWorkingRows(dedupeResult.cleanedRows);
    notify(`Applied deduplication: removed ${dedupeResult.removedCount} duplicate row(s).`);
  };

  return (
    <div className="space-y-6">
      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={(wb) => setWorkbook(wb)}
        onClear={() => setWorkbook(null)}
        title="Drop a workbook or CSV to clean and profile"
        subtitle="Non-destructive client transforms with instant export to XLSX, CSV, or JSON."
      />

      {activeSheet && (
        <>
          {/* Operation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === t.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={resetToOriginal}
              className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Table</span>
            </button>
          </div>

          {statusNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* TAB 1: DEDUPE */}
          {activeTab === 'dedupe' && dedupeResult && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      Duplicate Detection Rules
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      Found <strong className="text-slate-900 dark:text-white">{dedupeResult.removedCount}</strong> duplicate
                      row(s) out of {dedupeResult.originalCount} total rows.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRemovedRows((v) => !v)}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                    >
                      {showRemovedRows
                        ? 'View Cleaned Rows'
                        : `Inspect Removed (${dedupeResult.removedCount})`}
                    </button>
                    <button
                      type="button"
                      disabled={dedupeResult.removedCount === 0}
                      onClick={applyDedupeToWorking}
                      className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-40 px-3.5 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
                    >
                      Commit Clean Table
                    </button>
                  </div>
                </div>

                {/* Key Columns Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Key Columns ({dedupeKeyCols.length === 0 ? 'All columns' : `${dedupeKeyCols.length} selected`})
                    </span>
                    {dedupeKeyCols.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDedupeKeyCols([])}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Reset to all columns
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workingHeaders.map((h, idx) => {
                      const active = dedupeKeyCols.includes(idx);
                      return (
                        <label
                          key={h + idx}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                            active
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleIndex(dedupeKeyCols, idx, setDedupeKeyCols)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{h}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2">
                    <span>Keep occurrence</span>
                    <select
                      value={dedupeKeep}
                      onChange={(e) => setDedupeKeep(e.target.value as 'first' | 'last')}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-slate-800 dark:text-slate-200"
                    >
                      <option value="first">Keep first</option>
                      <option value="last">Keep last</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dedupeCaseSensitive}
                      onChange={(e) => setDedupeCaseSensitive(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Case sensitive</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dedupeTrim}
                      onChange={(e) => setDedupeTrim(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Trim whitespace before comparing</span>
                  </label>
                </div>
              </div>

              <DataPreviewTable
                headers={workingHeaders}
                rows={showRemovedRows ? dedupeResult.duplicateRows : dedupeResult.cleanedRows}
                title={showRemovedRows ? 'Removed Duplicate Rows' : 'Deduplicated Preview'}
                filename={showRemovedRows ? 'removed_duplicates' : 'deduplicated_data'}
              />
            </div>
          )}

          {/* TAB 2: WHITESPACE & BLANKS */}
          {activeTab === 'whitespace' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Trim Whitespace
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Remove leading/trailing spaces and optionally collapse repeated inner spaces.
                  </p>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={collapseInnerSpaces}
                      onChange={(e) => setCollapseInnerSpaces(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Collapse multiple inner spaces</span>
                  </label>
                  <button
                    type="button"
                    onClick={applyTrim}
                    className="h-8 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                  >
                    Run Trim Across Sheet
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Purge Blank Rows
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Delete completely empty rows or rows exceeding a missing-value threshold.
                  </p>
                  <select
                    value={blankThreshold}
                    onChange={(e) => setBlankThreshold(Number(e.target.value))}
                    className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value={1.0}>100% blank rows only</option>
                    <option value={0.75}>75%+ cells blank</option>
                    <option value={0.5}>50%+ cells blank</option>
                  </select>
                  <button
                    type="button"
                    onClick={applyRemoveBlankRows}
                    className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    Remove Blank Rows
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Purge Empty Columns
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Drop any columns whose rows contain only null, empty, or whitespace values.
                  </p>
                  <div className="h-8 flex items-center text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Current columns: {workingHeaders.length}
                  </div>
                  <button
                    type="button"
                    onClick={applyRemoveBlankCols}
                    className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    Remove Empty Columns
                  </button>
                </div>
              </div>

              <DataPreviewTable headers={workingHeaders} rows={workingRows} title="Working Table" filename="cleaned_table" />
            </div>
          )}

          {/* TAB 3: SPLIT & COMBINE */}
          {activeTab === 'split' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1">
                  <button
                    type="button"
                    onClick={() => setSplitCombineMode('split')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      splitCombineMode === 'split'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Split One Column
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitCombineMode('combine')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      splitCombineMode === 'combine'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Combine Multiple Columns
                  </button>
                </div>

                {splitCombineMode === 'split' ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <span>Target Column</span>
                      <select
                        value={Math.min(splitColIdx, Math.max(0, workingHeaders.length - 1))}
                        onChange={(e) => setSplitColIdx(Number(e.target.value))}
                        className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                      >
                        {workingHeaders.map((h, i) => (
                          <option key={h + i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <span>Delimiter</span>
                      <input
                        type="text"
                        value={splitDelimiter}
                        onChange={(e) => setSplitDelimiter(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <span>New Column Names (comma-separated)</span>
                      <input
                        type="text"
                        value={splitNewNames}
                        onChange={(e) => setSplitNewNames(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={applySplit}
                      className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-4 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                    >
                      Split Column
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {workingHeaders.map((h, i) => {
                        const active = combineCols.includes(i);
                        return (
                          <label
                            key={h + i}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer ${
                              active
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleIndex(combineCols, i, setCombineCols)}
                              className="rounded border-slate-300 text-emerald-600"
                            />
                            <span>{h}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>Separator</span>
                        <input
                          type="text"
                          value={combineSeparator}
                          onChange={(e) => setCombineSeparator(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>Merged Column Name</span>
                        <input
                          type="text"
                          value={combineNewName}
                          onChange={(e) => setCombineNewName(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="flex items-center gap-2 h-9 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={combineRemoveOriginals}
                          onChange={(e) => setCombineRemoveOriginals(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600"
                        />
                        <span>Remove original columns</span>
                      </label>
                      <button
                        type="button"
                        onClick={applyCombine}
                        className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-4 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                      >
                        Combine Columns
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <DataPreviewTable headers={workingHeaders} rows={workingRows} title="Working Table" filename="reshaped_columns" />
            </div>
          )}

          {/* TAB 4: SORT & FILTER */}
          {activeTab === 'sort' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span>Sort Column</span>
                  <select
                    value={Math.min(sortColIdx, Math.max(0, workingHeaders.length - 1))}
                    onChange={(e) => setSortColIdx(Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                  >
                    {workingHeaders.map((h, i) => (
                      <option key={h + i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span>Order</span>
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                  >
                    <option value="asc">Ascending (A→Z / 0→9)</option>
                    <option value="desc">Descending (Z→A / 9→0)</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span>Filter Column</span>
                  <select
                    value={Math.min(filterColIdx, Math.max(0, workingHeaders.length - 1))}
                    onChange={(e) => setFilterColIdx(Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                  >
                    {workingHeaders.map((h, i) => (
                      <option key={h + i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span>Condition</span>
                  <select
                    value={filterOp}
                    onChange={(e) => setFilterOp(e.target.value as FilterOperator)}
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                  >
                    <option value="contains">Contains</option>
                    <option value="not_contains">Does not contain</option>
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not equals</option>
                    <option value="greater_than">Greater than (&gt;)</option>
                    <option value="less_than">Less than (&lt;)</option>
                    <option value="starts_with">Starts with</option>
                    <option value="ends_with">Ends with</option>
                    <option value="regex">Regex match</option>
                    <option value="is_blank">Is blank</option>
                    <option value="is_not_blank">Is not blank</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span>Filter Value</span>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Optional filter..."
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>

              <DataPreviewTable headers={workingHeaders} rows={sortFilterRows} title="Sorted & Filtered View" filename="sorted_filtered" />
            </div>
          )}

          {/* TAB 5: FIND & REPLACE */}
          {activeTab === 'replace' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span>Find</span>
                    <input
                      type="text"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder="Text or regex pattern"
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span>Replace With</span>
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder="Replacement text"
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span>Target Scope</span>
                    <select
                      value={replaceColIdx}
                      onChange={(e) => setReplaceColIdx(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                    >
                      <option value={-1}>All columns</option>
                      {workingHeaders.map((h, i) => (
                        <option key={h + i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={applyFindReplace}
                    className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-4 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                  >
                    Replace All
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceMatchCase}
                      onChange={(e) => setReplaceMatchCase(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Match case</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceExact}
                      onChange={(e) => setReplaceExact(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Exact cell match</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceRegex}
                      onChange={(e) => setReplaceRegex(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Regular expression</span>
                  </label>
                </div>
              </div>

              <DataPreviewTable headers={workingHeaders} rows={workingRows} title="Working Table" filename="replaced_data" />
            </div>
          )}

          {/* TAB 6: TRANSPOSE & UNPIVOT */}
          {activeTab === 'transpose' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1">
                  <button
                    type="button"
                    onClick={() => setMatrixMode('transpose')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      matrixMode === 'transpose'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Transpose Matrix (90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixMode('unpivot')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      matrixMode === 'unpivot'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Unpivot Wide → Long
                  </button>
                </div>

                {matrixMode === 'unpivot' && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Select Identifier Columns to Preserve (remaining columns become rows):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workingHeaders.map((h, i) => {
                        const active = unpivotIdCols.includes(i);
                        return (
                          <label
                            key={h + i}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer ${
                              active
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleIndex(unpivotIdCols, i, setUnpivotIdCols)}
                              className="rounded border-slate-300 text-emerald-600"
                            />
                            <span>{h}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                      <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>Attribute Column Name</span>
                        <input
                          type="text"
                          value={unpivotVarName}
                          onChange={(e) => setUnpivotVarName(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>Value Column Name</span>
                        <input
                          type="text"
                          value={unpivotValName}
                          onChange={(e) => setUnpivotValName(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <DataPreviewTable
                headers={matrixResult.headers}
                rows={matrixResult.rows}
                title={matrixMode === 'transpose' ? 'Transposed Matrix' : 'Unpivoted Long Table'}
                filename={matrixMode === 'transpose' ? 'transposed_matrix' : 'unpivoted_table'}
              />
            </div>
          )}

          {/* TAB 7: DATA PROFILER */}
          {activeTab === 'profile' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-4 py-3">
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Column Health & Statistical Profile
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {columnProfiles.length} columns · {workingRows.length.toLocaleString()} rows scanned
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadJson(columnProfiles, 'column_profile_report.json')}
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Report JSON</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  <thead className="bg-slate-50 dark:bg-[#0d1219] text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-display font-semibold">Column</th>
                      <th className="px-4 py-2.5 text-left font-display font-semibold">Inferred Type</th>
                      <th className="px-4 py-2.5 text-right font-display font-semibold">Unique</th>
                      <th className="px-4 py-2.5 text-right font-display font-semibold">Missing</th>
                      <th className="px-4 py-2.5 text-left font-display font-semibold">Summary Stats / Samples</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 tabular-nums">
                    {columnProfiles.map((col) => (
                      <tr key={col.name + col.index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {col.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 uppercase">
                          {col.inferredType}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">
                          {col.uniqueCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span
                            className={
                              col.nullCount > 0
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }
                          >
                            {col.nullCount} ({col.nullPercentage}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {col.numericStats ? (
                            <span>
                              min {col.numericStats.min.toLocaleString()} · avg {col.numericStats.avg.toLocaleString()} · max{' '}
                              {col.numericStats.max.toLocaleString()} · sum {col.numericStats.sum.toLocaleString()}
                            </span>
                          ) : (
                            <span className="truncate block max-w-md">
                              {col.sampleValues.map((v) => String(v)).join(' · ') || '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
