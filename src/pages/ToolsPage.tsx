import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight, X } from 'lucide-react';
import { TOOLS } from '../registry/toolRegistry';
import { CATEGORIES } from '../registry/categories';
import { ToolDefinition } from '../registry/types';

interface ToolsPageProps {
  initialCategory?: string;
  onSelectTool: (tool: ToolDefinition) => void;
  onCategoryChange?: (category: string) => void;
}

const FORMAT_FILTERS = ['all', '.xlsx', '.csv', '.json', '.sql', '.yaml', '.xml', '.md'] as const;

export const ToolsPage: React.FC<ToolsPageProps> = ({
  initialCategory = 'all',
  onSelectTool,
  onCategoryChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep category synchronized when navigating from Header links (e.g. Converters -> Cleaning)
  useEffect(() => {
    setSelectedCategory(initialCategory || 'all');
  }, [initialCategory]);

  const handleCategoryPick = (catId: string) => {
    setSelectedCategory(catId);
    onCategoryChange?.(catId);
  };

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      if (selectedCategory !== 'all' && tool.category !== selectedCategory) return false;
      if (selectedFormat !== 'all') {
        const hasFormat =
          tool.acceptedFormats.includes(selectedFormat) || tool.outputFormats.includes(selectedFormat);
        if (!hasFormat) return false;
      }
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.searchKeywords.some((k) => k.toLowerCase().includes(q)) ||
        tool.acceptedFormats.some((f) => f.toLowerCase().includes(q)) ||
        tool.outputFormats.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, selectedFormat, searchQuery]);

  const activeCategoryDef =
    selectedCategory !== 'all' ? CATEGORIES[selectedCategory as keyof typeof CATEGORIES] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {activeCategoryDef ? activeCategoryDef.name : 'Tool Directory'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeCategoryDef
              ? activeCategoryDef.description
              : `All ${TOOLS.length} browser-only spreadsheet utilities, converters, cleaners, and auditors.`}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tool directory"
            placeholder="Search tools, formats, actions..."
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] pl-9 pr-8 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category & Format Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleCategoryPick('all')}
            className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All ({TOOLS.length})
          </button>
          {Object.values(CATEGORIES).map((cat) => {
            const count = TOOLS.filter((t) => t.category === cat.id).length;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryPick(cat.id)}
                className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 mr-1">Format:</span>
            {FORMAT_FILTERS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                  selectedFormat === fmt
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {fmt === 'all' ? 'Any' : fmt}
              </button>
            ))}
          </div>

          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
            Showing {filteredTools.length} of {TOOLS.length} tools
          </span>
        </div>
      </div>

      {/* Tool Cards */}
      {filteredTools.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] py-14 text-center space-y-2">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">No tools matched your filters.</p>
          <button
            type="button"
            onClick={() => {
              handleCategoryPick('all');
              setSelectedFormat('all');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const cat = CATEGORIES[tool.category];
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool)}
                className="group text-left flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">{cat.name}</span>
                    {tool.outputFormats.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px]">{tool.outputFormats.join(', ')}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {tool.name}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{tool.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  <span>Open tool</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
