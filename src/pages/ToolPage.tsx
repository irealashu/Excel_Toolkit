import React from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { ToolDefinition } from '../registry/types';
import { CATEGORIES } from '../registry/categories';
import { getToolsByCategory } from '../registry/toolRegistry';
import { SpreadsheetEditor } from '../components/spreadsheet/SpreadsheetEditor';
import { ViewerWorkspace } from '../components/tools/ViewerWorkspace';
import { ConverterWorkspace } from '../components/tools/ConverterWorkspace';
import { CleaningWorkspace } from '../components/tools/CleaningWorkspace';
import { ComparisonWorkspace } from '../components/tools/ComparisonWorkspace';
import { FormulaWorkspace } from '../components/tools/FormulaWorkspace';
import { ChartWorkspace } from '../components/tools/ChartWorkspace';
import { TemplatesWorkspace } from '../components/tools/TemplatesWorkspace';
import { SecurityWorkspace } from '../components/tools/SecurityWorkspace';
import { DocumentWorkspace } from '../components/tools/DocumentWorkspace';
import { PdfOcrWorkspace } from '../components/tools/PdfOcrWorkspace';

interface ToolPageProps {
  tool: ToolDefinition;
  onNavigate: (tab: string, arg?: string) => void;
  onSelectTool: (tool: ToolDefinition) => void;
}

export const ToolPage: React.FC<ToolPageProps> = ({ tool, onNavigate, onSelectTool }) => {
  const category = CATEGORIES[tool.category];
  const relatedTools = getToolsByCategory(tool.category)
    .filter((t) => t.id !== tool.id)
    .slice(0, 3);

  const renderWorkspace = () => {
    if (tool.id === 'pdf-to-excel-ocr') {
      return <PdfOcrWorkspace />;
    }
    switch (tool.category) {
      case 'viewers':
        return <ViewerWorkspace />;
      case 'editor':
        return <SpreadsheetEditor />;
      case 'converters':
        return <ConverterWorkspace initialToolId={tool.id} />;
      case 'cleaning':
        return <CleaningWorkspace initialToolId={tool.id} />;
      case 'comparison':
        return <ComparisonWorkspace initialToolId={tool.id} />;
      case 'formulas':
        return <FormulaWorkspace initialToolId={tool.id} />;
      case 'visualization':
        return <ChartWorkspace />;
      case 'templates':
        return <TemplatesWorkspace />;
      case 'security':
        return <SecurityWorkspace />;
      case 'documents':
        return <DocumentWorkspace />;
      default:
        return <ViewerWorkspace />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Tool Header */}
      <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => onNavigate('tools')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Directory
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button
            type="button"
            onClick={() => onNavigate('category', tool.category)}
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {category.name}
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-slate-900 dark:text-slate-200">{tool.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {tool.name}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tool.description}</p>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0 space-y-0.5 lg:text-right">
            {tool.acceptedFormats.length > 0 && (
              <div>Input: {tool.acceptedFormats.join(', ')}</div>
            )}
            {tool.outputFormats.length > 0 && (
              <div>Output: {tool.outputFormats.join(', ')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div>{renderWorkspace()}</div>

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <section className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Related in {category.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedTools.map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => onSelectTool(rel)}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {rel.name}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{rel.description}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
