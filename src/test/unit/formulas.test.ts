import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colLetterToIndex,
  indexToColLetter,
  excelSerialToDate,
  dateToExcelSerial,
  evaluateFormula,
  generateFormula,
} from '../../core/formulas/index';

test('colLetterToIndex converts letters to 1-based index numbers correctly', () => {
  assert.equal(colLetterToIndex('A'), 1);
  assert.equal(colLetterToIndex('Z'), 26);
  assert.equal(colLetterToIndex('AA'), 27);
  assert.equal(colLetterToIndex('AB'), 28);
  assert.equal(colLetterToIndex('AZ'), 52);
  assert.equal(colLetterToIndex('BA'), 53);
});

test('indexToColLetter converts 1-based numbers to letters', () => {
  assert.equal(indexToColLetter(1), 'A');
  assert.equal(indexToColLetter(26), 'Z');
  assert.equal(indexToColLetter(27), 'AA');
  assert.equal(indexToColLetter(28), 'AB');
  assert.equal(indexToColLetter(53), 'BA');
});

test('excelSerialToDate and dateToExcelSerial roundtrip accurately', () => {
  // Jan 1, 2026 is serial 46023
  const date = new Date(2026, 0, 1);
  const serial = dateToExcelSerial(date);
  assert.ok(serial > 45000);

  const restored = excelSerialToDate(serial);
  assert.equal(restored.getFullYear(), 2026);
  assert.equal(restored.getMonth(), 0);
  assert.equal(restored.getDate(), 1);
});

test('evaluateFormula executes SUM, AVERAGE, MIN, MAX, and basic arithmetic', () => {
  const grid = [
    [10, 20, 30],
    [5, 15, 25],
    [100, 200, 300],
  ];

  assert.equal(evaluateFormula('=SUM(A1:C1)', grid), 60);
  assert.equal(evaluateFormula('=SUM(A1:A3)', grid), 115);
  assert.equal(evaluateFormula('=AVERAGE(A1:C1)', grid), 20);
  assert.equal(evaluateFormula('=MIN(A1:C3)', grid), 5);
  assert.equal(evaluateFormula('=MAX(A1:C3)', grid), 300);
  assert.equal(evaluateFormula('=A1+B1', grid), 30);
  assert.equal(evaluateFormula('=A1*2', grid), 20);
});

test('generateFormula synthesizes valid Excel formula strings and explanations', () => {
  const vlookup = generateFormula({
    type: 'vlookup',
    params: { lookupValue: 'B2', tableRange: 'Data!$A$2:$F$100', colIndex: '4', exactMatch: 'true' },
  });
  assert.equal(vlookup.formula, '=VLOOKUP(B2, Data!$A$2:$F$100, 4, FALSE)');
  assert.ok(vlookup.explanation.includes('Searches for the value in B2'));

  const xlookup = generateFormula({
    type: 'xlookup',
    params: { lookupValue: 'A1', lookupArray: 'Catalog!$A$1:$A$50', returnArray: 'Catalog!$C$1:$C$50', ifNotFound: 'Missing' },
  });
  assert.equal(xlookup.formula, '=XLOOKUP(A1, Catalog!$A$1:$A$50, Catalog!$C$1:$C$50, "Missing", 0)');
});
