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

export interface TableExtractionOptions {
  sensitivity: ColumnSensitivity;
  firstRowAsHeaders: boolean;
  parseNumbers: boolean;
  trimCells: boolean;
  dropEmptyRows: boolean;
}

export interface ExtractedTable {
  headers: string[];
  rows: CellPrimitive[][];
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

export function parseCellValue(raw: string, parseNumbers: boolean): CellPrimitive {
  const cleaned = raw.trim();
  if (cleaned === '') return null;
  if (!parseNumbers) return cleaned;

  // Match plain numbers, negative numbers, comma-formatted numbers, optional currency symbol or %
  // Avoid converting IDs like "2026-10-01", "ORD-9021", or "+1-415-555-0199"
  if (/^[+-]?[$€£¥]?\s*\d{1,3}(,\d{3})+(\.\d+)?%?$/.test(cleaned) || /^[+-]?[$€£¥]?\s*\d+(\.\d+)?%?$/.test(cleaned)) {
    const isPercent = cleaned.endsWith('%');
    const numericStr = cleaned.replace(/[$€£¥,\s%]/g, '');
    const num = Number(numericStr);
    if (Number.isFinite(num)) {
      return isPercent ? Number((num / 100).toFixed(6)) : num;
    }
  }

  return cleaned;
}

/**
 * Spatial table reconstruction from 2D positioned text tokens (native PDF or OCR word bboxes).
 * 1. Clusters tokens into horizontal rows using adaptive median line height.
 * 2. Merges horizontally adjacent words into multi-word cell spans using adaptive char-width gaps.
 * 3. Aligns spans across rows into global column tracks via interval overlap clustering.
 */
export function extractTableFromTokens(
  tokens: PositionedToken[],
  options: TableExtractionOptions
): ExtractedTable {
  const cleanTokens = tokens
    .map((t) => ({
      ...t,
      text: options.trimCells ? t.text.replace(/\s+/g, ' ').trim() : t.text,
    }))
    .filter((t) => t.text.length > 0 && Number.isFinite(t.x) && Number.isFinite(t.y));

  if (cleanTokens.length === 0) {
    return {
      headers: ['Column 1'],
      rows: [],
      detectedColumns: 1,
      avgConfidence: 0,
      rawLines: [],
    };
  }

  // Estimate median line height and median character width
  const positiveHeights = cleanTokens.map((t) => t.height).filter((h) => h > 0);
  const medianHeight = median(positiveHeights) || 12;

  const charWidths = cleanTokens
    .filter((t) => t.width > 0 && t.text.length > 0)
    .map((t) => t.width / Math.max(1, t.text.length));
  const medianCharWidth = median(charWidths) || medianHeight * 0.55;

  // Step 1: Cluster tokens into rows by vertical center proximity
  const sortedByY = [...cleanTokens].sort((a, b) => {
    const cyA = a.y + a.height * 0.5;
    const cyB = b.y + b.height * 0.5;
    if (Math.abs(cyA - cyB) > medianHeight * 0.45) return cyA - cyB;
    return a.x - b.x;
  });

  const rowGroups: { yCenter: number; tokens: PositionedToken[] }[] = [];
  const yTolerance = Math.max(medianHeight * 0.58, 4);

  for (const tok of sortedByY) {
    const cy = tok.y + tok.height * 0.5;
    let placed = false;
    // Check last few groups (sorted by Y so match is near the tail)
    for (let i = rowGroups.length - 1; i >= Math.max(0, rowGroups.length - 4); i--) {
      if (Math.abs(rowGroups[i].yCenter - cy) <= yTolerance) {
        const g = rowGroups[i];
        const n = g.tokens.length;
        g.yCenter = (g.yCenter * n + cy) / (n + 1);
        g.tokens.push(tok);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rowGroups.push({ yCenter: cy, tokens: [tok] });
    }
  }

  rowGroups.sort((a, b) => a.yCenter - b.yCenter);

  // Step 2: Within each row, sort left-to-right and merge intra-cell words into cell spans
  const gapMultiplier = SENSITIVITY_CHAR_MULTIPLIER[options.sensitivity];
  const mergeGapThreshold = Math.max(medianCharWidth * gapMultiplier, medianHeight * 0.72);

  const rowSpans: CellSpan[][] = [];
  const rawLines: string[] = [];

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
          // Join with a single space if gap is noticeable (not ligature/sub-word chunk)
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
    rawLines.push(spans.map((s) => s.text).join('  '));
  }

  // Step 3: Build global column tracks from multi-cell rows (avoiding full-width title banners distorting tracks)
  const maxSpansInAnyRow = Math.max(...rowSpans.map((r) => r.length), 1);
  const tabularRows =
    maxSpansInAnyRow >= 2 ? rowSpans.filter((r) => r.length >= 2) : rowSpans;

  const allTabularSpans = tabularRows.flat().sort((a, b) => a.xStart - b.xStart);
  const colTracks: ColumnTrack[] = [];
  const columnOverlapSlack = medianCharWidth * 0.4;

  for (const span of allTabularSpans) {
    // Find best matching existing column track by horizontal overlap or tight center proximity
    let bestTrackIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < colTracks.length; i++) {
      const tr = colTracks[i];
      const overlap = Math.min(span.xEnd, tr.maxX) - Math.max(span.xStart, tr.minX);
      const centerDist = Math.abs(span.xCenter - tr.center);
      const spanWidth = Math.max(1, span.xEnd - span.xStart);
      const trackWidth = Math.max(1, tr.maxX - tr.minX);
      const minWidth = Math.min(spanWidth, trackWidth);

      // Strong overlap or right/left aligned within reasonable column slack
      if (overlap >= -columnOverlapSlack && (overlap / minWidth >= 0.15 || centerDist <= Math.max(medianCharWidth * 3.5, 24))) {
        const score = overlap - centerDist * 0.25;
        if (score > bestScore) {
          bestScore = score;
          bestTrackIdx = i;
        }
      }
    }

    if (bestTrackIdx >= 0) {
      const tr = colTracks[bestTrackIdx];
      // Guard against merging two distinct adjacent columns from the same row
      tr.minX = Math.min(tr.minX, span.xStart);
      tr.maxX = Math.max(tr.maxX, span.xEnd);
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

  // Ensure we have at least maxSpansInAnyRow columns if tracks collapsed slightly
  const numCols = Math.max(colTracks.length, 1);

  // Step 4: Map each row's spans into the aligned column tracks
  const rawMatrix: string[][] = [];
  let totalConf = 0;
  let totalConfCount = 0;

  for (const spans of rowSpans) {
    const rowCells = new Array<string>(numCols).fill('');

    if (numCols === 1) {
      rowCells[0] = spans.map((s) => s.text).join(' ');
      spans.forEach((s) => {
        totalConf += s.confSum;
        totalConfCount += s.confCount;
      });
      rawMatrix.push(rowCells);
      continue;
    }

    let lastAssignedCol = -1;
    for (const span of spans) {
      totalConf += span.confSum;
      totalConfCount += span.confCount;

      // Pick the best track with index >= lastAssignedCol (preserving left-to-right reading order)
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

      if (rowCells[bestCol]) {
        // If another span in the same row already occupies bestCol, spill right if empty, else append
        if (bestCol + 1 < numCols && !rowCells[bestCol + 1]) {
          rowCells[bestCol + 1] = span.text;
          lastAssignedCol = bestCol + 1;
        } else {
          rowCells[bestCol] = `${rowCells[bestCol]} ${span.text}`;
          lastAssignedCol = bestCol;
        }
      } else {
        rowCells[bestCol] = span.text;
        lastAssignedCol = bestCol;
      }
    }

    if (!options.dropEmptyRows || rowCells.some((c) => c.trim() !== '')) {
      rawMatrix.push(rowCells);
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

  const finalCols = Math.max(nonEmptyColIndices.length, 1);

  let headers: string[];
  let dataMatrix: string[][];

  if (options.firstRowAsHeaders && compactMatrix.length > 0) {
    // Skip leading sparse title/subtitle banner lines before the actual multi-column table header
    let headerRowIdx = 0;
    if (finalCols >= 2 && compactMatrix.length >= 2) {
      const minHeaderCols = Math.min(finalCols, Math.max(2, Math.ceil(finalCols * 0.5)));
      const scanLimit = Math.min(compactMatrix.length - 1, 6);
      for (let r = 0; r <= scanLimit; r++) {
        const nonEmpty = compactMatrix[r].filter((c) => c.trim() !== '').length;
        if (nonEmpty >= minHeaderCols) {
          headerRowIdx = r;
          break;
        }
      }
    }
    headers = compactMatrix[headerRowIdx].map((h, i) => (h.trim() ? h.trim() : `Column ${i + 1}`));
    dataMatrix = compactMatrix.slice(headerRowIdx + 1);
  } else {
    headers = Array.from({ length: finalCols }, (_, i) => `Column ${i + 1}`);
    dataMatrix = compactMatrix;
  }

  const parsedRows: CellPrimitive[][] = dataMatrix.map((r) =>
    r.map((cell) => parseCellValue(cell, options.parseNumbers))
  );

  const avgConfidence = totalConfCount > 0 ? Number((totalConf / totalConfCount).toFixed(1)) : 100;

  return {
    headers,
    rows: parsedRows,
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
