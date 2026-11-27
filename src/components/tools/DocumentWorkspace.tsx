import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Contact, Download, Copy, Check, AlertCircle } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { WorkbookData } from '../../registry/types';
import { tableToIcs, tableToVCard } from '../../core/converters';
import { downloadText } from '../../core/files/downloadBlob';

type DocMode = 'ics' | 'vcard';

function findHeaderIndex(headers: string[], patterns: RegExp[], fallback = -1): number {
  const idx = headers.findIndex((h) => patterns.some((p) => p.test(h)));
  return idx >= 0 ? idx : fallback;
}

export const DocumentWorkspace: React.FC = () => {
  const [mode, setMode] = useState<DocMode>('ics');
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [copied, setCopied] = useState(false);

  // ICS column mapping
  const [icsTitleCol, setIcsTitleCol] = useState(0);
  const [icsStartCol, setIcsStartCol] = useState(1);
  const [icsEndCol, setIcsEndCol] = useState(2);
  const [icsLocCol, setIcsLocCol] = useState(3);
  const [icsDescCol, setIcsDescCol] = useState(4);

  // vCard column mapping
  const [vcNameCol, setVcNameCol] = useState(2);
  const [vcOrgCol, setVcOrgCol] = useState(1);
  const [vcEmailCol, setVcEmailCol] = useState(3);
  const [vcPhoneCol, setVcPhoneCol] = useState(4);

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;

  // Smart column detection whenever sheet changes
  useEffect(() => {
    if (!activeSheet) return;
    const h = activeSheet.headers;

    setIcsTitleCol(findHeaderIndex(h, [/title|event|summary|name|task/i], 0));
    setIcsStartCol(findHeaderIndex(h, [/start|date|begin/i], Math.min(1, h.length - 1)));
    setIcsEndCol(findHeaderIndex(h, [/end|finish|due/i], -1));
    setIcsLocCol(findHeaderIndex(h, [/loc|room|place|venue/i], -1));
    setIcsDescCol(findHeaderIndex(h, [/desc|note|detail/i], -1));

    setVcNameCol(findHeaderIndex(h, [/contact|full.?name|person|name/i], 0));
    setVcOrgCol(findHeaderIndex(h, [/company|org|business/i], -1));
    setVcEmailCol(findHeaderIndex(h, [/email|mail/i], -1));
    setVcPhoneCol(findHeaderIndex(h, [/phone|tel|mobile/i], -1));
  }, [activeSheet]);

  const handleModeSwitch = (nextMode: DocMode) => {
    setMode(nextMode);
  };

  const icsResult = useMemo(() => {
    if (!activeSheet || mode !== 'ics') return null;
    return tableToIcs(activeSheet.headers, activeSheet.rows, {
      title: Math.min(icsTitleCol, Math.max(0, activeSheet.headers.length - 1)),
      startDate: Math.min(icsStartCol, Math.max(0, activeSheet.headers.length - 1)),
      endDate: icsEndCol >= 0 ? icsEndCol : undefined,
      location: icsLocCol >= 0 ? icsLocCol : undefined,
      description: icsDescCol >= 0 ? icsDescCol : undefined,
    });
  }, [activeSheet, mode, icsTitleCol, icsStartCol, icsEndCol, icsLocCol, icsDescCol]);

  const vcardResult = useMemo(() => {
    if (!activeSheet || mode !== 'vcard') return null;
    return tableToVCard(activeSheet.headers, activeSheet.rows, {
      name: Math.min(vcNameCol, Math.max(0, activeSheet.headers.length - 1)),
      org: vcOrgCol >= 0 ? vcOrgCol : undefined,
      email: vcEmailCol >= 0 ? vcEmailCol : undefined,
      phone: vcPhoneCol >= 0 ? vcPhoneCol : undefined,
    });
  }, [activeSheet, mode, vcNameCol, vcOrgCol, vcEmailCol, vcPhoneCol]);

  const outputContent = mode === 'ics' ? icsResult?.content || '' : vcardResult?.content || '';

  const handleCopy = () => {
    if (!outputContent) return;
    navigator.clipboard.writeText(outputContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!outputContent) return;
    if (mode === 'ics') {
      downloadText(outputContent, 'calendar_events.ics', 'text/calendar;charset=utf-8');
    } else {
      downloadText(outputContent, 'contacts_addressbook.vcf', 'text/vcard;charset=utf-8');
    }
  };

  const selectCls =
    'h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => handleModeSwitch('ics')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'ics'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>iCalendar (.ics) Generator</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('vcard')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'vcard'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Contact className="h-3.5 w-3.5" />
            <span>vCard (.vcf) Contacts</span>
          </button>
        </div>
      </div>

      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={setWorkbook}
        onClear={() => setWorkbook(null)}
        title={mode === 'ics' ? 'Drop a schedule spreadsheet to build .ics events' : 'Drop a contacts spreadsheet to build .vcf vCards'}
        subtitle="Select your worksheet and map columns below. Everything is generated locally."
      />

      {activeSheet && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Column Mapping ({activeSheet.name})
              </span>
              <button
                type="button"
                disabled={(mode === 'ics' && (icsResult?.eventCount ?? 0) === 0) || (mode === 'vcard' && (vcardResult?.contactCount ?? 0) === 0)}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-40 px-3.5 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download {mode === 'ics' ? '.ics Calendar' : '.vcf Contacts'}</span>
              </button>
            </div>

            {mode === 'ics' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Event Summary</span>
                  <select value={icsTitleCol} onChange={(e) => setIcsTitleCol(Number(e.target.value))} className={selectCls}>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Start Date/Time</span>
                  <select value={icsStartCol} onChange={(e) => setIcsStartCol(Number(e.target.value))} className={selectCls}>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>End Date (optional)</span>
                  <select value={icsEndCol} onChange={(e) => setIcsEndCol(Number(e.target.value))} className={selectCls}>
                    <option value={-1}>+1 hour default</option>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Location (optional)</span>
                  <select value={icsLocCol} onChange={(e) => setIcsLocCol(Number(e.target.value))} className={selectCls}>
                    <option value={-1}>None</option>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Description (optional)</span>
                  <select value={icsDescCol} onChange={(e) => setIcsDescCol(Number(e.target.value))} className={selectCls}>
                    <option value={-1}>None</option>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Full Name</span>
                  <select value={vcNameCol} onChange={(e) => setVcNameCol(Number(e.target.value))} className={selectCls}>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Organization (optional)</span>
                  <select value={vcOrgCol} onChange={(e) => setVcOrgCol(Number(e.target.value))} className={selectCls}>
                    <option value={-1}>None</option>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Email (optional)</span>
                  <select value={vcEmailCol} onChange={(e) => setVcEmailCol(Number(e.target.value))} className={selectCls}>
                    <option value={-1}>None</option>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-600 dark:text-slate-300">
                  <span>Phone (optional)</span>
                  <select value={vcPhoneCol} onChange={(e) => setVcPhoneCol(Number(e.target.value))} className={selectCls}>
                    <option value={-1}>None</option>
                    {activeSheet.headers.map((h, i) => (
                      <option key={h + i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {mode === 'ics' && icsResult && icsResult.skippedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Skipped {icsResult.skippedCount} row(s) without a parseable date in the Start Date column. Switch sheet or pick a date column above.
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-4 py-2.5 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                {mode === 'ics'
                  ? `Generated ${icsResult?.eventCount ?? 0} VEVENT calendar entries`
                  : `Generated ${vcardResult?.contactCount ?? 0} vCard 3.0 contacts`}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 overflow-x-auto max-h-[420px] font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre leading-relaxed">
              {outputContent}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};
