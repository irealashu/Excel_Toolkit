import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { WorkbookData } from '../../registry/types';
import { downloadCsv, downloadText } from '../../core/files/downloadBlob';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter';
type AggregationType = 'sum' | 'avg' | 'count';

const SERIES_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#0d9488', '#4f46e5'];

export const ChartWorkspace: React.FC = () => {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisCol, setXAxisCol] = useState(0);
  const [yAxisCol, setYAxisCol] = useState(1);
  const [aggregation, setAggregation] = useState<AggregationType>('sum');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;

  useEffect(() => {
    if (!activeSheet) return;
    // Ensure selected column indices stay valid on sheet change
    if (xAxisCol >= activeSheet.headers.length) setXAxisCol(0);
    if (yAxisCol >= activeSheet.headers.length) {
      // Pick first numeric-looking column or last column
      const numIdx = activeSheet.headers.findIndex((_, colIdx) => {
        const sample = activeSheet.rows.slice(0, 10).map((r) => r[colIdx]).filter((v) => v !== null && v !== '');
        return sample.length > 0 && sample.every((v) => !isNaN(Number(v)));
      });
      setYAxisCol(numIdx >= 0 ? numIdx : Math.max(0, activeSheet.headers.length - 1));
    }
  }, [activeSheet, xAxisCol, yAxisCol]);

  const chartData = useMemo<{ name: string; value: number; x?: number; count?: number }[]>(() => {
    if (!activeSheet) return [];
    const safeX = Math.min(xAxisCol, Math.max(0, activeSheet.headers.length - 1));
    const safeY = Math.min(yAxisCol, Math.max(0, activeSheet.headers.length - 1));

    if (chartType === 'scatter') {
      return activeSheet.rows
        .map((row, idx) => {
          const xVal = Number(row[safeX]);
          const yVal = Number(row[safeY]);
          return {
            name: String(row[0] ?? `Row ${idx + 1}`),
            x: Number.isFinite(xVal) ? xVal : idx + 1,
            value: Number.isFinite(yVal) ? yVal : 0,
          };
        })
        .slice(0, 200);
    }

    const groups = new Map<string, { sum: number; count: number }>();
    for (const row of activeSheet.rows) {
      const key = String(row[safeX] ?? 'Uncategorized').trim() || 'Uncategorized';
      const num = Number(row[safeY]);
      const val = Number.isFinite(num) ? num : 0;
      const cur = groups.get(key) || { sum: 0, count: 0 };
      cur.sum += val;
      cur.count += 1;
      groups.set(key, cur);
    }

    return Array.from(groups.entries()).map(([name, stats]) => ({
      name,
      value:
        aggregation === 'sum'
          ? Number(stats.sum.toFixed(2))
          : aggregation === 'avg'
          ? Number((stats.sum / Math.max(1, stats.count)).toFixed(2))
          : stats.count,
      count: stats.count,
    }));
  }, [activeSheet, chartType, xAxisCol, yAxisCol, aggregation]);

  const handleExportSummaryCsv = () => {
    if (!activeSheet || chartData.length === 0) return;
    const xLabel = activeSheet.headers[xAxisCol] || 'Category';
    const yLabel = `${activeSheet.headers[yAxisCol] || 'Value'} (${aggregation.toUpperCase()})`;
    const rows = chartData.map((d) => [d.name, d.value]);
    downloadCsv([xLabel, yLabel], rows, `chart_summary_${chartType}.csv`);
  };

  const handleExportSvg = () => {
    const svgEl = chartContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serialized = new XMLSerializer().serializeToString(clone);
    downloadText(serialized, `chart_${chartType}.svg`, 'image/svg+xml;charset=utf-8');
  };

  const xHeader = activeSheet?.headers[xAxisCol] || 'X Axis';
  const yHeader = activeSheet?.headers[yAxisCol] || 'Value';

  return (
    <div className="space-y-6">
      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={setWorkbook}
        onClear={() => setWorkbook(null)}
        title="Drop a spreadsheet or CSV to generate interactive charts"
        subtitle="Aggregate by category and plot Bar, Line, Area, Pie, or Scatter visualizations locally."
      />

      {activeSheet && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'bar', label: 'Bar' },
                    { id: 'line', label: 'Line' },
                    { id: 'area', label: 'Area' },
                    { id: 'pie', label: 'Pie' },
                    { id: 'scatter', label: 'Scatter' },
                  ] as { id: ChartType; label: string }[]
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChartType(c.id)}
                    className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${
                      chartType === c.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSvg}
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export SVG</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSummaryCsv}
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Summary CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>{chartType === 'scatter' ? 'X Axis (Numeric)' : 'Category / X Axis'}</span>
                <select
                  value={Math.min(xAxisCol, Math.max(0, activeSheet.headers.length - 1))}
                  onChange={(e) => setXAxisCol(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                >
                  {activeSheet.headers.map((h, i) => (
                    <option key={h + i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>Value / Y Axis</span>
                <select
                  value={Math.min(yAxisCol, Math.max(0, activeSheet.headers.length - 1))}
                  onChange={(e) => setYAxisCol(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100"
                >
                  {activeSheet.headers.map((h, i) => (
                    <option key={h + i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-slate-600 dark:text-slate-300">
                <span>Aggregation</span>
                <select
                  disabled={chartType === 'scatter'}
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value as AggregationType)}
                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Row Count</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                {yHeader} by {xHeader}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {chartData.length} data points · {chartType === 'scatter' ? 'Raw records' : aggregation.toUpperCase()}
              </span>
            </div>

            <div ref={chartContainerRef} className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name={yHeader} fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Line type="monotone" dataKey="value" name={yHeader} stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="value" name={yHeader} stroke="#059669" fill="#059669" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={130}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={SERIES_COLORS[idx % SERIES_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                ) : (
                  <ScatterChart margin={{ top: 10, right: 16, left: 8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis type="number" dataKey="x" name={xHeader} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis type="number" dataKey="value" name={yHeader} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Scatter name={`${xHeader} vs ${yHeader}`} data={chartData} fill="#059669" />
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
