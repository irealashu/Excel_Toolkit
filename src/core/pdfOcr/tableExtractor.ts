export type CellPrimitive = string | number | boolean | null;

export interface PositionedToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number; // 0..100 for OCR, 100 for native PDF text
}

export type ColumnSensitivity = 'tight' | 'balanced' | 'wide';

export interface GridLineHints {
  vertical: number[];
  horizontal: number[];
}

export interface TableExtractionOptions {
  sensitivity: ColumnSensitivity;
  firstRowAsHeaders: boolean;
  parseNumbers: boolean;
  trimCells: boolean;
  dropEmptyRows: boolean;
  filterOcrNoise?: boolean;
  gridLines?: GridLineHints;
}

export interface ExtractedTable {
  headers: string[];
  rows: CellPrimitive[][];
  cellConfidences: number[][];
  detectedColumns: number;
  avgConfidence: number;
  rawLines: string[];
}

interface CellSpan {
  text: string;
  xStart: number;
  xEnd: number;
  xCenter: number;
  confSum: number;
  confCount: number;
}

interface ColumnTrack {
  minX: number;
  maxX: number;
  center: number;
  count: number;
}

const SENSITIVITY_CHAR_MULTIPLIER: Record<ColumnSensitivity, number> = {
  tight: 1.25,
  balanced: 1.95,
  wide: 3.1,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Repairs common OCR digit confusions ONLY inside unambiguous numeric/currency tokens
 * (e.g., "$1,2OO.00" -> "$1,200.00", "45.0O" -> "45.00", "$ 1, 250.50" -> "$1,250.50").
 * Strictly avoids modifying alphabetic words, SKUs, or IDs.
 */
function repairNumericOcrToken(raw: string): string {
  // Strip stray leading/trailing border-speck punctuation separated from numbers/currency (e.g. "' $5,000.00" or ", $950.00")
  const trimmed = raw
    .trim()
    .replace(/^['"`,;:·•]+\s+(?=[+-]?[$€£¥₹(]?\d)/, '')
    .replace(/(?<=\d%?\)?)\s+['"`,;:·•]+$/, '')
    .trim();
  // Quick exit if token contains multiple clearly non-numeric letters
  const digits = (trimmed.match(/\d/g) || []).length;
  if (digits === 0) return trimmed;

  // Check if token looks like a currency/number with stray O/o/l/I or internal spaces around commas/decimals
  const collapsed = trimmed.replace(/(\d)\s+([.,]\s*\d)/g, '$1$2').replace(/([.,])\s+(\d)/g, '$1$2');
  const candidate = collapsed.replace(/^([$€£¥₹+-]\s*)/, '$1');

  // Only substitute O/o -> 0 if the token is exclusively digits, currency/sign, commas, dots, %, parens, and O/o
  if (/^\(?[+-]?[$€£¥₹]?\s*[\d,.\sOo]+%?\)?$/.test(candidate)) {
    const oCount = (candidate.match(/[Oo]/g) || []).length;
    if (oCount > 0 && digits >= oCount) {
      return candidate.replace(/[Oo]/g, '0');
    }
  }
  return collapsed;
}

export function parseCellValue(raw: string, parseNumbers: boolean): CellPrimitive {
  const cleaned = raw.trim();
  if (cleaned === '') return null;
  if (!parseNumbers) return cleaned;

  const repaired = repairNumericOcrToken(cleaned);

  // Accounting negative numbers in parentheses: e.g. ($1,240.50) or (420.00)
  const parenMatch = repaired.match(/^\(\s*([$€£¥₹]?\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?|[$€£¥₹]?\s*\d+(?:\.\d+)?)\s*\)$/);
  if (parenMatch) {
    const numericStr = parenMatch[1].replace(/[$€£¥₹,\s]/g, '');
    const num = Number(numericStr);
    if (Number.isFinite(num)) {
      return -Math.abs(num);
    }
  }

  // Match plain numbers, negative numbers, comma-formatted numbers, optional currency symbol or %
  // Avoid converting IDs like "2026-10-01", "ORD-9021", or "+1-415-555-0199"
  if (
    /^[+-]?[$€£¥₹]?\s*\d{1,3}(,\d{3})+(\.\d+)?%?$/.test(repaired) ||
    /^[+-]?[$€£¥₹]?\s*\d+(\.\d+)?%?$/.test(repaired)
  ) {
    const isPercent = repaired.endsWith('%');
    const numericStr = repaired.replace(/[$€£¥₹,\s%]/g, '');
    const num = Number(numericStr);
    if (Number.isFinite(num)) {
      return isPercent ? Number((num / 100).toFixed(6)) : num;
    }
  }

  return cleaned;
}

/**
 * Filters out common OCR border artifacts & dust specks (e.g., stray '|', '_', '~', low-confidence punctuation)
 * and strips border pipe characters accidentally glued to real words.
 */
function sanitizeTokens(tokens: PositionedToken[], trimCells: boolean, filterNoise: boolean): PositionedToken[] {
  const cleaned: PositionedToken[] = [];

  // Reference height of reliable alphanumeric tokens to spot micro-height line/speck fragments
  const reliableHeights = filterNoise
    ? tokens
        .filter((t) => (t.confidence ?? 100) >= 55 && t.height > 0 && /[A-Za-z0-9]/.test(t.text))
        .map((t) => t.height)
    : [];
  const refHeight = reliableHeights.length >= 3 ? median(reliableHeights) : 0;

  for (const t of tokens) {
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;
    let text = trimCells ? t.text.replace(/\s+/g, ' ').trim() : t.text;
    if (!text) continue;

    if (filterNoise) {
      // Strip vertical table border artifacts glued to edges of words: "|INV-101|" -> "INV-101"
      if (text.length > 1) {
        text = text.replace(/^[|¦[\]]+(?=[A-Za-z0-9$€£¥₹(])/, '').replace(/(?<=[A-Za-z0-9%)])[|¦[\]]+$/, '').trim();
      }
      if (!text) continue;

      const conf = t.confidence ?? 100;
      // Drop pure border/ruling artifacts like "|", "||", "___", "---", "~~~", "'", ","
      if (/^[|¦_—–=~·•`^'",;:]+$/.test(text)) {
        continue;
      }
      // Drop ultra-low-confidence isolated 1-2 char punctuation/symbol noise
      if (conf < 35 && text.length <= 2 && !/[A-Za-z0-9]/.test(text)) {
        continue;
      }
      // Drop micro-height line-stub artifacts with poor confidence (e.g. residual 4px border dashes misread as "ee"/"Ir")
      if (refHeight > 0 && t.height > 0 && t.height < refHeight * 0.42 && conf < 72 && !/^\d+$/.test(text)) {
        continue;
      }
      // Drop isolated 1-2 char non-digit hallucinated specks with very low confidence
      if (conf < 42 && text.length <= 2 && !/\d/.test(text)) {
        continue;
      }
    }

    cleaned.push({ ...t, text });
  }

  return cleaned;
}

/**
 * Builds clean column tracks from visual vertical gridlines when they genuinely partition the tokens.
 */
function buildTracksFromVerticalGrid(
  verticalLines: number[],
  tokens: PositionedToken[]
): ColumnTrack[] | null {
  if (verticalLines.length < 2 || tokens.length === 0) return null;

  const minTokX = Math.min(...tokens.map((t) => t.x));
  const maxTokX = Math.max(...tokens.map((t) => t.x + t.width));
  const spanW = maxTokX - minTokX;
  if (spanW <= 0) return null;

  // Keep vertical dividers that sit near or inside the token horizontal footprint
  const relevant = [...verticalLines]
    .filter((lx) => lx >= minTokX - 40 && lx <= maxTokX + 40)
    .sort((a, b) => a - b);

  if (relevant.length < 2) return null;

  // Construct column intervals between consecutive vertical lines (plus outer bands if tokens extend outside)
  const boundaries: number[] = [];
  if (minTokX < relevant[0] - 18) boundaries.push(minTokX - 10);
  boundaries.push(...relevant);
  if (maxTokX > relevant[relevant.length - 1] + 18) boundaries.push(maxTokX + 10);

  const tracks: ColumnTrack[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const left = boundaries[i];
    const right = boundaries[i + 1];
    if (right - left < 12) continue;
    tracks.push({
      minX: left,
      maxX: right,
      center: (left + right) / 2,
      count: 1,
    });
  }

  // Verify at least 2 distinct grid columns actually contain tokens
  const populatedCols = tracks.filter((tr) =>
    tokens.some((t) => {
      const cx = t.x + t.width * 0.5;
      return cx >= tr.minX && cx <= tr.maxX;
    })
  );

  return populatedCols.length >= 2 ? populatedCols : null;
}

/**
 * Clusters tokens into horizontal rows, respecting visual horizontal grid dividers if present.
 */
function clusterTokensIntoRows(
  tokens: PositionedToken[],
  medianHeight: number,
  horizontalLines?: number[]
): { yCenter: number; tokens: PositionedToken[] }[] {
  const sortedByY = [...tokens].sort((a, b) => {
    const cyA = a.y + a.height * 0.5;
    const cyB = b.y + b.height * 0.5;
    if (Math.abs(cyA - cyB) > medianHeight * 0.45) return cyA - cyB;
    return a.x - b.x;
  });

  const hLines = horizontalLines && horizontalLines.length >= 2 ? [...horizontalLines].sort((a, b) => a - b) : [];

  // Helper: find which horizontal grid band a Y center falls into (returns -1 if no grid)
  const getGridBand = (cy: number): number => {
    if (hLines.length < 2) return -1;
    let band = 0;
    for (let i = 0; i < hLines.length; i++) {
      if (cy >= hLines[i]) band = i + 1;
      else break;
    }
    return band;
  };

  const rowGroups: { yCenter: number; gridBand: number; tokens: PositionedToken[] }[] = [];
  const yTolerance = Math.max(medianHeight * 0.55, 4);

  for (const tok of sortedByY) {
    const cy = tok.y + tok.height * 0.5;
    const band = getGridBand(cy);
    let placed = false;

    for (let i = rowGroups.length - 1; i >= Math.max(0, rowGroups.length - 5); i--) {
      const g = rowGroups[i];
      // Never merge two tokens that are separated by an actual horizontal table gridline
      if (hLines.length >= 2 && g.gridBand !== band) continue;

      if (Math.abs(g.yCenter - cy) <= yTolerance) {
        const n = g.tokens.length;
        g.yCenter = (g.yCenter * n + cy) / (n + 1);
        g.tokens.push(tok);
        placed = true;
        break;
      }
    }

    if (!placed) {
      rowGroups.push({ yCenter: cy, gridBand: band, tokens: [tok] });
    }
  }

  rowGroups.sort((a, b) => a.yCenter - b.yCenter);
  return rowGroups.map((g) => ({ yCenter: g.yCenter, tokens: g.tokens }));
}

/**
 * Spatial table reconstruction from 2D positioned text tokens (native PDF or OCR word bboxes).
 * 1. Filters OCR artifacts and border noise.
 * 2. Clusters tokens into horizontal rows using adaptive median line height + visual horizontal rules.
 * 3. Uses detected vertical grid dividers when available, or adaptive interval/gutter clustering for borderless tables.
 * 4. Tracks per-cell OCR confidence and cleanly parses numbers/currency/accounting negatives.
 */
export function extractTableFromTokens(
  tokens: PositionedToken[],
  options: TableExtractionOptions
): ExtractedTable {
  const cleanTokens = sanitizeTokens(tokens, options.trimCells, options.filterOcrNoise ?? true);

  if (cleanTokens.length === 0) {
    return {
      headers: ['Column 1'],
      rows: [],
      cellConfidences: [],
      detectedColumns: 1,
      avgConfidence: 0,
      rawLines: [],
    };
  }

  const positiveHeights = cleanTokens.map((t) => t.height).filter((h) => h > 0);
  const medianHeight = median(positiveHeights) || 12;

  const charWidths = cleanTokens
    .filter((t) => t.width > 0 && t.text.length > 0)
    .map((t) => t.width / Math.max(1, t.text.length));
  const medianCharWidth = median(charWidths) || medianHeight * 0.55;

  // Step 1: Cluster tokens into rows
  const rowGroups = clusterTokensIntoRows(cleanTokens, medianHeight, options.gridLines?.horizontal);

  // Step 2: Check if visual vertical gridlines cleanly define the table columns
  const gridColTracks = options.gridLines?.vertical
    ? buildTracksFromVerticalGrid(options.gridLines.vertical, cleanTokens)
    : null;

  let colTracks: ColumnTrack[];
  const rowSpans: CellSpan[][] = [];
  const rowIsBannerFlags: boolean[] = [];
  const rawLines: string[] = [];

  if (gridColTracks) {
    // Grid-guided mode: bin each row's words directly into the exact visual column bands!
    colTracks = gridColTracks;
    const innerVerticalDividers = colTracks.slice(0, -1).map((tr) => tr.maxX);
    for (const group of rowGroups) {
      const lineTokens = [...group.tokens].sort((a, b) => a.x - b.x);
      // Detect non-tabular title/banner lines above or below the grid that flow continuously across column dividers
      let crossesDivider = false;
      for (let ti = 0; ti < lineTokens.length && !crossesDivider; ti++) {
        const tok = lineTokens[ti];
        const tokEnd = tok.x + Math.max(tok.width, tok.text.length * medianCharWidth * 0.6);
        for (const divX of innerVerticalDividers) {
          if (tok.x < divX - 6 && tokEnd > divX + 6) {
            crossesDivider = true;
            break;
          }
          if (ti + 1 < lineTokens.length) {
            const nextTok = lineTokens[ti + 1];
            const gap = nextTok.x - tokEnd;
            if (tokEnd <= divX + 6 && nextTok.x >= divX - 6 && gap >= -4 && gap < medianCharWidth * 1.35) {
              crossesDivider = true;
              break;
            }
          }
        }
      }
      rowIsBannerFlags.push(crossesDivider);
      const bucketMap = new Map<number, CellSpan>();

      for (const tok of lineTokens) {
        const cx = tok.x + tok.width * 0.5;
        let bestCol = 0;
        let bestDist = Infinity;
        for (let c = 0; c < colTracks.length; c++) {
          const tr = colTracks[c];
          if (cx >= tr.minX && cx <= tr.maxX) {
            bestCol = c;
            bestDist = 0;
            break;
          }
          const d = Math.abs(cx - tr.center);
          if (d < bestDist) {
            bestDist = d;
            bestCol = c;
          }
        }

        const conf = tok.confidence ?? 100;
        const tokEnd = tok.x + Math.max(tok.width, tok.text.length * medianCharWidth * 0.6);
        const existing = bucketMap.get(bestCol);
        if (existing) {
          existing.text = `${existing.text} ${tok.text}`;
          existing.xEnd = Math.max(existing.xEnd, tokEnd);
          existing.xCenter = (existing.xStart + existing.xEnd) / 2;
          existing.confSum += conf;
          existing.confCount += 1;
        } else {
          bucketMap.set(bestCol, {
            text: tok.text,
            xStart: tok.x,
            xEnd: tokEnd,
            xCenter: (tok.x + tokEnd) / 2,
            confSum: conf,
            confCount: 1,
          });
        }
      }

      const spans = Array.from(bucketMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, span]) => span);
      rowSpans.push(spans);
      rawLines.push(spans.map((s) => s.text).join('  '));
    }
  } else {
    // Borderless table mode: merge intra-cell words by adaptive gap threshold, then build global column tracks
    const gapMultiplier = SENSITIVITY_CHAR_MULTIPLIER[options.sensitivity];
    const mergeGapThreshold = Math.max(medianCharWidth * gapMultiplier, medianHeight * 0.72);

    for (const group of rowGroups) {
      const lineTokens = [...group.tokens].sort((a, b) => a.x - b.x);
      const spans: CellSpan[] = [];

      for (const tok of lineTokens) {
        const tokEnd = tok.x + Math.max(tok.width, tok.text.length * medianCharWidth * 0.6);
        const conf = tok.confidence ?? 100;

        if (spans.length === 0) {
          spans.push({
            text: tok.text,
            xStart: tok.x,
            xEnd: tokEnd,
            xCenter: (tok.x + tokEnd) / 2,
            confSum: conf,
            confCount: 1,
          });
        } else {
          const prev = spans[spans.length - 1];
          const gap = tok.x - prev.xEnd;
          if (gap <= mergeGapThreshold) {
            const sep = gap > medianCharWidth * 0.18 || !prev.text.endsWith('-') ? ' ' : '';
            prev.text = `${prev.text}${sep}${tok.text}`;
            prev.xEnd = Math.max(prev.xEnd, tokEnd);
            prev.xCenter = (prev.xStart + prev.xEnd) / 2;
            prev.confSum += conf;
            prev.confCount += 1;
          } else {
            spans.push({
              text: tok.text,
              xStart: tok.x,
              xEnd: tokEnd,
              xCenter: (tok.x + tokEnd) / 2,
              confSum: conf,
              confCount: 1,
            });
          }
        }
      }

      rowSpans.push(spans);
      rowIsBannerFlags.push(false);
      rawLines.push(spans.map((s) => s.text).join('  '));
    }

    // Step 3: Build global column tracks from multi-cell rows
    const maxSpansInAnyRow = Math.max(...rowSpans.map((r) => r.length), 1);
    const tabularRows = maxSpansInAnyRow >= 2 ? rowSpans.filter((r) => r.length >= 2) : rowSpans;

    const allTabularSpans = tabularRows.flat().sort((a, b) => a.xStart - b.xStart);
    colTracks = [];
    const columnOverlapSlack = medianCharWidth * 0.35;

    for (const span of allTabularSpans) {
      let bestTrackIdx = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < colTracks.length; i++) {
        const tr = colTracks[i];
        const overlap = Math.min(span.xEnd, tr.maxX) - Math.max(span.xStart, tr.minX);
        const centerDist = Math.abs(span.xCenter - tr.center);
        const spanWidth = Math.max(1, span.xEnd - span.xStart);
        const trackWidth = Math.max(1, tr.maxX - tr.minX);
        const minWidth = Math.min(spanWidth, trackWidth);

        if (
          overlap >= -columnOverlapSlack &&
          (overlap / minWidth >= 0.18 || centerDist <= Math.max(medianCharWidth * 3.0, 22))
        ) {
          const score = overlap - centerDist * 0.25;
          if (score > bestScore) {
            bestScore = score;
            bestTrackIdx = i;
          }
        }
      }

      if (bestTrackIdx >= 0) {
        const tr = colTracks[bestTrackIdx];
        // Prevent a single outlier wide span from swallowing an adjacent column track
        const proposedMaxX = Math.max(tr.maxX, span.xEnd);
        const nextTrack = colTracks[bestTrackIdx + 1];
        if (!nextTrack || proposedMaxX <= nextTrack.minX + columnOverlapSlack) {
          tr.minX = Math.min(tr.minX, span.xStart);
          tr.maxX = proposedMaxX;
        }
        tr.center = (tr.center * tr.count + span.xCenter) / (tr.count + 1);
        tr.count += 1;
      } else {
        colTracks.push({
          minX: span.xStart,
          maxX: span.xEnd,
          center: span.xCenter,
          count: 1,
        });
      }
    }

    colTracks.sort((a, b) => a.minX - b.minX);
  }

  const numCols = Math.max(colTracks.length, 1);

  // Step 4: Map each row's spans into the aligned column tracks & record per-cell confidences
  const rawMatrix: string[][] = [];
  const rawConfMatrix: number[][] = [];
  const keptBannerFlags: boolean[] = [];
  let totalConf = 0;
  let totalConfCount = 0;

  for (let rIdx = 0; rIdx < rowSpans.length; rIdx++) {
    const spans = rowSpans[rIdx];
    const isBanner = rowIsBannerFlags[rIdx] ?? false;
    const rowCells = new Array<string>(numCols).fill('');
    const rowConfSums = new Array<number>(numCols).fill(0);
    const rowConfCounts = new Array<number>(numCols).fill(0);

    if (numCols === 1) {
      rowCells[0] = spans.map((s) => s.text).join(' ');
      spans.forEach((s) => {
        rowConfSums[0] += s.confSum;
        rowConfCounts[0] += s.confCount;
        totalConf += s.confSum;
        totalConfCount += s.confCount;
      });
      rawMatrix.push(rowCells);
      rawConfMatrix.push([rowConfCounts[0] > 0 ? Math.round(rowConfSums[0] / rowConfCounts[0]) : 100]);
      keptBannerFlags.push(isBanner);
      continue;
    }

    let lastAssignedCol = -1;
    for (const span of spans) {
      totalConf += span.confSum;
      totalConfCount += span.confCount;

      let bestCol = Math.min(lastAssignedCol + 1, numCols - 1);
      let bestMetric = -Infinity;

      for (let c = Math.max(0, lastAssignedCol); c < numCols; c++) {
        const tr = colTracks[c];
        const overlap = Math.min(span.xEnd, tr.maxX) - Math.max(span.xStart, tr.minX);
        const dist = Math.abs(span.xCenter - tr.center);
        const metric = overlap > 0 ? overlap * 2 - dist * 0.2 : -dist;
        if (metric > bestMetric) {
          bestMetric = metric;
          bestCol = c;
        }
      }

      let assignedCol = bestCol;
      if (rowCells[bestCol]) {
        if (bestCol + 1 < numCols && !rowCells[bestCol + 1]) {
          rowCells[bestCol + 1] = span.text;
          assignedCol = bestCol + 1;
        } else {
          rowCells[bestCol] = `${rowCells[bestCol]} ${span.text}`;
          assignedCol = bestCol;
        }
      } else {
        rowCells[bestCol] = span.text;
        assignedCol = bestCol;
      }

      rowConfSums[assignedCol] += span.confSum;
      rowConfCounts[assignedCol] += span.confCount;
      lastAssignedCol = assignedCol;
    }

    if (!options.dropEmptyRows || rowCells.some((c) => c.trim() !== '')) {
      rawMatrix.push(rowCells);
      rawConfMatrix.push(
        rowCells.map((_, idx) =>
          rowConfCounts[idx] > 0 ? Math.round(rowConfSums[idx] / rowConfCounts[idx]) : 100
        )
      );
      keptBannerFlags.push(isBanner);
    }
  }

  // Drop columns that ended up 100% empty across all rows
  const nonEmptyColIndices: number[] = [];
  for (let c = 0; c < numCols; c++) {
    if (rawMatrix.some((r) => r[c] && r[c].trim() !== '')) {
      nonEmptyColIndices.push(c);
    }
  }
  const compactMatrix =
    nonEmptyColIndices.length > 0
      ? rawMatrix.map((r) => nonEmptyColIndices.map((c) => r[c]))
      : rawMatrix;
  const compactConfMatrix =
    nonEmptyColIndices.length > 0
      ? rawConfMatrix.map((r) => nonEmptyColIndices.map((c) => r[c]))
      : rawConfMatrix;

  const finalCols = Math.max(nonEmptyColIndices.length, 1);

  let headers: string[];
  let dataMatrix: string[][];
  let cellConfidences: number[][];

  if (options.firstRowAsHeaders && compactMatrix.length > 0) {
    let headerRowIdx = 0;
    if (finalCols >= 2 && compactMatrix.length >= 2) {
      const minHeaderCols = Math.min(finalCols, Math.max(2, Math.ceil(finalCols * 0.5)));
      const scanLimit = Math.min(compactMatrix.length - 1, 6);
      for (let r = 0; r <= scanLimit; r++) {
        if (keptBannerFlags[r]) continue;
        const nonEmpty = compactMatrix[r].filter((c) => c.trim() !== '').length;
        if (nonEmpty >= minHeaderCols) {
          headerRowIdx = r;
          break;
        }
      }
    }
    headers = compactMatrix[headerRowIdx].map((h, i) => (h.trim() ? h.trim() : `Column ${i + 1}`));
    dataMatrix = compactMatrix.slice(headerRowIdx + 1);
    cellConfidences = compactConfMatrix.slice(headerRowIdx + 1);
  } else {
    headers = Array.from({ length: finalCols }, (_, i) => `Column ${i + 1}`);
    dataMatrix = compactMatrix;
    cellConfidences = compactConfMatrix;
  }

  const parsedRows: CellPrimitive[][] = dataMatrix.map((r) =>
    r.map((cell) => parseCellValue(cell, options.parseNumbers))
  );

  const avgConfidence = totalConfCount > 0 ? Number((totalConf / totalConfCount).toFixed(1)) : 100;

  return {
    headers,
    rows: parsedRows,
    cellConfidences,
    detectedColumns: headers.length,
    avgConfidence,
    rawLines,
  };
}

/**
 * Parses a page range string like "1-3, 5, 8-10" into sorted unique 1-based page numbers clamped to totalPages.
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const cleaned = rangeStr.trim().toLowerCase();
  if (!cleaned || cleaned === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const parts = cleaned.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dashMatch) {
      const start = Math.max(1, Math.min(totalPages, parseInt(dashMatch[1], 10)));
      const end = Math.max(1, Math.min(totalPages, parseInt(dashMatch[2], 10)));
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let p = lo; p <= hi; p++) pages.add(p);
    } else if (/^\d+$/.test(trimmed)) {
      const p = parseInt(trimmed, 10);
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Combines multiple extracted page tables into one unified table, adding a Source_Page column.
 */
export function mergeExtractedPages(
  pages: { pageNumber: number; headers: string[]; rows: CellPrimitive[][] }[]
): { headers: string[]; rows: CellPrimitive[][] } {
  if (pages.length === 0) return { headers: ['Column 1'], rows: [] };
  if (pages.length === 1) return { headers: pages[0].headers, rows: pages[0].rows };

  const maxCols = Math.max(...pages.map((p) => p.headers.length), 1);
  const baseHeaders = Array.from({ length: maxCols }, (_, i) => pages[0].headers[i] || `Column ${i + 1}`);
  const mergedHeaders = ['Source_Page', ...baseHeaders];
  const mergedRows: CellPrimitive[][] = [];

  for (const page of pages) {
    for (const row of page.rows) {
      const padded = Array.from({ length: maxCols }, (_, i) => row[i] ?? null);
      mergedRows.push([`Page ${page.pageNumber}`, ...padded]);
    }
  }

  return { headers: mergedHeaders, rows: mergedRows };
}
