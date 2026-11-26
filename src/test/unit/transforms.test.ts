import { describe, it } from 'node:test';
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
  unpivotTable,
  findAndReplace,
  profileData,
  compareTables,
  joinTables,
  mergeTablesStack,
} from '../../core/transforms/index.ts';

describe('Data Transforms Engine', () => {
  it('removes duplicates with specific key columns and keeps first or last', () => {
    const headers = ['ID', 'Name', 'Amount'];
    const rows = [
      ['1', 'Alice', 100],
      ['2', 'Bob', 200],
      ['1', 'Alice Updated', 150],
    ];
    const keepFirst = removeDuplicates(headers, rows, {
      keyColumns: [0],
      caseSensitive: false,
      keep: 'first',
      trimBeforeCompare: true,
    });
    assert.equal(keepFirst.removedCount, 1);
    assert.equal(keepFirst.cleanedRows[0][1], 'Alice');

    const keepLast = removeDuplicates(headers, rows, {
      keyColumns: [0],
      caseSensitive: false,
      keep: 'last',
      trimBeforeCompare: true,
    });
    assert.equal(keepLast.removedCount, 1);
    assert.equal(keepLast.cleanedRows[1][1], 'Alice Updated');
  });

  it('trims whitespace and purges blank rows and blank columns', () => {
    const trimmed = trimWhitespace([['  hello   world  ', 42]], true);
    assert.equal(trimmed[0][0], 'hello world');

    const cleanedRows = removeBlankRows([
      ['A', 'B'],
      ['', null],
      ['C', 'D'],
    ]);
    assert.equal(cleanedRows.length, 2);

    const cleanedCols = removeBlankColumns(
      ['Keep', 'EmptyCol', 'AlsoKeep'],
      [
        ['1', null, 'x'],
        ['2', '   ', 'y'],
      ]
    );
    assert.deepEqual(cleanedCols.headers, ['Keep', 'AlsoKeep']);
    assert.equal(cleanedCols.rows[0].length, 2);
  });

  it('splits and combines columns cleanly', () => {
    const splitRes = splitColumn(['FullName', 'Role'], [['Jane Doe', 'Engineer']], 0, ' ', ['First', 'Last']);
    assert.deepEqual(splitRes.headers, ['First', 'Last', 'Role']);
    assert.deepEqual(splitRes.rows[0], ['Jane', 'Doe', 'Engineer']);

    const combined = combineColumns(splitRes.headers, splitRes.rows, [0, 1], ' ', 'Full_Name', true);
    assert.deepEqual(combined.headers, ['Role', 'Full_Name']);
    assert.deepEqual(combined.rows[0], ['Engineer', 'Jane Doe']);
  });

  it('sorts, filters, finds & replaces with regex, and profiles columns', () => {
    const rows = [
      ['North', 300],
      ['South', 100],
      ['North', 200],
    ];
    const sorted = sortRows(rows, 1, 'desc');
    assert.equal(sorted[0][1], 300);
    assert.equal(sorted[2][1], 100);

    const filtered = filterRows(rows, [
      { colIndex: 0, operator: 'equals', value: 'north' },
      { colIndex: 1, operator: 'greater_than', value: '250' },
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0][1], 300);

    const replaced = findAndReplace(rows, '^North$', 'NA', {
      targetColIndex: 0,
      matchCase: true,
      exactMatch: false,
      useRegex: true,
    });
    assert.equal(replaced.replacementCount, 2);
    assert.equal(replaced.rows[0][0], 'NA');

    const profile = profileData(['Region', 'Sales'], rows);
    assert.equal(profile[1].inferredType, 'number');
    assert.equal(profile[1].numericStats?.sum, 600);
    assert.equal(profile[1].numericStats?.avg, 200);
  });

  it('transposes and unpivots wide tables to long format', () => {
    const headers = ['Product', 'Q1', 'Q2'];
    const rows = [
      ['Widget', 10, 20],
      ['Gadget', 30, 40],
    ];
    const transposed = transposeTable(headers, rows);
    assert.deepEqual(transposed.headers, ['Product', 'Widget', 'Gadget']);
    assert.equal(transposed.rows.length, 2);

    const unpivoted = unpivotTable(headers, rows, [0], 'Quarter', 'Units');
    assert.deepEqual(unpivoted.headers, ['Product', 'Quarter', 'Units']);
    assert.equal(unpivoted.rows.length, 4);
    assert.deepEqual(unpivoted.rows[0], ['Widget', 'Q1', 10]);
    assert.deepEqual(unpivoted.rows[3], ['Gadget', 'Q2', 40]);
  });

  it('compares, joins, and stacks multiple tables', () => {
    const headers = ['ID', 'Status'];
    const a = [
      ['1', 'Open'],
      ['2', 'Open'],
    ];
    const b = [
      ['1', 'Closed'],
      ['3', 'Open'],
    ];
    const diff = compareTables(headers, a, headers, b, 0, 0);
    assert.equal(diff.modifiedCount, 1);
    assert.equal(diff.removedCount, 1);
    assert.equal(diff.addedCount, 1);

    const joined = joinTables(['ID', 'Name'], [['1', 'Apex'], ['2', 'Beta']], ['ID', 'Country'], [['1', 'US']], 0, 0, 'left');
    assert.deepEqual(joined.headers, ['ID', 'Name', 'ID_2', 'Country']);
    assert.equal(joined.rows.length, 2);
    assert.equal(joined.rows[0][3], 'US');
    assert.equal(joined.rows[1][3], null);

    const stacked = mergeTablesStack(
      [
        { name: 'Jan', headers: ['SKU', 'Qty'], rows: [['A', 5]] },
        { name: 'Feb', headers: ['SKU', 'Price'], rows: [['B', 99]] },
      ],
      true
    );
    assert.deepEqual(stacked.headers, ['Source_Sheet', 'SKU', 'Qty', 'Price']);
    assert.equal(stacked.rows.length, 2);
    assert.deepEqual(stacked.rows[0], ['Jan', 'A', 5, null]);
    assert.deepEqual(stacked.rows[1], ['Feb', 'B', null, 99]);
  });
});
