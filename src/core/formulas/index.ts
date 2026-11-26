// Browser-only deterministic formula calculation & generation engine (zero eval / zero Function)

export function colLetterToIndex(colLetter: string): number {
  const upper = colLetter.toUpperCase().trim();
  if (!/^[A-Z]+$/.test(upper)) return 0;
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index; // 1-based (A = 1)
}

export function indexToColLetter(index: number): string {
  if (!Number.isFinite(index) || index < 1) return 'A';
  let temp = Math.floor(index);
  let letter = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter || 'A';
}

export function excelSerialToDate(serial: number): Date {
  // Excel 1900 date system epoch (Dec 30, 1899 accounts for Excel's 1900 leap-year bug)
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);

  const seconds = totalSeconds % 60;
  totalSeconds = Math.floor(totalSeconds / 60);
  const minutes = totalSeconds % 60;
  const hours = Math.floor(totalSeconds / 60);

  return new Date(
    Date.UTC(
      dateInfo.getUTCFullYear(),
      dateInfo.getUTCMonth(),
      dateInfo.getUTCDate(),
      hours,
      minutes,
      seconds
    )
  );
}

export function dateToExcelSerial(date: Date): number {
  const epochUtc = Date.UTC(1899, 11, 30);
  const targetUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((targetUtc - epochUtc) / 86400000);
}

export type CellPrimitive = string | number | boolean | null;

function splitCellRef(ref: string): [number, number] | null {
  const match = ref.trim().replace(/\$/g, '').match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  const col = colLetterToIndex(match[1]);
  const row = parseInt(match[2], 10);
  if (col < 1 || row < 1) return null;
  return [col, row];
}

// Split top-level function arguments respecting nested parentheses and double quotes
function splitArgs(argsStr: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && ch === '(') {
      depth++;
      current += ch;
    } else if (!inQuotes && ch === ')') {
      depth--;
      current += ch;
    } else if (!inQuotes && depth === 0 && ch === ',') {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '' || argsStr.trim().endsWith(',')) {
    args.push(current.trim());
  }
  return args;
}

function toNumber(val: CellPrimitive): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (val === null || val === undefined) return null;
  const trimmed = String(val).trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function matchesCriteria(value: CellPrimitive, criteriaRaw: CellPrimitive): boolean {
  const criteria = String(criteriaRaw ?? '').trim();
  const opMatch = criteria.match(/^(>=|<=|<>|!=|>|<|=)(.*)$/);
  if (opMatch) {
    const op = opMatch[1];
    const rhsRaw = opMatch[2].trim();
    const lhsNum = toNumber(value);
    const rhsNum = toNumber(rhsRaw);

    if (lhsNum !== null && rhsNum !== null) {
      if (op === '>=') return lhsNum >= rhsNum;
      if (op === '<=') return lhsNum <= rhsNum;
      if (op === '>') return lhsNum > rhsNum;
      if (op === '<') return lhsNum < rhsNum;
      if (op === '=') return lhsNum === rhsNum;
      if (op === '<>' || op === '!=') return lhsNum !== rhsNum;
    }
    const lhsStr = String(value ?? '').toLowerCase();
    const rhsStr = rhsRaw.toLowerCase();
    if (op === '=') return lhsStr === rhsStr;
    if (op === '<>' || op === '!=') return lhsStr !== rhsStr;
    return false;
  }

  const lhsNum = toNumber(value);
  const rhsNum = toNumber(criteria);
  if (lhsNum !== null && rhsNum !== null) {
    return lhsNum === rhsNum;
  }
  return String(value ?? '').trim().toLowerCase() === criteria.toLowerCase();
}

interface EvalContext {
  grid: CellPrimitive[][];
  cache: Map<string, CellPrimitive>;
  visiting: Set<string>;
}

function evalCellAt(row1: number, col1: number, ctx: EvalContext): CellPrimitive {
  const key = `${row1}:${col1}`;
  if (ctx.cache.has(key)) return ctx.cache.get(key)!;
  if (ctx.visiting.has(key)) return '#CYCLE!';

  const raw = ctx.grid[row1 - 1]?.[col1 - 1] ?? null;
  if (typeof raw === 'string' && raw.trim().startsWith('=')) {
    ctx.visiting.add(key);
    const result = evalExpression(raw.trim().slice(1), ctx);
    ctx.visiting.delete(key);
    ctx.cache.set(key, result);
    return result;
  }
  ctx.cache.set(key, raw);
  return raw;
}

function collectRangeValues(rangeStr: string, ctx: EvalContext): CellPrimitive[] {
  const trimmed = rangeStr.trim();
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx !== -1) {
    const start = splitCellRef(trimmed.slice(0, colonIdx));
    const end = splitCellRef(trimmed.slice(colonIdx + 1));
    if (!start || !end) return [];
    const minCol = Math.min(start[0], end[0]);
    const maxCol = Math.max(start[0], end[0]);
    const minRow = Math.min(start[1], end[1]);
    const maxRow = Math.max(start[1], end[1]);

    const vals: CellPrimitive[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        vals.push(evalCellAt(r, c, ctx));
      }
    }
    return vals;
  }

  const single = splitCellRef(trimmed);
  if (single) {
    return [evalCellAt(single[1], single[0], ctx)];
  }

  return [evalExpression(trimmed, ctx)];
}

function collectArgsFlat(args: string[], ctx: EvalContext): CellPrimitive[] {
  const values: CellPrimitive[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (arg.includes(':') && /^[A-Za-z$]+\d+\s*:\s*[A-Za-z$]+\d+$/.test(arg)) {
      values.push(...collectRangeValues(arg, ctx));
    } else {
      values.push(evalExpression(arg, ctx));
    }
  }
  return values;
}

function evalFunction(funcName: string, argsRaw: string, ctx: EvalContext): CellPrimitive {
  const name = funcName.toUpperCase();
  const args = splitArgs(argsRaw);

  if (name === 'SUM') {
    const vals = collectArgsFlat(args, ctx);
    for (const v of vals) {
      if (typeof v === 'string' && v.startsWith('#')) return v;
    }
    const sum = vals.reduce<number>((acc, v) => acc + (toNumber(v) ?? 0), 0);
    return Number(sum.toFixed(10));
  }

  if (name === 'PRODUCT') {
    const vals = collectArgsFlat(args, ctx);
    const nums = vals.map(toNumber).filter((n): n is number => n !== null);
    if (nums.length === 0) return 0;
    return Number(nums.reduce((acc, n) => acc * n, 1).toFixed(10));
  }

  if (name === 'AVERAGE' || name === 'AVG') {
    const vals = collectArgsFlat(args, ctx);
    for (const v of vals) {
      if (typeof v === 'string' && v.startsWith('#')) return v;
    }
    const nums = vals.map(toNumber).filter((n): n is number => n !== null);
    return nums.length > 0 ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4)) : 0;
  }

  if (name === 'MEDIAN') {
    const vals = collectArgsFlat(args, ctx);
    const nums = vals.map(toNumber).filter((n): n is number => n !== null).sort((a, b) => a - b);
    if (nums.length === 0) return 0;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 !== 0 ? nums[mid] : Number(((nums[mid - 1] + nums[mid]) / 2).toFixed(4));
  }

  if (name === 'MIN') {
    const vals = collectArgsFlat(args, ctx);
    const nums = vals.map(toNumber).filter((n): n is number => n !== null);
    return nums.length > 0 ? Math.min(...nums) : 0;
  }

  if (name === 'MAX') {
    const vals = collectArgsFlat(args, ctx);
    const nums = vals.map(toNumber).filter((n): n is number => n !== null);
    return nums.length > 0 ? Math.max(...nums) : 0;
  }

  if (name === 'COUNT') {
    const vals = collectArgsFlat(args, ctx);
    return vals.filter((v) => toNumber(v) !== null).length;
  }

  if (name === 'COUNTA') {
    const vals = collectArgsFlat(args, ctx);
    return vals.filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length;
  }

  if (name === 'IF') {
    if (args.length < 2) return '#VALUE!';
    const cond = evalExpression(args[0], ctx);
    const truthy = typeof cond === 'boolean' ? cond : typeof cond === 'number' ? cond !== 0 : String(cond).toUpperCase() === 'TRUE';
    if (truthy) return evalExpression(args[1], ctx);
    return args.length >= 3 ? evalExpression(args[2], ctx) : false;
  }

  if (name === 'SUMIF') {
    if (args.length < 2) return '#VALUE!';
    const rangeVals = collectRangeValues(args[0], ctx);
    const criteria = evalExpression(args[1], ctx);
    const sumVals = args[2] ? collectRangeValues(args[2], ctx) : rangeVals;
    let total = 0;
    for (let i = 0; i < rangeVals.length; i++) {
      if (matchesCriteria(rangeVals[i], criteria)) {
        total += toNumber(sumVals[i] ?? null) ?? 0;
      }
    }
    return Number(total.toFixed(10));
  }

  if (name === 'COUNTIF') {
    if (args.length < 2) return '#VALUE!';
    const rangeVals = collectRangeValues(args[0], ctx);
    const criteria = evalExpression(args[1], ctx);
    return rangeVals.filter((v) => matchesCriteria(v, criteria)).length;
  }

  if (name === 'CONCAT' || name === 'CONCATENATE') {
    const vals = collectArgsFlat(args, ctx);
    return vals.map((v) => (v === null || v === undefined ? '' : String(v))).join('');
  }

  if (name === 'TEXTJOIN') {
    if (args.length < 3) return '#VALUE!';
    const delim = String(evalExpression(args[0], ctx) ?? '');
    const ignoreEmptyRaw = evalExpression(args[1], ctx);
    const ignoreEmpty = ignoreEmptyRaw === true || String(ignoreEmptyRaw).toUpperCase() === 'TRUE' || ignoreEmptyRaw === 1;
    const vals = collectArgsFlat(args.slice(2), ctx).map((v) => (v === null || v === undefined ? '' : String(v)));
    return (ignoreEmpty ? vals.filter((s) => s.trim() !== '') : vals).join(delim);
  }

  if (name === 'UPPER') {
    return String(evalExpression(args[0] ?? '', ctx) ?? '').toUpperCase();
  }

  if (name === 'LOWER') {
    return String(evalExpression(args[0] ?? '', ctx) ?? '').toLowerCase();
  }

  if (name === 'TRIM') {
    return String(evalExpression(args[0] ?? '', ctx) ?? '').trim().replace(/\s+/g, ' ');
  }

  if (name === 'LEN') {
    return String(evalExpression(args[0] ?? '', ctx) ?? '').length;
  }

  if (name === 'LEFT') {
    const str = String(evalExpression(args[0] ?? '', ctx) ?? '');
    const count = toNumber(evalExpression(args[1] ?? '1', ctx)) ?? 1;
    return str.slice(0, Math.max(0, Math.floor(count)));
  }

  if (name === 'RIGHT') {
    const str = String(evalExpression(args[0] ?? '', ctx) ?? '');
    const count = toNumber(evalExpression(args[1] ?? '1', ctx)) ?? 1;
    return count <= 0 ? '' : str.slice(-Math.floor(count));
  }

  if (name === 'ROUND') {
    const num = toNumber(evalExpression(args[0] ?? '0', ctx));
    const dec = toNumber(evalExpression(args[1] ?? '0', ctx)) ?? 0;
    if (num === null) return '#VALUE!';
    const factor = Math.pow(10, Math.floor(dec));
    return Math.round(num * factor) / factor;
  }

  if (name === 'ABS') {
    const num = toNumber(evalExpression(args[0] ?? '0', ctx));
    return num === null ? '#VALUE!' : Math.abs(num);
  }

  return '#NAME?';
}

// Recursive descent parser for safe formula evaluation (comparisons, +, -, *, /, ^, parentheses, functions, cell refs, literals)
type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }
  | { type: 'colon' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let str = '';
      i++;
      while (i < expr.length) {
        if (expr[i] === '"' && expr[i + 1] === '"') {
          str += '"';
          i += 2;
        } else if (expr[i] === '"') {
          i++;
          break;
        } else {
          str += expr[i++];
        }
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(numStr) });
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[A-Za-z0-9_$]/.test(expr[i])) {
        ident += expr[i++];
      }
      const upper = ident.toUpperCase();
      if (upper === 'TRUE') {
        tokens.push({ type: 'boolean', value: true });
      } else if (upper === 'FALSE') {
        tokens.push({ type: 'boolean', value: false });
      } else {
        tokens.push({ type: 'ident', value: ident });
      }
      continue;
    }
    // Two-char comparison operators
    const two = expr.slice(i, i + 2);
    if (['>=', '<=', '<>', '!='].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/^=&<>'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'colon' });
      i++;
      continue;
    }
    // Skip unknown char
    i++;
  }
  return tokens;
}

function evalExpression(expr: string, ctx: EvalContext): CellPrimitive {
  const trimmed = expr.trim();
  if (trimmed === '') return '';

  // Fast path: pure function call spanning entire expression
  const funcHead = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\(([\s\S]*)\)$/);
  if (funcHead) {
    // Verify the opening '(' matches the final ')'
    let depth = 0;
    let inQuotes = false;
    let matchesFull = true;
    const startIdx = funcHead[1].length;
    for (let i = startIdx; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && ch === '(') depth++;
      else if (!inQuotes && ch === ')') {
        depth--;
        if (depth === 0 && i < trimmed.length - 1) {
          matchesFull = false;
          break;
        }
      }
    }
    if (matchesFull) {
      return evalFunction(funcHead[1], funcHead[2], ctx);
    }
  }

  const tokens = tokenize(trimmed);
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseComparison(): CellPrimitive {
    let left = parseConcat();
    while (peek()?.type === 'op' && ['=', '<>', '!=', '<', '>', '<=', '>='].includes((peek() as { type: 'op'; value: string }).value)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parseConcat();
      const lNum = toNumber(left);
      const rNum = toNumber(right);
      if (lNum !== null && rNum !== null) {
        if (op === '=') left = lNum === rNum;
        else if (op === '<>' || op === '!=') left = lNum !== rNum;
        else if (op === '<') left = lNum < rNum;
        else if (op === '>') left = lNum > rNum;
        else if (op === '<=') left = lNum <= rNum;
        else if (op === '>=') left = lNum >= rNum;
      } else {
        const lStr = String(left ?? '').toLowerCase();
        const rStr = String(right ?? '').toLowerCase();
        if (op === '=') left = lStr === rStr;
        else if (op === '<>' || op === '!=') left = lStr !== rStr;
        else if (op === '<') left = lStr < rStr;
        else if (op === '>') left = lStr > rStr;
        else if (op === '<=') left = lStr <= rStr;
        else if (op === '>=') left = lStr >= rStr;
      }
    }
    return left;
  }

  function parseConcat(): CellPrimitive {
    let left = parseAddSub();
    while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '&') {
      consume();
      const right = parseAddSub();
      left = `${left ?? ''}${right ?? ''}`;
    }
    return left;
  }

  function parseAddSub(): CellPrimitive {
    let left = parseMulDiv();
    while (peek()?.type === 'op' && ['+', '-'].includes((peek() as { type: 'op'; value: string }).value)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parseMulDiv();
      if (typeof left === 'string' && left.startsWith('#')) return left;
      if (typeof right === 'string' && right.startsWith('#')) return right;
      const l = toNumber(left) ?? 0;
      const r = toNumber(right) ?? 0;
      left = op === '+' ? Number((l + r).toFixed(10)) : Number((l - r).toFixed(10));
    }
    return left;
  }

  function parseMulDiv(): CellPrimitive {
    let left = parsePower();
    while (peek()?.type === 'op' && ['*', '/'].includes((peek() as { type: 'op'; value: string }).value)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parsePower();
      if (typeof left === 'string' && left.startsWith('#')) return left;
      if (typeof right === 'string' && right.startsWith('#')) return right;
      const l = toNumber(left) ?? 0;
      const r = toNumber(right) ?? 0;
      if (op === '/') {
        if (r === 0) return '#DIV/0!';
        left = Number((l / r).toFixed(10));
      } else {
        left = Number((l * r).toFixed(10));
      }
    }
    return left;
  }

  function parsePower(): CellPrimitive {
    let left = parseUnary();
    while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '^') {
      consume();
      const right = parseUnary();
      const l = toNumber(left) ?? 0;
      const r = toNumber(right) ?? 0;
      left = Number(Math.pow(l, r).toFixed(10));
    }
    return left;
  }

  function parseUnary(): CellPrimitive {
    if (peek()?.type === 'op' && ['+', '-'].includes((peek() as { type: 'op'; value: string }).value)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const val = parseUnary();
      const num = toNumber(val);
      if (num === null) return '#VALUE!';
      return op === '-' ? -num : num;
    }
    return parsePrimary();
  }

  function parsePrimary(): CellPrimitive {
    const tok = peek();
    if (!tok) return '';

    if (tok.type === 'number') {
      consume();
      return tok.value;
    }
    if (tok.type === 'string') {
      consume();
      return tok.value;
    }
    if (tok.type === 'boolean') {
      consume();
      return tok.value;
    }
    if (tok.type === 'paren' && tok.value === '(') {
      consume();
      const inner = parseComparison();
      if (peek()?.type === 'paren' && (peek() as { type: 'paren'; value: string }).value === ')') {
        consume();
      }
      return inner;
    }
    if (tok.type === 'ident') {
      consume();
      // Function call inside expression
      if (peek()?.type === 'paren' && (peek() as { type: 'paren'; value: string }).value === '(') {
        consume();
        let depth = 1;
        const innerParts: string[] = [];
        while (pos < tokens.length && depth > 0) {
          const t = consume();
          if (t.type === 'paren' && t.value === '(') {
            depth++;
            innerParts.push('(');
          } else if (t.type === 'paren' && t.value === ')') {
            depth--;
            if (depth > 0) innerParts.push(')');
          } else if (t.type === 'string') {
            innerParts.push(`"${t.value}"`);
          } else if (t.type === 'comma') {
            innerParts.push(',');
          } else if (t.type === 'colon') {
            innerParts.push(':');
          } else if ('value' in t) {
            innerParts.push(String(t.value));
          }
        }
        return evalFunction(tok.value, innerParts.join(''), ctx);
      }

      // Cell reference
      const ref = splitCellRef(tok.value);
      if (ref) {
        return evalCellAt(ref[1], ref[0], ctx);
      }
      return '#NAME?';
    }

    consume();
    return '#VALUE!';
  }

  return parseComparison();
}

export function evaluateFormula(
  formula: string,
  grid: CellPrimitive[][]
): CellPrimitive {
  if (!formula.trim().startsWith('=')) return formula;
  try {
    const ctx: EvalContext = {
      grid,
      cache: new Map(),
      visiting: new Set(),
    };
    return evalExpression(formula.trim().slice(1), ctx);
  } catch {
    return '#VALUE!';
  }
}

export function evaluateGrid(grid: CellPrimitive[][]): CellPrimitive[][] {
  const ctx: EvalContext = {
    grid,
    cache: new Map(),
    visiting: new Set(),
  };

  return grid.map((row, rIdx) =>
    row.map((cell, cIdx) => {
      if (typeof cell === 'string' && cell.trim().startsWith('=')) {
        return evalCellAt(rIdx + 1, cIdx + 1, ctx);
      }
      return cell;
    })
  );
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
      const lookupVal = params.lookupValue?.trim() || 'A2';
      const tableRange = params.tableRange?.trim() || 'LookupSheet!$A$2:$D$100';
      const colIndex = params.colIndex?.trim() || '3';
      const exact = params.exactMatch !== 'false' ? 'FALSE' : 'TRUE';
      return {
        formula: `=VLOOKUP(${lookupVal}, ${tableRange}, ${colIndex}, ${exact})`,
        explanation: `Searches for the value in ${lookupVal} down the first column of ${tableRange}, and returns the matching value from column ${colIndex} using ${exact === 'FALSE' ? 'an exact' : 'an approximate'} match.`,
        syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
      };
    }

    case 'xlookup': {
      const lookupVal = params.lookupValue?.trim() || 'A2';
      const lookupArray = params.lookupArray?.trim() || 'Data!$A$2:$A$100';
      const returnArray = params.returnArray?.trim() || 'Data!$C$2:$C$100';
      const notFound = params.ifNotFound?.trim() ? `"${params.ifNotFound.trim()}"` : '"Not Found"';
      return {
        formula: `=XLOOKUP(${lookupVal}, ${lookupArray}, ${returnArray}, ${notFound}, 0)`,
        explanation: `Searches for ${lookupVal} in ${lookupArray} and returns the value at the matching position from ${returnArray}. Returns ${notFound} if no exact match exists.`,
        syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])',
      };
    }

    case 'index_match': {
      const returnRange = params.returnRange?.trim() || 'Data!$C$2:$C$100';
      const lookupVal = params.lookupValue?.trim() || 'A2';
      const lookupRange = params.lookupRange?.trim() || 'Data!$A$2:$A$100';
      return {
        formula: `=INDEX(${returnRange}, MATCH(${lookupVal}, ${lookupRange}, 0))`,
        explanation: `Finds the exact row index of ${lookupVal} within ${lookupRange} using MATCH, then retrieves the corresponding value from ${returnRange} via INDEX.`,
        syntax: 'INDEX(array, MATCH(lookup_value, lookup_array, 0))',
      };
    }

    case 'if': {
      const condition = params.condition?.trim() || 'A2>1000';
      const valTrue = params.valueIfTrue?.trim() || '"Qualified"';
      const valFalse = params.valueIfFalse?.trim() || '"Standard"';
      return {
        formula: `=IF(${condition}, ${valTrue}, ${valFalse})`,
        explanation: `Evaluates whether ${condition} is true. Returns ${valTrue} when true, or ${valFalse} otherwise.`,
        syntax: 'IF(logical_test, [value_if_true], [value_if_false])',
      };
    }

    case 'sumif': {
      const range = params.range?.trim() || 'A2:A100';
      const criteria = params.criteria?.trim() || '">500"';
      const sumRange = params.sumRange?.trim() ? `, ${params.sumRange.trim()}` : '';
      return {
        formula: `=SUMIF(${range}, ${criteria}${sumRange})`,
        explanation: `Adds numeric values in ${params.sumRange?.trim() || range} for rows where ${range} satisfies ${criteria}.`,
        syntax: 'SUMIF(range, criteria, [sum_range])',
      };
    }

    case 'countif': {
      const range = params.range?.trim() || 'A2:A100';
      const criteria = params.criteria?.trim() || '"Completed"';
      return {
        formula: `=COUNTIF(${range}, ${criteria})`,
        explanation: `Counts how many cells inside ${range} satisfy the criterion ${criteria}.`,
        syntax: 'COUNTIF(range, criteria)',
      };
    }

    case 'textjoin': {
      const delimiter = params.delimiter?.trim() || '", "';
      const ignoreEmpty = params.ignoreEmpty !== 'false' ? 'TRUE' : 'FALSE';
      const textRange = params.textRange?.trim() || 'A2:D2';
      return {
        formula: `=TEXTJOIN(${delimiter}, ${ignoreEmpty}, ${textRange})`,
        explanation: `Joins text across ${textRange} separated by ${delimiter}${ignoreEmpty === 'TRUE' ? ', omitting empty cells' : ', preserving empty cells'}.`,
        syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)',
      };
    }
  }
}

export const FORMULA_CHEATSHEET = [
  { name: 'SUM', cat: 'Math', syntax: '=SUM(A1:A10)', desc: 'Adds all numbers in a range of cells.' },
  { name: 'AVERAGE', cat: 'Statistical', syntax: '=AVERAGE(B2:B20)', desc: 'Calculates the arithmetic mean of numeric cells.' },
  { name: 'MEDIAN', cat: 'Statistical', syntax: '=MEDIAN(B2:B20)', desc: 'Returns the median value in a range.' },
  { name: 'XLOOKUP', cat: 'Lookup', syntax: '=XLOOKUP(E2, A:A, C:C, "N/A")', desc: 'Modern bidirectional lookup with built-in fallback.' },
  { name: 'VLOOKUP', cat: 'Lookup', syntax: '=VLOOKUP(A2, D:F, 3, FALSE)', desc: 'Vertical lookup in leftmost column of table array.' },
  { name: 'INDEX/MATCH', cat: 'Lookup', syntax: '=INDEX(B:B, MATCH(D1, A:A, 0))', desc: 'Flexible two-way lookup unaffected by column inserts.' },
  { name: 'IF', cat: 'Logical', syntax: '=IF(C2>50, "Pass", "Fail")', desc: 'Returns one value for true, another for false.' },
  { name: 'SUMIFS', cat: 'Math', syntax: '=SUMIFS(D:D, A:A, "East", B:B, ">100")', desc: 'Sums cells matching multiple conditions.' },
  { name: 'COUNTIFS', cat: 'Statistical', syntax: '=COUNTIFS(A:A, "Active", C:C, "<30")', desc: 'Counts cells matching multiple conditions.' },
  { name: 'TEXTJOIN', cat: 'Text', syntax: '=TEXTJOIN(", ", TRUE, A2:A10)', desc: 'Concatenates strings with a delimiter and blank handling.' },
  { name: 'TRIM', cat: 'Text', syntax: '=TRIM(A2)', desc: 'Strips leading, trailing, and excess interior spaces.' },
  { name: 'UNIQUE', cat: 'Dynamic Array', syntax: '=UNIQUE(A2:A100)', desc: 'Extracts distinct values from a range.' },
  { name: 'FILTER', cat: 'Dynamic Array', syntax: '=FILTER(A2:C50, B2:B50="US")', desc: 'Dynamically filters rows meeting boolean criteria.' },
];
