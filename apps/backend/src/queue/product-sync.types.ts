export interface ProductSyncJobData {
  productId: string;
  source: string;
  requestedAt: string;
}

export interface ProductSyncJobResult {
  productId: string;
  offersCount: number;
  bestPrice: number | null;
  processedAt: string;
}
