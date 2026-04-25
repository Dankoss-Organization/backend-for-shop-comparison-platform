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

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly payload?: ApiErrorResponse | unknown;

  constructor(statusCode: number, message: string, payload?: ApiErrorResponse | unknown) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export interface ProductsApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class ProductsApiClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ProductsApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getProductCard(id: string): Promise<ProductCardResponse> {
    return this.request<ProductCardResponse>(`/api/v1/products/${encodeURIComponent(id)}/card`);
  }

  getProductOffers(
    id: string,
    query: GetProductOffersQuery = {},
  ): Promise<ProductOffersResponse> {
    return this.request<ProductOffersResponse>(
      `/api/v1/products/${encodeURIComponent(id)}/offers${toQueryString(query)}`,
    );
  }

  getProductPriceHistory(
    id: string,
    query: GetProductPriceHistoryQuery = {},
  ): Promise<ProductPriceHistoryResponse> {
    return this.request<ProductPriceHistoryResponse>(
      `/api/v1/products/${encodeURIComponent(id)}/price-history${toQueryString(query)}`,
    );
  }

  getRelatedProducts(
    id: string,
    query: GetRelatedProductsQuery = {},
  ): Promise<RelatedProductsResponse> {
    return this.request<RelatedProductsResponse>(
      `/api/v1/products/${encodeURIComponent(id)}/related${toQueryString(query)}`,
    );
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${stripTrailingSlash(this.options.baseUrl)}${path}`);
    const text = await response.text();

    let payload: unknown = undefined;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const defaultMessage = `Request failed with status ${response.status}`;
      const apiMessage =
        typeof payload === "object" && payload !== null && "message" in payload
          ? String((payload as ApiErrorResponse).message)
          : defaultMessage;

      throw new ApiClientError(response.status, apiMessage, payload);
    }

    return payload as T;
  }
}

function toQueryString<T extends object>(query: T): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined) {
      continue;
    }

    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
