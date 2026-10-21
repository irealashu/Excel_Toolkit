import React, { useState } from 'react';
import { Calendar, Contact, Download, Copy, Check, FileText } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { tableToIcs, tableToVCard } from '../../core/converters';
import { downloadText } from '../../core/files/downloadBlob';
import { SAMPLE_WORKBOOK } from '../../core/files/sampleData';
import { WorkbookData } from '../../registry/types';

export const DocumentWorkspace: React.FC = () => {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(SAMPLE_WORKBOOK);
  const [docType, setDocType] = useState<'ics' | 'vcard'>('ics');
  const [copied, setCopied] = useState(false);

  // Column mapping states
  const [titleCol, setTitleCol] = useState(1);
  const [startCol, setStartCol] = useState(0);
  const [emailCol, setEmailCol] = useState(3);
  const [phoneCol, setPhoneCol] = useState(4);

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;
  const headers = activeSheet ? activeSheet.headers : [];
  const rows = activeSheet ? activeSheet.rows : [];

  const generatedOutput = React.useMemo(() => {
    if (!activeSheet) return '';
    if (docType === 'ics') {
      return tableToIcs(headers, rows, {
        title: titleCol,
        startDate: startCol,
      });
    } else {
      return tableToVCard(headers, rows, {
        name: titleCol,
        email: emailCol,
        phone: phoneCol,
      });
    }
  }, [activeSheet, docType, headers, rows, titleCol, startCol, emailCol, phoneCol]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = docType === 'ics' ? 'ics' : 'vcf';
    const mime = docType === 'ics' ? 'text/calendar' : 'text/vcard';
    downloadText(generatedOutput, `exported_data.${ext}`, mime);
  };

  return (
    <div className="space-y-6">
      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={setWorkbook}
        onClear={() => setWorkbook(null)}
        title="Upload Table for Calendar or Contact Generation"
        subtitle="Transform tabular events into standard iCalendar (.ics) or contact rows into vCard 3.0 (.vcf)."
      />

      {/* Mode Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setDocType('ics')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            docType === 'ics'
              ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>iCalendar (.ics) Events</span>
        </button>

        <button
          onClick={() => setDocType('vcard')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            docType === 'vcard'
              ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Contact className="h-3.5 w-3.5" />
          <span>vCard 3.0 (.vcf) Address Book</span>
        </button>
      </div>

      {workbook && (
        <div className="space-y-4">
          {/* Mapping Controls */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-300">
            <span className="font-semibold text-white">Column Field Mapping:</span>

            <div className="flex items-center space-x-1.5">
              <span>{docType === 'ics' ? 'Summary / Title:' : 'Contact Name:'}</span>
              <select
                value={titleCol}
                onChange={(e) => setTitleCol(Number(e.target.value))}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {docType === 'ics' ? (
              <div className="flex items-center space-x-1.5">
                <span>Event Date:</span>
                <select
                  value={startCol}
                  onChange={(e) => setStartCol(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-1.5">
                  <span>Email:</span>
                  <select
                    value={emailCol}
                    onChange={(e) => setEmailCol(Number(e.target.value))}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span>Phone:</span>
                  <select
                    value={phoneCol}
                    onChange={(e) => setPhoneCol(Number(e.target.value))}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Generated File Output Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                {docType.toUpperCase()} Standard Payload Output
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .{docType}</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 font-mono text-xs text-emerald-300 max-h-72 overflow-y-auto whitespace-pre">
              {generatedOutput}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
