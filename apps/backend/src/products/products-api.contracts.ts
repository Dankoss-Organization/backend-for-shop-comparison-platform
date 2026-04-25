export type OffersSort = "price" | "discount" | "updated";
export type AvailabilityStatus = "in_stock" | "out_of_stock";
export type PriceTrend = "up" | "down" | "stable";

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface GetProductOffersQuery {
  sort?: OffersSort;
  inStock?: boolean;
}

export interface GetProductPriceHistoryQuery {
  period?: string;
}

export interface GetRelatedProductsQuery {
  limit?: number;
}

export interface EnqueueProductSyncRequest {
  source?: string;
}

export interface EnqueueProductSyncResponse {
  queue: string;
  jobName: string;
  jobId: string;
  status: "queued";
  createdAt: string;
}

export interface ProductSyncJobStatusResponse {
  queue?: string;
  jobId: string;
  name?: string;
  status: string;
  attemptsMade?: number;
  data?: {
    productId: string;
    source: string;
    requestedAt: string;
  };
  result?: {
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
  } | null;
  failedReason?: string | null;
  createdAt?: string | null;
  processedAt?: string | null;
  finishedAt?: string | null;
}

export interface ProductOfferItem {
  id: string;
  store: {
    id: string;
    brand: string;
    city: string;
    address: string;
  };
  currentPrice: number;
  discountPrice: number | null;
  effectivePrice: number;
  oldPrice: number;
  discountPercent: number | null;
  availability: "in_stock";
  updatedAt: string;
}

export interface ProductCardResponse {
  product: {
    id: string;
    productId: string;
    canonicalName: string;
    brand: string | null;
    category: string | null;
    media: string;
    description: string | null;
    measurements: Record<string, unknown>;
    calories: string | null;
  };
  pricingSummary: {
    bestPrice: number | null;
    oldPrice: number | null;
    discountPercent: number | null;
    currency: "UAH";
  };
  topOffers: ProductOfferItem[];
  stats: {
    priceTrend: PriceTrend;
    minPrice30d: number | null;
    maxPrice30d: number | null;
    avgPrice30d: number | null;
  };
  badges: string[];
  availabilityStatus: AvailabilityStatus;
  userContext: {
    favorite: boolean;
    inComparison: boolean;
    inCart: boolean;
  };
  meta: {
    fetchedAt: string;
    cacheTtlSeconds: number;
  };
}

export interface ProductOffersResponse {
  productId: string;
  offers: ProductOfferItem[];
  total: number;
}

export interface ProductPriceHistoryResponse {
  productId: string;
  period: string;
  points: Array<{
    date: string;
    price: number;
    regularPrice: number;
    store: {
      id: string;
      brand: string;
      city: string;
    };
  }>;
  stats: {
    minPrice: number | null;
    maxPrice: number | null;
    avgPrice: number | null;
    trend: PriceTrend;
  };
}

export interface RelatedProductsResponse {
  productId: string;
  related: Array<{
    id: string;
    productId: string;
    canonicalName: string;
    brand: string | null;
    media: string;
    bestPrice: number | null;
    offersCount: number;
  }>;
}
