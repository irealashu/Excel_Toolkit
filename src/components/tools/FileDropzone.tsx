import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, X, FileSpreadsheet } from 'lucide-react';
import { parseWorkbookFile } from '../../core/files/parseWorkbook';
import { SAMPLE_WORKBOOK } from '../../core/files/sampleData';
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
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  acceptedFormats = ['.xlsx', '.xls', '.csv', '.tsv', '.json'],
  currentWorkbook,
  onWorkbookLoaded,
  onClear,
  title = 'Drop your spreadsheet or file here',
  subtitle = 'Supports XLSX, XLS, CSV, TSV, JSON up to 100MB. Processed entirely locally.',
  allowSampleData = true,
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read spreadsheet file. Please check file format.');
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleLoadSample = () => {
    setErrorMessage(null);
    onWorkbookLoaded(SAMPLE_WORKBOOK);
  };

  if (currentWorkbook) {
    const activeSheet = currentWorkbook.sheets[currentWorkbook.activeSheetIndex] || currentWorkbook.sheets[0];
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                  {currentWorkbook.fileName}
                </h4>
                <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
                  {currentWorkbook.fileName.split('.').pop()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                <span>{formatBytes(currentWorkbook.fileSizeBytes)}</span>
                <span>•</span>
                <span>{currentWorkbook.sheets.length} Sheet{currentWorkbook.sheets.length > 1 ? 's' : ''}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">
                  {activeSheet.totalRows.toLocaleString()} Rows × {activeSheet.totalCols} Columns
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Change File
            </button>
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Remove file"
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-950/30 scale-[0.99]'
            : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          accept={acceptedFormats.join(',')}
          className="hidden"
        />

        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
          <UploadCloud className="h-6 w-6" />
        </div>

        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md mb-4">{subtitle}</p>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
          >
            {isLoading ? 'Reading file...' : 'Choose File'}
          </button>

          {allowSampleData && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSample();
              }}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Load Sample Data</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {acceptedFormats.map((fmt) => (
            <span
              key={fmt}
              className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center space-x-2 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
