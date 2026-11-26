import React, { useState } from 'react';
import { FileDropzone } from './FileDropzone';
import { DataPreviewTable } from './DataPreviewTable';
import { cloneSampleWorkbook } from '../../core/files/sampleData';
import { WorkbookData } from '../../registry/types';
import { Layers, FileSpreadsheet, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const ViewerWorkspace: React.FC = () => {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(() => cloneSampleWorkbook(0));

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;

  return (
    <div className="space-y-6">
      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={setWorkbook}
        onClear={() => setWorkbook(null)}
        title="Open a spreadsheet or tabular file to inspect"
        subtitle="Preview XLSX, XLS, XLSM, CSV, TSV, JSON, YAML, XML, or Markdown tables with multi-sheet navigation and instant export."
      />

      {workbook && activeSheet && (
        <div className="space-y-5">
          {/* Workbook Metadata Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Sheet</div>
              <div className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white truncate">
                {activeSheet.name}
              </div>
            </div>
            <div className="bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Dimensions</div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                {activeSheet.totalRows.toLocaleString()} × {activeSheet.totalCols}
              </div>
            </div>
            <div className="bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Author / Source</div>
              <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white truncate">
                {workbook.metadata?.author || workbook.metadata?.application || 'Local file'}
              </div>
            </div>
            <div className="bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Macro Status</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                {workbook.metadata?.hasMacros ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-amber-700 dark:text-amber-400">Macros detected (blocked)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-700 dark:text-emerald-400">Clean workbook</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Multi-sheet tabs bar */}
          {workbook.sheets.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2" role="tablist" aria-label="Workbook sheets">
              <Layers className="h-4 w-4 text-slate-400 mr-1 shrink-0" />
              {workbook.sheets.map((sheet, idx) => {
                const isActive = idx === workbook.activeSheetIndex;
                return (
                  <button
                    key={sheet.name + idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setWorkbook({ ...workbook, activeSheetIndex: idx })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sheet.name} ({sheet.totalRows})
                  </button>
                );
              })}
            </div>
          )}

          {/* Data Grid Preview */}
          <DataPreviewTable
            headers={activeSheet.headers}
            rows={activeSheet.rows}
            title={`${workbook.fileName} — ${activeSheet.name}`}
            filename={`${workbook.fileName.replace(/\.[^/.]+$/, '')}_${activeSheet.name}`}
          />
        </div>
      )}

      {!workbook && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8 text-center space-y-2">
          <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No workbook loaded</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select any local spreadsheet above or load the sample workbook to inspect worksheets, dimensions, and rows.
          </p>
        </div>
      )}
    </div>
  );
};
