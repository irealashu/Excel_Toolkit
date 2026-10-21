import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Sliders, FileSpreadsheet } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { SAMPLE_WORKBOOK } from '../../core/files/sampleData';
import { WorkbookData } from '../../registry/types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];

export const ChartWorkspace: React.FC = () => {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(SAMPLE_WORKBOOK);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar');
  const [xAxisCol, setXAxisCol] = useState<number>(3); // Product_Category default
  const [yAxisCol, setYAxisCol] = useState<number>(6); // Total_Revenue default
  const [aggMode, setAggMode] = useState<'sum' | 'avg' | 'count'>('sum');

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] || workbook.sheets[0] : null;
  const headers = activeSheet ? activeSheet.headers : [];
  const rows = activeSheet ? activeSheet.rows : [];

  // Group and aggregate data locally
  const chartData = useMemo(() => {
    if (!activeSheet || rows.length === 0) return [];

    const grouped = new Map<string, { sum: number; count: number }>();

    rows.forEach((row) => {
      const rawX = row[xAxisCol];
      const key = rawX !== null && rawX !== undefined ? String(rawX) : 'Unassigned';

      const rawY = row[yAxisCol];
      const numY = typeof rawY === 'number' ? rawY : Number(rawY) || 0;

      if (!grouped.has(key)) {
        grouped.set(key, { sum: 0, count: 0 });
      }
      const item = grouped.get(key)!;
      item.sum += numY;
      item.count += 1;
    });

    return Array.from(grouped.entries()).map(([name, stat]) => {
      let val = stat.sum;
      if (aggMode === 'avg') val = Number((stat.sum / stat.count).toFixed(2));
      if (aggMode === 'count') val = stat.count;

      return {
        name,
        value: val,
        count: stat.count,
      };
    });
  }, [activeSheet, rows, xAxisCol, yAxisCol, aggMode]);

  return (
    <div className="space-y-6">
      <FileDropzone
        currentWorkbook={workbook}
        onWorkbookLoaded={setWorkbook}
        onClear={() => setWorkbook(null)}
        title="Upload data to visualize"
        subtitle="Generate interactive Bar, Line, Area, or Pie charts with client-side grouped aggregations."
      />

      {workbook && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            {/* Chart Type */}
            <div className="flex items-center space-x-1.5">
              {[
                { id: 'bar', label: 'Bar', icon: BarChart3 },
                { id: 'line', label: 'Line', icon: LineIcon },
                { id: 'area', label: 'Area', icon: BarChart3 },
                { id: 'pie', label: 'Pie', icon: PieIcon },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setChartType(t.id as any)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      chartType === t.id
                        ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                        : 'border border-slate-800 bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Column Axes Selector */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center space-x-1.5">
                <span>Category (X-Axis):</span>
                <select
                  value={xAxisCol}
                  onChange={(e) => setXAxisCol(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span>Value (Y-Axis):</span>
                <select
                  value={yAxisCol}
                  onChange={(e) => setYAxisCol(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span>Aggregation:</span>
                <select
                  value={aggMode}
                  onChange={(e) => setAggMode(e.target.value as any)}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
                >
                  <option value="sum">Sum Totals</option>
                  <option value="avg">Average</option>
                  <option value="count">Count Frequency</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chart Display Surface */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="text-sm font-semibold text-white">
                {aggMode.toUpperCase()} of {headers[yAxisCol] || 'Metric'} by {headers[xAxisCol] || 'Category'}
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {chartData.length} distinct groups
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" angle={-25} textAnchor="end" interval={0} fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" angle={-25} textAnchor="end" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" angle={-25} textAnchor="end" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
