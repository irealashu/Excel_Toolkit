import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Download, AlertCircle, ArrowRightLeft, FileCode2 } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { DataPreviewTable } from './DataPreviewTable';
import { WorkbookData } from '../../registry/types';
import { downloadText, downloadXlsx } from '../../core/files/downloadBlob';
import {
  CellValue,
  csvToTable,
  htmlToTable,
  jsonToTable,
  markdownToTable,
  tableToCsv,
  tableToHtml,
  tableToJson,
  tableToJsonLines,
  tableToLatex,
  tableToMarkdown,
  tableToSql,
  tableToTsv,
  tableToXml,
  tableToYaml,
  xmlToTable,
  yamlToTable,
} from '../../core/converters';

export type OutputFormat =
  | 'xlsx'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'jsonl'
  | 'markdown'
  | 'sql'
  | 'html'
  | 'yaml'
  | 'xml'
  | 'latex';

type PasteFormat = 'csv' | 'tsv' | 'json' | 'markdown' | 'html' | 'yaml' | 'xml';

const FORMAT_OPTIONS: { id: OutputFormat; label: string; ext: string; mime: string }[] = [
  { id: 'xlsx', label: 'Excel (.xlsx)', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv;charset=utf-8' },
  { id: 'tsv', label: 'TSV', ext: 'tsv', mime: 'text/tab-separated-values;charset=utf-8' },
  { id: 'json', label: 'JSON', ext: 'json', mime: 'application/json' },
  { id: 'jsonl', label: 'JSONL', ext: 'jsonl', mime: 'application/x-ndjson' },
  { id: 'markdown', label: 'Markdown', ext: 'md', mime: 'text/markdown' },
  { id: 'sql', label: 'SQL', ext: 'sql', mime: 'text/sql' },
  { id: 'html', label: 'HTML Table', ext: 'html', mime: 'text/html' },
  { id: 'yaml', label: 'YAML', ext: 'yaml', mime: 'text/yaml' },
  { id: 'xml', label: 'XML', ext: 'xml', mime: 'application/xml' },
  { id: 'latex', label: 'LaTeX', ext: 'tex', mime: 'application/x-tex' },
];

function resolveInitialFormat(toolId?: string): { mode: 'export' | 'import'; output: OutputFormat; paste: PasteFormat } {
  switch (toolId) {
    case 'csv-to-xlsx':
      return { mode: 'export', output: 'xlsx', paste: 'csv' };
    case 'xlsx-to-csv':
      return { mode: 'export', output: 'csv', paste: 'csv' };
    case 'json-to-xlsx':
      return { mode: 'import', output: 'xlsx', paste: 'json' };
    case 'xlsx-to-json':
      return { mode: 'export', output: 'json', paste: 'json' };
    case 'markdown-table-converter':
      return { mode: 'export', output: 'markdown', paste: 'markdown' };
    case 'sql-insert-converter':
      return { mode: 'export', output: 'sql', paste: 'csv' };
    case 'html-table-converter':
      return { mode: 'export', output: 'html', paste: 'html' };
    case 'yaml-converter':
      return { mode: 'export', output: 'yaml', paste: 'yaml' };
    case 'xml-converter':
      return { mode: 'export', output: 'xml', paste: 'xml' };
    case 'latex-table-converter':
      return { mode: 'export', output: 'latex', paste: 'csv' };
    default:
      return { mode: 'export', output: 'json', paste: 'json' };
  }
}

interface ConverterWorkspaceProps {
  initialToolId?: string;
}

export const ConverterWorkspace: React.FC<ConverterWorkspaceProps> = ({ initialToolId }) => {
  const initialConfig = resolveInitialFormat(initialToolId);

  const [mode, setMode] = useState<'export' | 'import'>(initialConfig.mode);
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(initialConfig.output);

  // Format-specific export options
  const [csvDelimiter, setCsvDelimiter] = useState<string>(',');
  const [sqlTableName, setSqlTableName] = useState('exported_table');
  const [sqlDialect, setSqlDialect] = useState<'postgres' | 'mysql' | 'sqlite'>('postgres');
  const [sqlIncludeCreate, setSqlIncludeCreate] = useState(true);
  const [xmlRootTag, setXmlRootTag] = useState('records');
  const [xmlRowTag, setXmlRowTag] = useState('record');
  const [latexCaption, setLatexCaption] = useState('Exported Spreadsheet Data');
  const [latexLabel, setLatexLabel] = useState('tab:spreadsheet_data');

  // Paste-to-table import mode
  const [pasteFormat, setPasteFormat] = useState<PasteFormat>(initialConfig.paste);
  const [rawInput, setRawInput] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const next = resolveInitialFormat(initialToolId);
    setMode(next.mode);
    setOutputFormat(next.output);
    setPasteFormat(next.paste);
  }, [initialToolId]);

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;

  const convertedText = useMemo(() => {
    if (!activeSheet || outputFormat === 'xlsx') return '';
    const { headers, rows } = activeSheet;
    switch (outputFormat) {
      case 'csv':
        return tableToCsv(headers, rows, csvDelimiter);
      case 'tsv':
        return tableToTsv(headers, rows);
      case 'json':
        return tableToJson(headers, rows, true);
      case 'jsonl':
        return tableToJsonLines(headers, rows);
      case 'markdown':
        return tableToMarkdown(headers, rows);
      case 'sql':
        return tableToSql(sqlTableName, headers, rows, sqlDialect, sqlIncludeCreate);
      case 'html':
        return tableToHtml(headers, rows);
      case 'yaml':
        return tableToYaml(headers, rows);
      case 'xml':
        return tableToXml(headers, rows, xmlRootTag, xmlRowTag);
      case 'latex':
        return tableToLatex(headers, rows, latexCaption, latexLabel);
      default:
        return '';
    }
  }, [
    activeSheet,
    outputFormat,
    csvDelimiter,
    sqlTableName,
    sqlDialect,
    sqlIncludeCreate,
    xmlRootTag,
    xmlRowTag,
    latexCaption,
    latexLabel,
  ]);

  const parsedPaste = useMemo<{ headers: string[]; rows: CellValue[][]; error: string | null }>(() => {
    if (!rawInput.trim()) return { headers: [], rows: [], error: null };
    try {
      let res: { headers: string[]; rows: CellValue[][] };
      switch (pasteFormat) {
        case 'csv':
          res = csvToTable(rawInput);
          break;
        case 'tsv':
          res = csvToTable(rawInput, '\t');
          break;
        case 'json':
          res = jsonToTable(rawInput);
          break;
        case 'markdown':
          res = markdownToTable(rawInput);
          break;
        case 'html':
          res = htmlToTable(rawInput);
          break;
        case 'yaml':
          res = yamlToTable(rawInput);
          break;
        case 'xml':
          res = xmlToTable(rawInput);
          break;
      }
      return { headers: res.headers, rows: res.rows, error: null };
    } catch (err: unknown) {
      return {
        headers: [],
        rows: [],
        error: err instanceof Error ? err.message : 'Unable to parse pasted content for the selected format.',
      };
    }
  }, [rawInput, pasteFormat]);

  const handleCopyOutput = () => {
    if (!convertedText) return;
    navigator.clipboard.writeText(convertedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadOutput = () => {
    if (!activeSheet) return;
    const baseName = (workbook?.fileName || 'converted').replace(/\.[^/.]+$/, '');
    if (outputFormat === 'xlsx') {
      downloadXlsx(
        workbook!.sheets.map((s) => ({ name: s.name, headers: s.headers, rows: s.rows })),
        `${baseName}_converted.xlsx`
      );
      return;
    }
    const meta = FORMAT_OPTIONS.find((f) => f.id === outputFormat)!;
    downloadText(convertedText, `${baseName}.${meta.ext}`, meta.mime);
  };

  const handleLoadParsedAsWorkbook = () => {
    if (parsedPaste.error || parsedPaste.headers.length === 0) return;
    setWorkbook({
      fileName: `pasted_${pasteFormat}_data.${pasteFormat}`,
      fileSizeBytes: new Blob([rawInput]).size,
      activeSheetIndex: 0,
      sheets: [
        {
          name: `${pasteFormat.toUpperCase()}_Import`,
          headers: parsedPaste.headers,
          rows: parsedPaste.rows,
          totalRows: parsedPaste.rows.length,
          totalCols: parsedPaste.headers.length,
        },
      ],
    });
    setMode('export');
    setOutputFormat('xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setMode('export')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'export'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Convert Loaded File</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('import')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'import'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            <span>Parse Pasted Text → Table / XLSX</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          {mode === 'export' ? '11 export targets · multi-sheet aware' : '7 structured text parsers · instant XLSX download'}
        </span>
      </div>

      {mode === 'export' ? (
        <div className="space-y-6">
          <FileDropzone
            currentWorkbook={workbook}
            onWorkbookLoaded={(wb) => {
              setWorkbook(wb);
              const base = wb.sheets[0]?.name?.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
              if (base) setSqlTableName(base);
            }}
            onClear={() => setWorkbook(null)}
            title="Drop any XLSX, CSV, TSV, JSON, YAML, XML, HTML, or Markdown file"
            subtitle="All conversions happen deterministically inside browser memory. Nothing is uploaded."
          />

          {activeSheet && (
            <>
              {/* Target Format Selector */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target Output Format
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadOutput}
                    className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-3.5 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download .{FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.ext}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setOutputFormat(fmt.id)}
                      className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                        outputFormat === fmt.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>

                {/* Format-specific Configuration Controls */}
                {outputFormat === 'csv' && (
                  <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span>Delimiter</span>
                      <select
                        value={csvDelimiter}
                        onChange={(e) => setCsvDelimiter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-800 dark:text-slate-200 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value=",">Comma (,)</option>
                        <option value=";">Semicolon (;)</option>
                        <option value="|">Pipe (|)</option>
                        <option value={'\t'}>Tab (\t)</option>
                      </select>
                    </label>
                  </div>
                )}

                {outputFormat === 'sql' && (
                  <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span>Table name</span>
                      <input
                        type="text"
                        value={sqlTableName}
                        onChange={(e) => setSqlTableName(e.target.value)}
                        className="h-8 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span>Dialect</span>
                      <select
                        value={sqlDialect}
                        onChange={(e) => setSqlDialect(e.target.value as 'postgres' | 'mysql' | 'sqlite')}
                        className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-800 dark:text-slate-200 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="postgres">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                        <option value="sqlite">SQLite</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sqlIncludeCreate}
                        onChange={(e) => setSqlIncludeCreate(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Include CREATE TABLE DDL</span>
                    </label>
                  </div>
                )}

                {outputFormat === 'xml' && (
                  <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span>Root element</span>
                      <input
                        type="text"
                        value={xmlRootTag}
                        onChange={(e) => setXmlRootTag(e.target.value)}
                        className="h-8 w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span>Row element</span>
                      <input
                        type="text"
                        value={xmlRowTag}
                        onChange={(e) => setXmlRowTag(e.target.value)}
                        className="h-8 w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                  </div>
                )}

                {outputFormat === 'latex' && (
                  <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span>Caption</span>
                      <input
                        type="text"
                        value={latexCaption}
                        onChange={(e) => setLatexCaption(e.target.value)}
                        className="h-8 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span>Label</span>
                      <input
                        type="text"
                        value={latexLabel}
                        onChange={(e) => setLatexLabel(e.target.value)}
                        className="h-8 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Output Display */}
              {outputFormat === 'xlsx' ? (
                <DataPreviewTable
                  headers={activeSheet.headers}
                  rows={activeSheet.rows}
                  title={`Ready for Excel Export — ${activeSheet.name}`}
                  filename={activeSheet.name}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-4 py-2.5">
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                      {FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.label} Output ·{' '}
                      <span className="text-slate-400">
                        {convertedText.split('\n').length.toLocaleString()} lines ·{' '}
                        {new Blob([convertedText]).size.toLocaleString()} bytes
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyOutput}
                      className="inline-flex items-center gap-1.5 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto max-h-[460px] text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre">
                    {convertedText}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['csv', 'tsv', 'json', 'markdown', 'html', 'yaml', 'xml'] as PasteFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setPasteFormat(fmt)}
                    className={`h-8 rounded-lg border px-3 text-xs font-medium uppercase transition-colors ${
                      pasteFormat === fmt
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!!parsedPaste.error || parsedPaste.headers.length === 0}
                  onClick={handleLoadParsedAsWorkbook}
                  className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-40 px-3.5 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
                >
                  Send to Export Mode
                </button>
              </div>
            </div>

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={8}
              aria-label={`Paste raw ${pasteFormat.toUpperCase()} data`}
              placeholder={`Paste raw ${pasteFormat.toUpperCase()} text here...`}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0d1219] p-3 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
            />

            {parsedPaste.error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{parsedPaste.error}</span>
              </div>
            )}
          </div>

          {!parsedPaste.error && parsedPaste.headers.length > 0 && (
            <DataPreviewTable
              headers={parsedPaste.headers}
              rows={parsedPaste.rows}
              title={`Parsed ${pasteFormat.toUpperCase()} Table`}
              filename={`parsed_${pasteFormat}`}
            />
          )}
        </div>
      )}
    </div>
  );
};
