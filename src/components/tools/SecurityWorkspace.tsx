import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FolderArchive,
  Download,
  CheckCircle2,
  Lock,
  EyeOff,
  User,
  Sparkles
} from 'lucide-react';
import { inspectWorkbookSecurity, stripWorkbookMetadataAndMacros, SecurityInspectionReport } from '../../core/security';
import { downloadBlob } from '../../core/files/downloadBlob';
import { formatBytes } from '../../core/files/detectFormat';

export const SecurityWorkspace: React.FC = () => {
  const [report, setReport] = useState<SecurityInspectionReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizedBlob, setSanitizedBlob] = useState<Blob | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setSanitizedBlob(null);

    try {
      const res = await inspectWorkbookSecurity(file);
      setReport(res);
    } catch (err: any) {
      alert('Security inspection error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSanitize = async () => {
    if (!selectedFile) return;
    setSanitizing(true);
    try {
      const blob = await stripWorkbookMetadataAndMacros(selectedFile);
      setSanitizedBlob(blob);
      downloadBlob(blob, `sanitized_${selectedFile.name.replace(/\.[^/.]+$/, '')}.xlsx`);
    } catch (err: any) {
      alert('Sanitization failed: ' + err.message);
    } finally {
      setSanitizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. File Upload Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Workbook Security & Macro Audit</h3>
            <p className="text-xs text-slate-400">
              Inspect OpenXML zip contents, detect embedded VBA binaries, expose hidden worksheets, and sanitize metadata.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
          <label className="cursor-pointer rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors shadow-sm">
            <span>{isLoading ? 'Scanning Archive...' : 'Select XLSX / XLSM File'}</span>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".xlsx,.xlsm,.xlsb,.xls"
              className="hidden"
            />
          </label>

          <span className="text-xs text-slate-500">
            Audit runs 100% locally in browser memory without executing binary code.
          </span>
        </div>
      </div>

      {/* 2. Audit Report */}
      {report && (
        <div className="space-y-6">
          {/* Risk Level Header Banner */}
          <div
            className={`rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              report.riskLevel === 'HIGH'
                ? 'border-rose-500/50 bg-rose-950/30'
                : report.riskLevel === 'MEDIUM'
                ? 'border-amber-500/50 bg-amber-950/30'
                : 'border-emerald-500/50 bg-emerald-950/20'
            }`}
          >
            <div className="flex items-center space-x-3">
              {report.riskLevel === 'HIGH' ? (
                <ShieldAlert className="h-8 w-8 text-rose-400 shrink-0" />
              ) : report.riskLevel === 'MEDIUM' ? (
                <AlertTriangle className="h-8 w-8 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-bold text-white">Overall Threat Level: {report.riskLevel}</h4>
                  <span className="text-xs text-slate-400">({report.fileName})</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {report.hasVbaMacros
                    ? 'Caution: Workbook contains compiled VBA macro code (vbaProject.bin). Never enable macros from untrusted sources.'
                    : report.hiddenSheets.length > 0
                    ? 'Workbook contains hidden sheets or external data links.'
                    : 'Clean OpenXML package. No suspicious executable streams or embedded binaries detected.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleSanitize}
              disabled={sanitizing}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md transition-colors shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{sanitizing ? 'Sanitizing...' : 'Scrub & Download Macro-Free XLSX'}</span>
            </button>
          </div>

          {/* Audit Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Macros */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">VBA Macros</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    report.hasVbaMacros ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {report.hasVbaMacros ? 'DETECTED' : 'NONE'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {report.hasVbaMacros ? `Binary: ${report.vbaProjectFile}` : 'No macro streams present.'}
              </p>
            </div>

            {/* Box 2: Sheets & Hidden */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Worksheets</span>
                <span className="text-xs font-mono text-white">{report.allSheets.length} Total</span>
              </div>
              <div className="text-xs text-slate-300">
                {report.hiddenSheets.length > 0 ? (
                  <span className="text-amber-400 font-semibold">
                    {report.hiddenSheets.length} Hidden: {report.hiddenSheets.join(', ')}
                  </span>
                ) : (
                  <span>All sheets visible</span>
                )}
              </div>
            </div>

            {/* Box 3: Personal Metadata */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Document Metadata</span>
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <div>Creator: <span className="text-slate-100">{report.metadata.creator || 'None'}</span></div>
                <div>Application: <span className="text-slate-100">{report.metadata.application || 'None'}</span></div>
              </div>
            </div>
          </div>

          {/* Detailed ZIP Entries Tree */}
          {report.zipEntries.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderArchive className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                    ZIP Container Stream Architecture
                  </h4>
                </div>
                <span className="text-xs text-slate-400">{report.zipEntries.length} package streams</span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80 font-mono text-xs">
                {report.zipEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-4 py-2 hover:bg-slate-800/40 ${
                      entry.isSuspicious ? 'bg-rose-950/30 text-rose-300' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate max-w-lg">{entry.path}</span>
                    <div className="flex items-center space-x-4 shrink-0 text-slate-400 text-[11px]">
                      <span>{formatBytes(entry.uncompressedSize)}</span>
                      {entry.isSuspicious && (
                        <span className="rounded bg-rose-500/20 text-rose-400 px-1.5 py-0.5 text-[10px] font-bold">
                          RISK
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
