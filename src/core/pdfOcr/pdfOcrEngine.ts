import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, PSM, Worker } from 'tesseract.js';
import { preprocessCanvasForOcr } from './imagePreprocess';
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
  pageRange: string;
  sensitivity: ColumnSensitivity;
  preprocessScan: boolean;
  dpiScale: number; // 2.0 to 2.5 recommended for OCR
  firstRowAsHeaders: boolean;
  parseNumbers: boolean;
  combinePages: boolean;
}

export interface PdfOcrProgress {
  stage: 'loading' | 'native-text' | 'rendering' | 'ocr-init' | 'ocr-running' | 'reconstructing' | 'done';
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
  rawText: string;
  previewDataUrl?: string;
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

    // PDF coordinate system has origin at bottom-left; flip Y to top-left screen coordinates
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
  scale: number
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
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

function createThumbnailDataUrl(sourceCanvas: HTMLCanvasElement, maxWidth = 420): string {
  const ratio = Math.min(1, maxWidth / Math.max(1, sourceCanvas.width));
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(sourceCanvas.width * ratio));
  thumb.height = Math.max(1, Math.round(sourceCanvas.height * ratio));
  const ctx = thumb.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.8);
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

async function runOcrOnCanvas(
  worker: Worker,
  canvas: HTMLCanvasElement,
  preprocess: boolean
): Promise<{ tokens: PositionedToken[]; rawText: string }> {
  const ocrInput = preprocess
    ? preprocessCanvasForOcr(canvas, { binarize: true, contrastStretch: true })
    : canvas;

  const { data } = await worker.recognize(
    ocrInput,
    { rotateAuto: true },
    { blocks: true, text: true, tsv: true }
  );

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

  return { tokens, rawText: data.text || '' };
}

async function loadImageFileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  // Upscale small images slightly for sharper OCR recognition
  const scale = bitmap.width < 1000 ? 1.5 : 1.0;
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Unable to acquire 2D canvas context.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  const tableOpts: TableExtractionOptions = {
    sensitivity: options.sensitivity,
    firstRowAsHeaders: options.firstRowAsHeaders,
    parseNumbers: options.parseNumbers,
    trimCells: true,
    dropEmptyRows: true,
  };

  const ocrWorkerRef: { current: Worker | null } = { current: null };
  let activePageIdxForLogger = 1;
  let totalTargetPagesForLogger = 1;

  const ensureOcrWorker = async (): Promise<Worker> => {
    if (ocrWorkerRef.current) return ocrWorkerRef.current;
    onProgress?.({
      stage: 'ocr-init',
      message: `Initializing Tesseract OCR engine (${options.language.toUpperCase()})...`,
      currentPage: activePageIdxForLogger,
      totalPages: totalTargetPagesForLogger,
      percent: 10,
    });

    const worker = await createWorker(options.language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          const base = ((activePageIdxForLogger - 1) / Math.max(1, totalTargetPagesForLogger)) * 100;
          const slice = (1 / Math.max(1, totalTargetPagesForLogger)) * 100;
          onProgress?.({
            stage: 'ocr-running',
            message: `Running OCR on page ${activePageIdxForLogger} of ${totalTargetPagesForLogger} (${Math.round(m.progress * 100)}%)...`,
            currentPage: activePageIdxForLogger,
            totalPages: totalTargetPagesForLogger,
            percent: Math.min(98, Math.round(base + slice * m.progress)),
          });
        }
      },
    });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    });

    ocrWorkerRef.current = worker;
    return worker;
  };

  try {
    // Path A: Direct scanned image file (PNG, JPG, WebP)
    if (isImage) {
      if (signal?.aborted) throw new Error('Extraction cancelled.');
      onProgress?.({
        stage: 'rendering',
        message: 'Preparing image for OCR...',
        currentPage: 1,
        totalPages: 1,
        percent: 15,
      });

      const canvas = await loadImageFileToCanvas(file);
      const thumb = createThumbnailDataUrl(canvas);
      const worker = await ensureOcrWorker();
      if (signal?.aborted) throw new Error('Extraction cancelled.');

      const { tokens, rawText } = await runOcrOnCanvas(worker, canvas, options.preprocessScan);
      const extracted = extractTableFromTokens(tokens, tableOpts);

      const pageRes: ExtractedPageResult = {
        pageNumber: 1,
        method: 'ocr',
        nativeCharCount: 0,
        tokenCount: tokens.length,
        avgConfidence: extracted.avgConfidence,
        headers: extracted.headers,
        rows: extracted.rows,
        rawText: rawText.trim() || extracted.rawLines.join('\n'),
        previewDataUrl: thumb,
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

      if (shouldRunOcr) {
        onProgress?.({
          stage: 'rendering',
          message: `Scanned page ${pageNum} detected — rendering at ${Math.round(options.dpiScale * 72)} DPI for OCR...`,
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

        const ocrRes = await runOcrOnCanvas(worker, canvas, options.preprocessScan);
        finalTokens = ocrRes.tokens;
        rawText = ocrRes.rawText;
      } else {
        // Generate lightweight preview thumbnail for normal PDF pages too
        const thumbCanvas = await renderPdfPageToCanvas(page, 0.8);
        previewDataUrl = createThumbnailDataUrl(thumbCanvas, 380);
      }

      onProgress?.({
        stage: 'reconstructing',
        message: `Reconstructing spreadsheet columns for page ${pageNum}...`,
        currentPage: idx + 1,
        totalPages: targetPages.length,
        percent: Math.min(98, Math.round(((idx + 0.9) / targetPages.length) * 100)),
      });

      const extracted = extractTableFromTokens(finalTokens, tableOpts);
      processedPages.push({
        pageNumber: pageNum,
        method: shouldRunOcr ? 'ocr' : 'native-text',
        nativeCharCount,
        tokenCount: finalTokens.length,
        avgConfidence: extracted.avgConfidence,
        headers: extracted.headers,
        rows: extracted.rows,
        rawText: rawText.trim() || extracted.rawLines.join('\n'),
        previewDataUrl,
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
