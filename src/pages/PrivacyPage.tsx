import React from 'react';
import { ShieldCheck, HardDrive, WifiOff, FileCheck, Lock, EyeOff } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Browser-Only Privacy &amp; Security Model</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Excel Toolkit is engineered from first principles as an isolated client-side utility.
          Your spreadsheets, documents, formulas, and customer records never leave your browser sandbox.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Zero Network Uploads</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All spreadsheet parsing (SheetJS), CSV parsing (Papa Parse), data cleaning, matrix transformations, formula calculation, and format serialization happen strictly within browser memory via JavaScript and WebAssembly.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
            <Lock className="h-4 w-4" />
            <span>No Server &amp; No Database</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The platform contains no backend API, no database, no telemetry trackers, and no session recorders. Static hosting serves pre-compiled bundles directly to your client.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
            <HardDrive className="h-4 w-4" />
            <span>Ephemeral In-Memory Lifecycle</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Imported files are held in JavaScript variables during your session. As soon as you navigate away, reload the page, or click &ldquo;Clear File&rdquo;, the memory is discarded by browser garbage collection.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
            <EyeOff className="h-4 w-4" />
            <span>No AI Models or Cloud APIs</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Unlike modern AI-wrapped sites, Excel Toolkit never passes your proprietary tables or financial data to remote LLMs or third-party servers. All operations are deterministic code.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Verification Guide</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          You can independently verify network isolation: open your browser Developer Tools (F12), select the <strong>Network</strong> tab, disconnect your Wi-Fi, and convert or clean any spreadsheet. The entire workflow operates uninterrupted without any outbound requests.
        </p>
      </div>
    </div>
  );
};
