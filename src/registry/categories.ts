import { CategoryDefinition, ToolCategory } from './types';

export const CATEGORIES: Record<ToolCategory, CategoryDefinition> = {
  viewers: {
    id: 'viewers',
    name: 'Spreadsheet Viewers',
    description: 'Inspect XLSX, XLS, CSV, TSV, and JSON tabular files with instant virtualization.',
    icon: 'Eye',
    color: 'emerald',
  },
  editor: {
    id: 'editor',
    name: 'Spreadsheet Editor',
    description: 'Full in-browser workbook editor with formulas, cell formatting, sheets, and XLSX export.',
    icon: 'Table',
    color: 'blue',
  },
  converters: {
    id: 'converters',
    name: 'File Converters',
    description: 'Convert seamlessly between CSV, XLSX, JSON, XML, Markdown, SQL, YAML, HTML, and LaTeX.',
    icon: 'ArrowLeftRight',
    color: 'indigo',
  },
  cleaning: {
    id: 'cleaning',
    name: 'Data Cleaning & Prep',
    description: 'Deduplicate, trim whitespace, remove blank rows, split columns, filter, and normalize.',
    icon: 'Sparkles',
    color: 'amber',
  },
  comparison: {
    id: 'comparison',
    name: 'Comparison & Diff',
    description: 'Side-by-side workbook diffing, column-level discrepancies, and key-based table joins.',
    icon: 'GitCompare',
    color: 'rose',
  },
  formulas: {
    id: 'formulas',
    name: 'Formula Utilities',
    description: 'Generators for VLOOKUP, XLOOKUP, IF, INDEX/MATCH, SUMIF, plus reference cheatsheet.',
    icon: 'Calculator',
    color: 'purple',
  },
  visualization: {
    id: 'visualization',
    name: 'Charts & Analysis',
    description: 'Bar, line, pie, and scatter charts with grouped summaries and instant profiling.',
    icon: 'BarChart3',
    color: 'cyan',
  },
  templates: {
    id: 'templates',
    name: 'Spreadsheet Templates',
    description: 'Download ready-made, pre-formatted XLSX models for budget, invoicing, project, and CRM.',
    icon: 'FileSpreadsheet',
    color: 'teal',
  },
  security: {
    id: 'security',
    name: 'Security & Inspection',
    description: 'Inspect macros, remove hidden metadata, unpack XLSX ZIP archives, and diagnose corruption.',
    icon: 'ShieldCheck',
    color: 'orange',
  },
  documents: {
    id: 'documents',
    name: 'Document Utilities',
    description: 'Extract tables from DOCX and PDF, generate vCard and iCalendar schedules, and sanitize data.',
    icon: 'FileText',
    color: 'pink',
  },
};
