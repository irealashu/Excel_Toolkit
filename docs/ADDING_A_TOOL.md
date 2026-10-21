# Adding a New Tool to Excel Toolkit

To introduce a new spreadsheet or data processing tool:

1. **Register the Tool Definition**:
   Open `src/registry/toolRegistry.ts` and add your entry to `TOOLS`:
   ```ts
   {
     id: 'custom-tool',
     slug: 'custom-tool',
     name: 'My Custom Tool',
     description: 'Tool purpose and capabilities...',
     category: 'cleaning',
     searchKeywords: ['keyword1', 'keyword2'],
     acceptedFormats: ['.xlsx', '.csv'],
     outputFormats: ['.xlsx', '.csv'],
     processingMode: 'client-main',
     capabilities: ['Capability 1', 'Capability 2'],
     implementationStatus: 'implemented',
   }
   ```

2. **Write the Pure Transformation Logic**:
   Place pure transformation functions in `src/core/transforms/` or `src/core/converters/`. Ensure deterministic outputs without external API calls.

3. **Add Unit Tests**:
   Add test coverage in `src/test/unit/*.test.ts` using `node:test` and `node:assert/strict`. Run:
   ```bash
   npm test
   ```

4. **Integrate into the Corresponding Workspace**:
   Connect the tool into its category workspace (e.g. `CleaningWorkspace.tsx` or `ConverterWorkspace.tsx`).
