# Excel Toolkit

> **Complete Browser-Only Spreadsheet, File Conversion, and Data Utility Platform**

Excel Toolkit is a high-performance, private, client-side spreadsheet engine and data transformation suite. All parsing, calculations, cleanups, matrix manipulations, and format conversions execute **100% inside your browser** using WebAssembly, pure TypeScript, and native Web APIs. No backend servers, no cloud databases, and zero data uploads.

---

## 🌟 Key Features

- **Universal Spreadsheet Viewer & Virtualized Table Preview**: Open XLSX, XLS, XLSM, XLSB, CSV, TSV, and JSON tabular files with instant rendering and pagination.
- **In-Browser Spreadsheet Editor**: Create and edit multi-sheet workbooks, formula bar with live recalculation (`SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, arithmetic), cell formatting (Currency, Percent, Bold, Italic), undo/redo, row/column operations, and XLSX export.
- **Multi-Format Converters**: Convert bi-directionally between CSV, XLSX, JSON, Markdown (GFM tables), SQL INSERT scripts, HTML tables, YAML documents, and LaTeX tabular.
- **Data Cleaning Suite**: Deduplicate rows by key columns, trim whitespace, purge empty rows/columns, split & combine columns, multi-column sorting, regex row filtering, transpose matrix, and column health profiler.
- **Comparison & Diff**: Side-by-side visual spreadsheet diffing with color-coded changes, deletions, additions, and SQL-like table joins (Inner, Left, Full Outer).
- **Formula Utilities & Cheatsheet**: Visual synthesizers for `XLOOKUP`, `VLOOKUP`, `INDEX/MATCH`, `IF`, `SUMIF`, `COUNTIF`, `TEXTJOIN`, Excel date serial converters, and column letter ↔ index mapping.
- **Instant Chart Studio**: Client-side interactive Bar, Line, Area, and Pie visualizations using Recharts with instant grouped aggregations (Sum, Average, Count).
- **Downloadable Template Vault**: 15+ pre-formatted, production-ready spreadsheet models (Monthly Operating Budget, Commercial Invoice, Gantt Schedule, P&L, Inventory Tracker, Loan Amortization, and Payroll).
- **Security & VBA Macro Audit**: Deep inspect OpenXML ZIP packages, detect compiled VBA binaries (`vbaProject.bin`), expose hidden worksheets, and scrub personal author metadata into clean XLSX downloads.
- **Document Utilities**: Generate RFC 5545 iCalendar (`.ics`) schedules and vCard 3.0 (`.vcf`) address books from spreadsheet rows.

---

## 🛡️ Privacy & Security Guarantee

1. **Zero Data Upload**: Your files and formulas are never sent to external servers. All processing executes in client memory.
2. **Ephemeral Lifecycle**: All data is stored in temporary runtime state and destroyed when the session or tab closes.
3. **No AI APIs or Tracking**: No third-party AI APIs, trackers, advertising, or session recorders.
4. **VBA Macro Safety**: Macro-enabled files (`.xlsm`) are safely inspected in memory without executing embedded code.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Development

```bash
# Clone the repository
git clone https://github.com/example/Excel_Toolkit.git
cd Excel_Toolkit

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to interact with the platform.

### Running Unit Tests

```bash
npx tsx --test src/test/unit/*.test.ts
```

### Production Build

```bash
npm run build
```

---

## 📂 Architecture Overview

```
Excel_Toolkit/
├── src/
│   ├── components/      # UI components (Header, Footer, Grid, Dropzone, Workspaces)
│   ├── core/
│   │   ├── files/       # Parse, format detection, downloadBlobs, sampleData
│   │   ├── transforms/  # Pure data transforms (dedupe, blanks, sort, join, diff)
│   │   ├── converters/  # Markdown, SQL, HTML, YAML, LaTeX, ICS, vCard
│   │   ├── formulas/    # Local formula evaluator, generators, date converter
│   │   ├── security/    # ZIP inspection, macro detection, metadata scrubber
│   │   └── templates/   # 15+ pre-formatted XLSX models
│   ├── registry/        # Tool definitions, categories, and search
│   ├── pages/           # Home, Tools directory, Tool page, Privacy, Formats
│   └── test/            # Pure unit tests run via tsx --test
└── docs/                # Architectural guides and documentation
```

---

## 📄 License

MIT License. Free for personal, commercial, and enterprise productivity use.
