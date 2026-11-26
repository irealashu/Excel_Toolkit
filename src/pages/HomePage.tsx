import React from 'react';
import {
  ArrowRight,
  ArrowLeftRight,
  BarChart3,
  Calculator,
  Eye,
  FileSpreadsheet,
  FileText,
  GitCompare,
  Lock,
  ShieldCheck,
  Sparkles,
  Table,
  Cpu,
} from 'lucide-react';
import { TOOLS } from '../registry/toolRegistry';
import { CATEGORIES } from '../registry/categories';
import { ToolCategory, ToolDefinition } from '../registry/types';

interface HomePageProps {
  onNavigate: (tab: string, arg?: string) => void;
  onSelectTool: (tool: ToolDefinition) => void;
}

const CATEGORY_ICONS: Record<ToolCategory, React.FC<{ className?: string }>> = {
  viewers: Eye,
  editor: Table,
  converters: ArrowLeftRight,
  cleaning: Sparkles,
  comparison: GitCompare,
  formulas: Calculator,
  visualization: BarChart3,
  templates: FileSpreadsheet,
  security: ShieldCheck,
  documents: FileText,
};

const PREVIEW_ROWS = [
  { id: 'PRD-101', item: 'Enterprise Suite', qty: '150', price: '$1,200', formula: '=E2*F2', total: '$180,000.00' },
  { id: 'PRD-102', item: 'Analytics Node', qty: '310', price: '$2,400', formula: '=E3*F3', total: '$744,000.00' },
  { id: 'PRD-103', item: 'Cloud Connector', qty: '420', price: '$450', formula: '=E4*F4', total: '$189,000.00' },
  { id: 'PRD-104', item: 'Security Audit Kit', qty: '95', price: '$820', formula: '=E5*F5', total: '$77,900.00' },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectTool }) => {
  const featuredTools = TOOLS.filter((t) => t.featured);
  const categoryList = Object.values(CATEGORIES);

  return (
    <div className="space-y-16 pb-12">
      {/* Asymmetric SaaS Studio Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-4 lg:pt-8">
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[-0.02em] text-slate-900 dark:text-white leading-[1.12]">
              Precision spreadsheet tools, running locally in your browser.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Edit formulas, convert between 11 structured formats, clean messy datasets, diff workbooks, and inspect OpenXML macros without uploading a single byte to a server.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('editor')}
              className="inline-flex items-center gap-2 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-5 text-sm font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
            >
              <span>Open Spreadsheet Editor</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('tools')}
              className="inline-flex items-center gap-2 h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 px-5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
            >
              <span>Browse All {TOOLS.length} Tools</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              <strong className="font-semibold text-slate-900 dark:text-white">{TOOLS.length}</strong> browser utilities
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="font-semibold text-slate-900 dark:text-white">11</strong> export formats
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="font-semibold text-slate-900 dark:text-white">0 bytes</strong> uploaded
            </span>
          </div>
        </div>

        {/* Dominant Hero Focal Anchor: Live Formula Grid Preview */}
        <div className="lg:col-span-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2 font-mono text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">G6</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>=SUM(G2:G5)</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('editor')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                Open in Editor →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219]/60 text-slate-400">
                    <th className="w-8 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-normal"></th>
                    <th className="px-3 py-2 text-left border-r border-slate-200 dark:border-slate-800 font-semibold">A · SKU</th>
                    <th className="px-3 py-2 text-left border-r border-slate-200 dark:border-slate-800 font-semibold">B · Product</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-semibold">E · Qty</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-semibold">F · Price</th>
                    <th className="px-3 py-2 text-right font-semibold">G · Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {PREVIEW_ROWS.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="py-2 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0d1219]/30">
                        {idx + 2}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/60">
                        {row.id}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                        {row.item}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60">
                        {row.qty}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60">
                        {row.price}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100 font-medium">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50/60 dark:bg-emerald-950/25 font-semibold">
                    <td className="py-2.5 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800">6</td>
                    <td colSpan={4} className="px-3 py-2.5 font-sans text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                      Total Q3 Revenue (recursive formula evaluation)
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/60">
                      $1,190,900.00
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools Grid */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Featured Workspaces</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              High-frequency tools ready immediately with built-in sample datasets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tools')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
          >
            View all {TOOLS.length} tools →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredTools.map((tool) => {
            const cat = CATEGORIES[tool.category];
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool)}
                className="group text-left flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">{cat.name}</span>
                    {tool.outputFormats.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px]">{tool.outputFormats.slice(0, 3).join(', ')}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  <span>Open workspace</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tool Categories Grid */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Browse by Suite</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organized across 10 focused spreadsheet engineering categories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {categoryList.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const count = TOOLS.filter((t) => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (cat.id === 'editor') onNavigate('editor');
                  else if (cat.id === 'templates') onNavigate('templates');
                  else if (cat.id === 'security') onNavigate('security');
                  else onNavigate('category', cat.id);
                }}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">{count}</span>
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Architecture & Privacy Proof */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-display font-semibold text-sm">
              <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Strict Local Execution</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every XLSX workbook, CSV dataset, and JSON payload is parsed inside your browser&apos;s RAM using local libraries. No backend upload endpoints exist.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-display font-semibold text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Zero-Execution Macro Audit</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Inspect untrusted .xlsm and .xlsx packages by reading raw OpenXML ZIP streams to spot VBA binaries, hidden sheets, and author metadata safely.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-display font-semibold text-sm">
              <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Deterministic Formula Engine</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Recursive cell dependency evaluation with cycle protection and safe parsing—zero dynamic <code className="font-mono">eval()</code> calls anywhere in the engine.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => onNavigate('privacy')}
            className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Read Privacy Architecture →
          </button>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onNavigate('format-support')}
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
          >
            Inspect Format Support Matrix →
          </button>
        </div>
      </section>
    </div>
  );
};
