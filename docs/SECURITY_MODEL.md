# Security Model

Excel Toolkit enforces a strict client-side security architecture:

## 1. Untrusted File Processing
- **Macro Containment**: Uploaded workbooks containing VBA macros (`.xlsm`, `.xlsb`) are parsed strictly for structure and data. Under no circumstances are VBA scripts executed.
- **Sanitized HTML Parsing**: When parsing HTML tables or rendering previews, input strings are sanitized to eliminate XSS vectors (`<script>`, `onerror`, `javascript:` protocol).
- **Formula Evaluation**: Formulas are evaluated via a safe recursive parser rather than JavaScript's `eval()` or `new Function()`.
- **Zip Expansion Bounds**: ZIP container inspection enforces safety checks against zip-bomb denial of service attacks by validating uncompressed ratios.

## 2. Content Security
- No third-party scripts, remote fonts, or dynamic external workers are fetched at runtime.
- Content Security Policy (CSP) compliant.
- No network transmission of parsed workbook rows, formulas, or metadata.
