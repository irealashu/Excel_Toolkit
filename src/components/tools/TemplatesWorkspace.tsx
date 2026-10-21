import React, { useState } from 'react';
import { FileSpreadsheet, Download, Search, Check, Sparkles, Layers, Eye } from 'lucide-react';
import { TEMPLATES, SpreadsheetTemplate } from '../../core/templates';
import { downloadXlsx, downloadCsv } from '../../core/files/downloadBlob';
import { DataPreviewTable } from './DataPreviewTable';

export const TemplatesWorkspace: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<SpreadsheetTemplate | null>(TEMPLATES[0]);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const categories = ['All', 'Finance', 'Operations', 'Project', 'HR', 'Sales'];

  const filteredTemplates = TEMPLATES.filter((tmpl) => {
    if (selectedCategory !== 'All' && tmpl.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tmpl.name.toLowerCase().includes(q) ||
      tmpl.description.toLowerCase().includes(q) ||
      tmpl.category.toLowerCase().includes(q)
    );
  });

  const handleDownloadTemplate = (tmpl: SpreadsheetTemplate) => {
    downloadXlsx(tmpl.sheets, `${tmpl.id}.xlsx`);
    setDownloadSuccessId(tmpl.id);
    setTimeout(() => setDownloadSuccessId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            <span>Downloadable Spreadsheet Template Vault</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            20+ professionally structured XLSX models with sample formulas, balance sheets, and project trackers.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-9 w-64 rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tmpl) => {
          const isSelected = previewTemplate?.id === tmpl.id;
          const isDownloaded = downloadSuccessId === tmpl.id;

          return (
            <div
              key={tmpl.id}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-emerald-500/50 bg-emerald-950/20 ring-1 ring-emerald-500/40'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-slate-700">
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {tmpl.sheets[0].rows.length} rows
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">{tmpl.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{tmpl.description}</p>
              </div>

              <div className="flex items-center space-x-2 pt-4 mt-3 border-t border-slate-800/80">
                <button
                  onClick={() => setPreviewTemplate(tmpl)}
                  className="flex-1 flex items-center justify-center space-x-1.5 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => handleDownloadTemplate(tmpl)}
                  className="flex-1 flex items-center justify-center space-x-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition-colors"
                >
                  {isDownloaded ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                  <span>{isDownloaded ? 'Downloaded' : 'Get XLSX'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Preview of Selected Template */}
      {previewTemplate && (
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Active Template Inspection:
              </span>
              <h4 className="text-base font-bold text-white">{previewTemplate.name}</h4>
            </div>

            <button
              onClick={() => handleDownloadTemplate(previewTemplate)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Full {previewTemplate.name} (.xlsx)</span>
            </button>
          </div>

          <DataPreviewTable
            headers={previewTemplate.sheets[0].headers}
            rows={previewTemplate.sheets[0].rows}
            title={`${previewTemplate.sheets[0].name} (Sheet 1)`}
            filename={previewTemplate.id}
          />
        </div>
      )}
    </div>
  );
};
