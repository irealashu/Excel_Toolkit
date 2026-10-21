# Formula Engine Compatibility

Excel Toolkit provides a built-in browser formula calculation and generator engine.

## Supported In-Grid Formulas
- **Mathematical**: `SUM(range)`, `ROUND(val, dec)`, `ABS(val)`, `+`, `-`, `*`, `/`
- **Statistical**: `AVERAGE(range)`, `MIN(range)`, `MAX(range)`, `COUNT(range)`, `COUNTA(range)`
- **Text**: `CONCAT(...)`, `CONCATENATE(...)`, `UPPER(ref)`, `LOWER(ref)`, `TRIM(ref)`
- **Cell References**: Single cell (`A1`, `B2`), range rectangles (`A1:C10`), relative arithmetic (`=A1*B1`)

## Visual Formula Synthesizers
- **XLOOKUP**: Full bidirectional lookup with exact match mode, lookup array, return array, and if_not_found fallback.
- **VLOOKUP**: Classic column index lookup with exact match flag (`FALSE`).
- **INDEX/MATCH**: 2-way dynamic matrix lookup combining row index matching with range value retrieval.
- **IF / IFS**: Logical branching conditions with custom True/False values.
- **SUMIF / SUMIFS**: Single and multi-criteria summation.
- **COUNTIF / COUNTIFS**: Criteria-based counting.
- **TEXTJOIN**: Multi-string joining with configurable delimiters and ignore_empty flags.
