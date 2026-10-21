export interface DedupeOptions {
  keyColumns: number[]; // empty means all columns
  caseSensitive: boolean;
  keep: 'first' | 'last';
  trimBeforeCompare: boolean;
}

export interface DedupeResult {
  cleanedRows: (string | number | boolean | null)[][];
  duplicateRows: (string | number | boolean | null)[][];
  removedCount: number;
  originalCount: number;
}

export function removeDuplicates(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  options: DedupeOptions
): DedupeResult {
  const originalCount = rows.length;
  const colsToCheck = options.keyColumns.length > 0
    ? options.keyColumns
    : Array.from({ length: headers.length }, (_, i) => i);

  const seen = new Map<string, number>();
  const duplicatesIndices = new Set<number>();

  const makeKey = (row: (string | number | boolean | null)[]) => {
    return colsToCheck
      .map((colIdx) => {
        let val = row[colIdx];
        if (val === null || val === undefined) return '__NULL__';
        let str = String(val);
        if (options.trimBeforeCompare) str = str.trim();
        if (!options.caseSensitive) str = str.toLowerCase();
        return str;
      })
      .join(':::');
  };

  if (options.keep === 'first') {
    rows.forEach((row, idx) => {
      const key = makeKey(row);
      if (seen.has(key)) {
        duplicatesIndices.add(idx);
      } else {
        seen.set(key, idx);
      }
    });
  } else {
    // Keep last: traverse backwards
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const key = makeKey(row);
      if (seen.has(key)) {
        duplicatesIndices.add(i);
      } else {
        seen.set(key, i);
      }
    }
  }

  const cleanedRows: (string | number | boolean | null)[][] = [];
  const duplicateRows: (string | number | boolean | null)[][] = [];

  rows.forEach((row, idx) => {
    if (duplicatesIndices.has(idx)) {
      duplicateRows.push(row);
    } else {
      cleanedRows.push(row);
    }
  });

  return {
    cleanedRows,
    duplicateRows,
    removedCount: duplicateRows.length,
    originalCount,
  };
}

export function removeBlankRows(
  rows: (string | number | boolean | null)[][],
  threshold = 1.0 // 1.0 = completely blank row
): (string | number | boolean | null)[][] {
  return rows.filter((row) => {
    if (!row || row.length === 0) return false;
    const blankCount = row.filter((cell) => cell === null || cell === undefined || String(cell).trim() === '').length;
    const blankRatio = blankCount / row.length;
    return blankRatio < threshold;
  });
}

export function removeBlankColumns(
  headers: string[],
  rows: (string | number | boolean | null)[][]
): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  const numCols = headers.length;
  const keepCols: number[] = [];

  for (let c = 0; c < numCols; c++) {
    const hasData = rows.some((r) => {
      const val = r[c];
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
    if (hasData) {
      keepCols.push(c);
    }
  }

  const newHeaders = keepCols.map((c) => headers[c]);
  const newRows = rows.map((r) => keepCols.map((c) => r[c]));

  return { headers: newHeaders, rows: newRows };
}

export function trimWhitespace(
  rows: (string | number | boolean | null)[][],
  collapseInner = false
): (string | number | boolean | null)[][] {
  return rows.map((row) =>
    row.map((cell) => {
      if (typeof cell === 'string') {
        let trimmed = cell.trim();
        if (collapseInner) {
          trimmed = trimmed.replace(/\s+/g, ' ');
        }
        return trimmed;
      }
      return cell;
    })
  );
}

export function splitColumn(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  targetColIndex: number,
  delimiter: string,
  newColNames: string[]
): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  const newHeaders = [...headers];
  const replaceCount = newColNames.length;
  newHeaders.splice(targetColIndex, 1, ...newColNames);

  const newRows = rows.map((row) => {
    const val = row[targetColIndex];
    const str = val !== null && val !== undefined ? String(val) : '';
    const parts = str.split(delimiter);

    const expandedParts = Array.from({ length: replaceCount }, (_, i) => {
      const part = parts[i];
      return part !== undefined ? part.trim() : null;
    });

    const newRow = [...row];
    newRow.splice(targetColIndex, 1, ...expandedParts);
    return newRow;
  });

  return { headers: newHeaders, rows: newRows };
}

export function combineColumns(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  targetColIndices: number[],
  separator: string,
  newColName: string,
  removeOriginals = false
): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  const newHeaders = removeOriginals
    ? headers.filter((_, i) => !targetColIndices.includes(i)).concat(newColName)
    : [...headers, newColName];

  const newRows = rows.map((row) => {
    const combinedVal = targetColIndices
      .map((i) => row[i])
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
      .join(separator);

    if (removeOriginals) {
      const filtered = row.filter((_, i) => !targetColIndices.includes(i));
      return [...filtered, combinedVal];
    }
    return [...row, combinedVal];
  });

  return { headers: newHeaders, rows: newRows };
}

export function sortRows(
  rows: (string | number | boolean | null)[][],
  colIndex: number,
  direction: 'asc' | 'desc',
  dataType: 'auto' | 'number' | 'text' | 'date' = 'auto'
): (string | number | boolean | null)[][] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const valA = a[colIndex];
    const valB = b[colIndex];

    if (valA === valB) return 0;
    if (valA === null || valA === undefined || valA === '') return 1;
    if (valB === null || valB === undefined || valB === '') return -1;

    let comp = 0;
    const isNum = dataType === 'number' || (dataType === 'auto' && !isNaN(Number(valA)) && !isNaN(Number(valB)));

    if (isNum) {
      comp = Number(valA) - Number(valB);
    } else {
      comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    }

    return direction === 'asc' ? comp : -comp;
  });
  return sorted;
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'is_blank'
  | 'is_not_blank'
  | 'regex';

export interface FilterCondition {
  colIndex: number;
  operator: FilterOperator;
  value: string;
}

export function filterRows(
  rows: (string | number | boolean | null)[][],
  conditions: FilterCondition[],
  matchAll = true
): (string | number | boolean | null)[][] {
  if (conditions.length === 0) return rows;

  return rows.filter((row) => {
    const results = conditions.map((cond) => {
      const cellVal = row[cond.colIndex];
      const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
      const targetVal = cond.value || '';

      switch (cond.operator) {
        case 'equals':
          return strVal.toLowerCase() === targetVal.toLowerCase();
        case 'not_equals':
          return strVal.toLowerCase() !== targetVal.toLowerCase();
        case 'contains':
          return strVal.toLowerCase().includes(targetVal.toLowerCase());
        case 'not_contains':
          return !strVal.toLowerCase().includes(targetVal.toLowerCase());
        case 'starts_with':
          return strVal.toLowerCase().startsWith(targetVal.toLowerCase());
        case 'ends_with':
          return strVal.toLowerCase().endsWith(targetVal.toLowerCase());
        case 'greater_than':
          return Number(cellVal) > Number(targetVal);
        case 'less_than':
          return Number(cellVal) < Number(targetVal);
        case 'is_blank':
          return strVal.trim() === '';
        case 'is_not_blank':
          return strVal.trim() !== '';
        case 'regex':
          try {
            return new RegExp(targetVal, 'i').test(strVal);
          } catch {
            return false;
          }
        default:
          return true;
      }
    });

    return matchAll ? results.every(Boolean) : results.some(Boolean);
  });
}

export function transposeTable(
  headers: string[],
  rows: (string | number | boolean | null)[][]
): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  const fullMatrix = [headers, ...rows];
  if (fullMatrix.length === 0) return { headers: [], rows: [] };

  const numCols = Math.max(...fullMatrix.map((r) => r.length));
  const transposed: (string | number | boolean | null)[][] = [];

  for (let c = 0; c < numCols; c++) {
    const newRow: (string | number | boolean | null)[] = [];
    for (let r = 0; r < fullMatrix.length; r++) {
      newRow.push(fullMatrix[r]?.[c] ?? null);
    }
    transposed.push(newRow);
  }

  const newHeaders = transposed[0].map((h, i) => (h ? String(h) : `Header ${i + 1}`));
  const newRows = transposed.slice(1);

  return { headers: newHeaders, rows: newRows };
}

export function findAndReplace(
  rows: (string | number | boolean | null)[][],
  findText: string,
  replaceText: string,
  options: {
    targetColIndex?: number; // undefined means all columns
    matchCase: boolean;
    exactMatch: boolean;
    useRegex: boolean;
  }
): {
  rows: (string | number | boolean | null)[][];
  replacementCount: number;
} {
  let count = 0;
  let regex: RegExp | null = null;

  if (options.useRegex) {
    try {
      regex = new RegExp(findText, options.matchCase ? 'g' : 'gi');
    } catch {
      regex = null;
    }
  }

  const updatedRows = rows.map((row) =>
    row.map((cell, colIdx) => {
      if (options.targetColIndex !== undefined && colIdx !== options.targetColIndex) {
        return cell;
      }
      if (cell === null || cell === undefined) return cell;

      const str = String(cell);

      if (options.useRegex && regex) {
        if (regex.test(str)) {
          const matchCount = (str.match(regex) || []).length;
          count += matchCount;
          return str.replace(regex, replaceText);
        }
        return cell;
      }

      if (options.exactMatch) {
        const matches = options.matchCase ? str === findText : str.toLowerCase() === findText.toLowerCase();
        if (matches) {
          count++;
          return replaceText;
        }
        return cell;
      }

      // Partial substring match
      if (options.matchCase) {
        if (str.includes(findText)) {
          const matches = str.split(findText).length - 1;
          count += matches;
          return str.split(findText).join(replaceText);
        }
      } else {
        const lowerStr = str.toLowerCase();
        const lowerFind = findText.toLowerCase();
        if (lowerStr.includes(lowerFind)) {
          const re = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const matches = (str.match(re) || []).length;
          count += matches;
          return str.replace(re, replaceText);
        }
      }

      return cell;
    })
  );

  return { rows: updatedRows, replacementCount: count };
}

export interface ColumnProfile {
  name: string;
  index: number;
  inferredType: 'number' | 'string' | 'date' | 'boolean' | 'empty';
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  sampleValues: (string | number | boolean | null)[];
  numericStats?: {
    min: number;
    max: number;
    sum: number;
    avg: number;
  };
}

export function profileData(headers: string[], rows: (string | number | boolean | null)[][]): ColumnProfile[] {
  const totalRows = rows.length;

  return headers.map((header, colIdx) => {
    const values = rows.map((r) => r[colIdx]);
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const nullCount = totalRows - nonNullValues.length;
    const nullPercentage = totalRows > 0 ? (nullCount / totalRows) * 100 : 0;

    const uniqueSet = new Set(nonNullValues.map((v) => String(v)));
    const uniqueCount = uniqueSet.size;

    // Type detection
    let numericCount = 0;
    let booleanCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    nonNullValues.forEach((val) => {
      const str = String(val).toLowerCase();
      if (str === 'true' || str === 'false') {
        booleanCount++;
      }
      const num = Number(val);
      if (!isNaN(num) && str.trim() !== '') {
        numericCount++;
        sum += num;
        if (num < min) min = num;
        if (num > max) max = num;
      }
    });

    let inferredType: 'number' | 'string' | 'date' | 'boolean' | 'empty' = 'string';
    if (nonNullValues.length === 0) {
      inferredType = 'empty';
    } else if (numericCount / nonNullValues.length >= 0.8) {
      inferredType = 'number';
    } else if (booleanCount / nonNullValues.length >= 0.8) {
      inferredType = 'boolean';
    }

    const profile: ColumnProfile = {
      name: header,
      index: colIdx,
      inferredType,
      totalCount: totalRows,
      nullCount,
      nullPercentage: Number(nullPercentage.toFixed(1)),
      uniqueCount,
      sampleValues: nonNullValues.slice(0, 5),
    };

    if (inferredType === 'number' && numericCount > 0) {
      profile.numericStats = {
        min,
        max,
        sum: Number(sum.toFixed(2)),
        avg: Number((sum / numericCount).toFixed(2)),
      };
    }

    return profile;
  });
}

export interface DiffRow {
  status: 'added' | 'removed' | 'modified' | 'identical';
  rowNumA?: number;
  rowNumB?: number;
  cells: {
    valA?: string | number | boolean | null;
    valB?: string | number | boolean | null;
    isDifferent: boolean;
  }[];
}

export function compareTables(
  headersA: string[],
  rowsA: (string | number | boolean | null)[][],
  headersB: string[],
  rowsB: (string | number | boolean | null)[][],
  keyColIndexA?: number,
  keyColIndexB?: number
): {
  diffRows: DiffRow[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  identicalCount: number;
} {
  const diffRows: DiffRow[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let identicalCount = 0;

  const maxCols = Math.max(headersA.length, headersB.length);

  // If key columns specified, match by key
  if (keyColIndexA !== undefined && keyColIndexB !== undefined) {
    const mapB = new Map<string, { row: (string | number | boolean | null)[]; index: number }>();
    rowsB.forEach((row, idx) => {
      const key = String(row[keyColIndexB] ?? '');
      if (key) mapB.set(key, { row, index: idx });
    });

    const visitedKeysB = new Set<string>();

    rowsA.forEach((rowA, idxA) => {
      const key = String(rowA[keyColIndexA] ?? '');
      const matchB = mapB.get(key);

      if (!matchB) {
        removedCount++;
        diffRows.push({
          status: 'removed',
          rowNumA: idxA + 1,
          cells: Array.from({ length: maxCols }, (_, c) => ({
            valA: rowA[c] ?? null,
            valB: undefined,
            isDifferent: true,
          })),
        });
      } else {
        visitedKeysB.add(key);
        const rowB = matchB.row;
        let isRowDiff = false;
        const cells = Array.from({ length: maxCols }, (_, c) => {
          const valA = rowA[c] ?? null;
          const valB = rowB[c] ?? null;
          const diff = String(valA ?? '') !== String(valB ?? '');
          if (diff) isRowDiff = true;
          return { valA, valB, isDifferent: diff };
        });

        if (isRowDiff) {
          modifiedCount++;
          diffRows.push({ status: 'modified', rowNumA: idxA + 1, rowNumB: matchB.index + 1, cells });
        } else {
          identicalCount++;
          diffRows.push({ status: 'identical', rowNumA: idxA + 1, rowNumB: matchB.index + 1, cells });
        }
      }
    });

    // Added rows in B that were not in A
    rowsB.forEach((rowB, idxB) => {
      const key = String(rowB[keyColIndexB] ?? '');
      if (!visitedKeysB.has(key)) {
        addedCount++;
        diffRows.push({
          status: 'added',
          rowNumB: idxB + 1,
          cells: Array.from({ length: maxCols }, (_, c) => ({
            valA: undefined,
            valB: rowB[c] ?? null,
            isDifferent: true,
          })),
        });
      }
    });
  } else {
    // Row-by-row positional diff
    const maxRows = Math.max(rowsA.length, rowsB.length);
    for (let r = 0; r < maxRows; r++) {
      const rowA = rowsA[r];
      const rowB = rowsB[r];

      if (!rowA && rowB) {
        addedCount++;
        diffRows.push({
          status: 'added',
          rowNumB: r + 1,
          cells: Array.from({ length: maxCols }, (_, c) => ({
            valA: undefined,
            valB: rowB[c] ?? null,
            isDifferent: true,
          })),
        });
      } else if (rowA && !rowB) {
        removedCount++;
        diffRows.push({
          status: 'removed',
          rowNumA: r + 1,
          cells: Array.from({ length: maxCols }, (_, c) => ({
            valA: rowA[c] ?? null,
            valB: undefined,
            isDifferent: true,
          })),
        });
      } else if (rowA && rowB) {
        let isRowDiff = false;
        const cells = Array.from({ length: maxCols }, (_, c) => {
          const valA = rowA[c] ?? null;
          const valB = rowB[c] ?? null;
          const diff = String(valA ?? '') !== String(valB ?? '');
          if (diff) isRowDiff = true;
          return { valA, valB, isDifferent: diff };
        });

        if (isRowDiff) {
          modifiedCount++;
          diffRows.push({ status: 'modified', rowNumA: r + 1, rowNumB: r + 1, cells });
        } else {
          identicalCount++;
          diffRows.push({ status: 'identical', rowNumA: r + 1, rowNumB: r + 1, cells });
        }
      }
    }
  }

  return {
    diffRows,
    addedCount,
    removedCount,
    modifiedCount,
    identicalCount,
  };
}

export function joinTables(
  headersA: string[],
  rowsA: (string | number | boolean | null)[][],
  headersB: string[],
  rowsB: (string | number | boolean | null)[][],
  keyColIndexA: number,
  keyColIndexB: number,
  joinType: 'inner' | 'left' | 'full'
): {
  headers: string[];
  rows: (string | number | boolean | null)[][];
} {
  // Avoid duplicate column header collisions
  const cleanHeadersB = headersB.map((h, i) => (headersA.includes(h) ? `${h}_2` : h));
  const mergedHeaders = [...headersA, ...cleanHeadersB];

  const mapB = new Map<string, (string | number | boolean | null)[][]>();
  rowsB.forEach((row) => {
    const key = String(row[keyColIndexB] ?? '').trim();
    if (!mapB.has(key)) mapB.set(key, []);
    mapB.get(key)!.push(row);
  });

  const matchedKeysB = new Set<string>();
  const joinedRows: (string | number | boolean | null)[][] = [];

  rowsA.forEach((rowA) => {
    const keyA = String(rowA[keyColIndexA] ?? '').trim();
    const matchesB = mapB.get(keyA);

    if (matchesB && matchesB.length > 0) {
      matchedKeysB.add(keyA);
      matchesB.forEach((rowB) => {
        joinedRows.push([...rowA, ...rowB]);
      });
    } else if (joinType === 'left' || joinType === 'full') {
      const nullsB = Array.from({ length: headersB.length }, () => null);
      joinedRows.push([...rowA, ...nullsB]);
    }
  });

  if (joinType === 'full') {
    rowsB.forEach((rowB) => {
      const keyB = String(rowB[keyColIndexB] ?? '').trim();
      if (!matchedKeysB.has(keyB)) {
        const nullsA = Array.from({ length: headersA.length }, () => null);
        joinedRows.push([...nullsA, ...rowB]);
      }
    });
  }

  return { headers: mergedHeaders, rows: joinedRows };
}
