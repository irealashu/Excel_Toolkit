import React, { useState } from 'react';
import {
  Calculator,
  Copy,
  Check,
  Calendar,
  Layers,
  BookOpen,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import {
  generateFormula,
  FORMULA_CHEATSHEET,
  colLetterToIndex,
  indexToColLetter,
  excelSerialToDate,
  dateToExcelSerial
} from '../../core/formulas';

export const FormulaWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generator' | 'date' | 'column' | 'cheatsheet'>('generator');
  const [formulaType, setFormulaType] = useState<'xlookup' | 'vlookup' | 'index_match' | 'if' | 'sumif' | 'countif' | 'textjoin'>('xlookup');

  // Generator inputs
  const [lookupValue, setLookupValue] = useState('A2');
  const [lookupArray, setLookupArray] = useState('Products!$A$2:$A$500');
  const [returnArray, setReturnArray] = useState('Products!$D$2:$D$500');
  const [notFoundValue, setNotFoundValue] = useState('Item Not Found');
  const [tableRange, setTableRange] = useState('LookupTable!$A$2:$F$200');
  const [colIndex, setColIndex] = useState('3');
  const [ifCondition, setIfCondition] = useState('C2 >= 1000');
  const [valueIfTrue, setValueIfTrue] = useState('"Premium Tier"');
  const [valueIfFalse, setValueIfFalse] = useState('"Standard Tier"');
  const [copied, setCopied] = useState(false);

  // Column converter input
  const [colLetterInput, setColLetterInput] = useState('AA');
  const [colIndexInput, setColIndexInput] = useState('27');

  // Date serial input
  const [serialInput, setSerialInput] = useState('45600');
  const [dateInput, setDateInput] = useState('2026-11-04');

  // Compute generated formula
  const generated = React.useMemo(() => {
    switch (formulaType) {
      case 'xlookup':
        return generateFormula({
          type: 'xlookup',
          params: { lookupValue, lookupArray, returnArray, ifNotFound: notFoundValue },
        });
      case 'vlookup':
        return generateFormula({
          type: 'vlookup',
          params: { lookupValue, tableRange, colIndex, exactMatch: 'true' },
        });
      case 'index_match':
        return generateFormula({
          type: 'index_match',
          params: { returnRange: returnArray, lookupValue, lookupRange: lookupArray },
        });
      case 'if':
        return generateFormula({
          type: 'if',
          params: { condition: ifCondition, valueIfTrue, valueIfFalse },
        });
      case 'sumif':
        return generateFormula({
          type: 'sumif',
          params: { range: 'Orders!$B$2:$B$1000', criteria: '">500"', sumRange: 'Orders!$E$2:$E$1000' },
        });
      case 'countif':
        return generateFormula({
          type: 'countif',
          params: { range: 'Tasks!$D$2:$D$500', criteria: '"Completed"' },
        });
      case 'textjoin':
        return generateFormula({
          type: 'textjoin',
          params: { delimiter: '", "', ignoreEmpty: 'true', textRange: 'A2:E2' },
        });
    }
  }, [formulaType, lookupValue, lookupArray, returnArray, notFoundValue, tableRange, colIndex, ifCondition, valueIfTrue, valueIfFalse]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generated.formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Sub-nav pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'generator', label: 'Formula Synthesizer', icon: Calculator },
          { id: 'column', label: 'Column Letter ↔ Index', icon: Layers },
          { id: 'date', label: 'Excel Date & Serial', icon: Calendar },
          { id: 'cheatsheet', label: 'Formula Cheatsheet', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                  : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Formula Generator View */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Config */}
          <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Formula Type</h4>
            <div className="space-y-1">
              {[
                { id: 'xlookup', name: 'XLOOKUP (Modern)', badge: 'Recommended' },
                { id: 'vlookup', name: 'VLOOKUP (Legacy Table)', badge: 'Traditional' },
                { id: 'index_match', name: 'INDEX / MATCH (Flexible)', badge: '2-Way' },
                { id: 'if', name: 'IF / Conditional', badge: 'Logic' },
                { id: 'sumif', name: 'SUMIF (Conditional Sum)', badge: 'Math' },
                { id: 'countif', name: 'COUNTIF (Criteria Count)', badge: 'Stats' },
                { id: 'textjoin', name: 'TEXTJOIN (Concatenation)', badge: 'Text' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormulaType(f.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    formulaType === f.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{f.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{f.badge}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3 text-xs">
              <h5 className="font-semibold text-slate-200">Parameters</h5>
              {formulaType === 'xlookup' && (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1">Lookup Value (Cell):</label>
                    <input
                      type="text"
                      value={lookupValue}
                      onChange={(e) => setLookupValue(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Lookup Array Range:</label>
                    <input
                      type="text"
                      value={lookupArray}
                      onChange={(e) => setLookupArray(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Return Array Range:</label>
                    <input
                      type="text"
                      value={returnArray}
                      onChange={(e) => setReturnArray(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">If Not Found (Fallback):</label>
                    <input
                      type="text"
                      value={notFoundValue}
                      onChange={(e) => setNotFoundValue(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white"
                    />
                  </div>
                </>
              )}

              {formulaType === 'vlookup' && (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1">Lookup Value (Cell):</label>
                    <input
                      type="text"
                      value={lookupValue}
                      onChange={(e) => setLookupValue(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Table Array Range:</label>
                    <input
                      type="text"
                      value={tableRange}
                      onChange={(e) => setTableRange(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Column Index Number (1-based):</label>
                    <input
                      type="text"
                      value={colIndex}
                      onChange={(e) => setColIndex(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                </>
              )}

              {formulaType === 'if' && (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1">Condition:</label>
                    <input
                      type="text"
                      value={ifCondition}
                      onChange={(e) => setIfCondition(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Value If True:</label>
                    <input
                      type="text"
                      value={valueIfTrue}
                      onChange={(e) => setValueIfTrue(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Value If False:</label>
                    <input
                      type="text"
                      value={valueIfFalse}
                      onChange={(e) => setValueIfFalse(e.target.value)}
                      className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2.5 text-white font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right / Output card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Generated Excel Formula
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Formula'}</span>
                </button>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-base text-emerald-400 break-all select-all">
                {generated.formula}
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-300 block mb-1">Formula Syntax:</span>
                  <code className="text-slate-400 font-mono text-[11px]">{generated.syntax}</code>
                </div>
                <div>
                  <span className="font-semibold text-slate-300 block mb-1">Step-by-Step Rule Explanation:</span>
                  <p className="text-slate-400 leading-relaxed">{generated.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Column letter index converter */}
      {activeTab === 'column' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h4 className="text-sm font-semibold text-white">Column Letter → 1-Based Index</h4>
            <p className="text-xs text-slate-400">Convert spreadsheet column letters (e.g. A, Z, AA, XFD) to numbers.</p>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={colLetterInput}
                onChange={(e) => setColLetterInput(e.target.value.toUpperCase())}
                placeholder="e.g. AA"
                className="h-9 w-32 rounded border border-slate-700 bg-slate-800 px-3 font-mono text-sm uppercase text-white"
              />
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <div className="flex h-9 min-w-20 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/30 px-3 font-mono text-base font-bold text-emerald-400">
                {colLetterToIndex(colLetterInput) || 'Invalid'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h4 className="text-sm font-semibold text-white">Index Number → Column Letter</h4>
            <p className="text-xs text-slate-400">Convert 1-based index numbers to Excel column letters.</p>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={colIndexInput}
                onChange={(e) => setColIndexInput(e.target.value)}
                placeholder="e.g. 27"
                className="h-9 w-32 rounded border border-slate-700 bg-slate-800 px-3 font-mono text-sm text-white"
              />
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <div className="flex h-9 min-w-20 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/30 px-3 font-mono text-base font-bold text-emerald-400">
                {indexToColLetter(Number(colIndexInput) || 1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Date serial converter */}
      {activeTab === 'date' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h4 className="text-sm font-semibold text-white">Excel Serial Number → Date</h4>
            <p className="text-xs text-slate-400">Excel serial 45600 represents days since 1899-12-30.</p>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="45600"
                className="h-9 w-32 rounded border border-slate-700 bg-slate-800 px-3 font-mono text-sm text-white"
              />
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <div className="flex h-9 px-3 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs font-bold text-emerald-400">
                {excelSerialToDate(Number(serialInput) || 0).toISOString().split('T')[0]}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h4 className="text-sm font-semibold text-white">Standard Date → Excel Serial Number</h4>
            <p className="text-xs text-slate-400">Calculate the integer serial date for Excel date formulas.</p>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="h-9 w-40 rounded border border-slate-700 bg-slate-800 px-3 font-mono text-sm text-white"
              />
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <div className="flex h-9 min-w-20 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/30 px-3 font-mono text-base font-bold text-emerald-400">
                {dateToExcelSerial(new Date(dateInput))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Formula Cheatsheet */}
      {activeTab === 'cheatsheet' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Excel Function Master Cheatsheet
            </h4>
          </div>

          <div className="divide-y divide-slate-800">
            {FORMULA_CHEATSHEET.map((fn, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 hover:bg-slate-800/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm font-mono">{fn.name}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-slate-700">
                      {fn.cat}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{fn.desc}</p>
                </div>
                <code className="text-xs font-mono text-emerald-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded self-start sm:self-center">
                  {fn.syntax}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
