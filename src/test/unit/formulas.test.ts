import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  colLetterToIndex,
  indexToColLetter,
  excelSerialToDate,
  dateToExcelSerial,
  evaluateFormula,
  evaluateGrid,
  generateFormula,
} from '../../core/formulas/index.ts';

describe('Formula Engine & Utilities', () => {
  it('converts column letters to 1-based indices and back', () => {
    assert.equal(colLetterToIndex('A'), 1);
    assert.equal(colLetterToIndex('Z'), 26);
    assert.equal(colLetterToIndex('AA'), 27);
    assert.equal(colLetterToIndex('XFD'), 16384);
    assert.equal(indexToColLetter(1), 'A');
    assert.equal(indexToColLetter(26), 'Z');
    assert.equal(indexToColLetter(27), 'AA');
    assert.equal(indexToColLetter(16384), 'XFD');
  });

  it('converts Excel serial dates to UTC ISO dates and back', () => {
    const date = excelSerialToDate(45292);
    assert.equal(date.toISOString().split('T')[0], '2024-01-01');
    const back = dateToExcelSerial(new Date(Date.UTC(2024, 0, 1)));
    assert.equal(back, 45292);
  });

  it('evaluates chained dependent formulas recursively via evaluateGrid', () => {
    const grid = [
      ['SKU', 'Product', 'Qty', 'Price', 'Revenue'],
      ['PRD-101', 'Enterprise Suite', 150, 1200, '=C2*D2'],
      ['PRD-102', 'Analytics Node', 310, 2400, '=C3*D3'],
      ['PRD-103', 'Cloud Connector', 420, 450, '=C4*D4'],
      ['PRD-104', 'Security Audit Kit', 95, 820, '=C5*D5'],
      ['Total', '', '=SUM(C2:C5)', '=AVERAGE(D2:D5)', '=SUM(E2:E5)'],
    ];

    const evaluated = evaluateGrid(grid);
    assert.equal(evaluated[1][4], 180000);
    assert.equal(evaluated[2][4], 744000);
    assert.equal(evaluated[3][4], 189000);
    assert.equal(evaluated[4][4], 77900);
    assert.equal(evaluated[5][2], 975);
    assert.equal(evaluated[5][3], 1217.5);
    assert.equal(evaluated[5][4], 1190900);
  });

  it('respects operator precedence, parentheses, division by zero, and cycle detection', () => {
    const grid = [
      [10, 20, 0],
      ['=A1+B1*2', '=(A1+B1)*2', '=A1/C1'],
      ['=B3+1', '=A3+1', null],
    ];
    const evaluated = evaluateGrid(grid);
    assert.equal(evaluated[1][0], 50);
    assert.equal(evaluated[1][1], 60);
    assert.equal(evaluated[1][2], '#DIV/0!');
    assert.equal(evaluated[2][0], '#CYCLE!');
    assert.equal(evaluated[2][1], '#CYCLE!');
  });

  it('evaluates IF, SUMIF, COUNTIF, MEDIAN, and TEXTJOIN functions', () => {
    const grid = [
      ['North', 100],
      ['South', 250],
      ['North', 400],
      ['East', 150],
    ];
    assert.equal(evaluateFormula('=IF(B2>200, "High", "Low")', grid), 'High');
    assert.equal(evaluateFormula('=IF(B1>200, "High", "Low")', grid), 'Low');
    assert.equal(evaluateFormula('=SUMIF(A1:A4, "North", B1:B4)', grid), 500);
    assert.equal(evaluateFormula('=COUNTIF(B1:B4, ">=150")', grid), 3);
    assert.equal(evaluateFormula('=MEDIAN(B1:B4)', grid), 200);
    assert.equal(evaluateFormula('=TEXTJOIN(", ", TRUE, A1:A4)', grid), 'North, South, North, East');
  });

  it('generates valid syntax for all 7 supported formula types', () => {
    assert.equal(
      generateFormula({
        type: 'xlookup',
        params: { lookupValue: 'A2', lookupArray: 'B:B', returnArray: 'C:C', ifNotFound: 'Missing' },
      }).formula,
      '=XLOOKUP(A2, B:B, C:C, "Missing", 0)'
    );
    assert.equal(
      generateFormula({
        type: 'index_match',
        params: { returnRange: 'C:C', lookupValue: 'A2', lookupRange: 'B:B' },
      }).formula,
      '=INDEX(C:C, MATCH(A2, B:B, 0))'
    );
    assert.equal(
      generateFormula({
        type: 'sumif',
        params: { range: 'A2:A10', criteria: '">50"', sumRange: 'B2:B10' },
      }).formula,
      '=SUMIF(A2:A10, ">50", B2:B10)'
    );
    assert.equal(
      generateFormula({
        type: 'textjoin',
        params: { delimiter: '"-"', ignoreEmpty: 'true', textRange: 'A2:C2' },
      }).formula,
      '=TEXTJOIN("-", TRUE, A2:C2)'
    );
  });
});
