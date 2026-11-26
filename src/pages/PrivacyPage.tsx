import React, { useState } from 'react';
import { ShieldCheck, Lock, HardDrive, Trash2, CheckCircle2 } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const [cleared, setCleared] = useState(false);

  const handleClearStorage = () => {
    try {
      localStorage.removeItem('excel-toolkit-theme');
      sessionStorage.clear();
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch {
      setCleared(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Privacy &amp; Offline Architecture
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Excel Toolkit is engineered as a static, 100% browser-resident studio. There are no file upload APIs, no user accounts, no cloud persistence, and no analytics trackers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-2">
          <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Zero Server Uploads</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Uploaded files are read directly via the browser File &amp; ArrayBuffer APIs. Nothing leaves your machine.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">No Macro Execution</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The Security Inspector unzips OpenXML structures passively in JavaScript—VBA binaries are detected and stripped without ever being executed.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-2">
          <HardDrive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Ephemeral Memory</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Workbook contents stay in transient browser tab memory and are discarded immediately when you clear the workspace or close the tab.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Local Storage Controls
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The only value stored in browser <code className="font-mono">localStorage</code> is your chosen Light/Dark theme preference (<code className="font-mono">excel-toolkit-theme</code>). No spreadsheet rows or filenames are saved to disk.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleClearStorage}
            className="inline-flex items-center gap-2 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Local Preferences</span>
          </button>

          {cleared && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Local preferences cleared.</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
