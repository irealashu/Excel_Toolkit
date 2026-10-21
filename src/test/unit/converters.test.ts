import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tableToMarkdown,
  markdownToTable,
  tableToSql,
  tableToHtml,
  tableToYaml,
  yamlToTable,
  tableToLatex,
} from '../../core/converters/index';

test('tableToMarkdown and markdownToTable roundtrip', () => {
  const headers = ['Name', 'Age', 'City'];
  const rows = [
    ['Alice', 30, 'London'],
    ['Bob', 25, 'Paris'],
  ];

  const md = tableToMarkdown(headers, rows);
  assert.ok(md.includes('| Name | Age | City |'));
  assert.ok(md.includes('| Alice | 30 | London |'));

  const parsed = markdownToTable(md);
  assert.deepEqual(parsed.headers, headers);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0][0], 'Alice');
  assert.equal(parsed.rows[1][2], 'Paris');
});

test('tableToSql produces valid CREATE TABLE and batched INSERT SQL', () => {
  const headers = ['product_id', 'product_name', 'price'];
  const rows = [
    ['P100', 'Office Chair', 199.99],
    ['P200', 'Desk Mat', 29.5],
  ];

  const sql = tableToSql('products', headers, rows, 'postgres');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "products"'));
  assert.ok(sql.includes('INSERT INTO "products" ("product_id", "product_name", "price")'));
  assert.ok(sql.includes("'Office Chair'"));
});

test('tableToYaml and yamlToTable roundtrip', () => {
  const headers = ['SKU', 'Quantity'];
  const rows = [
    ['A-100', 50],
    ['B-200', 80],
  ];

  const yamlStr = tableToYaml(headers, rows);
  assert.ok(yamlStr.includes('SKU: A-100'));
  assert.ok(yamlStr.includes('Quantity: 50'));

  const back = yamlToTable(yamlStr);
  assert.equal(back.headers.length, 2);
  assert.equal(back.rows.length, 2);
});

test('tableToLatex generates booktabs table markup', () => {
  const headers = ['Item', 'Cost'];
  const rows = [
    ['Server', 1200],
    ['Storage', 400],
  ];

  const tex = tableToLatex(headers, rows);
  assert.ok(tex.includes('\\begin{table}'));
  assert.ok(tex.includes('\\textbf{Item} & \\textbf{Cost}'));
  assert.ok(tex.includes('Server & 1200 \\\\'));
  assert.ok(tex.includes('\\end{table}'));
});
