import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  ScanText,
  Download,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCw,
  X,
  CheckCircle2,
  Layers,
  Pencil,
  Copy,
  Check,
} from 'lucide-react';
import { formatBytes } from '../../core/files/detectFormat';
import { downloadCsv, downloadJson, downloadText, downloadXlsx } from '../../core/files/downloadBlob';
import { PreprocessMode } from '../../core/pdfOcr/imagePreprocess';
import { CellPrimitive, ColumnSensitivity, mergeExtractedPages, parseCellValue } from '../../core/pdfOcr/tableExtractor';
import {
  OCR_LANGUAGES,
  OcrLanguage,
  OcrLayoutMode,
  OcrQualityModel,
  PdfExtractionMode,
  PdfOcrDocumentResult,
  PdfOcrOptions,
  PdfOcrProgress,
  processPdfOrImageToExcel,
} from '../../core/pdfOcr/pdfOcrEngine';

export const PdfOcrWorkspace: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // High-precision OCR configuration defaults
  const [mode, setMode] = useState<PdfExtractionMode>('auto');
  const [language, setLanguage] = useState<OcrLanguage>('eng');
  const [ocrQuality, setOcrQuality] = useState<OcrQualityModel>('best');
  const [layoutMode, setLayoutMode] = useState<OcrLayoutMode>('auto-table');
  const [preprocessMode, setPreprocessMode] = useState<PreprocessMode>('enhanced');
  const [autoDeskew, setAutoDeskew] = useState<boolean>(true);
  const [removeTableLines, setRemoveTableLines] = useState<boolean>(true);
  const [pageRange, setPageRange] = useState<string>('All');
  const [sensitivity, setSensitivity] = useState<ColumnSensitivity>('balanced');
  const [dpiScale, setDpiScale] = useState<number>(4.16); // 300 DPI default
  const [firstRowAsHeaders, setFirstRowAsHeaders] = useState<boolean>(true);
  const [parseNumbers, setParseNumbers] = useState<boolean>(true);
  const [combinePages, setCombinePages] = useState<boolean>(false);

  // Runtime state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<PdfOcrProgress | null>(null);
  const [result, setResult] = useState<PdfOcrDocumentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View & inline edit state
  const [activeTab, setActiveTab] = useState<'combined' | number>(0);
  const [showPagePreview, setShowPagePreview] = useState<boolean>(true);
  const [previewLayer, setPreviewLayer] = useState<'original' | 'preprocessed'>('original');
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [copiedTsv, setCopiedTsv] = useState<boolean>(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runExtraction = async (file: File, overrideOpts?: Partial<PdfOcrOptions>) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSelectedFile(file);
    setErrorMessage(null);
    setEditingCell(null);
    setIsProcessing(true);
    setProgress({
      stage: 'loading',
      message: 'Starting extraction...',
      currentPage: 0,
      totalPages: 0,
      percent: 4,
    });

    const opts: PdfOcrOptions = {
      mode,
      language,
      ocrQuality,
      layoutMode,
      preprocessMode,
      autoDeskew,
      removeTableLines,
      pageRange,
      sensitivity,
      dpiScale,
      firstRowAsHeaders,
      parseNumbers,
      combinePages,
      ...overrideOpts,
    };

    try {
      const docResult = await processPdfOrImageToExcel(
        file,
        opts,
        (p) => setProgress(p),
        controller.signal
      );
      setResult(docResult);
      setActiveTab(opts.combinePages && docResult.processedPages.length > 1 ? 'combined' : 0);
      setPreviewLayer('original');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract tables from file.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileList = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    runExtraction(file);
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const commitInlineCellEdit = (pageIdx: number, rowIdx: number, colIdx: number, rawValue: string) => {
    if (!result) return;
    const nextPages = result.processedPages.map((page, pIdx) => {
      if (pIdx !== pageIdx) return page;
      const nextRows = page.rows.map((r, rIdx) => {
        if (rIdx !== rowIdx) return r;
        const copy = [...r];
        copy[colIdx] = parseCellValue(rawValue, parseNumbers);
        return copy;
      });
      const nextConfs = page.cellConfidences.map((cr, rIdx) => {
        if (rIdx !== rowIdx) return cr;
        const copy = [...cr];
        copy[colIdx] = 100; // Human-verified cell
        return copy;
      });
      return { ...page, rows: nextRows, cellConfidences: nextConfs };
    });

    const merged = mergeExtractedPages(
      nextPages.map((p) => ({
        pageNumber: p.pageNumber,
        headers: p.headers,
        rows: p.rows,
      }))
    );

    setResult({
      ...result,
      processedPages: nextPages,
      combinedSheet: {
        ...result.combinedSheet,
        headers: merged.headers,
        rows: merged.rows,
      },
    });
    setEditingCell(null);
  };

  const handleExportWorkbookXlsx = () => {
    if (!result) return;
    const baseName = result.fileName.replace(/\.[^/.]+$/, '');
    if (combinePages || activeTab === 'combined') {
      downloadXlsx(
        [
          {
            name: result.combinedSheet.name,
            headers: result.combinedSheet.headers,
            rows: result.combinedSheet.rows,
          },
        ],
        `${baseName}_combined.xlsx`
      );
    } else {
      downloadXlsx(
        result.processedPages.map((p) => ({
          name: `Page_${p.pageNumber}`,
          headers: p.headers,
          rows: p.rows,
        })),
        `${baseName}_extracted.xlsx`
      );
    }
  };

  const handleExportRawText = () => {
    if (!result) return;
    const baseName = result.fileName.replace(/\.[^/.]+$/, '');
    const text = result.processedPages
      .map((p) => `--- Page ${p.pageNumber} (${p.method === 'ocr' ? 'OCR' : 'Native Text'}) ---\n${p.rawText}`)
      .join('\n\n');
    downloadText(text, `${baseName}_extracted.txt`, 'text/plain;charset=utf-8');
  };

  const currentPageIndex = typeof activeTab === 'number' ? activeTab : -1;
  const currentPageResult =
    result && currentPageIndex >= 0
      ? result.processedPages[currentPageIndex] || result.processedPages[0]
      : null;

  const activeTable =
    result && activeTab === 'combined'
      ? {
          title: `${result.fileName} — Combined (${result.processedPages.length} pages)`,
          filename: `${result.fileName.replace(/\.[^/.]+$/, '')}_combined`,
          headers: result.combinedSheet.headers,
          rows: result.combinedSheet.rows,
          cellConfidences: null as number[][] | null,
          editable: false,
        }
      : currentPageResult && result
      ? {
          title: `${result.fileName} — Page ${currentPageResult.pageNumber}`,
          filename: `${result.fileName.replace(/\.[^/.]+$/, '')}_page_${currentPageResult.pageNumber}`,
          headers: currentPageResult.headers,
          rows: currentPageResult.rows,
          cellConfidences: currentPageResult.cellConfidences,
          editable: true,
        }
      : null;

  const filteredRowEntries = activeTable
    ? activeTable.rows
        .map((row, originalIndex) => ({ row, originalIndex }))
        .filter(({ row }) => {
          if (!filterQuery.trim()) return true;
          const q = filterQuery.toLowerCase();
          return row.some((cell) => String(cell ?? '').toLowerCase().includes(q));
        })
    : [];

  const handleCopyTsv = () => {
    if (!activeTable) return;
    const tsv = [
      activeTable.headers.join('\t'),
      ...activeTable.rows.map((r) => r.map((v) => String(v ?? '')).join('\t')),
    ].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 1600);
  };

  const ocrPageCount = result ? result.processedPages.filter((p) => p.method === 'ocr').length : 0;
  const nativePageCount = result ? result.processedPages.filter((p) => p.method === 'native-text').length : 0;
  const totalExtractedRows = result
    ? result.processedPages.reduce((sum, p) => sum + p.rows.length, 0)
    : 0;
  const overallConfidence =
    result && result.processedPages.length > 0
      ? Number(
          (
            result.processedPages.reduce((sum, p) => sum + p.avgConfidence, 0) /
            result.processedPages.length
          ).toFixed(1)
        )
      : 0;

  const lowConfidenceCount =
    currentPageResult && currentPageResult.method === 'ocr'
      ? currentPageResult.cellConfidences.reduce(
          (acc, row, rIdx) =>
            acc +
            row.filter(
              (c, cIdx) =>
                c < 75 &&
                currentPageResult.rows[rIdx]?.[cIdx] !== null &&
                String(currentPageResult.rows[rIdx]?.[cIdx] ?? '').trim() !== ''
            ).length,
          0
        )
      : 0;

  const selectCls =
    'h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none';

  return (
    <div className="space-y-6">
      {/* File Upload Dropzone */}
      {selectedFile && !isDragging ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-4 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ScanText className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {selectedFile.name}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{formatBytes(selectedFile.size)}</span>
                  {result && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {result.totalDocumentPages} page{result.totalDocumentPages === 1 ? '' : 's'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        {totalExtractedRows.toLocaleString()} extracted rows
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => runExtraction(selectedFile)}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-50 px-3 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Re-Extract</span>
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Replace PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCancel();
                  setSelectedFile(null);
                  setResult(null);
                  setProgress(null);
                  setErrorMessage(null);
                  setEditingCell(null);
                }}
                aria-label="Clear file"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp"
            onChange={(e) => handleFileList(e.target.files)}
            className="hidden"
          />
        </div>
      ) : (
        <div
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileList(e.dataTransfer.files);
          }}
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
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp"
            onChange={(e) => handleFileList(e.target.files)}
            className="hidden"
          />

          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Upload className="h-5 w-5" />
          </div>
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-1">
            Drop a normal PDF, scanned PDF, or document image
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mb-5 leading-relaxed">
            Auto Hybrid extracts native PDF text coordinates instantly and automatically switches to 300 DPI rendering, auto-deskew, shadow normalization, gridline removal, and full LSTM OCR on scanned pages—100% locally in your browser.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-4 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
          >
            Choose PDF or Image
          </button>

          <p className="mt-4 text-xs font-mono text-slate-400 dark:text-slate-500">
            .pdf · .png · .jpg · .jpeg · .webp
          </p>
        </div>
      )}

      {/* High-Precision OCR Settings Panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-1">
            {(
              [
                { id: 'auto', label: 'Auto Hybrid (Smart)' },
                { id: 'ocr', label: 'Force OCR (Scanned)' },
                { id: 'native', label: 'Native Text Only' },
              ] as { id: PdfExtractionMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === opt.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Change any setting and click <strong className="text-slate-700 dark:text-slate-200">Re-Extract</strong> to re-run
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <label className="space-y-1 text-slate-600 dark:text-slate-300">
            <span>OCR Accuracy Model</span>
            <select
              value={ocrQuality}
              onChange={(e) => setOcrQuality(e.target.value as OcrQualityModel)}
              className={selectCls}
            >
              <option value="best">Best Accuracy (Full LSTM)</option>
              <option value="fast">Fast (Lightweight LSTM)</option>
            </select>
          </label>

          <label className="space-y-1 text-slate-600 dark:text-slate-300">
            <span>Page Layout Strategy</span>
            <select
              value={layoutMode}
              onChange={(e) => setLayoutMode(e.target.value as OcrLayoutMode)}
              className={selectCls}
            >
              <option value="auto-table">Auto Table (Multi-Pass)</option>
              <option value="grid">Uniform Spreadsheet / Grid (PSM 6)</option>
              <option value="sparse">Sparse / Invoice / Receipt (PSM 11)</option>
              <option value="auto">Full Page Auto (PSM 3)</option>
            </select>
          </label>

          <label className="space-y-1 text-slate-600 dark:text-slate-300">
            <span>Scan Image Preprocessing</span>
            <select
              value={preprocessMode}
              onChange={(e) => setPreprocessMode(e.target.value as PreprocessMode)}
              className={selectCls}
            >
              <option value="enhanced">Enhanced Grayscale (Best for LSTM)</option>
              <option value="sauvola">Adaptive Sauvola Binarize (Faded Scans)</option>
              <option value="none">Raw Image (No Preprocessing)</option>
            </select>
          </label>

          <label className="space-y-1 text-slate-600 dark:text-slate-300">
            <span>Scan Render Quality</span>
            <select
              value={dpiScale}
              onChange={(e) => setDpiScale(Number(e.target.value))}
              className={selectCls}
            >
              <option value={2.8}>200 DPI (Fast)</option>
              <option value={3.5}>250 DPI (Balanced)</option>
              <option value={4.16}>300 DPI (High Precision)</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="space-y-1 text-slate-600 dark:text-slate-300">
            <span>OCR Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as OcrLanguage)}
              className={selectCls}
            >
              {OCR_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-slate-600 dark:text-slate-300">
            <span>Column Gap Sensitivity</span>
            <select
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value as ColumnSensitivity)}
              className={selectCls}
            >
              <option value="tight">Tight (Dense multi-column tables)</option>
              <option value="balanced">Balanced (Default)</option>
              <option value="wide">Wide (Merge wider phrases)</option>
            </select>
          </label>

          <label className="space-y-1 text-slate-600 dark:text-slate-300">
            <span>Page Range</span>
            <input
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="All or e.g. 1-3, 5"
              className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDeskew}
              onChange={(e) => setAutoDeskew(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Auto-deskew tilted scans</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={removeTableLines}
              onChange={(e) => setRemoveTableLines(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Detect &amp; remove table gridlines</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={firstRowAsHeaders}
              onChange={(e) => setFirstRowAsHeaders(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Treat first table row as headers</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={parseNumbers}
              onChange={(e) => setParseNumbers(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Auto-parse &amp; repair numbers</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={combinePages}
              onChange={(e) => setCombinePages(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Combine all pages into one Excel sheet</span>
          </label>
        </div>
      </div>

      {/* Live Progress Bar */}
      {isProcessing && progress && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/25 p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="font-medium text-emerald-900 dark:text-emerald-200">{progress.message}</div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {progress.percent}%
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-200"
              style={{ width: `${Math.max(4, progress.percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Extracted Results */}
      {result && activeTable && !isProcessing && (
        <div className="space-y-5">
          {/* Diagnostics & Master Export Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tabular-nums">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {result.processedPages.length} page{result.processedPages.length === 1 ? '' : 's'} extracted
                </span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Native text: <strong className="text-slate-900 dark:text-white">{nativePageCount}</strong> · OCR:{' '}
                <strong className="text-slate-900 dark:text-white">{ocrPageCount}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Confidence: <strong className="text-slate-900 dark:text-white">{overallConfidence}%</strong>
              </span>
              {currentPageResult?.skewAngleDeg !== undefined && currentPageResult.skewAngleDeg !== 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  Deskew: <strong className="text-slate-900 dark:text-white">{currentPageResult.skewAngleDeg > 0 ? `+${currentPageResult.skewAngleDeg}°` : `${currentPageResult.skewAngleDeg}°`}</strong>
                </span>
              )}
              {currentPageResult && (currentPageResult.detectedGridCols ?? 0) > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  Grid: <strong className="text-slate-900 dark:text-white">{currentPageResult.detectedGridCols}×{currentPageResult.detectedGridRows}</strong>
                </span>
              )}
              {currentPageResult && (currentPageResult.rescuedCells ?? 0) > 0 && (
                <span className="text-emerald-700 dark:text-emerald-400">
                  Rescued cells: <strong>{currentPageResult.rescuedCells}</strong>
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">
                Time: <strong className="text-slate-900 dark:text-white">{(result.durationMs / 1000).toFixed(2)}s</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPagePreview((v) => !v)}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {showPagePreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPagePreview ? 'Hide Scan' : 'Show Scan'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRawText((v) => !v)}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{showRawText ? 'Hide Raw Text' : 'Raw Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportRawText}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                .TXT
              </button>

              <button
                type="button"
                onClick={handleExportWorkbookXlsx}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-3.5 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>
                  {result.processedPages.length > 1 && !combinePages
                    ? `Download ${result.processedPages.length}-Sheet XLSX`
                    : 'Download Excel (.xlsx)'}
                </span>
              </button>
            </div>
          </div>

          {/* Page Tabs */}
          {result.processedPages.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
              <Layers className="h-4 w-4 text-slate-400 mr-1 shrink-0" />
              {result.processedPages.map((p, idx) => (
                <button
                  key={p.pageNumber}
                  type="button"
                  onClick={() => {
                    setActiveTab(idx);
                    setEditingCell(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === idx
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Page {p.pageNumber} · {p.method === 'ocr' ? `OCR ${p.avgConfidence}%` : 'Native'} ({p.rows.length})
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('combined');
                  setEditingCell(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'combined'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Combined All Pages ({result.combinedSheet.rows.length})
              </button>
            </div>
          )}

          {/* Side-by-side Source Page Scan + Editable Extracted Data Table */}
          <div className={`grid grid-cols-1 ${showPagePreview && currentPageResult?.previewDataUrl ? 'xl:grid-cols-12' : ''} gap-5 items-start`}>
            {showPagePreview && currentPageResult?.previewDataUrl && (
              <div className="xl:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-display font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Source Page {currentPageResult.pageNumber}
                  </span>
                  {currentPageResult.preprocessedPreviewDataUrl ? (
                    <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPreviewLayer('original')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          previewLayer === 'original'
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewLayer('preprocessed')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          previewLayer === 'preprocessed'
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        OCR View
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono text-slate-500 dark:text-slate-400">Native PDF Text</span>
                  )}
                </div>
                <div className="p-3 bg-slate-100/60 dark:bg-slate-950/60 flex justify-center">
                  <img
                    src={
                      previewLayer === 'preprocessed' && currentPageResult.preprocessedPreviewDataUrl
                        ? currentPageResult.preprocessedPreviewDataUrl
                        : currentPageResult.previewDataUrl
                    }
                    alt={`Rendered preview of page ${currentPageResult.pageNumber}`}
                    className="max-h-[520px] w-auto rounded border border-slate-200 dark:border-slate-800 shadow-xs object-contain"
                  />
                </div>
              </div>
            )}

            {/* Interactive Editable Extracted Table */}
            <div className={showPagePreview && currentPageResult?.previewDataUrl ? 'xl:col-span-8' : 'w-full'}>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-4 py-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-display font-semibold text-slate-900 dark:text-white">
                        {activeTable.title}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                        {activeTable.rows.length} rows · {activeTable.headers.length} columns
                      </span>
                      {activeTable.editable && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Pencil className="h-3 w-3" />
                          <span>Click any cell to edit</span>
                        </span>
                      )}
                      {lowConfidenceCount > 0 && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          · {lowConfidenceCount} low-confidence cell{lowConfidenceCount === 1 ? '' : 's'} highlighted
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Filter rows..."
                      aria-label="Filter extracted rows"
                      className="h-8 w-full sm:w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                    />

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyTsv}
                        className="inline-flex items-center gap-1 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {copiedTsv ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedTsv ? 'Copied' : 'Copy TSV'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadCsv(activeTable.headers, activeTable.rows, `${activeTable.filename}.csv`)}
                        className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const objects = activeTable.rows.map((r) => {
                            const obj: Record<string, CellPrimitive> = {};
                            activeTable.headers.forEach((h, i) => {
                              obj[h] = r[i] ?? null;
                            });
                            return obj;
                          });
                          downloadJson(objects, `${activeTable.filename}.json`);
                        }}
                        className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadXlsx(
                            [{ name: 'Extracted', headers: activeTable.headers, rows: activeTable.rows }],
                            `${activeTable.filename}.xlsx`
                          )
                        }
                        className="inline-flex items-center gap-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-3 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export XLSX</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-xs border-collapse font-mono tabular-nums">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0d1219] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="w-10 px-2.5 py-2.5 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800 font-normal">
                          #
                        </th>
                        {activeTable.headers.map((header, hIdx) => (
                          <th
                            key={header + hIdx}
                            className="px-3 py-2.5 text-left font-sans font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 last:border-r-0 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredRowEntries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={activeTable.headers.length + 1}
                            className="px-4 py-8 text-center font-sans text-slate-500 dark:text-slate-400"
                          >
                            No rows matched your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRowEntries.map(({ row, originalIndex }) => (
                          <tr
                            key={originalIndex}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="px-2.5 py-2 text-center text-slate-400 border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-[#0d1219]/30">
                              {originalIndex + 1}
                            </td>
                            {activeTable.headers.map((_, cIdx) => {
                              const val = row[cIdx];
                              const conf = activeTable.cellConfidences?.[originalIndex]?.[cIdx] ?? 100;
                              const isNumeric = typeof val === 'number';
                              const isLowConf =
                                activeTable.editable &&
                                conf < 75 &&
                                val !== null &&
                                String(val).trim() !== '';
                              const isEditing =
                                activeTable.editable &&
                                editingCell?.row === originalIndex &&
                                editingCell?.col === cIdx;

                              return (
                                <td
                                  key={cIdx}
                                  onClick={() => {
                                    if (!activeTable.editable || isEditing) return;
                                    setEditingCell({ row: originalIndex, col: cIdx });
                                    setEditDraft(val === null || val === undefined ? '' : String(val));
                                  }}
                                  title={
                                    isLowConf
                                      ? `OCR confidence: ${conf}% — click to review or edit`
                                      : activeTable.editable
                                      ? 'Click to edit cell'
                                      : undefined
                                  }
                                  className={`px-3 py-2 border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 whitespace-nowrap ${
                                    isNumeric ? 'text-right' : 'text-left'
                                  } ${
                                    isLowConf
                                      ? 'bg-amber-50/80 dark:bg-amber-950/35 text-amber-950 dark:text-amber-200 ring-1 ring-inset ring-amber-300/70 dark:ring-amber-700/60'
                                      : 'text-slate-800 dark:text-slate-200'
                                  } ${activeTable.editable ? 'cursor-text' : ''}`}
                                >
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editDraft}
                                      onChange={(e) => setEditDraft(e.target.value)}
                                      onBlur={() => commitInlineCellEdit(currentPageIndex, originalIndex, cIdx, editDraft)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          commitInlineCellEdit(currentPageIndex, originalIndex, cIdx, editDraft);
                                        } else if (e.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                      className="w-full min-w-[72px] rounded border border-emerald-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                    />
                                  ) : val === null || val === undefined || val === '' ? (
                                    <span className="text-slate-300 dark:text-slate-700">—</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Raw Recognized Text Inspector */}
          {showRawText && currentPageResult && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Raw Recognized Text — Page {currentPageResult.pageNumber}
              </div>
              <pre className="p-4 max-h-64 overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {currentPageResult.rawText || '(No text recognized on this page)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
