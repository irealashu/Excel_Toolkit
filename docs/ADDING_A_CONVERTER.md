# Adding a New File Converter

Converters transform tabular matrices (headers and rows) into different serialization formats and vice-versa.

## Implementation Pattern
In `src/core/converters/index.ts`:

```ts
export function tableToCustomFormat(
  headers: string[],
  rows: (string | number | boolean | null)[][]
): string {
  // Pure string serialization
}

export function customFormatToTable(
  content: string
): { headers: string[]; rows: (string | number | boolean | null)[][] } {
  // Safe client parsing
}
```

## Safety Checklist
- [ ] No `eval()` or un-sanitized script execution.
- [ ] Proper character escaping (SQL quotes, XML entities, LaTeX special characters).
- [ ] Handle null, undefined, empty cells, and numeric values gracefully.
