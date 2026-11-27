import React, { useMemo, useState } from 'react';
import { Download, Search, Eye, X } from 'lucide-react';
import { SpreadsheetTemplate, TEMPLATES } from '../../core/templates';
import { downloadCsv, downloadXlsx } from '../../core/files/downloadBlob';
import { DataPreviewTable } from './DataPreviewTable';

const CATEGORIES = ['All', 'Finance', 'Operations', 'Project', 'HR', 'Sales'] as const;

export const TemplatesWorkspace: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<SpreadsheetTemplate | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const handleDownloadXlsx = (tpl: SpreadsheetTemplate) => {
    downloadXlsx(tpl.sheets, `${tpl.id}_template.xlsx`);
  };

  const handleDownloadCsv = (tpl: SpreadsheetTemplate) => {
    const first = tpl.sheets[0];
    downloadCsv(first.headers, first.rows, `${tpl.id}_template.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search templates"
            placeholder="Search templates..."
            className="h-8 w-full sm:w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Live Preview Panel */}
      {previewTemplate && (
        <div className="space-y-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/15 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Preview: {previewTemplate.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Starter template with placeholder fields — verify figures and formulas for your use case.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewTemplate(null)}
              aria-label="Close template preview"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DataPreviewTable
            headers={previewTemplate.sheets[0].headers}
            rows={previewTemplate.sheets[0].rows}
            title={previewTemplate.sheets[0].name}
            filename={previewTemplate.id}
            maxInitialRows={10}
          />
        </div>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tpl) => {
          const firstSheet = tpl.sheets[0];
          return (
            <div
              key={tpl.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{tpl.category}</span>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {firstSheet.rows.length} rows × {firstSheet.headers.length} cols
                  </span>
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{tpl.description}</p>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3.5">
                <button
                  type="button"
                  onClick={() => handleDownloadXlsx(tpl)}
                  className="inline-flex items-center justify-center gap-1.5 h-8 flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-3 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv(tpl)}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(tpl)}
                  aria-label={`Preview ${tpl.name}`}
                  className="inline-flex items-center gap-1 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] py-12 text-center text-sm text-slate-500">
          No templates matched &ldquo;{searchQuery}&rdquo;.
        </div>
      )}
    </div>
  );
};
