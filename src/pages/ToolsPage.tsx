import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowRight, Table, Sparkles, CheckCircle2 } from 'lucide-react';
import { TOOLS } from '../registry/toolRegistry';
import { CATEGORIES } from '../registry/categories';
import { ToolCategory, ToolDefinition } from '../registry/types';

interface ToolsPageProps {
  initialCategory?: string;
  onSelectTool: (tool: ToolDefinition) => void;
}

export const ToolsPage: React.FC<ToolsPageProps> = ({ initialCategory, onSelectTool }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');

  const formats = ['.xlsx', '.csv', '.json', '.md', '.sql', '.yaml', '.xml', '.tex'];

  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      // Category filter
      if (selectedCategory !== 'all' && tool.category !== selectedCategory) {
        return false;
      }
      // Format filter
      if (
        selectedFormat !== 'all' &&
        !tool.acceptedFormats.includes(selectedFormat) &&
        !tool.outputFormats.includes(selectedFormat)
      ) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.searchKeywords.some((k) => k.toLowerCase().includes(q)) ||
        tool.capabilities.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, selectedFormat, searchQuery]);

  return (
    <div className="space-y-8 py-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Spreadsheet &amp; Data Tools Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browser-only utilities with zero server upload. Instant execution and private processing.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all tools and keywords..."
            className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Bar: Categories & Formats */}
      <div className="space-y-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            All Categories ({TOOLS.length})
          </button>
          {Object.values(CATEGORIES).map((cat) => {
            const count = TOOLS.filter((t) => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Format Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Format:</span>
          <button
            onClick={() => setSelectedFormat('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              selectedFormat === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            ALL
          </button>
          {formats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                selectedFormat === fmt ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs">
            No tools match the selected filters or search query.
          </div>
        ) : (
          filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool)}
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-emerald-500/40 hover:bg-slate-900 hover:shadow-xl transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400 uppercase tracking-wide border border-slate-700">
                    {tool.category}
                  </span>
                  <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 font-medium border border-emerald-500/20">
                    {tool.implementationStatus}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>

                {/* Capabilities list */}
                <div className="space-y-1 pt-1">
                  {tool.capabilities.slice(0, 3).map((cap, i) => (
                    <div key={i} className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400/80 shrink-0" />
                      <span className="truncate">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs font-semibold text-emerald-400">
                <span>Launch Utility</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
