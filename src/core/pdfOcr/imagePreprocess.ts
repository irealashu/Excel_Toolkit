export type PreprocessMode = 'enhanced' | 'sauvola' | 'none';

export interface DetectedGridLines {
  /** X-coordinates (in preprocessed canvas space) of detected vertical table dividers */
  vertical: number[];
  /** Y-coordinates (in preprocessed canvas space) of detected horizontal table dividers */
  horizontal: number[];
}

export interface PreprocessResult {
  canvas: HTMLCanvasElement;
  skewAngleDeg: number;
  gridLines: DetectedGridLines;
  padPx: number;
}

export interface PreprocessOptions {
  mode: PreprocessMode;
  autoDeskew: boolean;
  removeTableLines: boolean;
  sharpen: boolean;
}

const DEFAULT_PAD_PX = 24;

/**
 * Computes fast integral image (sum and squared sum) for O(1) local window statistics.
 */
function buildIntegralImages(gray: Uint8ClampedArray, w: number, h: number) {
  const stride = w + 1;
  const sum = new Float64Array(stride * (h + 1));
  const sqSum = new Float64Array(stride * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    let rowSqSum = 0;
    const srcRow = y * w;
    const dstRow = (y + 1) * stride;
    const prevRow = y * stride;

    for (let x = 0; x < w; x++) {
      const v = gray[srcRow + x];
      rowSum += v;
      rowSqSum += v * v;
      sum[dstRow + x + 1] = sum[prevRow + x + 1] + rowSum;
      sqSum[dstRow + x + 1] = sqSum[prevRow + x + 1] + rowSqSum;
    }
  }

  return { sum, sqSum, stride };
}

function boxSum(integral: Float64Array, stride: number, x0: number, y0: number, x1: number, y1: number): number {
  return (
    integral[y1 * stride + x1] -
    integral[y0 * stride + x1] -
    integral[y1 * stride + x0] +
    integral[y0 * stride + x0]
  );
}

/**
 * Estimates document skew angle (-8 deg to +8 deg) using coarse-to-fine projection energy
 * on vertical-gradient ink edges with linear bin splatting (immune to shadows and 0-deg aliasing).
 * Returns the document's detected clockwise tilt in degrees (e.g. +2.4 deg means rotated CW 2.4 deg).
 */
export function estimateSkewAngle(sourceCanvas: HTMLCanvasElement): number {
  const maxDim = 540;
  const scale = Math.min(1, maxDim / Math.max(sourceCanvas.width, sourceCanvas.height));
  const sw = Math.max(40, Math.round(sourceCanvas.width * scale));
  const sh = Math.max(40, Math.round(sourceCanvas.height * scale));

  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  if (!sctx) return 0;

  sctx.fillStyle = '#ffffff';
  sctx.fillRect(0, 0, sw, sh);
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(sourceCanvas, 0, 0, sw, sh);

  const img = sctx.getImageData(0, 0, sw, sh).data;
  const lums = new Uint8Array(sw * sh);
  for (let i = 0, p = 0; i < img.length; i += 4, p++) {
    lums[p] = Math.round(0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]);
  }

  // Extract strong vertical-gradient edge points (text baselines, x-heights, horizontal rules).
  // Completely immune to uneven lighting / paper shadow gradients and handles both black-on-white
  // and white-on-dark headers.
  const edgePoints: number[] = [];
  const marginX = Math.max(4, Math.floor(sw * 0.04));
  const marginY = Math.max(4, Math.floor(sh * 0.04));
  const cx = sw * 0.5;
  const cy = sh * 0.5;

  for (let y = marginY; y < sh - marginY; y++) {
    const rowOff = y * sw;
    const prevOff = (y - 1) * sw;
    for (let x = marginX; x < sw - marginX; x++) {
      const gradY = Math.abs(lums[rowOff + x] - lums[prevOff + x]);
      if (gradY >= 24) {
        edgePoints.push(x - cx, y - cy);
      }
    }
  }

  if (edgePoints.length < 200) return 0;

  // Subsample evenly if extremely dense so angle sweep always stays < 15ms
  const maxCoords = 36000; // 18,000 points
  const stepPairs = edgePoints.length > maxCoords ? Math.ceil(edgePoints.length / maxCoords) * 2 : 2;
  const numBins = sh + 80;
  const halfH = sh * 0.5 + 40;
  const bins = new Float64Array(numBins);

  const scoreAngle = (deg: number): number => {
    const rad = (deg * Math.PI) / 180;
    const sinA = Math.sin(rad);
    const cosA = Math.cos(rad);
    bins.fill(0);

    for (let i = 0; i < edgePoints.length; i += stepPairs) {
      const px = edgePoints[i];
      const py = edgePoints[i + 1];
      const ry = px * sinA + py * cosA + halfH;
      const b0 = Math.floor(ry);
      if (b0 >= 0 && b0 + 1 < numBins) {
        const frac = ry - b0;
        bins[b0] += 1 - frac;
        bins[b0 + 1] += frac;
      }
    }

    // Projection profile energy: maximized when text lines & table rules align strictly horizontally
    let energy = 0;
    for (let i = 0; i < numBins; i++) {
      const v = bins[i];
      energy += v * v;
    }
    return energy;
  };

  // Coarse sweep: -8.0 to +8.0 deg in 0.5 deg steps
  let bestAngle = 0;
  let bestScore = scoreAngle(0);
  const zeroScore = bestScore;

  for (let deg = -8.0; deg <= 8.001; deg += 0.5) {
    const rounded = Math.round(deg * 10) / 10;
    if (rounded === 0) continue;
    const s = scoreAngle(rounded);
    if (s > bestScore) {
      bestScore = s;
      bestAngle = rounded;
    }
  }

  // Fine sweep around bestAngle: +/- 0.6 deg in 0.1 deg steps
  const center = bestAngle;
  for (let deg = center - 0.6; deg <= center + 0.601; deg += 0.1) {
    const rounded = Math.round(deg * 10) / 10;
    const s = scoreAngle(rounded);
    if (s > bestScore) {
      bestScore = s;
      bestAngle = rounded;
    }
  }

  // Only deskew if skew is meaningful and measurably improves horizontal line alignment over 0 deg
  if (Math.abs(bestAngle) < 0.35 || bestScore < zeroScore * 1.03) {
    return 0;
  }
  // bestAngle is the canvas correction angle that makes lines horizontal;
  // negate it so skewAngleDeg reports the document's clockwise tilt (e.g. +2.4 deg)
  // and ctx.rotate(-skewAngleDeg) straightens it back to 0 deg.
  const detectedSkew = -bestAngle;
  return Number((Object.is(detectedSkew, -0) ? 0 : detectedSkew).toFixed(1));
}

/**
 * Clusters nearby line positions (within tolerance px) into single clean line coordinates.
 */
function clusterLineCoords(coords: number[], minGap: number): number[] {
  if (coords.length === 0) return [];
  const sorted = [...coords].sort((a, b) => a - b);
  const clusters: { sum: number; count: number; last: number }[] = [];

  for (const c of sorted) {
    const prev = clusters[clusters.length - 1];
    if (prev && c - prev.last <= minGap) {
      prev.sum += c;
      prev.count += 1;
      prev.last = c;
    } else {
      clusters.push({ sum: c, count: 1, last: c });
    }
  }

  return clusters.map((cl) => Math.round(cl.sum / cl.count));
}

/**
 * Detects long straight horizontal and vertical table ruling lines, returns their coordinates,
 * and safely erases thin ruling lines from the grayscale buffer without slicing crossing characters.
 */
function detectAndRemoveTableLines(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  eraseLines: boolean
): DetectedGridLines {
  // Adaptive dark threshold for ruling lines (lines can be medium gray in spreadsheets)
  const lineDarkCutoff = 210;
  const minHorizRun = Math.max(120, Math.floor(w * 0.22));
  const minVertRun = Math.max(80, Math.floor(h * 0.08));
  const maxLineThickness = Math.max(6, Math.round(Math.min(w, h) * 0.0045));

  // Mask of pixels belonging to horizontal or vertical ruling lines
  const hLineRows: number[] = [];
  const vLineCols: number[] = [];
  const hMask = eraseLines ? new Uint8Array(w * h) : null;
  const vMask = eraseLines ? new Uint8Array(w * h) : null;

  // 1. Scan horizontal long runs
  for (let y = 2; y < h - 2; y++) {
    const rowOff = y * w;
    let runStart = -1;
    let gapCount = 0;

    for (let x = 0; x <= w; x++) {
      const isDark = x < w && gray[rowOff + x] < lineDarkCutoff;
      if (isDark) {
        if (runStart < 0) runStart = x;
        gapCount = 0;
      } else if (runStart >= 0) {
        gapCount++;
        // Allow tiny 2px anti-aliasing/scan breaks inside a ruling line
        if (gapCount > 2 || x === w) {
          const runEnd = x - gapCount;
          const runLen = runEnd - runStart + 1;
          if (runLen >= minHorizRun) {
            // Verify this is a thin line, not a solid dark filled header banner
            let thinSamples = 0;
            let totalSamples = 0;
            const step = Math.max(1, Math.floor(runLen / 24));
            for (let sx = runStart; sx <= runEnd; sx += step) {
              totalSamples++;
              const above = y >= maxLineThickness ? gray[(y - maxLineThickness) * w + sx] : 255;
              const below = y + maxLineThickness < h ? gray[(y + maxLineThickness) * w + sx] : 255;
              if (above > lineDarkCutoff && below > lineDarkCutoff) {
                thinSamples++;
              }
            }
            if (totalSamples > 0 && thinSamples / totalSamples >= 0.55) {
              hLineRows.push(y);
              if (hMask) {
                for (let sx = runStart; sx <= runEnd; sx++) {
                  hMask[rowOff + sx] = 1;
                }
              }
            }
          }
          runStart = -1;
          gapCount = 0;
        }
      }
    }
  }

  // 2. Scan vertical long runs
  for (let x = 2; x < w - 2; x++) {
    let runStart = -1;
    let gapCount = 0;

    for (let y = 0; y <= h; y++) {
      const isDark = y < h && gray[y * w + x] < lineDarkCutoff;
      if (isDark) {
        if (runStart < 0) runStart = y;
        gapCount = 0;
      } else if (runStart >= 0) {
        gapCount++;
        if (gapCount > 2 || y === h) {
          const runEnd = y - gapCount;
          const runLen = runEnd - runStart + 1;
          if (runLen >= minVertRun) {
            let thinSamples = 0;
            let totalSamples = 0;
            const step = Math.max(1, Math.floor(runLen / 20));
            for (let sy = runStart; sy <= runEnd; sy += step) {
              totalSamples++;
              const left = x >= maxLineThickness ? gray[sy * w + (x - maxLineThickness)] : 255;
              const right = x + maxLineThickness < w ? gray[sy * w + (x + maxLineThickness)] : 255;
              if (left > lineDarkCutoff && right > lineDarkCutoff) {
                thinSamples++;
              }
            }
            if (totalSamples > 0 && thinSamples / totalSamples >= 0.55) {
              vLineCols.push(x);
              if (vMask) {
                for (let sy = runStart; sy <= runEnd; sy++) {
                  vMask[sy * w + x] = 1;
                }
              }
            }
          }
          runStart = -1;
          gapCount = 0;
        }
      }
    }
  }

  // 3. Erase detected ruling lines cleanly (including +/-1px anti-aliased halos and +/T/L intersections,
  // while preserving genuine crossing letter strokes!)
  if (eraseLines && hMask && vMask) {
    const probeDist = Math.max(4, Math.ceil(maxLineThickness * 0.75));
    const original = new Uint8ClampedArray(gray);

    // Dilate hMask vertically by 1px and vMask horizontally by 1px onto adjacent anti-aliased fringe pixels
    const hDilated = new Uint8Array(hMask);
    const vDilated = new Uint8Array(vMask);
    for (let y = 1; y < h - 1; y++) {
      const rowOff = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = rowOff + x;
        if (hMask[idx] === 1) {
          if (original[idx - w] < 245) hDilated[idx - w] = 1;
          if (original[idx + w] < 245) hDilated[idx + w] = 1;
        }
        if (vMask[idx] === 1) {
          if (original[idx - 1] < 245) vDilated[idx - 1] = 1;
          if (original[idx + 1] < 245) vDilated[idx + 1] = 1;
        }
      }
    }

    for (let y = probeDist; y < h - probeDist; y++) {
      const rowOff = y * w;
      for (let x = probeDist; x < w - probeDist; x++) {
        const idx = rowOff + x;
        const isH = hDilated[idx] === 1;
        const isV = vDilated[idx] === 1;

        if (isH && isV) {
          // Grid corner/intersection — erase cleanly
          gray[idx] = 255;
        } else if (isH) {
          // Erase unless a genuine non-gridline stroke crosses vertically above OR below
          const upIdx = (y - probeDist) * w + x;
          const dnIdx = (y + probeDist) * w + x;
          const aboveClear = original[upIdx] > 185 || vDilated[upIdx] === 1 || hDilated[upIdx] === 1;
          const belowClear = original[dnIdx] > 185 || vDilated[dnIdx] === 1 || hDilated[dnIdx] === 1;
          if (aboveClear && belowClear) {
            gray[idx] = 255;
          }
        } else if (isV) {
          // Erase unless a genuine non-gridline stroke crosses horizontally left OR right
          const lIdx = rowOff + (x - probeDist);
          const rIdx = rowOff + (x + probeDist);
          const leftClear = original[lIdx] > 185 || hDilated[lIdx] === 1 || vDilated[lIdx] === 1;
          const rightClear = original[rIdx] > 185 || hDilated[rIdx] === 1 || vDilated[rIdx] === 1;
          if (leftClear && rightClear) {
            gray[idx] = 255;
          }
        }
      }
    }
  }

  const horizontal = clusterLineCoords(hLineRows, Math.max(8, maxLineThickness * 2));
  const vertical = clusterLineCoords(vLineCols, Math.max(8, maxLineThickness * 2));

  return { vertical, horizontal };
}

/**
 * Mild 3x3 unsharp mask to crisp up scanned/JPEG font edges without introducing ringing noise.
 */
function applyUnsharpMask(gray: Uint8ClampedArray, w: number, h: number, amount = 0.55): void {
  const src = new Uint8ClampedArray(gray);
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    const prev = row - w;
    const next = row + w;
    for (let x = 1; x < w - 1; x++) {
      const blur =
        (src[prev + x - 1] +
          2 * src[prev + x] +
          src[prev + x + 1] +
          2 * src[row + x - 1] +
          4 * src[row + x] +
          2 * src[row + x + 1] +
          src[next + x - 1] +
          2 * src[next + x] +
          src[next + x + 1]) *
        0.0625;
      const center = src[row + x];
      const sharpened = center + amount * (center - blur);
      gray[row + x] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : Math.round(sharpened);
    }
  }
}

/**
 * Full document restoration pipeline for high-accuracy browser OCR:
 * 1. Auto-deskew (projection-profile angle estimation & canvas rotation)
 * 2. White border quiet-zone padding (prevents edge clipping in Tesseract)
 * 3. Integral-image adaptive illumination flattening (removes shadows, yellowed paper, zebra row tints)
 *    OR Sauvola local adaptive binarization (for degraded low-contrast scans)
 * 4. Mild unsharp sharpening for crisp thin-font edges
 * 5. Table ruling-line detection & non-destructive border removal
 */
export function preprocessCanvasForOcr(
  sourceCanvas: HTMLCanvasElement,
  options: PreprocessOptions = {
    mode: 'enhanced',
    autoDeskew: true,
    removeTableLines: true,
    sharpen: true,
  }
): PreprocessResult {
  const padPx = DEFAULT_PAD_PX;
  const skewAngleDeg = options.autoDeskew ? estimateSkewAngle(sourceCanvas) : 0;

  const w = sourceCanvas.width + padPx * 2;
  const h = sourceCanvas.height + padPx * 2;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      canvas: sourceCanvas,
      skewAngleDeg: 0,
      gridLines: { vertical: [], horizontal: [] },
      padPx: 0,
    };
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (Math.abs(skewAngleDeg) >= 0.35) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-skewAngleDeg * Math.PI) / 180);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    ctx.restore();
  } else {
    ctx.drawImage(sourceCanvas, padPx, padPx);
  }

  if (options.mode === 'none') {
    const imgData = ctx.getImageData(0, 0, w, h);
    const grayRaw = new Uint8ClampedArray(w * h);
    for (let i = 0, p = 0; i < imgData.data.length; i += 4, p++) {
      grayRaw[p] = Math.round(
        0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2]
      );
    }
    const gridLines = detectAndRemoveTableLines(grayRaw, w, h, false);
    return { canvas: outCanvas, skewAngleDeg, gridLines, padPx };
  }

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const pixelCount = w * h;
  const gray = new Uint8ClampedArray(pixelCount);

  // Step 1: Luminance grayscale (alpha-composited on white)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const alpha = data[i + 3] / 255;
    const r = data[i] * alpha + 255 * (1 - alpha);
    const g = data[i + 1] * alpha + 255 * (1 - alpha);
    const b = data[i + 2] * alpha + 255 * (1 - alpha);
    gray[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Step 2: Detect and cleanly invert dark-background colored header bars (white text on navy/charcoal/teal)
  // Uses O(1) integral dark-fraction queries so normal bold black text (~20-30% density) is untouched
  // while solid dark banners (>=50% dark density) turn into crisp black text on pure white paper!
  const invertDarkBanners = (buf: Uint8ClampedArray) => {
    const stride = w + 1;
    const darkCnt = new Float64Array(stride * (h + 1));
    const darkVal = new Float64Array(stride * (h + 1));
    const darkThresh = 142;

    for (let y = 0; y < h; y++) {
      let rowCnt = 0;
      let rowVal = 0;
      const srcRow = y * w;
      const dstRow = (y + 1) * stride;
      const prevRow = y * stride;
      for (let x = 0; x < w; x++) {
        const v = buf[srcRow + x];
        if (v < darkThresh) {
          rowCnt += 1;
          rowVal += v;
        }
        darkCnt[dstRow + x + 1] = darkCnt[prevRow + x + 1] + rowCnt;
        darkVal[dstRow + x + 1] = darkVal[prevRow + x + 1] + rowVal;
      }
    }

    const rx = Math.max(18, Math.min(44, Math.round(w * 0.016)));
    const ry = Math.max(10, Math.min(24, Math.round(h * 0.012)));
    const out = new Uint8ClampedArray(buf);

    for (let y = 0; y < h; y++) {
      const yTop = Math.max(0, y - ry);
      const yBot = Math.min(h, y + ry + 1);
      const yDown = Math.min(h, y + ry * 2 + 1);
      const yUp = Math.max(0, y - ry * 2);
      const rowOff = y * w;

      for (let x = 0; x < w; x++) {
        const xL = Math.max(0, x - rx);
        const xR = Math.min(w, x + rx + 1);
        const areaC = (xR - xL) * (yBot - yTop);
        const cntC = boxSum(darkCnt, stride, xL, yTop, xR, yBot);
        const fracC = cntC / areaC;

        let inDarkBanner = fracC >= 0.5;
        let isOuterSeam = false;
        let bgLum = 55;

        if (!inDarkBanner && buf[rowOff + x] < 222) {
          // Check directional boxes so both the inner edge and 1-2px anti-aliased outer seam of a dark banner clear cleanly
          const downArea = Math.max(1, (xR - xL) * (yDown - y));
          const upArea = Math.max(1, (xR - xL) * (y + 1 - yUp));
          const fracDown = boxSum(darkCnt, stride, xL, y, xR, yDown) / downArea;
          const fracUp = boxSum(darkCnt, stride, xL, yUp, xR, y + 1) / upArea;

          if (Math.max(fracDown, fracUp) >= 0.52) {
            const xLL = Math.max(0, x - rx * 2);
            const xRR = Math.min(w, x + rx * 2 + 1);
            const leftArea = Math.max(1, (x + 1 - xLL) * (yBot - yTop));
            const rightArea = Math.max(1, (xRR - x) * (yBot - yTop));
            const fracLeft = boxSum(darkCnt, stride, xLL, yTop, x + 1, yBot) / leftArea;
            const fracRight = boxSum(darkCnt, stride, x, yTop, xRR, yBot) / rightArea;
            if (Math.max(fracLeft, fracRight) >= 0.52) {
              if (buf[rowOff + x] < darkThresh) {
                inDarkBanner = true;
              } else {
                isOuterSeam = true;
              }
            }
          }
        }

        if (isOuterSeam) {
          out[rowOff + x] = 255;
        } else if (inDarkBanner) {
          if (cntC > 0) {
            bgLum = boxSum(darkVal, stride, xL, yTop, xR, yBot) / cntC;
          }
          const v = buf[rowOff + x];
          const denom = Math.max(45, 228 - bgLum);
          const t = (v - bgLum) / denom;
          if (t <= 0.14) {
            out[rowOff + x] = 255;
          } else if (t >= 0.92) {
            out[rowOff + x] = 0;
          } else {
            out[rowOff + x] = Math.round((1 - (t - 0.14) / 0.78) * 255);
          }
        }
      }
    }

    buf.set(out);
  };

  invertDarkBanners(gray);

  // Step 3: Build integral images for adaptive illumination normalization or Sauvola binarization
  const { sum, sqSum, stride } = buildIntegralImages(gray, w, h);

  if (options.mode === 'sauvola') {
    // Local adaptive Sauvola binarization (great for uneven lighting, fax scans, low-contrast photos)
    const radius = Math.max(12, Math.min(28, Math.round(Math.min(w, h) / 60)));
    const k = 0.22;

    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(h, y + radius + 1);
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - radius);
        const x1 = Math.min(w, x + radius + 1);
        const area = (x1 - x0) * (y1 - y0);
        const s = boxSum(sum, stride, x0, y0, x1, y1);
        const sq = boxSum(sqSum, stride, x0, y0, x1, y1);
        const mean = s / area;
        const variance = Math.max(0, sq / area - mean * mean);
        const std = Math.sqrt(variance);
        const thresh = mean * (1 + k * (std / 128 - 1));
        const val = gray[rowOff + x];
        gray[rowOff + x] = std < 6 ? 255 : val < thresh ? 0 : 255;
      }
    }
  } else {
    // Enhanced Grayscale (Recommended for Tesseract 5 LSTM):
    // Flattens uneven lighting / paper tint / light row shading while preserving smooth anti-aliased strokes!
    const bgRadius = Math.max(22, Math.min(54, Math.round(Math.min(w, h) / 34)));

    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - bgRadius);
      const y1 = Math.min(h, y + bgRadius + 1);
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - bgRadius);
        const x1 = Math.min(w, x + bgRadius + 1);
        const area = (x1 - x0) * (y1 - y0);
        const localMean = boxSum(sum, stride, x0, y0, x1, y1) / area;
        const v = gray[rowOff + x];

        // Divide by local illumination so paper shadows & zebra tint become pure 255 white
        const bg = Math.max(localMean, 130);
        const norm = (v / bg) * 255;
        if (norm >= 232) {
          gray[rowOff + x] = 255;
        } else if (norm <= 70) {
          gray[rowOff + x] = 0;
        } else {
          gray[rowOff + x] = Math.round(((norm - 70) / 162) * 255);
        }
      }
    }

    if (options.sharpen) {
      applyUnsharpMask(gray, w, h, 0.5);
    }
  }

  // Step 4: Detect table gridlines & optionally erase ruling lines so Tesseract sees clean borderless cells
  const gridLines = detectAndRemoveTableLines(gray, w, h, options.removeTableLines);

  // Write processed grayscale buffer back to canvas
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const val = gray[p];
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return {
    canvas: outCanvas,
    skewAngleDeg,
    gridLines,
    padPx,
  };
}
