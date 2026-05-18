/**
 * Meilisearch-related types and interfaces
 */

export interface MeilisearchProduct {
  id: string;
  productId: string;
  canonicalName: string;
  brand: string | null;
  category: string;
  categoryId: string;
  media: string;
  description: string | null;
  bestPrice: number | null;
  oldPrice: number | null;
  discountPercent: number | null;
  currency: "UAH";
  offersCount: number;
  storeNames: string[];
  updatedAt: number; // Unix timestamp for sorting
}

export interface MeilisearchIndexStats {
  numberOfDocuments: number;
  isIndexing: boolean;
  lastUpdate: number;
}

export interface MeilisearchHealthStatus {
  status: "healthy" | "unhealthy";
  message: string;
  version?: string;
}

export interface MeilisearchBatchIndexParams {
  documents: MeilisearchProduct[];
  primaryKey?: string;
}

export interface IndexationTask {
  taskUid: number;
  indexUid: string;
  status: "enqueued" | "processing" | "succeeded" | "failed";
  type: "documentAdditionOrUpdate" | "documentDeletion" | "indexCreation";
  duration?: number;
  enqueuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: {
    message: string;
    code: string;
    type: string;
    link: string;
  };
}
