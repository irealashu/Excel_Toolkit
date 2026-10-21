# Adding a New Data Processor

Data processors take an incoming 2D matrix or workbook structure and return transformed tabular rows or profile metrics.

## Guidelines
1. Accept `(headers: string[], rows: (string | number | boolean | null)[][], options: CustomOptions)`.
2. Keep transformations pure: do not mutate input arrays directly. Always return new arrays or shallow copies.
3. Handle empty datasets, single-column datasets, and unexpected string types safely.
4. Provide comprehensive unit tests covering standard values, empty cells, and edge cases.
