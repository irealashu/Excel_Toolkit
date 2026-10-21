import test from 'node:test';
import assert from 'node:assert/strict';
import {
  removeDuplicates,
  removeBlankRows,
  removeBlankColumns,
  trimWhitespace,
  splitColumn,
  combineColumns,
  sortRows,
  filterRows,
  transposeTable,
  findAndReplace,
  profileData,
  compareTables,
  joinTables,
} from '../../core/transforms/index';

test('removeDuplicates removes duplicates correctly while keeping first occurrence', () => {
  const headers = ['ID', 'Name', 'Score'];
  const rows = [
    [1, 'Alice', 95],
    [2, 'Bob', 80],
    [3, 'Alice', 95],
    [4, 'Charlie', 88],
  ];

  const result = removeDuplicates(headers, rows, {
    keyColumns: [1, 2],
    caseSensitive: false,
    keep: 'first',
    trimBeforeCompare: true,
  });

  assert.equal(result.originalCount, 4);
  assert.equal(result.removedCount, 1);
  assert.equal(result.cleanedRows.length, 3);
  assert.equal(result.cleanedRows[0][0], 1);
  assert.equal(result.cleanedRows[1][0], 2);
  assert.equal(result.cleanedRows[2][0], 4);
});

test('removeBlankRows filters out empty or null rows', () => {
  const rows: (string | number | boolean | null)[][] = [
    ['Header1', 'Header2'],
    ['', null],
    ['Val1', 'Val2'],
    [null, null],
  ];

  const cleaned = removeBlankRows(rows, 0.9);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0][0], 'Header1');
  assert.equal(cleaned[1][0], 'Val1');
});

test('trimWhitespace trims leading and trailing spaces and collapses inner spaces', () => {
  const rows = [
    ['   Product A   ', '   120   '],
    ['Multiple    spaces    inside', 'NoSpaces'],
  ];

  const trimmed = trimWhitespace(rows, true);
  assert.equal(trimmed[0][0], 'Product A');
  assert.equal(trimmed[0][1], '120');
  assert.equal(trimmed[1][0], 'Multiple spaces inside');
  assert.equal(trimmed[1][1], 'NoSpaces');
});

test('splitColumn splits a column by delimiter into two columns', () => {
  const headers = ['ID', 'Full_Name', 'Role'];
  const rows = [
    [1, 'John Doe', 'Engineer'],
    [2, 'Jane Smith', 'Designer'],
  ];

  const result = splitColumn(headers, rows, 1, ' ', ['First_Name', 'Last_Name']);
  assert.deepEqual(result.headers, ['ID', 'First_Name', 'Last_Name', 'Role']);
  assert.equal(result.rows[0][1], 'John');
  assert.equal(result.rows[0][2], 'Doe');
  assert.equal(result.rows[1][1], 'Jane');
  assert.equal(result.rows[1][2], 'Smith');
});

test('combineColumns merges columns with a custom separator', () => {
  const headers = ['First', 'Last', 'City'];
  const rows = [
    ['John', 'Doe', 'New York'],
    ['Jane', 'Smith', 'London'],
  ];

  const result = combineColumns(headers, rows, [0, 1], ' ', 'FullName', false);
  assert.equal(result.headers[3], 'FullName');
  assert.equal(result.rows[0][3], 'John Doe');
  assert.equal(result.rows[1][3], 'Jane Smith');
});

test('sortRows sorts numeric and string columns accurately', () => {
  const rows = [
    ['Charlie', 50],
    ['Alice', 100],
    ['Bob', 25],
  ];

  const sortedAlpha = sortRows(rows, 0, 'asc');
  assert.equal(sortedAlpha[0][0], 'Alice');
  assert.equal(sortedAlpha[1][0], 'Bob');
  assert.equal(sortedAlpha[2][0], 'Charlie');

  const sortedNum = sortRows(rows, 1, 'desc', 'number');
  assert.equal(sortedNum[0][1], 100);
  assert.equal(sortedNum[1][1], 50);
  assert.equal(sortedNum[2][1], 25);
});

test('transposeTable inverts rows and columns', () => {
  const headers = ['Quarter', 'Revenue', 'Cost'];
  const rows = [
    ['Q1', 100, 40],
    ['Q2', 150, 60],
  ];

  const transposed = transposeTable(headers, rows);
  assert.equal(transposed.headers.length, 3);
  assert.equal(transposed.headers[0], 'Quarter');
  assert.equal(transposed.headers[1], 'Q1');
  assert.equal(transposed.headers[2], 'Q2');
  assert.equal(transposed.rows[0][0], 'Revenue');
  assert.equal(transposed.rows[0][1], 100);
  assert.equal(transposed.rows[0][2], 150);
});

test('joinTables performs inner and left joins between two datasets', () => {
  const headersA = ['EmpID', 'Name'];
  const rowsA = [
    [1, 'Alice'],
    [2, 'Bob'],
    [3, 'Charlie'],
  ];

  const headersB = ['ID', 'Department'];
  const rowsB = [
    [1, 'Engineering'],
    [2, 'Product'],
    [4, 'Finance'],
  ];

  const leftJoin = joinTables(headersA, rowsA, headersB, rowsB, 0, 0, 'left');
  assert.equal(leftJoin.rows.length, 3);
  assert.equal(leftJoin.rows[0][1], 'Alice');
  assert.equal(leftJoin.rows[0][3], 'Engineering');
  assert.equal(leftJoin.rows[2][1], 'Charlie');
  assert.equal(leftJoin.rows[2][3], null); // Charlie has no department in table B
});
