export type ToolCategory =
  | 'viewers'
  | 'editor'
  | 'converters'
  | 'cleaning'
  | 'comparison'
  | 'formulas'
  | 'visualization'
  | 'templates'
  | 'security'
  | 'documents';

export interface CategoryDefinition {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export type ProcessingMode = 'client-worker' | 'client-main' | 'instant';

export type ImplementationStatus = 'implemented' | 'partial' | 'planned';

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  searchKeywords: string[];
  acceptedFormats: string[];
  outputFormats: string[];
  processingMode: ProcessingMode;
  capabilities: string[];
  implementationStatus: ImplementationStatus;
  knownLimitations?: string[];
  relatedToolIds?: string[];
  badge?: string;
  featured?: boolean;
}

export interface ParseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: {
    rowCount?: number;
    colCount?: number;
    sheetNames?: string[];
    fileSizeBytes?: number;
    detectedFormat?: string;
    executionTimeMs?: number;
  };
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  totalRows: number;
  totalCols: number;
}

export interface WorkbookData {
  fileName: string;
  fileSizeBytes: number;
  activeSheetIndex: number;
  sheets: SheetData[];
  metadata?: {
    author?: string;
    created?: string;
    modified?: string;
    application?: string;
    hasMacros?: boolean;
    isEncrypted?: boolean;
  };
}
