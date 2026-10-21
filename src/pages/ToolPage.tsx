import React from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Share2 } from 'lucide-react';
import { ToolDefinition } from '../registry/types';
import { SpreadsheetEditor } from '../components/spreadsheet/SpreadsheetEditor';
import { ConverterWorkspace } from '../components/tools/ConverterWorkspace';
import { CleaningWorkspace } from '../components/tools/CleaningWorkspace';
import { ComparisonWorkspace } from '../components/tools/ComparisonWorkspace';
import { FormulaWorkspace } from '../components/tools/FormulaWorkspace';
import { ChartWorkspace } from '../components/tools/ChartWorkspace';
import { TemplatesWorkspace } from '../components/tools/TemplatesWorkspace';
import { SecurityWorkspace } from '../components/tools/SecurityWorkspace';
import { DocumentWorkspace } from '../components/tools/DocumentWorkspace';

interface ToolPageProps {
  tool: ToolDefinition;
  onBack: () => void;
}

export const ToolPage: React.FC<ToolPageProps> = ({ tool, onBack }) => {
  const renderWorkspace = () => {
    switch (tool.category) {
      case 'editor':
        return <SpreadsheetEditor />;
      case 'converters':
        return <ConverterWorkspace initialToolId={tool.id} />;
      case 'cleaning':
        return <CleaningWorkspace initialToolId={tool.id} />;
      case 'comparison':
        return <ComparisonWorkspace />;
      case 'formulas':
        return <FormulaWorkspace />;
      case 'visualization':
        return <ChartWorkspace />;
      case 'templates':
        return <TemplatesWorkspace />;
      case 'security':
        return <SecurityWorkspace />;
      case 'documents':
        return <DocumentWorkspace />;
      case 'viewers':
      default:
        return <CleaningWorkspace initialToolId="dedupe" />;
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tools Directory</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="rounded bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 border border-emerald-500/20 font-medium">
            Local Execution
          </span>
        </div>
      </div>

      {/* Tool Header Summary */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{tool.name}</h1>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400 uppercase">
              {tool.category}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {tool.acceptedFormats.map((f) => (
              <span key={f} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          {tool.description}
        </p>

        {tool.capabilities && tool.capabilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
            {tool.capabilities.map((cap, i) => (
              <span key={i} className="flex items-center space-x-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{cap}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* The Active Interactive Tool Workspace */}
      <div className="pt-2">
        {renderWorkspace()}
      </div>
    </div>
  );
};
