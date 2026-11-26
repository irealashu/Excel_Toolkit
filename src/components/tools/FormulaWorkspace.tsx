import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Search } from 'lucide-react';
import {
  colLetterToIndex,
  dateToExcelSerial,
  excelSerialToDate,
  FORMULA_CHEATSHEET,
  FormulaGeneratorConfig,
  generateFormula,
  indexToColLetter,
} from '../../core/formulas';

type FormulaTab = 'builder' | 'date' | 'column' | 'cheatsheet';
type FormulaType = FormulaGeneratorConfig['type'];

function mapToolToTab(toolId?: string): FormulaTab {
  if (toolId === 'date-calculator') return 'date';
  if (toolId === 'column-converter') return 'column';
  return 'builder';
}

const FORMULA_TYPES: { id: FormulaType; label: string }[] = [
  { id: 'xlookup', label: 'XLOOKUP' },
  { id: 'vlookup', label: 'VLOOKUP' },
  { id: 'index_match', label: 'INDEX / MATCH' },
  { id: 'if', label: 'IF Logic' },
  { id: 'sumif', label: 'SUMIF' },
  { id: 'countif', label: 'COUNTIF' },
  { id: 'textjoin', label: 'TEXTJOIN' },
];

const DEFAULT_PARAMS: Record<FormulaType, Record<string, string>> = {
  xlookup: {
    lookupValue: 'A2',
    lookupArray: 'Data!$A$2:$A$100',
    returnArray: 'Data!$C$2:$C$100',
    ifNotFound: 'Not Found',
  },
  vlookup: {
    lookupValue: 'A2',
    tableRange: 'LookupSheet!$A$2:$D$100',
    colIndex: '3',
    exactMatch: 'true',
  },
  index_match: {
    returnRange: 'Data!$C$2:$C$100',
    lookupValue: 'A2',
    lookupRange: 'Data!$A$2:$A$100',
  },
  if: {
    condition: 'G2>5000',
    valueIfTrue: '"Enterprise"',
    valueIfFalse: '"Standard"',
  },
  sumif: {
    range: 'C2:C100',
    criteria: '"North America"',
    sumRange: 'G2:G100',
  },
  countif: {
    range: 'H2:H100',
    criteria: '"Completed"',
  },
  textjoin: {
    delimiter: '", "',
    ignoreEmpty: 'true',
    textRange: 'A2:D2',
  },
};

interface FormulaWorkspaceProps {
  initialToolId?: string;
}

export const FormulaWorkspace: React.FC<FormulaWorkspaceProps> = ({ initialToolId }) => {
  const [activeTab, setActiveTab] = useState<FormulaTab>(() => mapToolToTab(initialToolId));
  const [formulaType, setFormulaType] = useState<FormulaType>('xlookup');
  const [params, setParams] = useState<Record<string, string>>(DEFAULT_PARAMS.xlookup);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Date converter state
  const [serialInput, setSerialInput] = useState('46350');
  const [isoInput, setIsoInput] = useState('2026-11-24');
  const [dateSystem, setDateSystem] = useState<'1900' | '1904'>('1900');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  // Column converter state
  const [colLetter, setColLetter] = useState('AA');
  const [colIndex, setColIndex] = useState('27');
  const [rangeInput, setRangeInput] = useState('B2:H45');

  // Cheatsheet filter
  const [cheatSearch, setCheatSearch] = useState('');

  useEffect(() => {
    setActiveTab(mapToolToTab(initialToolId));
  }, [initialToolId]);

  const handleSelectFormulaType = (type: FormulaType) => {
    setFormulaType(type);
    setParams({ ...DEFAULT_PARAMS[type] });
  };

  const updateParam = (key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const generated = useMemo(() => generateFormula({ type: formulaType, params }), [formulaType, params]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  // Date calculations
  const serialOffset = dateSystem === '1904' ? 1462 : 0;
  const serialToIso = useMemo(() => {
    const n = Number(serialInput);
    if (!Number.isFinite(n)) return 'Invalid serial number';
    const d = excelSerialToDate(n + serialOffset);
    return isNaN(d.getTime()) ? 'Invalid serial number' : d.toISOString().split('T')[0];
  }, [serialInput, serialOffset]);

  const isoToSerial = useMemo(() => {
    const d = new Date(`${isoInput}T00:00:00Z`);
    if (isNaN(d.getTime())) return 'Invalid date';
    return String(dateToExcelSerial(d) - serialOffset);
  }, [isoInput, serialOffset]);

  const dateDiffStats = useMemo(() => {
    const d1 = new Date(`${startDate}T00:00:00Z`);
    const d2 = new Date(`${endDate}T00:00:00Z`);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    const msPerDay = 86400000;
    const calendarDays = Math.round((d2.getTime() - d1.getTime()) / msPerDay);
    let businessDays = 0;
    const step = d2 >= d1 ? 1 : -1;
    const cur = new Date(d1.getTime());
    const limit = Math.min(Math.abs(calendarDays), 40000);
    for (let i = 0; i <= limit; i++) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) businessDays++;
      cur.setUTCDate(cur.getUTCDate() + step);
    }
    return { calendarDays, businessDays: step > 0 ? businessDays : -businessDays };
  }, [startDate, endDate]);

  // Column range stats
  const rangeStats = useMemo(() => {
    const m = rangeInput.trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!m) return null;
    const c1 = colLetterToIndex(m[1]);
    const r1 = parseInt(m[2], 10);
    const c2 = colLetterToIndex(m[3]);
    const r2 = parseInt(m[4], 10);
    const cols = Math.abs(c2 - c1) + 1;
    const rows = Math.abs(r2 - r1) + 1;
    return { rows, cols, cells: rows * cols };
  }, [rangeInput]);

  const filteredCheatsheet = useMemo(() => {
    const q = cheatSearch.trim().toLowerCase();
    if (!q) return FORMULA_CHEATSHEET;
    return FORMULA_CHEATSHEET.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.cat.toLowerCase().includes(q) ||
        f.desc.toLowerCase().includes(q) ||
        f.syntax.toLowerCase().includes(q)
    );
  }, [cheatSearch]);

  const inputCls =
    'h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none';

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-4">
        {(
          [
            { id: 'builder', label: 'Formula Builder' },
            { id: 'date', label: 'Excel Date & Serial' },
            { id: 'column', label: 'Column Letter ↔ Index' },
            { id: 'cheatsheet', label: 'Reference Cheatsheet' },
          ] as { id: FormulaTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`h-8 rounded-lg border px-3.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: FORMULA BUILDER */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-5">
            <div className="flex flex-wrap gap-1.5">
              {FORMULA_TYPES.map((ft) => (
                <button
                  key={ft.id}
                  type="button"
                  onClick={() => handleSelectFormulaType(ft.id)}
                  className={`h-8 rounded-lg border px-3 text-xs font-mono font-medium transition-colors ${
                    formulaType === ft.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {formulaType === 'xlookup' && (
                <>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Lookup Value</span>
                    <input value={params.lookupValue || ''} onChange={(e) => updateParam('lookupValue', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Lookup Array</span>
                    <input value={params.lookupArray || ''} onChange={(e) => updateParam('lookupArray', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Return Array</span>
                    <input value={params.returnArray || ''} onChange={(e) => updateParam('returnArray', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Fallback If Not Found</span>
                    <input value={params.ifNotFound || ''} onChange={(e) => updateParam('ifNotFound', e.target.value)} className={inputCls} />
                  </label>
                </>
              )}

              {formulaType === 'vlookup' && (
                <>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Lookup Value</span>
                    <input value={params.lookupValue || ''} onChange={(e) => updateParam('lookupValue', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Table Array Range</span>
                    <input value={params.tableRange || ''} onChange={(e) => updateParam('tableRange', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Column Index Number</span>
                    <input type="number" min={1} value={params.colIndex || '3'} onChange={(e) => updateParam('colIndex', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Match Mode</span>
                    <select value={params.exactMatch || 'true'} onChange={(e) => updateParam('exactMatch', e.target.value)} className={inputCls}>
                      <option value="true">Exact match (FALSE)</option>
                      <option value="false">Approximate match (TRUE)</option>
                    </select>
                  </label>
                </>
              )}

              {formulaType === 'index_match' && (
                <>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Return Column Range</span>
                    <input value={params.returnRange || ''} onChange={(e) => updateParam('returnRange', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Lookup Value</span>
                    <input value={params.lookupValue || ''} onChange={(e) => updateParam('lookupValue', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 sm:col-span-2 text-slate-600 dark:text-slate-300">
                    <span>Lookup Column Range</span>
                    <input value={params.lookupRange || ''} onChange={(e) => updateParam('lookupRange', e.target.value)} className={inputCls} />
                  </label>
                </>
              )}

              {formulaType === 'if' && (
                <>
                  <label className="space-y-1 sm:col-span-2 text-slate-600 dark:text-slate-300">
                    <span>Logical Condition</span>
                    <input value={params.condition || ''} onChange={(e) => updateParam('condition', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Value If True</span>
                    <input value={params.valueIfTrue || ''} onChange={(e) => updateParam('valueIfTrue', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Value If False</span>
                    <input value={params.valueIfFalse || ''} onChange={(e) => updateParam('valueIfFalse', e.target.value)} className={inputCls} />
                  </label>
                </>
              )}

              {formulaType === 'sumif' && (
                <>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Criteria Range</span>
                    <input value={params.range || ''} onChange={(e) => updateParam('range', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Criteria</span>
                    <input value={params.criteria || ''} onChange={(e) => updateParam('criteria', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 sm:col-span-2 text-slate-600 dark:text-slate-300">
                    <span>Sum Range (optional)</span>
                    <input value={params.sumRange || ''} onChange={(e) => updateParam('sumRange', e.target.value)} className={inputCls} />
                  </label>
                </>
              )}

              {formulaType === 'countif' && (
                <>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Range</span>
                    <input value={params.range || ''} onChange={(e) => updateParam('range', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Criteria</span>
                    <input value={params.criteria || ''} onChange={(e) => updateParam('criteria', e.target.value)} className={inputCls} />
                  </label>
                </>
              )}

              {formulaType === 'textjoin' && (
                <>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Delimiter</span>
                    <input value={params.delimiter || ''} onChange={(e) => updateParam('delimiter', e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1 text-slate-600 dark:text-slate-300">
                    <span>Ignore Empty Cells</span>
                    <select value={params.ignoreEmpty || 'true'} onChange={(e) => updateParam('ignoreEmpty', e.target.value)} className={inputCls}>
                      <option value="true">TRUE (Skip blanks)</option>
                      <option value="false">FALSE (Include blanks)</option>
                    </select>
                  </label>
                  <label className="space-y-1 sm:col-span-2 text-slate-600 dark:text-slate-300">
                    <span>Text Range</span>
                    <input value={params.textRange || ''} onChange={(e) => updateParam('textRange', e.target.value)} className={inputCls} />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Generated Formula
                </span>
                <button
                  type="button"
                  onClick={() => copyText(generated.formula, 'generated')}
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-3 text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                >
                  {copiedId === 'generated' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'generated' ? 'Copied' : 'Copy Formula'}</span>
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0d1219] p-4 font-mono text-sm text-emerald-700 dark:text-emerald-400 break-all">
                {generated.formula}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Explanation</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{generated.explanation}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Syntax</div>
              <code className="text-xs font-mono text-slate-600 dark:text-slate-300">{generated.syntax}</code>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATE & SERIAL */}
      {activeTab === 'date' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Serial ↔ ISO Date Converter
              </h3>
              <select
                aria-label="Excel date system"
                value={dateSystem}
                onChange={(e) => setDateSystem(e.target.value as '1900' | '1904')}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="1900">1900 System (Windows / Default)</option>
                <option value="1904">1904 System (Legacy Mac)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>Excel Serial Number</span>
                <input type="number" value={serialInput} onChange={(e) => setSerialInput(e.target.value)} className={inputCls} />
              </label>
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400">ISO Date Result</span>
                <div className="h-9 flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] px-3 font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {serialToIso}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-slate-200 dark:border-slate-800 pt-4">
              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>ISO Date (YYYY-MM-DD)</span>
                <input type="date" value={isoInput} onChange={(e) => setIsoInput(e.target.value)} className={inputCls} />
              </label>
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400">Excel Serial Result</span>
                <div className="h-9 flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] px-3 font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {isoToSerial}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Date Difference & Business Days
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>Start Date</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>End Date</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </label>
            </div>
            {dateDiffStats && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Calendar Days</div>
                  <div className="font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {dateDiffStats.calendarDays.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Business Days (Mon–Fri)</div>
                  <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {dateDiffStats.businessDays.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Excel equivalents: <code className="text-slate-800 dark:text-slate-200">=DATEDIF(A2, B2, &quot;d&quot;)</code> ·{' '}
              <code className="text-slate-800 dark:text-slate-200">=NETWORKDAYS(A2, B2)</code>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COLUMN CONVERTER */}
      {activeTab === 'column' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              A1 Column Letter ↔ 1-Based Index
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>Column Letter (e.g. AA, XFD)</span>
                <input
                  type="text"
                  value={colLetter}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                    setColLetter(clean);
                    if (clean) setColIndex(String(colLetterToIndex(clean)));
                  }}
                  className={inputCls}
                />
              </label>
              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>1-Based Index (1 – 16384)</span>
                <input
                  type="number"
                  min={1}
                  max={16384}
                  value={colIndex}
                  onChange={(e) => {
                    setColIndex(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (n >= 1 && n <= 16384) setColLetter(indexToColLetter(n));
                  }}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Range Dimension Calculator
            </h3>
            <label className="space-y-1 block text-xs text-slate-600 dark:text-slate-300">
              <span>A1 Range Reference</span>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="B2:H45"
                className={inputCls}
              />
            </label>
            {rangeStats ? (
              <div className="text-xs font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                {rangeStats.rows.toLocaleString()} rows × {rangeStats.cols.toLocaleString()} columns ={' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {rangeStats.cells.toLocaleString()} cells
                </strong>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Enter a valid range like A1:Z100</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CHEATSHEET */}
      {activeTab === 'cheatsheet' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0d1219] px-4 py-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Essential Spreadsheet Formula Cheatsheet
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={cheatSearch}
                onChange={(e) => setCheatSearch(e.target.value)}
                placeholder="Filter functions..."
                aria-label="Filter formula cheatsheet"
                className="h-8 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCheatsheet.map((fn) => (
              <div
                key={fn.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{fn.name}</span>
                    <span className="text-xs text-slate-400">· {fn.cat}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{fn.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <code className="rounded bg-slate-100 dark:bg-slate-900 px-2.5 py-1 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                    {fn.syntax}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(fn.syntax, fn.name)}
                    aria-label={`Copy ${fn.name} syntax`}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {copiedId === fn.name ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
