# Dependency Catalog & Licensing Audit

All third-party libraries utilized in Excel Toolkit have been evaluated for browser compatibility, licensing, bundle efficiency, and client-side isolation.

| Package | Version | Purpose | License | Execution Mode |
| :--- | :--- | :--- | :--- | :--- |
| `react` | ^19.0.0 | Component rendering engine | MIT | Client runtime |
| `react-dom` | ^19.0.0 | Browser DOM bindings | MIT | Client runtime |
| `xlsx` | ^0.18.5 | OpenXML spreadsheet parser & serializer | Apache-2.0 | Browser in-memory |
| `papaparse` | ^5.4.1 | Fast CSV / TSV parser & unparser | MIT | Browser in-memory |
| `jszip` | ^3.10.1 | OpenXML ZIP container stream inspection | MIT | Browser in-memory |
| `js-yaml` | ^4.1.0 | YAML serialization & deserialization | MIT | Browser in-memory |
| `recharts` | ^2.15.0 | SVG charting (Bar, Line, Area, Pie) | MIT | Client SVG |
| `lucide-react`| ^0.546.0| Production iconography | ISC | Client SVG |
| `tailwindcss` | ^4.3.0 | Modern utility design tokens | MIT | Build-time CSS |
| `esbuild` | ^0.25.0 | High-performance bundler | MIT | Development / Build |
| `vite` | ^8.3.0 | Static site build tooling | MIT | Development / Build |
| `tsx` | ^4.21.0 | TypeScript test runner | MIT | Test runner |
| `typescript` | ^7.0.0 | Strict static type checking | Apache-2.0 | Development |

## Prohibited Dependencies
- ❌ No remote AI APIs or backend services.
- ❌ No cloud storage SDKs (AWS S3, Firebase, Supabase).
- ❌ No telemetry, tracking, or session recording scripts.
