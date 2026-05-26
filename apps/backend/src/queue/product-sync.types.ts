export interface ProductSyncJobData {
  productId: string;
  source: string;
  requestedAt: string;
}

export interface ProductSyncJobResult {
  productId: string;
  offersCount: number;
  bestPrice: number | null;
  cpuMetrics: {
    checksum: number;
    durationMs: number;
    usedWorkerThread: boolean;
    threadId: number | null;
    iterations: number;
  };
  processedAt: string;
}
