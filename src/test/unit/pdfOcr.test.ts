import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTableFromTokens,
  mergeExtractedPages,
  parseCellValue,
  parsePageRange,
  PositionedToken,
} from '../../core/pdfOcr/tableExtractor.ts';

describe('PDF & OCR Spatial Table Extractor', () => {
  it('reconstructs aligned columns and merges multi-word cells while skipping title and subtitle banners', () => {
    const tokens: PositionedToken[] = [
      // Title banner on row 0
      { text: 'VENDOR', x: 50, y: 20, width: 55, height: 14, confidence: 96 },
      { text: 'INVOICE', x: 112, y: 20, width: 60, height: 14, confidence: 95 },
      { text: 'SUMMARY', x: 180, y: 20, width: 65, height: 14, confidence: 97 },

      // Subtitle banner on row 1
      { text: 'Scanned', x: 50, y: 42, width: 52, height: 12, confidence: 95 },
      { text: 'Raster', x: 108, y: 42, width: 42, height: 12, confidence: 94 },
      { text: 'Document', x: 156, y: 42, width: 64, height: 12, confidence: 96 },

      // Header row
      { text: 'SKU', x: 50, y: 70, width: 32, height: 12, confidence: 98 },
      { text: 'Description', x: 160, y: 70, width: 75, height: 12, confidence: 97 },
      { text: 'Qty', x: 360, y: 70, width: 28, height: 12, confidence: 99 },
      { text: 'Total', x: 450, y: 70, width: 42, height: 12, confidence: 98 },

      // Row 1 (multi-word description)
      { text: 'HW-101', x: 50, y: 100, width: 52, height: 12, confidence: 95 },
      { text: 'Rackmount', x: 160, y: 100, width: 70, height: 12, confidence: 94 },
      { text: 'Server', x: 237, y: 100, width: 45, height: 12, confidence: 96 },
      { text: '4', x: 368, y: 100, width: 10, height: 12, confidence: 99 },
      { text: '$5,000.00', x: 446, y: 100, width: 68, height: 12, confidence: 93 },

      // Row 2 (multi-word description)
      { text: 'NW-204', x: 50, y: 130, width: 52, height: 12, confidence: 92 },
      { text: 'Managed', x: 160, y: 130, width: 58, height: 12, confidence: 91 },
      { text: '10GbE', x: 224, y: 130, width: 42, height: 12, confidence: 90 },
      { text: 'Switch', x: 272, y: 130, width: 44, height: 12, confidence: 95 },
      { text: '2', x: 368, y: 130, width: 10, height: 12, confidence: 98 },
      { text: '$5,600.00', x: 446, y: 130, width: 68, height: 12, confidence: 94 },
    ];

    const result = extractTableFromTokens(tokens, {
      sensitivity: 'balanced',
      firstRowAsHeaders: true,
      parseNumbers: true,
      trimCells: true,
      dropEmptyRows: true,
    });

    assert.deepEqual(result.headers, ['SKU', 'Description', 'Qty', 'Total']);
    assert.equal(result.rows.length, 2);
    assert.deepEqual(result.rows[0], ['HW-101', 'Rackmount Server', 4, 5000]);
    assert.deepEqual(result.rows[1], ['NW-204', 'Managed 10GbE Switch', 2, 5600]);
    assert.ok(result.avgConfidence > 90);
  });

  it('parses numbers, currencies, and percentages while preserving IDs and dates', () => {
    assert.equal(parseCellValue('$1,240.50', true), 1240.5);
    assert.equal(parseCellValue('25%', true), 0.25);
    assert.equal(parseCellValue('-42', true), -42);
    assert.equal(parseCellValue('ORD-9021', true), 'ORD-9021');
    assert.equal(parseCellValue('2026-11-26', true), '2026-11-26');
    assert.equal(parseCellValue('$1,240.50', false), '$1,240.50');
  });

  it('parses flexible page range expressions safely', () => {
    assert.deepEqual(parsePageRange('All', 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(parsePageRange('1-3, 5', 6), [1, 2, 3, 5]);
    assert.deepEqual(parsePageRange('4-2, 99', 5), [2, 3, 4]);
    assert.deepEqual(parsePageRange('', 3), [1, 2, 3]);
  });

  it('merges multi-page extracted tables with Source_Page attribution', () => {
    const merged = mergeExtractedPages([
      { pageNumber: 1, headers: ['Item', 'Amount'], rows: [['Server', 5000]] },
      { pageNumber: 2, headers: ['Item', 'Amount'], rows: [['Switch', 2800]] },
    ]);
    assert.deepEqual(merged.headers, ['Source_Page', 'Item', 'Amount']);
    assert.equal(merged.rows.length, 2);
    assert.deepEqual(merged.rows[0], ['Page 1', 'Server', 5000]);
    assert.deepEqual(merged.rows[1], ['Page 2', 'Switch', 2800]);
  });
});
