import React from 'react';
import {
  FileSpreadsheet,
  Table,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowLeftRight,
  GitCompare,
  Calculator,
  BarChart3,
  Lock,
  WifiOff,
  FolderDown,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { CATEGORIES } from '../registry/categories';
import { TOOLS } from '../registry/toolRegistry';
import { ToolCategory, ToolDefinition } from '../registry/types';

interface HomePageProps {
  onNavigate: (tab: string, arg?: string) => void;
  onSelectTool: (tool: ToolDefinition) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectTool }) => {
  const featuredTools = TOOLS.filter((t) => t.featured);

  return (
    <div className="space-y-16 py-8">
      {/* 1. Hero Section */}
      <section className="relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>100% Client-Side • Zero Data Uploaded to Cloud</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            The Complete Browser Spreadsheet &amp; Data Utility Platform
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            View, edit, convert, clean, diff, and visualize your spreadsheets directly on your machine.
            Zero server reliance, instant performance, and enterprise-grade privacy.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('editor')}
              className="flex items-center space-x-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
            >
              <Table className="h-4 w-4 stroke-[2.5]" />
              <span>Launch Spreadsheet Editor</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => onNavigate('tools')}
              className="flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition-all"
            >
              <span>Explore All 25+ Tools</span>
            </button>
          </div>

          {/* Privacy & Feature Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>No Registration</span>
            </div>
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Offline Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Instant In-Memory</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Strict Network Isolation</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Tools */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Featured Power Utilities</h2>
            <p className="text-xs text-slate-400 mt-1">Direct access to the most widely-used spreadsheet capabilities</p>
          </div>
          <button
            onClick={() => onNavigate('tools')}
            className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool)}
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 hover:border-emerald-500/40 hover:bg-slate-900 hover:shadow-xl transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400 uppercase tracking-wide border border-slate-700">
                    {tool.category}
                  </span>
                  <div className="flex gap-1">
                    {tool.acceptedFormats.slice(0, 2).map((fmt) => (
                      <span key={fmt} className="text-[10px] font-mono text-slate-500">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs font-medium text-emerald-400">
                <span>Launch Tool</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Category Matrix Grid */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Suite Categories</h2>
          <p className="text-xs text-slate-400 mt-1">Explore purpose-built toolsets organized by workflow</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.values(CATEGORIES).map((cat) => {
            const count = TOOLS.filter((t) => t.category === cat.id).length;
            return (
              <div
                key={cat.id}
                onClick={() => onNavigate('category', cat.id)}
                className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 hover:bg-slate-900/80 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-400">
                    {count} tools
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Privacy & Architecture Banner */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Your Data Never Leaves Your Device</h3>
        <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
          Traditional web converters and spreadsheet SaaS upload your confidential files to remote servers.
          Excel Toolkit executes all calculations, regex parses, formulas, and conversions locally in WebAssembly and browser memory.
        </p>
        <button
          onClick={() => onNavigate('privacy')}
          className="text-xs font-semibold text-emerald-400 hover:underline"
        >
          Read the Privacy &amp; Security Model →
        </button>
      </section>
    </div>
  );
};
