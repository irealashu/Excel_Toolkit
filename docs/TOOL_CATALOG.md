# Tool Catalog & Registry

Excel Toolkit registers 20+ specialized client-side data utilities organized into distinct suites:

### 1. Viewers & Editor
- `spreadsheet-viewer`: Virtualized multi-sheet XLSX, XLS, CSV, TSV, and JSON table reader.
- `spreadsheet-editor`: In-browser workbook editor with formula bar, sheets, formatting, and XLSX export.

### 2. Converters
- `csv-to-xlsx`: Convert CSV text files into modern formatted Excel `.xlsx` workbooks.
- `xlsx-to-csv`: Export worksheets from Excel to RFC 4180-compliant CSV files.
- `json-to-xlsx`: Flatten JSON arrays/objects into Excel spreadsheets.
- `xlsx-to-json`: Export spreadsheets to clean JSON objects or JSON Lines (`.jsonl`).
- `markdown-table-converter`: Bi-directional Markdown GFM pipe table converter.
- `sql-insert-converter`: Generate `CREATE TABLE` and batched `INSERT INTO` SQL scripts.
- `html-table-converter`: Scrape HTML table markup into Excel or generate styled HTML tables.
- `yaml-converter`: Bi-directional YAML serialization and spreadsheet conversion.
- `xml-converter`: XML node and attribute parsing into tabular columns.
- `latex-table-converter`: Tabular and booktabs LaTeX syntax generator.

### 3. Data Cleaning
- `remove-duplicates`: Multi-column duplicate detector and scrubber.
- `whitespace-trimmer`: Edge whitespace and non-breaking space trimmer.
- `blank-rows-columns`: Empty rows and columns purger.
- `split-combine-columns`: Delimiter-based column splitting and merging.
- `sort-filter-transform`: Multi-column order and regex row filtering.
- `transpose-unpivot`: Matrix transposition and table melting.
- `find-and-replace`: Global and column-targeted find and replace.
- `data-profiler`: Column data type, null ratio, and numerical statistics analyzer.

### 4. Comparison & Diff
- `workbook-diff`: Side-by-side discrepancy matrix highlighting additions, deletions, and cell edits.
- `table-joiner`: Key-based table joins (Inner, Left Outer, Full Outer).
- `workbook-merger`: Multi-file workbook and worksheet aggregator.

### 5. Formula Utilities
- `formula-generator`: Visual builder for `XLOOKUP`, `VLOOKUP`, `INDEX/MATCH`, `IF`, and `SUMIF`.
- `date-calculator`: Excel serial date (1899-12-30 epoch) converter and day counter.
- `column-converter`: A1 column letters to 1-based index numbers and reverse.

### 6. Visualization & Studio
- `spreadsheet-charts`: Bar, Line, Area, and Pie chart studio with instant grouped summaries.

### 7. Templates Vault
- `spreadsheet-templates`: 15+ pre-formatted models (Operating Budget, Commercial Invoice, Gantt Schedule, P&L, Inventory, Amortization, and Payroll).

### 8. Security & Macro Audit
- `security-inspector`: OpenXML ZIP package inspector, VBA macro (`vbaProject.bin`) audit, and author metadata scrubber.

### 9. Document Utilities
- `document-tools`: Table to iCalendar (`.ics`) and vCard 3.0 (`.vcf`) generator.
