// Browser-only pure formula calculation & generation engine

export function colLetterToIndex(colLetter: string): number {
  let index = 0;
  const upper = colLetter.toUpperCase().trim();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index; // 1-based (A = 1)
}

export function indexToColLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter || 'A';
}

export function excelSerialToDate(serial: number): Date {
  // Excel base date: Dec 30, 1899 (accounting for Excel leap year 1900 bug)
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);

  const seconds = totalSeconds % 60;
  totalSeconds = Math.floor(totalSeconds / 60);
  const minutes = totalSeconds % 60;
  const hours = Math.floor(totalSeconds / 60);

  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
}

export function dateToExcelSerial(date: Date): number {
  const epoch = new Date(1899, 11, 30);
  const diff = date.getTime() - epoch.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Evaluate spreadsheet cell formula safely without eval/Function
export function evaluateFormula(
  formula: string,
  grid: (string | number | boolean | null)[][]
): string | number | boolean {
  if (!formula.startsWith('=')) return formula;

  const raw = formula.slice(1).trim();
  const upper = raw.toUpperCase();

  try {
    // Helper to get range of numbers or values
    const parseRange = (rangeStr: string): (string | number | boolean | null)[] => {
      const parts = rangeStr.split(':');
      if (parts.length === 1) {
        return [getCellValue(parts[0].trim())];
      }
      const [startCol, startRow] = splitCellRef(parts[0].trim());
      const [endCol, endRow] = splitCellRef(parts[1].trim());

      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);

      const values: (string | number | boolean | null)[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          values.push(grid[r - 1]?.[c - 1] ?? null);
        }
      }
      return values;
    };

    const splitCellRef = (ref: string): [number, number] => {
      const match = ref.match(/^([A-Za-z]+)(\d+)$/);
      if (!match) return [1, 1];
      const col = colLetterToIndex(match[1]);
      const row = parseInt(match[2], 10);
      return [col, row];
    };

    const getCellValue = (ref: string): string | number | boolean | null => {
      const [col, row] = splitCellRef(ref);
      return grid[row - 1]?.[col - 1] ?? null;
    };

    // Math Functions
    const matchFunc = upper.match(/^([A-Z_]+)\((.*)\)$/);
    if (matchFunc) {
      const funcName = matchFunc[1];
      const argsStr = matchFunc[2];

      if (funcName === 'SUM') {
        const vals = parseRange(argsStr);
        return vals.reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : Number(v) || 0), 0);
      }

      if (funcName === 'AVERAGE') {
        const vals = parseRange(argsStr);
        const nums = vals
          .map((v) => (typeof v === 'number' ? v : Number(v)))
          .filter((v) => !isNaN(v));
        return nums.length > 0 ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : 0;
      }

      if (funcName === 'MIN') {
        const vals = parseRange(argsStr);
        const nums = vals
          .map((v) => (typeof v === 'number' ? v : Number(v)))
          .filter((v) => !isNaN(v));
        return nums.length > 0 ? Math.min(...nums) : 0;
      }

      if (funcName === 'MAX') {
        const vals = parseRange(argsStr);
        const nums = vals
          .map((v) => (typeof v === 'number' ? v : Number(v)))
          .filter((v) => !isNaN(v));
        return nums.length > 0 ? Math.max(...nums) : 0;
      }

      if (funcName === 'COUNT') {
        const vals = parseRange(argsStr);
        return vals.filter((v) => typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')).length;
      }

      if (funcName === 'COUNTA') {
        const vals = parseRange(argsStr);
        return vals.filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length;
      }

      if (funcName === 'CONCAT' || funcName === 'CONCATENATE') {
        const args = argsStr.split(',').map((s) => s.trim());
        return args
          .map((a) => {
            if (a.startsWith('"') && a.endsWith('"')) return a.slice(1, -1);
            return String(getCellValue(a) ?? '');
          })
          .join('');
      }

      if (funcName === 'UPPER') {
        const val = getCellValue(argsStr);
        return String(val ?? '').toUpperCase();
      }

      if (funcName === 'LOWER') {
        const val = getCellValue(argsStr);
        return String(val ?? '').toLowerCase();
      }

      if (funcName === 'TRIM') {
        const val = getCellValue(argsStr);
        return String(val ?? '').trim();
      }

      if (funcName === 'ROUND') {
        const [valRef, decRef] = argsStr.split(',').map((s) => s.trim());
        const num = Number(getCellValue(valRef) ?? valRef);
        const dec = Number(decRef || 0);
        return Number(num.toFixed(dec));
      }

      if (funcName === 'ABS') {
        const num = Number(getCellValue(argsStr) ?? argsStr);
        return Math.abs(num);
      }
    }

    // Direct cell reference like =A1
    if (/^[A-Za-z]+\d+$/.test(raw)) {
      return getCellValue(raw) ?? '';
    }

    // Basic arithmetic like =A1+B1, =100*1.2
    const arithMatch = raw.match(/^([A-Za-z0-9.]+)\s*([+\-*/])\s*([A-Za-z0-9.]+)$/);
    if (arithMatch) {
      const leftVal = /^[A-Za-z]+\d+$/.test(arithMatch[1]) ? Number(getCellValue(arithMatch[1])) : Number(arithMatch[1]);
      const rightVal = /^[A-Za-z]+\d+$/.test(arithMatch[3]) ? Number(getCellValue(arithMatch[3])) : Number(arithMatch[3]);
      const op = arithMatch[2];

      if (!isNaN(leftVal) && !isNaN(rightVal)) {
        if (op === '+') return leftVal + rightVal;
        if (op === '-') return leftVal - rightVal;
        if (op === '*') return leftVal * rightVal;
        if (op === '/') return rightVal !== 0 ? leftVal / rightVal : '#DIV/0!';
      }
    }

    return formula;
  } catch {
    return '#VALUE!';
  }
}

// Formula Generators
export interface FormulaGeneratorConfig {
  type: 'vlookup' | 'xlookup' | 'index_match' | 'if' | 'sumif' | 'countif' | 'textjoin';
  params: Record<string, string>;
}

export function generateFormula(config: FormulaGeneratorConfig): {
  formula: string;
  explanation: string;
  syntax: string;
} {
  const { type, params } = config;

  switch (type) {
    case 'vlookup': {
      const lookupVal = params.lookupValue || 'A2';
      const tableRange = params.tableRange || 'LookupSheet!$A$2:$D$100';
      const colIndex = params.colIndex || '3';
      const exact = params.exactMatch !== 'false' ? 'FALSE' : 'TRUE';
      return {
        formula: `=VLOOKUP(${lookupVal}, ${tableRange}, ${colIndex}, ${exact})`,
        explanation: `Searches for the value in ${lookupVal} down the first column of ${tableRange}, and returns the corresponding value from column ${colIndex}.`,
        syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
      };
    }

    case 'xlookup': {
      const lookupVal = params.lookupValue || 'A2';
      const lookupArray = params.lookupArray || 'Data!$A$2:$A$100';
      const returnArray = params.returnArray || 'Data!$C$2:$C$100';
      const notFound = params.ifNotFound ? `"${params.ifNotFound}"` : '"Not Found"';
      return {
        formula: `=XLOOKUP(${lookupVal}, ${lookupArray}, ${returnArray}, ${notFound}, 0)`,
        explanation: `Modern, safe lookup: searches for ${lookupVal} in ${lookupArray} and returns the value at the matching position from ${returnArray}. Doesn't break when columns move!`,
        syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])',
      };
    }

    case 'index_match': {
      const returnRange = params.returnRange || 'Data!$C$2:$C$100';
      const lookupVal = params.lookupValue || 'A2';
      const lookupRange = params.lookupRange || 'Data!$A$2:$A$100';
      return {
        formula: `=INDEX(${returnRange}, MATCH(${lookupVal}, ${lookupRange}, 0))`,
        explanation: `Flexible two-way lookup: MATCH finds the exact row position of ${lookupVal} in ${lookupRange}, and INDEX retrieves the value from ${returnRange} at that position.`,
        syntax: 'INDEX(array, MATCH(lookup_value, lookup_array, 0))',
      };
    }

    case 'if': {
      const condition = params.condition || 'A2>1000';
      const valTrue = params.valueIfTrue || '"Qualified"';
      const valFalse = params.valueIfFalse || '"Standard"';
      return {
        formula: `=IF(${condition}, ${valTrue}, ${valFalse})`,
        explanation: `Evaluates condition (${condition}). If TRUE, returns ${valTrue}; if FALSE, returns ${valFalse}.`,
        syntax: 'IF(logical_test, [value_if_true], [value_if_false])',
      };
    }

    case 'sumif': {
      const range = params.range || 'A2:A100';
      const criteria = params.criteria || '">500"';
      const sumRange = params.sumRange ? `, ${params.sumRange}` : '';
      return {
        formula: `=SUMIF(${range}, ${criteria}${sumRange})`,
        explanation: `Sums numbers in ${params.sumRange || range} that meet the condition (${criteria}) in ${range}.`,
        syntax: 'SUMIF(range, criteria, [sum_range])',
      };
    }

    case 'countif': {
      const range = params.range || 'A2:A100';
      const criteria = params.criteria || '"Completed"';
      return {
        formula: `=COUNTIF(${range}, ${criteria})`,
        explanation: `Counts cells within ${range} that equal ${criteria}.`,
        syntax: 'COUNTIF(range, criteria)',
      };
    }

    case 'textjoin': {
      const delimiter = params.delimiter || '", "';
      const ignoreEmpty = params.ignoreEmpty !== 'false' ? 'TRUE' : 'FALSE';
      const textRange = params.textRange || 'A2:D2';
      return {
        formula: `=TEXTJOIN(${delimiter}, ${ignoreEmpty}, ${textRange})`,
        explanation: `Concatenates strings in ${textRange} separated by delimiter ${delimiter}, skipping blanks if ${ignoreEmpty}.`,
        syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)',
      };
    }
  }
}

export const FORMULA_CHEATSHEET = [
  { name: 'SUM', cat: 'Math', syntax: '=SUM(A1:A10)', desc: 'Adds all numbers in a range of cells.' },
  { name: 'AVERAGE', cat: 'Statistical', syntax: '=AVERAGE(B2:B20)', desc: 'Calculates the arithmetic mean.' },
  { name: 'XLOOKUP', cat: 'Lookup', syntax: '=XLOOKUP(E2, A:A, C:C, "N/A")', desc: 'Modern bidirectional lookup.' },
  { name: 'VLOOKUP', cat: 'Lookup', syntax: '=VLOOKUP(A2, D:F, 3, FALSE)', desc: 'Vertical lookup in table array.' },
  { name: 'INDEX/MATCH', cat: 'Lookup', syntax: '=INDEX(B:B, MATCH(D1, A:A, 0))', desc: 'Powerful dynamic 2D lookup.' },
  { name: 'IF', cat: 'Logical', syntax: '=IF(C2>50, "Pass", "Fail")', desc: 'Conditional branch evaluation.' },
  { name: 'SUMIFS', cat: 'Math', syntax: '=SUMIFS(D:D, A:A, "East", B:B, ">100")', desc: 'Sum with multiple criteria.' },
  { name: 'COUNTIFS', cat: 'Statistical', syntax: '=COUNTIFS(A:A, "Active", C:C, "<30")', desc: 'Count with multiple criteria.' },
  { name: 'TEXTJOIN', cat: 'Text', syntax: '=TEXTJOIN(", ", TRUE, A2:A10)', desc: 'Join strings with a delimiter.' },
  { name: 'TRIM', cat: 'Text', syntax: '=TRIM(A2)', desc: 'Removes extra spaces from text.' },
  { name: 'UNIQUE', cat: 'Dynamic Array', syntax: '=UNIQUE(A2:A100)', desc: 'Returns distinct list of values.' },
  { name: 'FILTER', cat: 'Dynamic Array', syntax: '=FILTER(A2:C50, B2:B50="US")', desc: 'Filters range based on boolean criteria.' },
];
