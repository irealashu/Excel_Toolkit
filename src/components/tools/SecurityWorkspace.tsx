import React, { useRef, useState } from 'react';
import { Upload, ShieldCheck, ShieldAlert, AlertTriangle, Download, FileArchive, CheckCircle2 } from 'lucide-react';
import {
  inspectWorkbookSecurity,
  SecurityInspectionReport,
  stripWorkbookMetadataAndMacros,
} from '../../core/security';
import { downloadBlob, downloadJson } from '../../core/files/downloadBlob';
import { formatBytes } from '../../core/files/detectFormat';

export const SecurityWorkspace: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [report, setReport] = useState<SecurityInspectionReport | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runInspection = async (file: File) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsInspecting(true);
    setSelectedFile(file);

    try {
      const result = await inspectWorkbookSecurity(file);
      setReport(result);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to inspect the selected workbook.');
      setReport(null);
    } finally {
      setIsInspecting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScrub = async () => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsScrubbing(true);

    try {
      const cleanBlob = await stripWorkbookMetadataAndMacros(selectedFile);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      downloadBlob(cleanBlob, `${baseName}_sanitized.xlsx`);
      setStatusMessage(`Downloaded sanitized workbook (${baseName}_sanitized.xlsx) with author metadata and macros stripped.`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to sanitize workbook.');
    } finally {
      setIsScrubbing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dropzone Card */}
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm,.xlsb,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) runInspection(f);
          }}
          className="hidden"
        />
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          <Upload className="h-5 w-5" />
        </div>
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-1">
          Inspect Excel Package Structure, Macros &amp; Metadata
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-5 leading-relaxed">
          Reads raw OpenXML ZIP streams without executing macros. Detects <code className="font-mono">vbaProject.bin</code>,
          hidden worksheets, external links, and author properties locally in browser memory.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            disabled={isInspecting}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-4 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
          >
            {isInspecting ? 'Inspecting ZIP package...' : 'Select .xlsx / .xlsm file'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  report.riskLevel === 'HIGH'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : report.riskLevel === 'MEDIUM'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {report.riskLevel === 'HIGH' ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : report.riskLevel === 'MEDIUM' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {report.fileName}
                  </h3>
                  <span
                    className={`font-mono text-xs font-semibold ${
                      report.riskLevel === 'HIGH'
                        ? 'text-rose-600 dark:text-rose-400'
                        : report.riskLevel === 'MEDIUM'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    RISK: {report.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatBytes(report.fileSizeBytes)} · {report.allSheets.length} sheets ({report.hiddenSheets.length}{' '}
                  hidden) · {report.zipEntries.length} ZIP payload files · VBA Macros:{' '}
                  {report.hasVbaMacros ? 'Detected' : 'None'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadJson(report, `${report.fileName}_security_report.json`)}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Audit JSON</span>
              </button>
              <button
                type="button"
                disabled={isScrubbing}
                onClick={handleScrub}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-3.5 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{isScrubbing ? 'Sanitizing...' : 'Scrub Metadata & Macros'}</span>
              </button>
            </div>
          </div>

          {/* Findings + Metadata + Sheets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
              <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Security Findings</h4>
              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                {report.findings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                    <span className="leading-relaxed">{finding}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Worksheet Visibility
                </h5>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {report.allSheets.map((s, i) => (
                    <div key={s.name + i} className="flex items-center justify-between py-2">
                      <span className="font-mono text-slate-800 dark:text-slate-200">{s.name}</span>
                      <span
                        className={`font-medium ${
                          s.isHidden
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {s.isHidden ? 'Hidden' : 'Visible'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
              <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Document Properties</h4>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {[
                  ['Creator / Author', report.metadata.creator || 'Not present'],
                  ['Last Modified By', report.metadata.lastModifiedBy || 'Not present'],
                  ['Organization / Company', report.metadata.company || 'Not present'],
                  ['Application', report.metadata.application || 'Not present'],
                  ['Created Timestamp', report.metadata.created || 'Not present'],
                  ['Modified Timestamp', report.metadata.modified || 'Not present'],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between py-2 gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="font-mono text-slate-800 dark:text-slate-200 text-right truncate">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* ZIP Archive Contents */}
          {report.isZipArchive && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4 text-slate-500" />
                  <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    OpenXML ZIP Stream Inventory ({report.zipEntries.length} entries)
                  </h4>
                </div>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs font-mono tabular-nums">
                  <thead className="bg-slate-50 dark:bg-[#0d1219] text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left font-sans font-semibold">Internal Path</th>
                      <th className="px-4 py-2 text-right font-sans font-semibold">Compressed</th>
                      <th className="px-4 py-2 text-right font-sans font-semibold">Uncompressed</th>
                      <th className="px-4 py-2 text-right font-sans font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {report.zipEntries.map((entry) => (
                      <tr key={entry.path} className={entry.isSuspicious ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}>
                        <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{entry.path}</td>
                        <td className="px-4 py-2 text-right text-slate-500">{formatBytes(entry.compressedSize)}</td>
                        <td className="px-4 py-2 text-right text-slate-500">{formatBytes(entry.uncompressedSize)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={entry.isSuspicious ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400'}>
                            {entry.isSuspicious ? 'Flagged' : 'Clean'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
