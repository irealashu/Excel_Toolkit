import React from 'react';
import { ShieldCheck, HardDrive, WifiOff, FileCheck2, Github } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string, arg?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: Mission & Privacy */}
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-white text-sm">Excel Toolkit</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A static, browser-only spreadsheet and data engineering platform. All parsing, calculations, and conversions execute on your device with complete network isolation.
          </p>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-medium">
            <WifiOff className="h-3.5 w-3.5" />
            <span>Works completely offline</span>
          </div>
        </div>

        {/* Col 2: Core Tool Suites */}
        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Tool Suites</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button onClick={() => onNavigate('editor')} className="hover:text-emerald-400 transition-colors">
                Spreadsheet Editor
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('category', 'converters')} className="hover:text-emerald-400 transition-colors">
                File Converters (CSV, JSON, SQL)
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('category', 'cleaning')} className="hover:text-emerald-400 transition-colors">
                Data Cleaning & Deduplication
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('category', 'comparison')} className="hover:text-emerald-400 transition-colors">
                Workbook Comparison & Joiner
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('category', 'formulas')} className="hover:text-emerald-400 transition-colors">
                Formula Builder & Cheatsheet
              </button>
            </li>
          </ul>
        </div>

        {/* Col 3: Utilities & Models */}
        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Resources</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button onClick={() => onNavigate('category', 'templates')} className="hover:text-emerald-400 transition-colors">
                20+ Spreadsheet Templates
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('security')} className="hover:text-emerald-400 transition-colors">
                VBA Macro & Security Inspector
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('category', 'visualization')} className="hover:text-emerald-400 transition-colors">
                Chart Studio & Profiling
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('privacy')} className="hover:text-emerald-400 transition-colors">
                Privacy Architecture
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4: Privacy & Client Storage */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Device Architecture</h4>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-1.5">
                <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                <span>Local Session:</span>
              </span>
              <span className="text-emerald-400 font-mono">In-Memory</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Zero File Uploads:</span>
              </span>
              <span className="text-emerald-400 font-mono">Enforced</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Open Source • MIT License • No tracking cookies or advertising.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
        <div>© 2026 Excel Toolkit. Fully client-side spreadsheet software.</div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <button onClick={() => onNavigate('privacy')} className="hover:text-slate-300">Privacy Model</button>
          <span>•</span>
          <button onClick={() => onNavigate('format-support')} className="hover:text-slate-300">Format Support</button>
          <span>•</span>
          <button onClick={() => onNavigate('about')} className="hover:text-slate-300">Architecture</button>
        </div>
      </div>
    </footer>
  );
};
