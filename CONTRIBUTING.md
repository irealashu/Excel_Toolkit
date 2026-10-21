# Contributing to Excel Toolkit

We welcome contributions to expand formula functions, converters, templates, and data cleaning utilities!

## Development Guidelines
1. All spreadsheet processing must remain **100% browser-side**. Do not add backend dependencies or remote API calls.
2. Write unit tests for all new data transformations under `src/test/unit/*.test.ts`.
3. Verify tests with `npx tsx --test src/test/unit/*.test.ts`.
4. Ensure `npm run build` succeeds cleanly before submitting changes.
