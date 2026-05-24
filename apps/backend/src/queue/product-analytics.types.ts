export type AnalyticsPriceTrend = "up" | "down" | "stable";

export interface ProductAnalyticsJobData {
  productId: string;
  period: string;
  source: string;
  requestedAt: string;
}

export interface ProductAnalyticsJobResult {
  product: {
    id: string;
    productId: string;
  };
  period: string;
  summary: {
    historyPoints: number;
    minPrice: number | null;
    maxPrice: number | null;
    avgPrice: number | null;
    trend: AnalyticsPriceTrend;
    storesCount: number;
    cheapestStore:
      | {
          id: string;
          brand: string;
          city: string;
          effectivePrice: number;
        }
      | null;
  };
  performance: {
    queryDurationMs: number;
  };
  computedAt: string;
}
