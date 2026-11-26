import React from 'react';
import { Grid3X3 } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string, arg?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f14] text-slate-600 dark:text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-slate-900 dark:text-white font-display font-bold text-sm"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">
              <Grid3X3 className="h-3.5 w-3.5" />
            </span>
            <span>Excel Toolkit</span>
          </button>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-xs">
            Client-side spreadsheet editing, file conversion, data cleaning, and workbook auditing. Files remain strictly inside browser memory.
          </p>
        </div>

        <div>
          <h4 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-200 mb-3">
            Core Suites
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button type="button" onClick={() => onNavigate('editor')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Spreadsheet Editor
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('category', 'converters')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                File Converters
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('category', 'cleaning')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Data Cleaning &amp; Prep
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('category', 'comparison')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Workbook Diff &amp; Join
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-200 mb-3">
            Analysis &amp; Models
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button type="button" onClick={() => onNavigate('category', 'formulas')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Formula Builder
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('category', 'visualization')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Chart Studio
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('templates')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Spreadsheet Templates
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('security')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Security &amp; Macro Audit
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-200 mb-3">
            Documentation
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button type="button" onClick={() => onNavigate('format-support')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Format Support Matrix
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Privacy &amp; Offline Model
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('tools')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Full Tool Directory
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>Excel Toolkit · Local browser processing · MIT License</span>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Privacy
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onNavigate('format-support')} className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Formats
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onNavigate('security')} className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Security
          </button>
        </div>
      </div>
    </footer>
  );
};
