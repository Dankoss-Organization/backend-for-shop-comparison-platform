/**
 * Search index sync related types
 */

export interface SearchIndexSyncJobData {
  productId: string;
  action: "index" | "delete";
  timestamp: string;
}

export interface SearchIndexSyncJobResult {
  productId: string;
  action: "index" | "delete";
  indexed: boolean;
  taskId?: number;
  error?: string;
  processingTimeMs: number;
}
