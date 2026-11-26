import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, X, FileSpreadsheet } from 'lucide-react';
import { parseWorkbookFile } from '../../core/files/parseWorkbook';
import { cloneSampleWorkbook } from '../../core/files/sampleData';
import { formatBytes } from '../../core/files/detectFormat';
import { WorkbookData } from '../../registry/types';

interface FileDropzoneProps {
  acceptedFormats?: string[];
  currentWorkbook: WorkbookData | null;
  onWorkbookLoaded: (wb: WorkbookData) => void;
  onClear: () => void;
  title?: string;
  subtitle?: string;
  allowSampleData?: boolean;
  defaultSampleSheetIndex?: number;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  acceptedFormats = ['.xlsx', '.xls', '.xlsm', '.csv', '.tsv', '.json', '.md', '.html', '.yaml', '.xml'],
  currentWorkbook,
  onWorkbookLoaded,
  onClear,
  title = 'Drop a spreadsheet or structured file here',
  subtitle = 'Supports XLSX, XLS, CSV, TSV, JSON, YAML, XML, HTML, and Markdown. Processed locally in browser memory.',
  allowSampleData = true,
  defaultSampleSheetIndex = 0,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const wb = await parseWorkbookFile(file);
      onWorkbookLoaded(wb);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file. Please verify the format.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleLoadSample = () => {
    setErrorMessage(null);
    onWorkbookLoaded(cloneSampleWorkbook(defaultSampleSheetIndex));
  };

  const handleSheetChange = (sheetIndex: number) => {
    if (!currentWorkbook) return;
    onWorkbookLoaded({
      ...currentWorkbook,
      activeSheetIndex: sheetIndex,
    });
  };

  if (currentWorkbook) {
    const activeSheet = currentWorkbook.sheets[currentWorkbook.activeSheetIndex] || currentWorkbook.sheets[0];
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-4 py-3.5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {currentWorkbook.fileName}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span>{formatBytes(currentWorkbook.fileSizeBytes)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {currentWorkbook.sheets.length} sheet{currentWorkbook.sheets.length === 1 ? '' : 's'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {activeSheet.totalRows.toLocaleString()} rows × {activeSheet.totalCols} columns
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {currentWorkbook.sheets.length > 1 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="sr-only">Active worksheet</span>
                <select
                  aria-label="Select active worksheet"
                  value={currentWorkbook.activeSheetIndex}
                  onChange={(e) => handleSheetChange(Number(e.target.value))}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-emerald-600 focus:outline-none"
                >
                  {currentWorkbook.sheets.map((s, idx) => (
                    <option key={s.name + idx} value={idx}>
                      Sheet: {s.name} ({s.totalRows})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Replace file
            </button>
            <button
              type="button"
              onClick={onClear}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              aria-label="Clear loaded file"
              title="Clear loaded file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          accept={acceptedFormats.join(',')}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          accept={acceptedFormats.join(',')}
          className="hidden"
        />

        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Upload className="h-5 w-5" />
        </div>

        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">{subtitle}</p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-4 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
          >
            {isLoading ? 'Reading file...' : 'Choose local file'}
          </button>

          {allowSampleData && (
            <button
              type="button"
              onClick={handleLoadSample}
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Load sample workbook
            </button>
          )}
        </div>

        <p className="mt-4 text-xs font-mono text-slate-400 dark:text-slate-500">
          {acceptedFormats.join(' · ')}
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
