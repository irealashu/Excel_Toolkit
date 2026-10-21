import React, { useState } from 'react';
import {
  Sparkles,
  Scissors,
  CheckCircle2,
  Trash2,
  Filter,
  ArrowUpDown,
  RotateCw,
  Search,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { DataPreviewTable } from './DataPreviewTable';
import {
  removeDuplicates,
  removeBlankRows,
  removeBlankColumns,
  trimWhitespace,
  splitColumn,
  combineColumns,
  sortRows,
  filterRows,
  transposeTable,
  findAndReplace,
  profileData,
  FilterCondition
} from '../../core/transforms';
import { SAMPLE_WORKBOOK } from '../../core/files/sampleData';
import { WorkbookData } from '../../registry/types';

interface CleaningWorkspaceProps {
  initialToolId?: string;
}

export const CleaningWorkspace: React.FC<CleaningWorkspaceProps> = ({ initialToolId }) => {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(SAMPLE_WORKBOOK);
  const [activeTab, setActiveTab] = useState<'dedupe' | 'trim' | 'blanks' | 'columns' | 'sort' | 'transpose' | 'find_replace' | 'profile'>(() => {
    if (initialToolId === 'whitespace-trimmer') return 'trim';
    if (initialToolId === 'blank-rows-columns') return 'blanks';
    if (initialToolId === 'split-combine-columns') return 'columns';
    if (initialToolId === 'sort-filter-transform') return 'sort';
    if (initialToolId === 'transpose-unpivot') return 'transpose';
    if (initialToolId === 'find-and-replace') return 'find_replace';
    if (initialToolId === 'data-profiler') return 'profile';
    return 'dedupe';
  });

  // Dedupe Options
  const [selectedKeyCols, setSelectedKeyCols] = useState<number[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [keepStrategy, setKeepStrategy] = useState<'first' | 'last'>('first');

  // Trim Options
  const [collapseInner, setCollapseInner] = useState(true);

  // Column Split/Combine
  const [splitColIndex, setSplitColIndex] = useState(0);
  const [splitDelimiter, setSplitDelimiter] = useState(' ');
  const [splitCol1, setSplitCol1] = useState('Part_1');
  const [splitCol2, setSplitCol2] = useState('Part_2');

  // Sort & Filter
  const [sortColIndex, setSortColIndex] = useState(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  // Find & Replace
  const [findVal, setFindVal] = useState('');
  const [replaceVal, setReplaceVal] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;
  const originalHeaders = activeSheet ? activeSheet.headers : [];
  const originalRows = activeSheet ? activeSheet.rows : [];

  // Computed results based on current tab
  const cleanedResult = React.useMemo(() => {
    if (!activeSheet) return { headers: [], rows: [], stats: '' };

    if (activeTab === 'dedupe') {
      const res = removeDuplicates(originalHeaders, originalRows, {
        keyColumns: selectedKeyCols,
        caseSensitive,
        keep: keepStrategy,
        trimBeforeCompare: true,
      });
      return {
        headers: originalHeaders,
        rows: res.cleanedRows,
        stats: `Removed ${res.removedCount} duplicate row(s). Kept ${res.cleanedRows.length} unique records.`,
      };
    }

    if (activeTab === 'trim') {
      const trimmed = trimWhitespace(originalRows, collapseInner);
      return {
        headers: originalHeaders,
        rows: trimmed,
        stats: 'Trimmed leading/trailing whitespaces and collapsed spaces across all cells.',
      };
    }

    if (activeTab === 'blanks') {
      const noBlankRows = removeBlankRows(originalRows, 0.9);
      const noBlankCols = removeBlankColumns(originalHeaders, noBlankRows);
      return {
        headers: noBlankCols.headers,
        rows: noBlankCols.rows,
        stats: `Cleaned empty data: ${noBlankCols.rows.length} rows and ${noBlankCols.headers.length} columns remaining.`,
      };
    }

    if (activeTab === 'columns') {
      const splitRes = splitColumn(originalHeaders, originalRows, splitColIndex, splitDelimiter, [splitCol1, splitCol2]);
      return {
        headers: splitRes.headers,
        rows: splitRes.rows,
        stats: `Split column "${originalHeaders[splitColIndex]}" by delimiter "${splitDelimiter}".`,
      };
    }

    if (activeTab === 'sort') {
      let resultRows = sortRows(originalRows, sortColIndex, sortDirection, 'auto');
      if (filterText.trim()) {
        const cond: FilterCondition = { colIndex: sortColIndex, operator: 'contains', value: filterText };
        resultRows = filterRows(resultRows, [cond]);
      }
      return {
        headers: originalHeaders,
        rows: resultRows,
        stats: `Sorted by ${originalHeaders[sortColIndex]} (${sortDirection.toUpperCase()}). ${resultRows.length} rows matched.`,
      };
    }

    if (activeTab === 'transpose') {
      const transposed = transposeTable(originalHeaders, originalRows);
      return {
        headers: transposed.headers,
        rows: transposed.rows,
        stats: `Transposed table: ${transposed.rows.length} rows × ${transposed.headers.length} columns.`,
      };
    }

    if (activeTab === 'find_replace') {
      if (!findVal) return { headers: originalHeaders, rows: originalRows, stats: 'Enter text to find and replace.' };
      const res = findAndReplace(originalRows, findVal, replaceVal, {
        matchCase,
        exactMatch: false,
        useRegex: false,
      });
      return {
        headers: originalHeaders,
        rows: res.rows,
        stats: `Replaced ${res.replacementCount} occurrence(s) of "${findVal}".`,
      };
    }

    return { headers: originalHeaders, rows: originalRows, stats: '' };
  }, [
    activeSheet,
    activeTab,
    originalHeaders,
    originalRows,
    selectedKeyCols,
    caseSensitive,
    keepStrategy,
    collapseInner,
    splitColIndex,
    splitDelimiter,
    splitCol1,
    splitCol2,
    sortColIndex,
    sortDirection,
    filterText,
    findVal,
    replaceVal,
    matchCase,
  ]);

  // Profiles
  const profiles = React.useMemo(() => {
    if (activeTab !== 'profile' || !activeSheet) return [];
    return profileData(originalHeaders, originalRows);
  }, [activeTab, activeSheet, originalHeaders, originalRows]);

  return (
    <div className="space-y-6">
      {/* 1. File Selector */}
      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={setWorkbook}
        onClear={() => setWorkbook(null)}
        title="Upload spreadsheet to clean & transform"
        subtitle="Deduplicate, clean whitespaces, split columns, sort, filter, transpose, or profile column quality."
      />

      {/* 2. Cleaning Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'dedupe', label: 'Deduplicate Rows', icon: Scissors },
          { id: 'trim', label: 'Trim Whitespace', icon: Sparkles },
          { id: 'blanks', label: 'Remove Blanks', icon: Trash2 },
          { id: 'columns', label: 'Split / Combine', icon: Layers },
          { id: 'sort', label: 'Sort & Filter', icon: ArrowUpDown },
          { id: 'transpose', label: 'Transpose Matrix', icon: RotateCw },
          { id: 'find_replace', label: 'Find & Replace', icon: Search },
          { id: 'profile', label: 'Data Profiler', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                  : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Options Panel */}
      {workbook && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          {activeTab === 'dedupe' && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Deduplication Strategy
              </h4>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <span>Case Sensitive</span>
                </label>

                <div className="flex items-center space-x-2">
                  <span>Keep:</span>
                  <select
                    value={keepStrategy}
                    onChange={(e) => setKeepStrategy(e.target.value as any)}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                  >
                    <option value="first">First Occurrence</option>
                    <option value="last">Last Occurrence</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trim' && (
            <div className="flex items-center space-x-4 text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collapseInner}
                  onChange={(e) => setCollapseInner(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                />
                <span>Collapse multiple internal spaces into single space</span>
              </label>
            </div>
          )}

          {activeTab === 'columns' && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <span>Column to Split:</span>
                <select
                  value={splitColIndex}
                  onChange={(e) => setSplitColIndex(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  {originalHeaders.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span>Delimiter:</span>
                <input
                  type="text"
                  value={splitDelimiter}
                  onChange={(e) => setSplitDelimiter(e.target.value)}
                  className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 text-center font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span>New Headers:</span>
                <input
                  type="text"
                  value={splitCol1}
                  onChange={(e) => setSplitCol1(e.target.value)}
                  className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                  placeholder="Part 1"
                />
                <span>&</span>
                <input
                  type="text"
                  value={splitCol2}
                  onChange={(e) => setSplitCol2(e.target.value)}
                  className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                  placeholder="Part 2"
                />
              </div>
            </div>
          )}

          {activeTab === 'sort' && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <span>Sort by:</span>
                <select
                  value={sortColIndex}
                  onChange={(e) => setSortColIndex(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  {originalHeaders.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span>Direction:</span>
                <select
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value as any)}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  <option value="asc">Ascending (A-Z, 0-9)</option>
                  <option value="desc">Descending (Z-A, 9-0)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span>Filter Contains:</span>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="e.g. North America"
                  className="w-40 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                />
              </div>
            </div>
          )}

          {activeTab === 'find_replace' && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <input
                type="text"
                placeholder="Find value..."
                value={findVal}
                onChange={(e) => setFindVal(e.target.value)}
                className="w-40 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
              />
              <span>Replace with:</span>
              <input
                type="text"
                placeholder="Replacement..."
                value={replaceVal}
                onChange={(e) => setReplaceVal(e.target.value)}
                className="w-40 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
              />
              <label className="flex items-center space-x-2 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                />
                <span>Match Case</span>
              </label>
            </div>
          )}

          {cleanedResult.stats && activeTab !== 'profile' && (
            <div className="mt-3 flex items-center space-x-2 text-xs text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{cleanedResult.stats}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Display Profiler or Table */}
      {workbook && (
        <div>
          {activeTab === 'profile' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {profiles.map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate">{p.name}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 uppercase">
                        {p.inferredType}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-400">
                      <div className="flex justify-between">
                        <span>Distinct Values:</span>
                        <span className="font-mono text-slate-200">{p.uniqueCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Missing / Nulls:</span>
                        <span className={`font-mono ${p.nullCount > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                          {p.nullCount} ({p.nullPercentage}%)
                        </span>
                      </div>
                      {p.numericStats && (
                        <>
                          <div className="flex justify-between">
                            <span>Min / Max:</span>
                            <span className="font-mono text-slate-200">
                              {p.numericStats.min} / {p.numericStats.max}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Average:</span>
                            <span className="font-mono text-emerald-400">{p.numericStats.avg}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <DataPreviewTable
                headers={originalHeaders}
                rows={originalRows}
                title="Profiled Dataset"
                filename={workbook.fileName.replace(/\.[^/.]+$/, '')}
              />
            </div>
          ) : (
            <DataPreviewTable
              headers={cleanedResult.headers}
              rows={cleanedResult.rows}
              title={`Cleaned Dataset (${activeTab.toUpperCase()})`}
              filename={`${workbook.fileName.replace(/\.[^/.]+$/, '')}_cleaned`}
            />
          )}
        </div>
      )}
    </div>
  );
};
