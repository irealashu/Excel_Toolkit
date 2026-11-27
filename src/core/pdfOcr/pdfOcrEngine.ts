import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, OEM, PSM, Worker } from 'tesseract.js';
import { DetectedGridLines, preprocessCanvasForOcr, PreprocessMode } from './imagePreprocess';
import {
  CellPrimitive,
  ColumnSensitivity,
  extractTableFromTokens,
  mergeExtractedPages,
  parsePageRange,
  PositionedToken,
  TableExtractionOptions,
} from './tableExtractor';

// Configure local bundled PDF.js worker (works offline with zero external CDN requests)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfExtractionMode = 'auto' | 'ocr' | 'native';
export type OcrQualityModel = 'best' | 'fast';
export type OcrLayoutMode = 'auto-table' | 'grid' | 'sparse' | 'auto';

export type OcrLanguage =
  | 'eng'
  | 'spa'
  | 'fra'
  | 'deu'
  | 'ita'
  | 'por'
  | 'hin'
  | 'chi_sim'
  | 'jpn';

export const OCR_LANGUAGES: { code: OcrLanguage; label: string }[] = [
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'hin', label: 'Hindi' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'jpn', label: 'Japanese' },
];

export interface PdfOcrOptions {
  mode: PdfExtractionMode;
  language: OcrLanguage;
  ocrQuality: OcrQualityModel;
  layoutMode: OcrLayoutMode;
  preprocessMode: PreprocessMode;
  autoDeskew: boolean;
  removeTableLines: boolean;
  pageRange: string;
  sensitivity: ColumnSensitivity;
  dpiScale: number; // ~3.5 (250 DPI) to 4.16 (300 DPI) recommended for OCR
  firstRowAsHeaders: boolean;
  parseNumbers: boolean;
  combinePages: boolean;
}

export interface PdfOcrProgress {
  stage: 'loading' | 'native-text' | 'rendering' | 'preprocessing' | 'ocr-init' | 'ocr-running' | 'reconstructing' | 'done';
  message: string;
  currentPage: number;
  totalPages: number;
  percent: number; // 0..100
}

export interface ExtractedPageResult {
  pageNumber: number;
  method: 'native-text' | 'ocr';
  nativeCharCount: number;
  tokenCount: number;
  avgConfidence: number;
  headers: string[];
  rows: CellPrimitive[][];
  cellConfidences: number[][];
  rawText: string;
  previewDataUrl?: string;
  preprocessedPreviewDataUrl?: string;
  skewAngleDeg?: number;
  detectedGridCols?: number;
  detectedGridRows?: number;
  rescuedCells?: number;
  ocrModelUsed?: string;
}

export interface PdfOcrDocumentResult {
  fileName: string;
  fileSizeBytes: number;
  totalDocumentPages: number;
  processedPages: ExtractedPageResult[];
  combinedSheet: {
    name: string;
    headers: string[];
    rows: CellPrimitive[][];
  };
  durationMs: number;
}

interface TextItemLike {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

const MAX_CANVAS_DIMENSION = 4000;
const OCR_CHAR_BLACKLIST = '¦§©®™°¬~`';

function getTessdataPath(language: OcrLanguage, quality: OcrQualityModel): { langPath: string; cachePath: string; label: string } {
  if (quality === 'fast') {
    return {
      langPath: `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${language}/4.0.0_fast`,
      cachePath: 'tessdata-fast',
      label: 'Fast LSTM (4.0.0)',
    };
  }
  return {
    langPath: `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${language}/4.0.0_best_int`,
    cachePath: 'tessdata-best-int',
    label: 'Best LSTM (4.0.0_best_int)',
  };
}

function isGarbledNativeText(tokens: PositionedToken[]): boolean {
  const joined = tokens.map((t) => t.text).join('');
  if (joined.length === 0) return true;
  const badChars = (joined.match(/[\uFFFD\uE000-\uF8FF]/g) || []).length;
  return badChars / joined.length > 0.2;
}

async function extractNativeTokensFromPdfPage(
  page: pdfjsLib.PDFPageProxy
): Promise<{ tokens: PositionedToken[]; charCount: number }> {
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const tokens: PositionedToken[] = [];
  let charCount = 0;

  for (const rawItem of textContent.items) {
    const item = rawItem as TextItemLike;
    if (!item.str || !item.transform) continue;
    const trimmed = item.str.trim();
    if (!trimmed) continue;

    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]) || Math.abs(item.height || 10) || 10;
    const x = tx[4];
    const y = tx[5] - fontHeight;
    const width = Math.max(item.width || 0, trimmed.length * fontHeight * 0.45);

    tokens.push({
      text: trimmed,
      x,
      y,
      width,
      height: fontHeight,
      confidence: 100,
    });
    charCount += trimmed.replace(/\s+/g, '').length;
  }

  return { tokens, charCount };
}

async function renderPdfPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  requestedScale: number
): Promise<HTMLCanvasElement> {
  const baseViewport = page.getViewport({ scale: 1.0 });
  const maxSafeScale = MAX_CANVAS_DIMENSION / Math.max(baseViewport.width, baseViewport.height, 1);
  const effectiveScale = Math.min(requestedScale, maxSafeScale);

  const viewport = page.getViewport({ scale: effectiveScale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire 2D canvas context for PDF rendering.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  return canvas;
}

function createThumbnailDataUrl(sourceCanvas: HTMLCanvasElement, maxWidth = 460): string {
  const ratio = Math.min(1, maxWidth / Math.max(1, sourceCanvas.width));
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(sourceCanvas.width * ratio));
  thumb.height = Math.max(1, Math.round(sourceCanvas.height * ratio));
  const ctx = thumb.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.85);
}

function parseTsvFallback(tsv: string): PositionedToken[] {
  const tokens: PositionedToken[] = [];
  const lines = tsv.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length < 12) continue;
    const level = Number(parts[0]);
    const text = parts.slice(11).join('\t').trim();
    if (level !== 5 || !text) continue;
    const x = Number(parts[6]);
    const y = Number(parts[7]);
    const width = Number(parts[8]);
    const height = Number(parts[9]);
    const confidence = Number(parts[10]);
    if (Number.isFinite(x) && Number.isFinite(y) && confidence >= 0) {
      tokens.push({ text, x, y, width, height, confidence });
    }
  }
  return tokens;
}

function extractTokensFromPageData(data: Awaited<ReturnType<Worker['recognize']>>['data']): PositionedToken[] {
  const tokens: PositionedToken[] = [];
  if (data.blocks && data.blocks.length > 0) {
    for (const block of data.blocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const word of line.words || []) {
            const cleaned = word.text?.trim();
            if (!cleaned) continue;
            const { x0, y0, x1, y1 } = word.bbox;
            tokens.push({
              text: cleaned,
              x: x0,
              y: y0,
              width: Math.max(1, x1 - x0),
              height: Math.max(1, y1 - y0),
              confidence: word.confidence,
            });
          }
        }
      }
    }
  } else if (data.tsv) {
    tokens.push(...parseTsvFallback(data.tsv));
  }
  return tokens;
}

function scoreOcrPass(tokens: PositionedToken[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const t of tokens) {
    const conf = Math.max(0, t.confidence ?? 0);
    const alnum = (t.text.match(/[A-Za-z0-9]/g) || []).length;
    if (alnum > 0 && conf >= 30) {
      score += alnum * (conf / 100);
    }
  }
  return score;
}

async function recognizeWithPsm(
  worker: Worker,
  canvas: HTMLCanvasElement,
  psm: PSM
): Promise<{ tokens: PositionedToken[]; rawText: string; avgConf: number }> {
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
    tessedit_char_blacklist: OCR_CHAR_BLACKLIST,
  });

  const { data } = await worker.recognize(
    canvas,
    { rotateAuto: false },
    { blocks: true, text: true, tsv: true }
  );

  const tokens = extractTokensFromPageData(data);
  const avgConf =
    tokens.length > 0
      ? tokens.reduce((s, t) => s + (t.confidence ?? 0), 0) / tokens.length
      : 0;

  return { tokens, rawText: data.text || '', avgConf };
}

/**
 * For gridded tables, checks interior grid cells that contain dark text ink yet received zero tokens
 * from full-page OCR (common for isolated 1-2 digit numbers or short codes) and runs targeted
 * single-line cell-crop OCR to rescue them!
 */
async function rescueMissedGridCells(
  worker: Worker,
  ocrCanvas: HTMLCanvasElement,
  gridLines: DetectedGridLines,
  existingTokens: PositionedToken[],
  signal?: AbortSignal
): Promise<{
  rescued: PositionedToken[];
  rescuedCount: number;
  replacedRects: { x0: number; y0: number; x1: number; y1: number }[];
}> {
  if (gridLines.vertical.length < 3 || gridLines.horizontal.length < 3) {
    return { rescued: [], rescuedCount: 0, replacedRects: [] };
  }

  const ctx = ocrCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { rescued: [], rescuedCount: 0, replacedRects: [] };

  const vLines = [...gridLines.vertical].sort((a, b) => a - b);
  const hLines = [...gridLines.horizontal].sort((a, b) => a - b);

  // Collect empty or low-confidence cells that contain foreground ink (tightly bounded around the ink!)
  const candidateBoxes: {
    x: number;
    y: number;
    w: number;
    h: number;
    cellX0: number;
    cellY0: number;
    cellX1: number;
    cellY1: number;
  }[] = [];

  for (let r = 0; r < hLines.length - 1; r++) {
    const y0 = hLines[r] + 3;
    const y1 = hLines[r + 1] - 3;
    const ch = y1 - y0;
    if (ch < 14 || ch > 220) continue;

    for (let c = 0; c < vLines.length - 1; c++) {
      const x0 = vLines[c] + 3;
      const x1 = vLines[c + 1] - 3;
      const cw = x1 - x0;
      if (cw < 18 || cw > 900) continue;

      // Skip only if a reliable alphanumeric token already lies inside this cell
      // (do not let a low-confidence punctuation/speck artifact block cell rescue!)
      const alreadyHasToken = existingTokens.some((t) => {
        if ((t.confidence ?? 0) < 45 || !/[A-Za-z0-9]/.test(t.text)) return false;
        const cx = t.x + t.width * 0.5;
        const cy = t.y + t.height * 0.5;
        return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      });
      if (alreadyHasToken) continue;

      // Measure foreground ink density and tight ink bounding box inside the cell
      const imgData = ctx.getImageData(x0, y0, cw, ch).data;
      let darkPixels = 0;
      let minIx = cw;
      let maxIx = -1;
      let minIy = ch;
      let maxIy = -1;
      const totalPixels = cw * ch;

      for (let py = 0; py < ch; py++) {
        const rowOff = py * cw * 4;
        for (let px = 0; px < cw; px++) {
          if (imgData[rowOff + px * 4] < 170) {
            darkPixels++;
            if (px < minIx) minIx = px;
            if (px > maxIx) maxIx = px;
            if (py < minIy) minIy = py;
            if (py > maxIy) maxIy = py;
          }
        }
      }

      const inkRatio = darkPixels / Math.max(1, totalPixels);
      const inkW = maxIx - minIx + 1;
      const inkH = maxIy - minIy + 1;
      // Single-digit cells (e.g. "1" or "4") occupy ~0.2-0.6% of cell area with ~50-200 dark pixels
      if (darkPixels >= 32 && inkRatio >= 0.0015 && inkRatio <= 0.55 && inkW >= 4 && inkH >= 8) {
        const margin = 4;
        const bx = Math.max(x0, x0 + minIx - margin);
        const by = Math.max(y0, y0 + minIy - margin);
        const bx2 = Math.min(x1, x0 + maxIx + 1 + margin);
        const by2 = Math.min(y1, y0 + maxIy + 1 + margin);
        candidateBoxes.push({
          x: bx,
          y: by,
          w: Math.max(1, bx2 - bx),
          h: Math.max(1, by2 - by),
          cellX0: x0,
          cellY0: y0,
          cellX1: x1,
          cellY1: y1,
        });
      }
    }
  }

  // Cap targeted rescue to 24 cells per page so runtime remains snappy
  const toRescue = candidateBoxes.slice(0, 24);
  if (toRescue.length === 0) return { rescued: [], rescuedCount: 0, replacedRects: [] };

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
    tessedit_char_blacklist: OCR_CHAR_BLACKLIST,
  });

  const rescued: PositionedToken[] = [];
  const replacedRects: { x0: number; y0: number; x1: number; y1: number }[] = [];
  let rescuedCount = 0;
  const pad = 20;

  for (const box of toRescue) {
    if (signal?.aborted) break;
    // Upscale tiny isolated characters so glyph height hits ~42-50px sweet spot for single-line/word LSTM
    const scale = box.h < 32 ? 1.8 : 1.3;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.round(box.w * scale) + pad * 2;
    cropCanvas.height = Math.round(box.h * scale) + pad * 2;
    const cctx = cropCanvas.getContext('2d');
    if (!cctx) continue;

    cctx.fillStyle = '#ffffff';
    cctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = 'high';
    cctx.drawImage(
      ocrCanvas,
      box.x,
      box.y,
      box.w,
      box.h,
      pad,
      pad,
      Math.round(box.w * scale),
      Math.round(box.h * scale)
    );

    let { data } = await worker.recognize(cropCanvas, {}, { blocks: true, text: true, tsv: true });
    let cellTokens = extractTokensFromPageData(data).filter(
      (t) => (t.confidence ?? 0) >= 30 && /[A-Za-z0-9$€£¥₹%.-]/.test(t.text)
    );

    // Fallback to PSM.SINGLE_WORD / SINGLE_CHAR for tiny isolated single digits
    if (cellTokens.length === 0 && !signal?.aborted) {
      const fallbackPsm = box.w < box.h * 1.6 ? PSM.SINGLE_CHAR : PSM.SINGLE_WORD;
      await worker.setParameters({
        tessedit_pageseg_mode: fallbackPsm,
        user_defined_dpi: '300',
        tessedit_char_blacklist: OCR_CHAR_BLACKLIST,
      });
      const retry = await worker.recognize(cropCanvas, {}, { blocks: true, text: true, tsv: true });
      data = retry.data;
      cellTokens = extractTokensFromPageData(data).filter(
        (t) => (t.confidence ?? 0) >= 25 && /[A-Za-z0-9$€£¥₹%.-]/.test(t.text)
      );
      // Restore SINGLE_LINE for subsequent cells
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
        tessedit_char_blacklist: OCR_CHAR_BLACKLIST,
      });
    }

    if (cellTokens.length > 0) {
      rescuedCount++;
      replacedRects.push({
        x0: box.cellX0,
        y0: box.cellY0,
        x1: box.cellX1,
        y1: box.cellY1,
      });
      for (const ct of cellTokens) {
        rescued.push({
          text: ct.text,
          x: box.x + Math.max(0, (ct.x - pad) / scale),
          y: box.y + Math.max(0, (ct.y - pad) / scale),
          width: Math.max(1, ct.width / scale),
          height: Math.max(1, ct.height / scale),
          confidence: ct.confidence,
        });
      }
    }
  }

  return { rescued, rescuedCount, replacedRects };
}

async function runSmartOcrOnCanvas(
  worker: Worker,
  sourceCanvas: HTMLCanvasElement,
  options: PdfOcrOptions,
  signal?: AbortSignal
): Promise<{
  tokens: PositionedToken[];
  rawText: string;
  preprocessedCanvas: HTMLCanvasElement;
  skewAngleDeg: number;
  gridLines: DetectedGridLines;
  rescuedCells: number;
}> {
  const prep = preprocessCanvasForOcr(sourceCanvas, {
    mode: options.preprocessMode,
    autoDeskew: options.autoDeskew,
    removeTableLines: options.removeTableLines,
    sharpen: true,
  });

  let bestPass: { tokens: PositionedToken[]; rawText: string; avgConf: number };

  if (options.layoutMode === 'grid') {
    bestPass = await recognizeWithPsm(worker, prep.canvas, PSM.SINGLE_BLOCK);
  } else if (options.layoutMode === 'sparse') {
    bestPass = await recognizeWithPsm(worker, prep.canvas, PSM.SPARSE_TEXT);
  } else if (options.layoutMode === 'auto') {
    bestPass = await recognizeWithPsm(worker, prep.canvas, PSM.AUTO);
  } else {
    // 'auto-table' (Recommended): PSM.SINGLE_BLOCK reads tables cleanly row-by-row.
    // If confidence is mediocre or sparse layout caused low recall, compare against PSM.SPARSE_TEXT!
    const blockPass = await recognizeWithPsm(worker, prep.canvas, PSM.SINGLE_BLOCK);
    bestPass = blockPass;

    if (!signal?.aborted && (blockPass.avgConf < 78 || blockPass.tokens.length < 18)) {
      const sparsePass = await recognizeWithPsm(worker, prep.canvas, PSM.SPARSE_TEXT);
      if (scoreOcrPass(sparsePass.tokens) > scoreOcrPass(blockPass.tokens) * 1.06) {
        bestPass = sparsePass;
      }
    }
  }

  // Rescue any missed or low-confidence cells inside detected ruled table grids
  let rescuedCells = 0;
  let finalTokens = bestPass.tokens;
  if (!signal?.aborted && prep.gridLines.vertical.length >= 3 && prep.gridLines.horizontal.length >= 3) {
    const rescueRes = await rescueMissedGridCells(worker, prep.canvas, prep.gridLines, finalTokens, signal);
    if (rescueRes.rescued.length > 0) {
      // Remove superseded low-confidence tokens inside rescued cells before inserting crisp rescued tokens
      const keptTokens = finalTokens.filter((t) => {
        const cx = t.x + t.width * 0.5;
        const cy = t.y + t.height * 0.5;
        return !rescueRes.replacedRects.some((r) => cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1);
      });
      finalTokens = [...keptTokens, ...rescueRes.rescued];
      rescuedCells = rescueRes.rescuedCount;
    }
  }

  return {
    tokens: finalTokens,
    rawText: bestPass.rawText,
    preprocessedCanvas: prep.canvas,
    skewAngleDeg: prep.skewAngleDeg,
    gridLines: prep.gridLines,
    rescuedCells,
  };
}

async function loadImageFileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  // Target ~2200px width for crisp ~30px glyph height in Tesseract LSTM, capped safely at MAX_CANVAS_DIMENSION
  let scale = 1.0;
  if (bitmap.width < 2000) {
    scale = Math.min(3.0, 2200 / Math.max(1, bitmap.width));
  }
  const maxSafeScale = MAX_CANVAS_DIMENSION / Math.max(bitmap.width, bitmap.height, 1);
  scale = Math.min(scale, maxSafeScale);

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Unable to acquire 2D canvas context.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function processPdfOrImageToExcel(
  file: File,
  options: PdfOcrOptions,
  onProgress?: (progress: PdfOcrProgress) => void,
  signal?: AbortSignal
): Promise<PdfOcrDocumentResult> {
  const startedAt = performance.now();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext);

  const ocrWorkerRef: { current: Worker | null } = { current: null };
  let activePageIdxForLogger = 1;
  let totalTargetPagesForLogger = 1;
  let resolvedModelLabel = options.ocrQuality === 'best' ? 'Full LSTM (Best)' : 'Fast LSTM';

  const ensureOcrWorker = async (): Promise<Worker> => {
    if (ocrWorkerRef.current) return ocrWorkerRef.current;
    onProgress?.({
      stage: 'ocr-init',
      message:
        options.ocrQuality === 'best'
          ? `Loading high-accuracy LSTM OCR model (${options.language.toUpperCase()})...`
          : `Loading fast OCR model (${options.language.toUpperCase()})...`,
      currentPage: activePageIdxForLogger,
      totalPages: totalTargetPagesForLogger,
      percent: 10,
    });

    const logger = (m: { status?: string; progress?: number }) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        const base = ((activePageIdxForLogger - 1) / Math.max(1, totalTargetPagesForLogger)) * 100;
        const slice = (1 / Math.max(1, totalTargetPagesForLogger)) * 100;
        onProgress?.({
          stage: 'ocr-running',
          message: `Running high-precision OCR on page ${activePageIdxForLogger} of ${totalTargetPagesForLogger} (${Math.round(m.progress * 100)}%)...`,
          currentPage: activePageIdxForLogger,
          totalPages: totalTargetPagesForLogger,
          percent: Math.min(96, Math.round(base + slice * m.progress)),
        });
      }
    };

    const modelCfg = getTessdataPath(options.language, options.ocrQuality);
    let worker: Worker;
    try {
      worker = await createWorker(options.language, OEM.LSTM_ONLY, {
        langPath: modelCfg.langPath,
        cachePath: modelCfg.cachePath,
        logger,
        errorHandler: (err) => {
          console.error('OCR worker error:', err);
        },
      });
      resolvedModelLabel = modelCfg.label;
    } catch {
      // Resilient fallback to default tesseract.js built-in CDN resolution
      worker = await createWorker(options.language, OEM.LSTM_ONLY, {
        logger,
        errorHandler: (err) => {
          console.error('OCR worker error:', err);
        },
      });
      resolvedModelLabel = 'Best LSTM (Default)';
    }

    ocrWorkerRef.current = worker;
    return worker;
  };

  try {
    // Path A: Direct scanned image file (PNG, JPG, WebP)
    if (isImage) {
      if (signal?.aborted) throw new Error('Extraction cancelled.');
      onProgress?.({
        stage: 'preprocessing',
        message: 'Upscaling, deskewing, and normalizing scanned image...',
        currentPage: 1,
        totalPages: 1,
        percent: 15,
      });

      const canvas = await loadImageFileToCanvas(file);
      const origThumb = createThumbnailDataUrl(canvas);
      const worker = await ensureOcrWorker();
      if (signal?.aborted) throw new Error('Extraction cancelled.');

      const ocrRes = await runSmartOcrOnCanvas(worker, canvas, options, signal);
      const prepThumb = createThumbnailDataUrl(ocrRes.preprocessedCanvas);

      const tableOpts: TableExtractionOptions = {
        sensitivity: options.sensitivity,
        firstRowAsHeaders: options.firstRowAsHeaders,
        parseNumbers: options.parseNumbers,
        trimCells: true,
        dropEmptyRows: true,
        filterOcrNoise: true,
        gridLines: ocrRes.gridLines,
      };
      const extracted = extractTableFromTokens(ocrRes.tokens, tableOpts);

      const pageRes: ExtractedPageResult = {
        pageNumber: 1,
        method: 'ocr',
        nativeCharCount: 0,
        tokenCount: ocrRes.tokens.length,
        avgConfidence: extracted.avgConfidence,
        headers: extracted.headers,
        rows: extracted.rows,
        cellConfidences: extracted.cellConfidences,
        rawText: ocrRes.rawText.trim() || extracted.rawLines.join('\n'),
        previewDataUrl: origThumb,
        preprocessedPreviewDataUrl: prepThumb,
        skewAngleDeg: ocrRes.skewAngleDeg,
        detectedGridCols: ocrRes.gridLines.vertical.length >= 2 ? ocrRes.gridLines.vertical.length - 1 : 0,
        detectedGridRows: ocrRes.gridLines.horizontal.length >= 2 ? ocrRes.gridLines.horizontal.length - 1 : 0,
        rescuedCells: ocrRes.rescuedCells,
        ocrModelUsed: resolvedModelLabel,
      };

      onProgress?.({
        stage: 'done',
        message: 'Completed image OCR extraction.',
        currentPage: 1,
        totalPages: 1,
        percent: 100,
      });

      return {
        fileName: file.name,
        fileSizeBytes: file.size,
        totalDocumentPages: 1,
        processedPages: [pageRes],
        combinedSheet: {
          name: 'OCR_Extracted',
          headers: pageRes.headers,
          rows: pageRes.rows,
        },
        durationMs: Math.round(performance.now() - startedAt),
      };
    }

    // Path B: PDF Document (Normal, Scanned, or Mixed)
    onProgress?.({
      stage: 'loading',
      message: 'Reading PDF document structure...',
      currentPage: 0,
      totalPages: 0,
      percent: 5,
    });

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;
    const totalDocPages = pdfDoc.numPages;
    const targetPages = parsePageRange(options.pageRange, totalDocPages);
    totalTargetPagesForLogger = targetPages.length;

    const processedPages: ExtractedPageResult[] = [];

    for (let idx = 0; idx < targetPages.length; idx++) {
      if (signal?.aborted) {
        await loadingTask.destroy();
        throw new Error('Extraction cancelled by user.');
      }

      const pageNum = targetPages[idx];
      activePageIdxForLogger = idx + 1;
      const basePercent = Math.round((idx / targetPages.length) * 95);

      const page = await pdfDoc.getPage(pageNum);

      // Step 1: Inspect native text layer (for Auto and Native modes)
      let nativeTokens: PositionedToken[] = [];
      let nativeCharCount = 0;

      if (options.mode !== 'ocr') {
        onProgress?.({
          stage: 'native-text',
          message: `Inspecting native text layer on page ${pageNum} of ${totalDocPages}...`,
          currentPage: idx + 1,
          totalPages: targetPages.length,
          percent: basePercent + 3,
        });
        const nativeRes = await extractNativeTokensFromPdfPage(page);
        nativeTokens = nativeRes.tokens;
        nativeCharCount = nativeRes.charCount;
      }

      const shouldRunOcr =
        options.mode === 'ocr' ||
        (options.mode === 'auto' && (nativeCharCount < 20 || isGarbledNativeText(nativeTokens)));

      let finalTokens: PositionedToken[] = nativeTokens;
      let rawText = '';
      let previewDataUrl: string | undefined;
      let preprocessedPreviewDataUrl: string | undefined;
      let skewAngleDeg = 0;
      let gridLines: DetectedGridLines | undefined;
      let rescuedCells = 0;

      if (shouldRunOcr) {
        onProgress?.({
          stage: 'rendering',
          message: `Rendering page ${pageNum} at ${Math.round(options.dpiScale * 72)} DPI & preprocessing scan...`,
          currentPage: idx + 1,
          totalPages: targetPages.length,
          percent: basePercent + 8,
        });

        const canvas = await renderPdfPageToCanvas(page, options.dpiScale);
        previewDataUrl = createThumbnailDataUrl(canvas);
        const worker = await ensureOcrWorker();
        if (signal?.aborted) {
          await loadingTask.destroy();
          throw new Error('Extraction cancelled by user.');
        }

        const ocrRes = await runSmartOcrOnCanvas(worker, canvas, options, signal);
        finalTokens = ocrRes.tokens;
        rawText = ocrRes.rawText;
        preprocessedPreviewDataUrl = createThumbnailDataUrl(ocrRes.preprocessedCanvas);
        skewAngleDeg = ocrRes.skewAngleDeg;
        gridLines = ocrRes.gridLines;
        rescuedCells = ocrRes.rescuedCells;
      } else {
        const thumbCanvas = await renderPdfPageToCanvas(page, 0.9);
        previewDataUrl = createThumbnailDataUrl(thumbCanvas, 420);
      }

      onProgress?.({
        stage: 'reconstructing',
        message: `Reconstructing spreadsheet columns for page ${pageNum}...`,
        currentPage: idx + 1,
        totalPages: targetPages.length,
        percent: Math.min(98, Math.round(((idx + 0.9) / targetPages.length) * 100)),
      });

      const tableOpts: TableExtractionOptions = {
        sensitivity: options.sensitivity,
        firstRowAsHeaders: options.firstRowAsHeaders,
        parseNumbers: options.parseNumbers,
        trimCells: true,
        dropEmptyRows: true,
        filterOcrNoise: shouldRunOcr,
        gridLines,
      };
      const extracted = extractTableFromTokens(finalTokens, tableOpts);

      processedPages.push({
        pageNumber: pageNum,
        method: shouldRunOcr ? 'ocr' : 'native-text',
        nativeCharCount,
        tokenCount: finalTokens.length,
        avgConfidence: extracted.avgConfidence,
        headers: extracted.headers,
        rows: extracted.rows,
        cellConfidences: extracted.cellConfidences,
        rawText: rawText.trim() || extracted.rawLines.join('\n'),
        previewDataUrl,
        preprocessedPreviewDataUrl,
        skewAngleDeg: shouldRunOcr ? skewAngleDeg : undefined,
        detectedGridCols: gridLines && gridLines.vertical.length >= 2 ? gridLines.vertical.length - 1 : 0,
        detectedGridRows: gridLines && gridLines.horizontal.length >= 2 ? gridLines.horizontal.length - 1 : 0,
        rescuedCells: shouldRunOcr ? rescuedCells : 0,
        ocrModelUsed: shouldRunOcr ? resolvedModelLabel : undefined,
      });

      page.cleanup();
    }

    await loadingTask.destroy();

    const combined = mergeExtractedPages(
      processedPages.map((p) => ({
        pageNumber: p.pageNumber,
        headers: p.headers,
        rows: p.rows,
      }))
    );

    onProgress?.({
      stage: 'done',
      message: `Extracted ${processedPages.length} page(s) successfully.`,
      currentPage: targetPages.length,
      totalPages: targetPages.length,
      percent: 100,
    });

    return {
      fileName: file.name,
      fileSizeBytes: file.size,
      totalDocumentPages: totalDocPages,
      processedPages,
      combinedSheet: {
        name: 'Combined_Pages',
        headers: combined.headers,
        rows: combined.rows,
      },
      durationMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    if (ocrWorkerRef.current) {
      await ocrWorkerRef.current.terminate();
      ocrWorkerRef.current = null;
    }
  }
}
