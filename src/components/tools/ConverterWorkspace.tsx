import React, { useState } from 'react';
import {
  FileCode,
  ArrowRight,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  Settings2,
  Table,
  Code
} from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { DataPreviewTable } from './DataPreviewTable';
import {
  tableToMarkdown,
  markdownToTable,
  tableToSql,
  tableToHtml,
  htmlToTable,
  tableToYaml,
  yamlToTable,
  tableToLatex
} from '../../core/converters';
import { downloadText, downloadXlsx, downloadCsv, downloadJson } from '../../core/files/downloadBlob';
import { SAMPLE_WORKBOOK } from '../../core/files/sampleData';
import { WorkbookData } from '../../registry/types';

interface ConverterWorkspaceProps {
  initialToolId?: string;
}

export const ConverterWorkspace: React.FC<ConverterWorkspaceProps> = ({ initialToolId }) => {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(SAMPLE_WORKBOOK);
  const [activeConverter, setActiveConverter] = useState<'csv' | 'json' | 'markdown' | 'sql' | 'html' | 'yaml' | 'latex'>(() => {
    if (initialToolId?.includes('json')) return 'json';
    if (initialToolId?.includes('markdown')) return 'markdown';
    if (initialToolId?.includes('sql')) return 'sql';
    if (initialToolId?.includes('html')) return 'html';
    if (initialToolId?.includes('yaml')) return 'yaml';
    if (initialToolId?.includes('latex')) return 'latex';
    return 'csv';
  });

  const [sqlTableName, setSqlTableName] = useState('sales_orders');
  const [copied, setCopied] = useState(false);

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;
  const headers = activeSheet ? activeSheet.headers : [];
  const rows = activeSheet ? activeSheet.rows : [];

  // Computed outputs
  const textOutput = React.useMemo(() => {
    if (!activeSheet) return '';
    switch (activeConverter) {
      case 'markdown':
        return tableToMarkdown(headers, rows);
      case 'sql':
        return tableToSql(sqlTableName, headers, rows, 'postgres');
      case 'html':
        return tableToHtml(headers, rows);
      case 'yaml':
        return tableToYaml(headers, rows);
      case 'latex':
        return tableToLatex(headers, rows, `${workbook?.fileName || 'Spreadsheet'} Data`);
      case 'json': {
        const objArray = rows.map((r) => {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            obj[h || `col_${i + 1}`] = r[i] ?? null;
          });
          return obj;
        });
        return JSON.stringify(objArray, null, 2);
      }
      case 'csv':
      default:
        return '';
    }
  }, [activeSheet, activeConverter, headers, rows, sqlTableName, workbook?.fileName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(textOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const baseName = workbook?.fileName.replace(/\.[^/.]+$/, '') || 'converted_data';
    switch (activeConverter) {
      case 'csv':
        downloadCsv(headers, rows, `${baseName}.csv`);
        break;
      case 'json':
        downloadText(textOutput, `${baseName}.json`, 'application/json');
        break;
      case 'markdown':
        downloadText(textOutput, `${baseName}.md`, 'text/markdown');
        break;
      case 'sql':
        downloadText(textOutput, `${baseName}.sql`, 'application/sql');
        break;
      case 'html':
        downloadText(textOutput, `${baseName}.html`, 'text/html');
        break;
      case 'yaml':
        downloadText(textOutput, `${baseName}.yaml`, 'text/yaml');
        break;
      case 'latex':
        downloadText(textOutput, `${baseName}.tex`, 'application/x-tex');
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. File Upload / Sample Dropzone */}
      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={setWorkbook}
        onClear={() => setWorkbook(null)}
        title="Upload file to convert"
        subtitle="Upload XLSX, XLS, CSV, TSV, or JSON for client-side multi-format transformation."
      />

      {/* 2. Format Selector Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Target Output:</span>
        {[
          { id: 'csv', label: 'CSV / TSV', ext: '.csv' },
          { id: 'json', label: 'JSON / JSONL', ext: '.json' },
          { id: 'markdown', label: 'Markdown Table', ext: '.md' },
          { id: 'sql', label: 'SQL INSERT Schema', ext: '.sql' },
          { id: 'html', label: 'HTML Table', ext: '.html' },
          { id: 'yaml', label: 'YAML Format', ext: '.yaml' },
          { id: 'latex', label: 'LaTeX Table', ext: '.tex' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveConverter(tab.id as any)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeConverter === tab.id
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="opacity-70 text-[10px] font-mono">({tab.ext})</span>
          </button>
        ))}
      </div>

      {/* 3. Converter Options */}
      {activeConverter === 'sql' && (
        <div className="flex items-center space-x-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <Settings2 className="h-4 w-4 text-emerald-400" />
          <label className="text-xs text-slate-300 font-medium">SQL Table Name:</label>
          <input
            type="text"
            value={sqlTableName}
            onChange={(e) => setSqlTableName(e.target.value)}
            className="h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* 4. Output Render */}
      {workbook && (
        <div className="space-y-4">
          {activeConverter === 'csv' ? (
            <DataPreviewTable
              headers={headers}
              rows={rows}
              title="CSV Output Preview"
              filename={workbook.fileName.replace(/\.[^/.]+$/, '')}
            />
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 gap-2">
                <div className="flex items-center space-x-2">
                  <Code className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    {activeConverter.toUpperCase()} Generated Output
                  </span>
                  <span className="text-xs text-slate-400">
                    ({rows.length} records generated)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download {activeConverter.toUpperCase()}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 font-mono text-xs text-emerald-300 max-h-[500px] overflow-auto whitespace-pre leading-relaxed">
                {textOutput}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
