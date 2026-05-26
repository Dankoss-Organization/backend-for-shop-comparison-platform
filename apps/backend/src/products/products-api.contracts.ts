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

export interface GetProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  categoryId?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  minRating?: number;
  inStock?: boolean;
  sort?: "updated" | "name" | "price_asc" | "price_desc" | "discount";
}

export interface GetCategoriesQuery {
  parentId?: string;
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

export interface EnqueueProductAnalyticsRequest {
  source?: string;
  period?: string;
}

export interface EnqueueProductAnalyticsResponse {
  queue: string;
  jobName: string;
  jobId: string;
  status: "queued";
  createdAt: string;
}

export interface ProductAnalyticsJobStatusResponse {
  queue?: string;
  jobId: string;
  name?: string;
  status: string;
  attemptsMade?: number;
  data?: {
    productId: string;
    period: string;
    source: string;
    requestedAt: string;
  };
  result?: {
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
      trend: PriceTrend;
      storesCount: number;
      cheapestStore: {
        id: string;
        brand: string;
        city: string;
        effectivePrice: number;
      } | null;
    };
    performance: {
      queryDurationMs: number;
    };
    computedAt: string;
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

export interface ProductCatalogItem {
  id: string;
  productId: string;
  canonicalName: string;
  brand: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  media: string;
  description: string | null;
  bestPrice: number | null;
  oldPrice: number | null;
  discountPercent: number | null;
  currency: "UAH";
  offersCount: number;
  availabilityStatus: AvailabilityStatus;
  updatedAt: string;
}

export interface ProductCatalogResponse {
  items: ProductCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  productCount: number;
  children: CategoryTreeNode[];
}

export interface CategoriesResponse {
  categories: CategoryTreeNode[];
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
