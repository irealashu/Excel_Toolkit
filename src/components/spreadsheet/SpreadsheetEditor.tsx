import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FilePlus2,
  ArrowUpDown,
  AlertCircle,
  Check,
  Pencil,
  X,
} from 'lucide-react';
import { evaluateGrid, indexToColLetter } from '../../core/formulas';
import { downloadEditorXlsx, downloadRawCsv } from '../../core/files/downloadBlob';
import { parseWorkbookFile } from '../../core/files/parseWorkbook';
import { SheetData } from '../../registry/types';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  isCurrency?: boolean;
  isPercent?: boolean;
}

function makeBlankWorkbook(): SheetData[] {
  const cols = 10;
  return [
    {
      name: 'Sheet1',
      headers: Array.from({ length: cols }, (_, i) => indexToColLetter(i + 1)),
      rows: Array.from({ length: 25 }, () => Array(cols).fill('')),
      totalRows: 25,
      totalCols: cols,
    },
  ];
}

function cloneSheets(s: SheetData[]): SheetData[] {
  return JSON.parse(JSON.stringify(s));
}

export const SpreadsheetEditor: React.FC = () => {
  const [sheets, setSheets] = useState<SheetData[]>(makeBlankWorkbook);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaInputValue, setFormulaInputValue] = useState('');
  const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({});

  // Clean past / future stacks for reliable Undo & Redo
  const [past, setPast] = useState<SheetData[][]>([]);
  const [future, setFuture] = useState<SheetData[][]>([]);

  // Inline sheet rename state (no window.prompt)
  const [renamingSheetIdx, setRenamingSheetIdx] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Inline Find & Replace
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Inline status / error toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const currentSheet = sheets[activeSheetIndex] || sheets[0];

  // Recursive full-grid formula evaluation (resolves chained formulas like =SUM(G2:G5) over =E2*F2)
  const evaluatedRows = useMemo(() => evaluateGrid(currentSheet.rows), [currentSheet.rows]);

  useEffect(() => {
    const rawVal = currentSheet.rows[selectedCell.row]?.[selectedCell.col];
    setFormulaInputValue(rawVal !== null && rawVal !== undefined ? String(rawVal) : '');
  }, [selectedCell, currentSheet.rows]);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

  const showToast = (text: string, type: 'info' | 'error' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const commitSheets = (nextSheets: SheetData[]) => {
    setPast((prev) => [...prev.slice(-24), cloneSheets(sheets)]);
    setFuture([]);
    setSheets(nextSheets);
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture((prev) => [cloneSheets(sheets), ...prev.slice(0, 24)]);
    setPast((prev) => prev.slice(0, -1));
    setSheets(previous);
    if (activeSheetIndex >= previous.length) {
      setActiveSheetIndex(Math.max(0, previous.length - 1));
    }
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((prev) => [...prev.slice(-24), cloneSheets(sheets)]);
    setFuture((prev) => prev.slice(1));
    setSheets(next);
  };

  const updateCellValue = (rowIdx: number, colIdx: number, value: string | number) => {
    const rawPrev = currentSheet.rows[rowIdx]?.[colIdx];
    let parsedVal: string | number = value;
    if (typeof value === 'string' && !value.trim().startsWith('=') && value.trim() !== '' && !isNaN(Number(value))) {
      parsedVal = Number(value);
    }
    if (rawPrev === parsedVal) return;

    const nextSheets = cloneSheets(sheets);
    nextSheets[activeSheetIndex].rows[rowIdx][colIdx] = parsedVal;
    commitSheets(nextSheets);
  };

  const handleFormulaBarCommit = () => {
    updateCellValue(selectedCell.row, selectedCell.col, formulaInputValue);
  };

  const handleAddSheet = () => {
    const name = `Sheet${sheets.length + 1}`;
    const cols = 8;
    const newSheet: SheetData = {
      name,
      headers: Array.from({ length: cols }, (_, i) => indexToColLetter(i + 1)),
      rows: Array.from({ length: 20 }, () => Array(cols).fill('')),
      totalRows: 20,
      totalCols: cols,
    };
    commitSheets([...cloneSheets(sheets), newSheet]);
    setActiveSheetIndex(sheets.length);
    setSelectedCell({ row: 0, col: 0 });
  };

  const handleDeleteSheet = (idx: number) => {
    if (sheets.length <= 1) return;
    const nextSheets = sheets.filter((_, i) => i !== idx);
    commitSheets(nextSheets);
    setActiveSheetIndex(Math.max(0, idx - 1));
    setSelectedCell({ row: 0, col: 0 });
  };

  const startRenameSheet = (idx: number) => {
    setRenamingSheetIdx(idx);
    setRenameDraft(sheets[idx].name);
  };

  const commitRenameSheet = () => {
    if (renamingSheetIdx === null) return;
    const clean = renameDraft.trim().replace(/[*?:/[\]]/g, '').slice(0, 31);
    if (clean) {
      const nextSheets = cloneSheets(sheets);
      nextSheets[renamingSheetIdx].name = clean;
      commitSheets(nextSheets);
    }
    setRenamingSheetIdx(null);
  };

  const handleAddRow = () => {
    const nextSheets = cloneSheets(sheets);
    const target = nextSheets[activeSheetIndex];
    const insertAt = Math.min(target.rows.length, selectedCell.row + 1);
    target.rows.splice(insertAt, 0, Array(target.headers.length).fill(''));
    target.totalRows = target.rows.length;
    commitSheets(nextSheets);
    setSelectedCell({ row: insertAt, col: selectedCell.col });
  };

  const handleDeleteSelectedRow = () => {
    if (currentSheet.rows.length <= 1) return;
    const nextSheets = cloneSheets(sheets);
    const target = nextSheets[activeSheetIndex];
    target.rows.splice(selectedCell.row, 1);
    target.totalRows = target.rows.length;
    commitSheets(nextSheets);
    setSelectedCell((c) => ({ ...c, row: Math.min(c.row, target.rows.length - 1) }));
  };

  const handleAddCol = () => {
    const nextSheets = cloneSheets(sheets);
    const target = nextSheets[activeSheetIndex];
    const nextLetter = indexToColLetter(target.headers.length + 1);
    target.headers.push(nextLetter);
    target.rows = target.rows.map((r) => [...r, '']);
    target.totalCols = target.headers.length;
    commitSheets(nextSheets);
  };

  const handleDeleteSelectedCol = () => {
    if (currentSheet.headers.length <= 1) return;
    const nextSheets = cloneSheets(sheets);
    const target = nextSheets[activeSheetIndex];
    target.rows = target.rows.map((r) => r.filter((_, cIdx) => cIdx !== selectedCell.col));
    target.headers = Array.from({ length: target.headers.length - 1 }, (_, i) => indexToColLetter(i + 1));
    target.totalCols = target.headers.length;
    commitSheets(nextSheets);
    setSelectedCell((c) => ({ ...c, col: Math.min(c.col, target.headers.length - 1) }));
  };

  const handleSortSelectedCol = () => {
    const nextSheets = cloneSheets(sheets);
    const target = nextSheets[activeSheetIndex];
    if (target.rows.length <= 2) return;
    const headerRow = target.rows[0];
    const dataRows = target.rows.slice(1);
    const nonEmpty = dataRows.filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''));
    const empty = dataRows.filter((r) => !r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''));
    const col = selectedCell.col;
    nonEmpty.sort((a, b) => {
      const va = a[col] ?? '';
      const vb = b[col] ?? '';
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb) && String(va).trim() !== '' && String(vb).trim() !== '') {
        return na - nb;
      }
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
    });
    target.rows = [headerRow, ...nonEmpty, ...empty];
    commitSheets(nextSheets);
    showToast(`Sorted column ${indexToColLetter(col + 1)} ascending (preserving row 1).`);
  };

  const handleFormatToggle = (formatKey: keyof CellFormat, value?: CellFormat[keyof CellFormat]) => {
    const key = `${activeSheetIndex}:${selectedCell.row}:${selectedCell.col}`;
    const curr = cellFormats[key] || {};
    const nextVal = value !== undefined ? value : !curr[formatKey];
    setCellFormats((prev) => ({
      ...prev,
      [key]: {
        ...curr,
        [formatKey]: nextVal,
      },
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell || renamingSheetIdx !== null) return;
    const targetTag = (e.target as HTMLElement).tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      const val = evaluatedRows[selectedCell.row]?.[selectedCell.col];
      navigator.clipboard?.writeText(val !== null && val !== undefined ? String(val) : '').catch(() => {});
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
      navigator.clipboard?.readText().then((clip) => {
        if (clip !== undefined) {
          updateCellValue(selectedCell.row, selectedCell.col, clip.split('\n')[0].split('\t')[0]);
        }
      }).catch(() => {});
      return;
    }

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
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setEditingCell({ ...selectedCell });
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      updateCellValue(selectedCell.row, selectedCell.col, '');
    }
  };

  const convertWorkbookToEditorSheets = (importedSheets: SheetData[]): SheetData[] => {
    return importedSheets.map((s) => {
      const colCount = Math.max(s.headers.length, 6);
      const colLetters = Array.from({ length: colCount }, (_, i) => indexToColLetter(i + 1));
      const padRow = (r: (string | number | boolean | null)[]) =>
        Array.from({ length: colCount }, (_, i) => (r[i] !== undefined && r[i] !== null ? r[i] : ''));
      const headerAsRow1 = padRow(s.headers);
      const bodyRows = s.rows.map(padRow);
      const extraBlankRows = Array.from({ length: Math.max(0, 18 - (bodyRows.length + 1)) }, () =>
        Array(colCount).fill('')
      );
      const allRows = [headerAsRow1, ...bodyRows, ...extraBlankRows];
      return {
        name: s.name,
        headers: colLetters,
        rows: allRows,
        totalRows: allRows.length,
        totalCols: colCount,
      };
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseWorkbookFile(file);
      const editorSheets = convertWorkbookToEditorSheets(parsed.sheets);
      commitSheets(editorSheets);
      setActiveSheetIndex(0);
      setSelectedCell({ row: 0, col: 0 });
      setCellFormats({});
      showToast(`Imported "${file.name}" (${editorSheets.length} sheet${editorSheets.length === 1 ? '' : 's'}).`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to read workbook.';
      showToast(msg, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNewBlank = () => {
    commitSheets(makeBlankWorkbook());
    setActiveSheetIndex(0);
    setSelectedCell({ row: 0, col: 0 });
    setCellFormats({});
    showToast('Created blank workbook.');
  };

  const handleFindAndReplace = () => {
    if (!findText) return;
    let replacedCount = 0;
    const nextSheets = cloneSheets(sheets);
    nextSheets[activeSheetIndex].rows = nextSheets[activeSheetIndex].rows.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return cell;
        const str = String(cell);
        if (str.includes(findText)) {
          replacedCount += str.split(findText).length - 1;
          return str.split(findText).join(replaceText);
        }
        return cell;
      })
    );
    commitSheets(nextSheets);
    showToast(
      replacedCount > 0 ? `Replaced ${replacedCount} match${replacedCount === 1 ? '' : 'es'}.` : 'No matches found.'
    );
  };

  const activeCellAddress = `${indexToColLetter(selectedCell.col + 1)}${selectedCell.row + 1}`;
  const activeCellKey = `${activeSheetIndex}:${selectedCell.row}:${selectedCell.col}`;
  const currentFormat = cellFormats[activeCellKey] || {};
  const activeEvaluatedVal = evaluatedRows[selectedCell.row]?.[selectedCell.col];

  const toolbarBtn = (active = false) =>
    `h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${
      active
        ? 'border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div
      ref={gridContainerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Spreadsheet Editor Workspace"
      className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden focus:outline-none"
    >
      {/* 1. Primary Formatting & Workbook Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={past.length === 0}
            className={`${toolbarBtn(false)} disabled:opacity-35 disabled:cursor-not-allowed`}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={future.length === 0}
            className={`${toolbarBtn(false)} disabled:opacity-35 disabled:cursor-not-allowed`}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => handleFormatToggle('bold')}
            className={toolbarBtn(!!currentFormat.bold)}
            aria-label="Toggle bold"
            aria-pressed={!!currentFormat.bold}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatToggle('italic')}
            className={toolbarBtn(!!currentFormat.italic)}
            aria-label="Toggle italic"
            aria-pressed={!!currentFormat.italic}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatToggle('align', 'left')}
            className={toolbarBtn(currentFormat.align === 'left')}
            aria-label="Align left"
            title="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatToggle('align', 'center')}
            className={toolbarBtn(currentFormat.align === 'center')}
            aria-label="Align center"
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatToggle('align', 'right')}
            className={toolbarBtn(currentFormat.align === 'right')}
            aria-label="Align right"
            title="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => handleFormatToggle('isCurrency')}
            className={toolbarBtn(!!currentFormat.isCurrency)}
            aria-label="Currency format"
            aria-pressed={!!currentFormat.isCurrency}
            title="Format as Currency ($)"
          >
            <DollarSign className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatToggle('isPercent')}
            className={toolbarBtn(!!currentFormat.isPercent)}
            aria-label="Percent format"
            aria-pressed={!!currentFormat.isPercent}
            title="Format as Percent (%)"
          >
            <Percent className="h-3.5 w-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={handleAddRow}
            className="h-8 px-2.5 flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            title="Insert row below selection"
          >
            <Plus className="h-3 w-3" />
            <span>Row</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteSelectedRow}
            className="h-8 px-2 flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
            aria-label="Delete selected row"
            title="Delete selected row"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden lg:inline">Row</span>
          </button>
          <button
            type="button"
            onClick={handleAddCol}
            className="h-8 px-2.5 flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            title="Append column"
          >
            <Plus className="h-3 w-3" />
            <span>Col</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteSelectedCol}
            className="h-8 px-2 flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
            aria-label="Delete selected column"
            title="Delete selected column"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden lg:inline">Col</span>
          </button>

          <button
            type="button"
            onClick={handleSortSelectedCol}
            className={toolbarBtn(false)}
            aria-label="Sort active column ascending"
            title="Sort active column A-Z / 0-9"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFindOpen((v) => !v)}
            className={toolbarBtn(isFindOpen)}
            aria-label="Toggle Find and Replace"
            title="Find & Replace"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* File Operations */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleNewBlank}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            title="Create blank workbook"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Blank</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx,.xls,.xlsm,.csv,.tsv,.json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => downloadRawCsv(evaluatedRows, `${currentSheet.name}.csv`)}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() =>
              downloadEditorXlsx(
                sheets.map((s) => ({ name: s.name, rows: evaluateGrid(s.rows) })),
                'Excel_Toolkit_Workbook.xlsx'
              )
            }
            className="h-8 px-3 flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-xs font-semibold text-white dark:text-slate-950 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export XLSX</span>
          </button>
        </div>
      </div>

      {/* Inline Status / Toast Notification */}
      {statusMessage && (
        <div
          role="status"
          className={`flex items-center justify-between px-4 py-2 text-xs border-b ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
          }`}
        >
          <span className="flex items-center gap-2">
            {statusMessage.type === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {statusMessage.text}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Find & Replace Drawer */}
      {isFindOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0d1219] px-4 py-2">
          <input
            type="text"
            placeholder="Find text..."
            aria-label="Find text in sheet"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="h-8 w-44 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Replace with..."
            aria-label="Replace text with"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="h-8 w-44 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleFindAndReplace}
            className="h-8 px-3 rounded-md bg-slate-900 dark:bg-slate-700 text-xs font-medium text-white hover:bg-slate-800 dark:hover:bg-slate-600"
          >
            Replace all
          </button>
          <button
            type="button"
            onClick={() => setIsFindOpen(false)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      )}

      {/* 2. Formula Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3 py-2">
        <div
          className="flex h-8 w-16 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums"
          aria-label={`Selected cell ${activeCellAddress}`}
        >
          {activeCellAddress}
        </div>
        <span className="font-mono text-xs font-semibold text-slate-400 select-none px-1">fx</span>
        <input
          type="text"
          value={formulaInputValue}
          onChange={(e) => setFormulaInputValue(e.target.value)}
          onBlur={handleFormulaBarCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFormulaBarCommit();
              setSelectedCell((c) => ({ ...c, row: Math.min(currentSheet.rows.length - 1, c.row + 1) }));
              gridContainerRef.current?.focus();
            }
          }}
          aria-label="Formula bar"
          placeholder="Enter value or formula (e.g. =SUM(G2:G5), =IF(E2>300,&quot;High&quot;,&quot;Normal&quot;))"
          className="flex-1 h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] px-3 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
        />
        {typeof currentSheet.rows[selectedCell.row]?.[selectedCell.col] === 'string' &&
          String(currentSheet.rows[selectedCell.row]?.[selectedCell.col]).startsWith('=') && (
            <span className="hidden sm:inline-block font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
              = {String(activeEvaluatedVal ?? '')}
            </span>
          )}
      </div>

      {/* 3. Spreadsheet Data Grid */}
      <div className="flex-1 overflow-auto bg-white dark:bg-[#0b0f14] select-none relative max-h-[560px]">
        <table className="border-collapse text-xs font-mono tabular-nums w-full">
          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-[#131a24]">
            <tr>
              <th className="w-11 h-8 border-r border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#131a24] text-center text-slate-400 text-[10px] sticky left-0 z-30">
                #
              </th>
              {currentSheet.headers.map((colHeader, cIdx) => {
                const colSelected = selectedCell.col === cIdx;
                return (
                  <th
                    key={cIdx}
                    className={`min-w-[120px] h-8 border-r border-b border-slate-200 dark:border-slate-800 px-2 text-center font-semibold tracking-wider ${
                      colSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {colHeader}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {evaluatedRows.map((row, rIdx) => {
              const rowSelected = selectedCell.row === rIdx;
              return (
                <tr key={rIdx} className="h-8">
                  <td
                    className={`w-11 border-r border-b border-slate-200 dark:border-slate-800 text-center text-[11px] font-medium sticky left-0 z-10 select-none ${
                      rowSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'bg-slate-50 dark:bg-[#0f151e] text-slate-400'
                    }`}
                  >
                    {rIdx + 1}
                  </td>

                  {currentSheet.headers.map((_, cIdx) => {
                    const isSelected = selectedCell.row === rIdx && selectedCell.col === cIdx;
                    const isEditing = editingCell?.row === rIdx && editingCell?.col === cIdx;
                    const evaluatedVal = row[cIdx];
                    const rawVal = currentSheet.rows[rIdx]?.[cIdx];
                    const key = `${activeSheetIndex}:${rIdx}:${cIdx}`;
                    const fmt = cellFormats[key] || {};

                    let displayStr = '';
                    if (evaluatedVal !== null && evaluatedVal !== undefined && evaluatedVal !== '') {
                      if (fmt.isCurrency && typeof evaluatedVal === 'number') {
                        displayStr = `$${evaluatedVal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`;
                      } else if (fmt.isPercent && typeof evaluatedVal === 'number') {
                        displayStr = `${(evaluatedVal * 100).toFixed(1)}%`;
                      } else if (typeof evaluatedVal === 'number') {
                        displayStr = evaluatedVal.toLocaleString(undefined, { maximumFractionDigits: 4 });
                      } else {
                        displayStr = String(evaluatedVal);
                      }
                    }

                    const alignClass =
                      fmt.align === 'center'
                        ? 'text-center'
                        : fmt.align === 'right'
                        ? 'text-right'
                        : fmt.align === 'left'
                        ? 'text-left'
                        : typeof evaluatedVal === 'number' || fmt.isCurrency
                        ? 'text-right'
                        : 'text-left';

                    const isError = typeof evaluatedVal === 'string' && evaluatedVal.startsWith('#');

                    return (
                      <td
                        key={cIdx}
                        data-cell={`${indexToColLetter(cIdx + 1)}${rIdx + 1}`}
                        onClick={() => {
                          setSelectedCell({ row: rIdx, col: cIdx });
                          setEditingCell(null);
                        }}
                        onDoubleClick={() => {
                          setSelectedCell({ row: rIdx, col: cIdx });
                          setEditingCell({ row: rIdx, col: cIdx });
                        }}
                        className={`min-w-[120px] max-w-[240px] px-2.5 border-r border-b border-slate-200/80 dark:border-slate-800/80 truncate cursor-cell relative ${alignClass} ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/35 ring-2 ring-inset ring-emerald-600 dark:ring-emerald-400 z-10'
                            : rIdx === 0
                            ? 'bg-slate-50/70 dark:bg-slate-900/40'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/30'
                        } ${fmt.bold ? 'font-bold' : ''} ${fmt.italic ? 'italic' : ''}`}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            defaultValue={rawVal !== null && rawVal !== undefined ? String(rawVal) : ''}
                            aria-label={`Edit cell ${indexToColLetter(cIdx + 1)}${rIdx + 1}`}
                            onBlur={(e) => {
                              updateCellValue(rIdx, cIdx, e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateCellValue(rIdx, cIdx, e.currentTarget.value);
                                setEditingCell(null);
                                setSelectedCell({ row: Math.min(currentSheet.rows.length - 1, rIdx + 1), col: cIdx });
                                gridContainerRef.current?.focus();
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                                gridContainerRef.current?.focus();
                              }
                            }}
                            className="absolute inset-0 h-full w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 border-2 border-emerald-600 dark:border-emerald-400 outline-none font-mono text-xs z-30"
                          />
                        ) : (
                          <span className={isError ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-800 dark:text-slate-200'}>
                            {displayStr}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Worksheet Tabs & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1219] px-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Worksheets">
          {sheets.map((sheet, idx) => {
            const isActive = idx === activeSheetIndex;
            const isRenaming = renamingSheetIdx === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-700 font-semibold shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {isRenaming ? (
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRenameSheet}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRenameSheet();
                      if (e.key === 'Escape') setRenamingSheetIdx(null);
                    }}
                    aria-label="Rename worksheet"
                    autoFocus
                    className="w-24 bg-transparent border-b border-emerald-600 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveSheetIndex(idx);
                      setSelectedCell({ row: 0, col: 0 });
                    }}
                    onDoubleClick={() => startRenameSheet(idx)}
                    className="whitespace-nowrap"
                  >
                    {sheet.name}
                  </button>
                )}

                {!isRenaming && isActive && (
                  <button
                    type="button"
                    onClick={() => startRenameSheet(idx)}
                    aria-label={`Rename ${sheet.name}`}
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Rename sheet"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}

                {!isRenaming && sheets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSheet(idx)}
                    aria-label={`Delete ${sheet.name}`}
                    className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete sheet"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddSheet}
            aria-label="Add worksheet"
            title="Add worksheet"
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            {currentSheet.rows.length} rows × {currentSheet.headers.length} cols
          </span>
        </div>
      </div>
    </div>
  );
};
