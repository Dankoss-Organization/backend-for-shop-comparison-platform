import {
  ApiErrorResponse,
  GetProductOffersQuery,
  GetProductPriceHistoryQuery,
  GetRelatedProductsQuery,
  ProductCardResponse,
  ProductOffersResponse,
  ProductPriceHistoryResponse,
  RelatedProductsResponse,
} from "./products-api.contracts";

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

export class ProductsApiClient {
  constructor(private readonly baseUrl: string) {}

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
    const response = await fetch(`${stripTrailingSlash(this.baseUrl)}${path}`);
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
