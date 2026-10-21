import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Undo2,
  Redo2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Search,
  Check,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  FileText
} from 'lucide-react';
import { evaluateFormula, indexToColLetter } from '../../core/formulas';
import { downloadCsv, downloadXlsx } from '../../core/files/downloadBlob';
import { parseWorkbookFile } from '../../core/files/parseWorkbook';
import { SAMPLE_WORKBOOK } from '../../core/files/sampleData';
import { SheetData, WorkbookData } from '../../registry/types';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  isCurrency?: boolean;
  isPercent?: boolean;
}

export const SpreadsheetEditor: React.FC = () => {
  // Current active sheets in editor
  const [sheets, setSheets] = useState<SheetData[]>(() => [
    {
      name: 'Sales_Data',
      headers: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      rows: [
        ['Product', 'Region', 'Q1 Sales', 'Q2 Sales', 'Total Units', 'Unit Price', 'Gross Revenue', 'Notes'],
        ['Enterprise Suite', 'North America', 120, 145, 265, 1200, '=E2*F2', 'Key Account'],
        ['Cloud Starter', 'Europe', 310, 280, 590, 350, '=E3*F3', 'Active promo'],
        ['Security Gateway', 'Asia Pacific', 95, 110, 205, 2400, '=E4*F4', 'Pending approval'],
        ['IoT Edge Node', 'North America', 450, 520, 970, 180, '=E5*F5', 'Standard tier'],
        ['Total Units / Avg', 'Summary', '=AVERAGE(C2:C5)', '=AVERAGE(D2:D5)', '=SUM(E2:E5)', '', '=SUM(G2:G5)', 'Auto computed'],
        ...Array.from({ length: 15 }, () => Array(8).fill('')),
      ],
      totalRows: 21,
      totalCols: 8,
    },
    {
      name: 'Targets',
      headers: ['A', 'B', 'C', 'D'],
      rows: [
        ['Department', 'Q1 Target', 'Q2 Target', 'Annual Goal'],
        ['Enterprise Sales', 300000, 350000, 1500000],
        ['SMB Cloud', 180000, 210000, 850000],
        ['Security & Ops', 220000, 250000, 1000000],
        ...Array.from({ length: 16 }, () => Array(4).fill('')),
      ],
      totalRows: 20,
      totalCols: 4,
    },
  ]);

  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaInputValue, setFormulaInputValue] = useState('');
  const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({});

  // History for Undo / Redo
  const [history, setHistory] = useState<SheetData[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  // Find & Replace state
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [replaceFeedback, setReplaceFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentSheet = sheets[activeSheetIndex] || sheets[0];

  // Evaluate cells for display
  const evaluatedRows = React.useMemo(() => {
    return currentSheet.rows.map((row) =>
      row.map((cell) => {
        if (typeof cell === 'string' && cell.startsWith('=')) {
          return evaluateFormula(cell, currentSheet.rows);
        }
        return cell;
      })
    );
  }, [currentSheet.rows]);

  // Keep formula bar in sync with selected cell
  useEffect(() => {
    const rawVal = currentSheet.rows[selectedCell.row]?.[selectedCell.col];
    setFormulaInputValue(rawVal !== null && rawVal !== undefined ? String(rawVal) : '');
  }, [selectedCell, currentSheet.rows]);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

  const pushHistory = (newSheets: SheetData[]) => {
    const newHist = history.slice(0, historyStep + 1);
    newHist.push(JSON.parse(JSON.stringify(sheets)));
    if (newHist.length > 20) newHist.shift();
    setHistory(newHist);
    setHistoryStep(newHist.length - 1);
    setSheets(newSheets);
  };

  const handleUndo = () => {
    if (historyStep >= 0 && history[historyStep]) {
      const prev = history[historyStep];
      setHistoryStep(historyStep - 1);
      setSheets(JSON.parse(JSON.stringify(prev)));
    }
  };

  const updateCellValue = (rowIdx: number, colIdx: number, value: string | number) => {
    const newSheets = [...sheets];
    const newSheet = { ...currentSheet };
    const newRows = newSheet.rows.map((r, rIdx) => {
      if (rIdx !== rowIdx) return r;
      const newR = [...r];
      // Convert to number if numeric and not starting with =
      let parsedVal: string | number = value;
      if (typeof value === 'string' && !value.startsWith('=') && !isNaN(Number(value)) && value.trim() !== '') {
        parsedVal = Number(value);
      }
      newR[colIdx] = parsedVal;
      return newR;
    });

    newSheet.rows = newRows;
    newSheets[activeSheetIndex] = newSheet;
    pushHistory(newSheets);
  };

  const handleFormulaBarChange = (val: string) => {
    setFormulaInputValue(val);
    updateCellValue(selectedCell.row, selectedCell.col, val);
  };

  const handleAddSheet = () => {
    const name = `Sheet${sheets.length + 1}`;
    const newSheet: SheetData = {
      name,
      headers: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      rows: Array.from({ length: 25 }, () => Array(8).fill('')),
      totalRows: 25,
      totalCols: 8,
    };
    pushHistory([...sheets, newSheet]);
    setActiveSheetIndex(sheets.length);
  };

  const handleDeleteSheet = (idx: number) => {
    if (sheets.length <= 1) return;
    const newSheets = sheets.filter((_, i) => i !== idx);
    pushHistory(newSheets);
    setActiveSheetIndex(Math.max(0, idx - 1));
  };

  const handleRenameSheet = (idx: number) => {
    const newName = prompt('Enter sheet name:', sheets[idx].name);
    if (!newName || !newName.trim()) return;
    const newSheets = [...sheets];
    newSheets[idx] = { ...newSheets[idx], name: newName.trim().slice(0, 31) };
    pushHistory(newSheets);
  };

  const handleAddRow = () => {
    const newSheet = { ...currentSheet };
    const emptyRow = Array(currentSheet.headers.length).fill('');
    newSheet.rows = [...newSheet.rows, emptyRow];
    newSheet.totalRows += 1;
    const newSheets = [...sheets];
    newSheets[activeSheetIndex] = newSheet;
    pushHistory(newSheets);
  };

  const handleAddCol = () => {
    const newSheet = { ...currentSheet };
    const nextColLetter = indexToColLetter(newSheet.headers.length + 1);
    newSheet.headers = [...newSheet.headers, nextColLetter];
    newSheet.rows = newSheet.rows.map((r) => [...r, '']);
    newSheet.totalCols += 1;
    const newSheets = [...sheets];
    newSheets[activeSheetIndex] = newSheet;
    pushHistory(newSheets);
  };

  const handleDeleteRow = (rIdx: number) => {
    if (currentSheet.rows.length <= 1) return;
    const newSheet = { ...currentSheet };
    newSheet.rows = newSheet.rows.filter((_, i) => i !== rIdx);
    newSheet.totalRows -= 1;
    const newSheets = [...sheets];
    newSheets[activeSheetIndex] = newSheet;
    pushHistory(newSheets);
    if (selectedCell.row >= newSheet.rows.length) {
      setSelectedCell((c) => ({ ...c, row: newSheet.rows.length - 1 }));
    }
  };

  const handleFormatToggle = (formatKey: keyof CellFormat, value?: any) => {
    const cellKey = `${activeSheetIndex}:${selectedCell.row}:${selectedCell.col}`;
    const curr = cellFormats[cellKey] || {};
    const nextVal = value !== undefined ? value : !curr[formatKey];
    setCellFormats({
      ...cellFormats,
      [cellKey]: {
        ...curr,
        [formatKey]: nextVal,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCell((c) => ({ ...c, row: Math.min(currentSheet.rows.length - 1, c.row + 1) }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCell((c) => ({ ...c, row: Math.max(0, c.row - 1) }));
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      setSelectedCell((c) => ({ ...c, col: Math.min(currentSheet.headers.length - 1, c.col + 1) }));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedCell((c) => ({ ...c, col: Math.max(0, c.col - 1) }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setEditingCell({ ...selectedCell });
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      updateCellValue(selectedCell.row, selectedCell.col, '');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseWorkbookFile(file);
      setSheets(parsed.sheets);
      setActiveSheetIndex(0);
      setSelectedCell({ row: 0, col: 0 });
    } catch (err: any) {
      alert('Failed to parse spreadsheet: ' + err.message);
    }
  };

  const handleLoadSample = () => {
    setSheets(SAMPLE_WORKBOOK.sheets);
    setActiveSheetIndex(0);
    setSelectedCell({ row: 0, col: 0 });
  };

  const handleExportXlsx = () => {
    downloadXlsx(sheets, 'Workbook.xlsx');
  };

  const handleExportCsv = () => {
    downloadCsv(currentSheet.headers, evaluatedRows, `${currentSheet.name}.csv`);
  };

  const handleFindAndReplace = () => {
    if (!findText) return;
    let replacedCount = 0;
    const newSheet = { ...currentSheet };
    const newRows = newSheet.rows.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return cell;
        const str = String(cell);
        if (str.includes(findText)) {
          replacedCount++;
          return str.replaceAll(findText, replaceText);
        }
        return cell;
      })
    );
    newSheet.rows = newRows;
    const newSheets = [...sheets];
    newSheets[activeSheetIndex] = newSheet;
    pushHistory(newSheets);
    setReplaceFeedback(`Replaced ${replacedCount} instance(s).`);
    setTimeout(() => setReplaceFeedback(null), 3000);
  };

  const activeCellAddress = `${indexToColLetter(selectedCell.col + 1)}${selectedCell.row + 1}`;
  const cellKey = `${activeSheetIndex}:${selectedCell.row}:${selectedCell.col}`;
  const currentFormat = cellFormats[cellKey] || {};

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* 1. App / Toolbar Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2.5">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <span className="font-bold text-white text-sm">Spreadsheet Studio</span>
          <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 border border-emerald-500/20">
            Local Engine
          </span>
        </div>

        {/* Action Controls & Undo/Redo */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={handleUndo}
            disabled={historyStep < 0}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleFormatToggle('bold')}
            className={`p-1.5 rounded-lg border transition-colors ${
              currentFormat.bold ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleFormatToggle('italic')}
            className={`p-1.5 rounded-lg border transition-colors ${
              currentFormat.italic ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleFormatToggle('isCurrency')}
            className={`p-1.5 rounded-lg border transition-colors ${
              currentFormat.isCurrency ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Format as Currency ($)"
          >
            <DollarSign className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleFormatToggle('isPercent')}
            className={`p-1.5 rounded-lg border transition-colors ${
              currentFormat.isPercent ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Format as Percentage (%)"
          >
            <Percent className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={() => setIsFindOpen(!isFindOpen)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800"
            title="Find and Replace"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={handleAddRow}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            title="Append Row"
          >
            <Plus className="h-3 w-3" />
            <span>Row</span>
          </button>
          <button
            onClick={handleAddCol}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            title="Append Column"
          >
            <Plus className="h-3 w-3" />
            <span>Col</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Import / Export */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            title="Open spreadsheet from file"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <button
            onClick={handleExportXlsx}
            className="flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            title="Download full workbook as XLSX"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export XLSX</span>
          </button>
        </div>
      </div>

      {/* Find & Replace bar */}
      {isFindOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950/90 px-4 py-2">
          <input
            type="text"
            placeholder="Find text..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="h-7 w-40 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Replace with..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="h-7 w-40 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={handleFindAndReplace}
            className="h-7 px-3 rounded bg-slate-800 text-xs text-slate-200 border border-slate-700 hover:bg-slate-700"
          >
            Replace All
          </button>
          {replaceFeedback && <span className="text-xs text-emerald-400 font-medium">{replaceFeedback}</span>}
          <button
            onClick={() => setIsFindOpen(false)}
            className="text-xs text-slate-400 hover:text-white ml-auto"
          >
            Close
          </button>
        </div>
      )}

      {/* 2. Formula Bar */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900 px-3 py-2 space-x-2">
        <div className="flex h-7 w-14 items-center justify-center rounded border border-slate-700 bg-slate-950 font-mono text-xs font-bold text-emerald-400 shadow-inner">
          {activeCellAddress}
        </div>
        <div className="text-xs font-mono font-bold text-slate-500 select-none">ƒx</div>
        <input
          type="text"
          value={formulaInputValue}
          onChange={(e) => handleFormulaBarChange(e.target.value)}
          placeholder="Enter formula (e.g. =SUM(A1:A5)) or raw value..."
          className="flex-1 h-7 rounded border border-slate-800 bg-slate-950/80 px-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* 3. Grid Table Viewport */}
      <div className="flex-1 overflow-auto bg-slate-950 select-none relative max-h-[600px]">
        <table className="border-collapse text-xs font-mono">
          <thead className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800">
            <tr>
              {/* Corner header */}
              <th className="w-12 h-7 border-r border-b border-slate-800 bg-slate-950 text-center text-slate-500 text-[10px]">
                ◢
              </th>
              {currentSheet.headers.map((colHeader, cIdx) => (
                <th
                  key={cIdx}
                  className="min-w-[110px] h-7 border-r border-b border-slate-800 px-2 text-center font-bold text-slate-400 uppercase tracking-wider bg-slate-900"
                >
                  {colHeader}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {evaluatedRows.map((row, rIdx) => (
              <tr key={rIdx} className="h-7 hover:bg-slate-900/40">
                {/* Row Number header */}
                <td className="w-12 border-r border-slate-800 bg-slate-900/70 text-center text-slate-500 text-[11px] font-semibold sticky left-0 z-10 select-none">
                  {rIdx + 1}
                </td>

                {currentSheet.headers.map((_, cIdx) => {
                  const isSelected = selectedCell.row === rIdx && selectedCell.col === cIdx;
                  const isEditing = editingCell?.row === rIdx && editingCell?.col === cIdx;
                  const evaluatedVal = row[cIdx];
                  const rawVal = currentSheet.rows[rIdx]?.[cIdx];
                  const cellKey = `${activeSheetIndex}:${rIdx}:${cIdx}`;
                  const fmt = cellFormats[cellKey] || {};

                  let displayStr = '';
                  if (evaluatedVal !== null && evaluatedVal !== undefined) {
                    if (fmt.isCurrency && typeof evaluatedVal === 'number') {
                      displayStr = `$${evaluatedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    } else if (fmt.isPercent && typeof evaluatedVal === 'number') {
                      displayStr = `${(evaluatedVal * 100).toFixed(1)}%`;
                    } else {
                      displayStr = String(evaluatedVal);
                    }
                  }

                  return (
                    <td
                      key={cIdx}
                      onClick={() => {
                        setSelectedCell({ row: rIdx, col: cIdx });
                        setEditingCell(null);
                      }}
                      onDoubleClick={() => {
                        setSelectedCell({ row: rIdx, col: cIdx });
                        setEditingCell({ row: rIdx, col: cIdx });
                      }}
                      className={`min-w-[110px] max-w-[220px] px-2 border-r border-b border-slate-800/70 truncate cursor-cell relative ${
                        isSelected ? 'bg-emerald-950/50 ring-2 ring-emerald-500 z-10' : ''
                      } ${fmt.bold ? 'font-bold' : ''} ${fmt.italic ? 'italic' : ''} ${
                        typeof evaluatedVal === 'number' || fmt.isCurrency ? 'text-right' : 'text-left'
                      }`}
                    >
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          defaultValue={rawVal !== null && rawVal !== undefined ? String(rawVal) : ''}
                          onBlur={(e) => {
                            updateCellValue(rIdx, cIdx, e.target.value);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateCellValue(rIdx, cIdx, e.currentTarget.value);
                              setEditingCell(null);
                              setSelectedCell({ row: Math.min(currentSheet.rows.length - 1, rIdx + 1), col: cIdx });
                            } else if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className="absolute inset-0 h-full w-full bg-slate-900 text-white px-2 border-2 border-emerald-400 outline-none font-mono text-xs z-30"
                        />
                      ) : (
                        <span className={String(evaluatedVal).startsWith('#') ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                          {displayStr}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Sheet Tabs Bar & Status */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-800 bg-slate-950 px-3 py-1.5 gap-2">
        {/* Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {sheets.map((sheet, idx) => {
            const isActive = idx === activeSheetIndex;
            return (
              <div
                key={idx}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-t text-xs font-medium cursor-pointer transition-colors border-t-2 ${
                  isActive
                    ? 'bg-slate-900 text-emerald-400 border-emerald-500 font-semibold'
                    : 'text-slate-400 border-transparent hover:bg-slate-900/60 hover:text-slate-200'
                }`}
                onClick={() => {
                  setActiveSheetIndex(idx);
                  setSelectedCell({ row: 0, col: 0 });
                }}
                onDoubleClick={() => handleRenameSheet(idx)}
              >
                <span>{sheet.name}</span>
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSheet(idx);
                    }}
                    className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete sheet"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddSheet}
            className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Add new worksheet"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Status / Quick Stats */}
        <div className="flex items-center space-x-4 text-[11px] text-slate-400 font-mono">
          <span>{currentSheet.rows.length} rows × {currentSheet.headers.length} cols</span>
          <span>•</span>
          <button onClick={handleLoadSample} className="text-emerald-400 hover:underline">
            Load Sample Sheet
          </button>
          <span>•</span>
          <button onClick={handleExportCsv} className="hover:text-slate-200">
            Export Sheet CSV
          </button>
        </div>
      </div>
    </div>
  );
};
