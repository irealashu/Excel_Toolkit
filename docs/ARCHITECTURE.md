# Excel Toolkit Architecture

## 1. Architectural Philosophy

Excel Toolkit is engineered as an entirely **client-side static web application**. Traditional SaaS spreadsheet and file conversion tools upload user data to remote backends, introducing data governance liabilities, latency, and compliance issues.

Excel Toolkit solves this by executing all data processing inside the user's browser runtime:

```
[ User File (.xlsx, .csv, .json) ]
              │
              ▼
   [ Browser FileReader API ]
              │
              ▼
   [ In-Memory ArrayBuffer ]
              │
    ┌─────────┴─────────┐
    ▼                   ▼
[ SheetJS / Papa ]  [ JSZip Inspection ]
    │                   │
    ▼                   ▼
[ Normalized SheetData & Rows Matrix ]
    │
    ├─► Pure Data Transforms (Dedupe, Blanks, Sort, Filter, Split, Diff)
    ├─► Formula Evaluation & Synthesis (SUM, AVG, MIN, MAX, XLOOKUP)
    ├─► Format Converters (JSON, Markdown, SQL, YAML, LaTeX, ICS, vCard)
    └─► Data Visualization (Recharts Aggregation Matrix)
              │
              ▼
[ Client-Side Blob Generation (URL.createObjectURL) ]
              │
              ▼
[ Instant Local Browser Download ]
```

## 2. Key Subsystems

### A. Format Ingestion & Parsing
- **SheetJS (xlsx)**: Parses binary OpenXML formats (`.xlsx`, `.xlsm`, `.xlsb`, `.xls`) with dates, formula expressions, and multiple worksheets.
- **Papa Parse**: High-performance streaming RFC 4180 CSV parser with automatic delimiter sniffing and type coercion.
- **JSON Parser**: Normalizes nested JSON object arrays into flat tabular schemas with dynamic key extraction.

### B. In-Browser Spreadsheet Editor
- **Decoupled Grid State**: The editor maintains an independent tabular matrix with multi-sheet tabs and undo/redo stacks.
- **Formula Bar & Evaluator**: Evaluates formulas dynamically without `eval()` or `Function()` constructors. Cell references (`A1`, `B2`), ranges (`A1:C10`), and core functions (`SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, arithmetic) recalculate live.

### C. Pure Transforms Engine
Transformations are written as pure functions with deterministic outputs and zero side effects:
- `removeDuplicates(headers, rows, options)`
- `removeBlankRows(rows, threshold)`
- `splitColumn(headers, rows, colIdx, delimiter, newColNames)`
- `compareTables(headersA, rowsA, headersB, rowsB, keyColA, keyColB)`
- `joinTables(headersA, rowsA, headersB, rowsB, keyColA, keyColB, joinType)`

### D. Security & Package Inspection
- **JSZip Stream Scanner**: Reads the OpenXML zip archive directly, locating `xl/vbaProject.bin`, external relationships, and hidden sheets.
- **Scrubber**: Emits new sanitized `.xlsx` packages stripped of VBA binaries and author metadata.

## 3. Network Isolation
Network isolation is enforced:
- Runtime assets are bundled locally by Vite.
- No analytics scripts, cookies, or remote telemetries are instantiated.
- After page load, all operations function normally with network disabled.
