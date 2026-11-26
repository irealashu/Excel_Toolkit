import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  tableToCsv,
  csvToTable,
  tableToTsv,
  tableToJson,
  tableToJsonLines,
  jsonToTable,
  tableToMarkdown,
  markdownToTable,
  tableToSql,
  tableToYaml,
  yamlToTable,
  tableToXml,
  xmlToTable,
  tableToLatex,
  tableToIcs,
  tableToVCard,
} from '../../core/converters/index.ts';

describe('Structured Format Converters', () => {
  const headers = ['ID', 'Name', 'Amount'];
  const rows = [
    ['ORD-1', 'Apex Cloud', 1200],
    ['ORD-2', 'Zenith Ops', 450],
  ];

  it('round-trips CSV, TSV, JSON, and JSONL accurately', () => {
    const csv = tableToCsv(headers, rows);
    const parsedCsv = csvToTable(csv);
    assert.deepEqual(parsedCsv.headers, headers);
    assert.equal(parsedCsv.rows.length, 2);
    assert.equal(parsedCsv.rows[0][2], 1200);

    const tsv = tableToTsv(headers, rows);
    assert.ok(tsv.includes('\t'));

    const json = tableToJson(headers, rows);
    const parsedJson = jsonToTable(json);
    assert.deepEqual(parsedJson.headers, headers);
    assert.equal(parsedJson.rows[1][1], 'Zenith Ops');

    const jsonl = tableToJsonLines(headers, rows);
    const parsedJsonl = jsonToTable(jsonl);
    assert.equal(parsedJsonl.rows.length, 2);
  });

  it('round-trips Markdown, YAML, and XML', () => {
    const md = tableToMarkdown(headers, rows);
    const parsedMd = markdownToTable(md);
    assert.deepEqual(parsedMd.headers, headers);
    assert.equal(parsedMd.rows[0][2], 1200);

    const yml = tableToYaml(headers, rows);
    const parsedYml = yamlToTable(yml);
    assert.deepEqual(parsedYml.headers, headers);
    assert.equal(parsedYml.rows[1][2], 450);

    const xml = tableToXml(headers, rows, 'orders', 'order');
    assert.ok(xml.includes('<orders>'));
    const parsedXml = xmlToTable(xml);
    assert.deepEqual(parsedXml.headers, headers);
    assert.equal(parsedXml.rows.length, 2);
    assert.equal(parsedXml.rows[0][2], 1200);
  });

  it('generates dialect-specific SQL and escaped LaTeX', () => {
    const pgSql = tableToSql('Sales Orders', headers, rows, 'postgres', true);
    assert.ok(pgSql.includes('CREATE TABLE IF NOT EXISTS "sales_orders"'));
    assert.ok(pgSql.includes('"amount" NUMERIC'));

    const mysqlSql = tableToSql('Sales Orders', headers, rows, 'mysql', true);
    assert.ok(mysqlSql.includes('CREATE TABLE IF NOT EXISTS `sales_orders`'));
    assert.ok(mysqlSql.includes('INSERT INTO `sales_orders`'));

    const latex = tableToLatex(['Metric %', 'Cost $'], [['Margin', 50]]);
    assert.ok(latex.includes('Metric \\%'));
    assert.ok(latex.includes('Cost \\$'));
  });

  it('generates iCalendar (.ics) and vCard (.vcf) with accurate counts', () => {
    const ics = tableToIcs(
      ['Title', 'Start', 'Location'],
      [
        ['Budget Review', '2026-12-01T09:00:00Z', 'Room 4A'],
        ['Invalid Row', 'not-a-date', 'Room 4B'],
      ],
      { title: 0, startDate: 1, location: 2 }
    );
    assert.equal(ics.eventCount, 1);
    assert.equal(ics.skippedCount, 1);
    assert.ok(ics.content.includes('SUMMARY:Budget Review'));

    const vcard = tableToVCard(
      ['Name', 'Email', 'Org'],
      [
        ['Sarah Jenkins', 'sarah@apex.io', 'Apex Cloud'],
        ['', 'nobody@apex.io', ''],
      ],
      { name: 0, email: 1, org: 2 }
    );
    assert.equal(vcard.contactCount, 1);
    assert.ok(vcard.content.includes('FN:Sarah Jenkins'));
    assert.ok(vcard.content.includes('ORG:Apex Cloud'));
  });
});
