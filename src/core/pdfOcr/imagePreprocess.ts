/**
 * Canvas image preprocessing pipeline for scanned PDFs and camera photos.
 * Converts to grayscale, stretches luminance contrast (2%-98% percentile),
 * and optionally applies Otsu global thresholding for crisp black-on-white OCR input.
 */
export function preprocessCanvasForOcr(
  sourceCanvas: HTMLCanvasElement,
  options: { binarize: boolean; contrastStretch: boolean } = { binarize: true, contrastStretch: true }
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = width * height;

  // Step 1: Grayscale luminance + build histogram
  const gray = new Uint8ClampedArray(pixelCount);
  const hist = new Uint32Array(256);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Composite over white if pixel has transparency
    const alpha = data[i + 3] / 255;
    const r = data[i] * alpha + 255 * (1 - alpha);
    const g = data[i + 1] * alpha + 255 * (1 - alpha);
    const b = data[i + 2] * alpha + 255 * (1 - alpha);
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray[p] = lum;
    hist[lum]++;
  }

  // Step 2: Contrast stretching (ignore extreme 1% tails)
  if (options.contrastStretch && pixelCount > 0) {
    const lowCut = Math.floor(pixelCount * 0.01);
    const highCut = Math.floor(pixelCount * 0.99);
    let acc = 0;
    let minVal = 0;
    let maxVal = 255;

    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= lowCut) {
        minVal = v;
        break;
      }
    }
    acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= highCut) {
        maxVal = v;
        break;
      }
    }

    if (maxVal - minVal > 12) {
      const scale = 255 / (maxVal - minVal);
      hist.fill(0);
      for (let p = 0; p < pixelCount; p++) {
        const stretched = Math.max(0, Math.min(255, Math.round((gray[p] - minVal) * scale)));
        gray[p] = stretched;
        hist[stretched]++;
      }
    }
  }

  // Step 3: Optional Otsu threshold binarization
  let threshold = 180;
  if (options.binarize && pixelCount > 0) {
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let maxBetween = -1;
    let bestThreshold = 160;

    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = pixelCount - wB;
      if (wF === 0) break;

      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);

      if (between > maxBetween) {
        maxBetween = between;
        bestThreshold = t;
      }
    }

    // Clamp threshold slightly so faint anti-aliased thin strokes aren't lost on clean white pages
    threshold = Math.min(Math.max(bestThreshold, 110), 218);
  }

  // Write processed grayscale/binary values back
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const val = options.binarize ? (gray[p] < threshold ? 0 : 255) : gray[p];
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return outCanvas;
}
