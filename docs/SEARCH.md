# Search Module

Search is the NestJS boundary around Meilisearch in this codebase. It owns the module wiring, client bootstrap, index creation, index tuning, and the API layer that turns request DTOs into Meilisearch queries.

## What Lives Here

- [apps/backend/src/search/meilisearch.module.ts](../apps/backend/src/search/meilisearch.module.ts) wires the controller and service into NestJS.
- [apps/backend/src/search/meilisearch.service.ts](../apps/backend/src/search/meilisearch.service.ts) creates the Meilisearch client, initializes the index, and executes search operations.
- [apps/backend/src/search/search.controller.ts](../apps/backend/src/search/search.controller.ts) exposes the HTTP endpoints.
- [apps/backend/src/search/dto/search-query.dto.ts](../apps/backend/src/search/dto/search-query.dto.ts) and [apps/backend/src/search/dto/search-filter.dto.ts](../apps/backend/src/search/dto/search-filter.dto.ts) define query validation and transformation.
- [apps/backend/src/search/dto/search-facets.dto.ts](../apps/backend/src/search/dto/search-facets.dto.ts) defines the faceted search response.
- [apps/backend/src/search/types/meilisearch.types.ts](../apps/backend/src/search/types/meilisearch.types.ts) defines the indexed document shape and task metadata.
- [apps/backend/src/queue/product-sync.processor.ts](../apps/backend/src/queue/product-sync.processor.ts) is the worker-side producer of indexed documents.

## Internal Architecture

The Search module is intentionally thin. It does not own product extraction or data synchronization logic. Instead, it bridges three layers:

1. The API layer receives search requests and validates parameters.
2. The Search service translates requests into Meilisearch calls and keeps the index ready.
3. The queue worker prepares product documents and pushes them into the search index.

### Startup Lifecycle

On module startup, `MeilisearchService` performs the following steps:

1. Reads `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, and `MEILISEARCH_INDEX_NAME`.
2. Detects test mode through `APP_ENV` or `NODE_ENV` and disables Meilisearch access entirely in tests.
3. Falls back to `http://127.0.0.1:7700` when `MEILISEARCH_HOST` is not set, which keeps local development working even when the environment file is incomplete.
4. Creates the Meilisearch client.
5. Calls `initializeIndex()` during `onModuleInit()`.
6. Creates the index if it does not exist and applies the index settings used by the application.

### Request Flow

For a typical search request, the flow looks like this:

1. Controller validates the query DTO.
2. The controller normalizes pagination and sorting input.
3. The service calls `index.search()` with `limit`, `offset`, `filter`, and `sort`.
4. The controller shapes the response into the API DTO with pagination metadata.

Advanced search follows the same path, but the controller also builds a Meilisearch filter expression from nested filters and requests facets.

### Indexing Flow

Indexing is worker-driven:

1. Product synchronization happens in the queue worker.
2. The worker builds `MeilisearchProduct` documents.
3. The service adds or updates documents in the configured index.
4. Meilisearch applies the configured settings and makes the data searchable.

This keeps indexing off the request path and avoids coupling search latency to database writes.

## Configuration

The Search module currently relies on a small set of environment variables.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MEILISEARCH_HOST` | No | `http://127.0.0.1:7700` in local development | Meilisearch base URL. If unset, the service logs a warning and uses the local fallback. |
| `MEILISEARCH_API_KEY` | No | unset | API key used when the Meilisearch instance is protected. |
| `MEILISEARCH_INDEX_NAME` | No | `products` | Target index name used by the service and worker. |
| `APP_ENV` / `NODE_ENV` | No | unset | If either resolves to `test`, the service disables Meilisearch initialization and client calls. |

Important behavior:

- The fallback host only applies when `MEILISEARCH_HOST` is missing.
- Test mode short-circuits the service before the client is created.
- The default index name is `products`, so docs and local setup should use that unless the deployment intentionally overrides it.

### Index Settings Applied at Startup

The service applies the following settings during initialization:

- `searchableAttributes`: `canonicalName`, `brand`, `description`, `category`
- `filterableAttributes`: `category`, `categoryId`, `brand`, `storeNames`, `bestPrice`, `currency`
- `sortableAttributes`: `bestPrice`, `discountPercent`, `updatedAt`
- `typoTolerance`: enabled, with `oneTypo = 5` and `twoTypos = 9`
- `pagination.maxTotalHits`: `10000`

These settings are the source of truth for how search ranking, filtering, sorting, typo handling, and pagination behave.

## API Surface

The search controller exposes the following endpoints under `api/v1/search`:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/search` | Basic full-text search with optional `filter`, `sort`, `limit`, and `offset`. |
| `GET /api/v1/search/advanced` | Search with nested filters, sorting, facets, and price statistics. |
| `GET /api/v1/search/suggestions` | Prefix-based suggestions built from search results. |
| `GET /api/v1/search/health` | Health check for the Meilisearch connection. |
| `GET /api/v1/search/stats` | Index statistics and current indexing state. |

### Basic Search

The basic search endpoint uses `SearchProductsQueryDto` and forwards these values to Meilisearch:

- `q` for the query string
- `limit` and `offset` for pagination
- `filter` for raw Meilisearch filter syntax
- `sort` for a single sort expression, normalized into a one-item array

### Advanced Search

The advanced endpoint uses `SearchAdvancedQueryDto` and builds a filter string from structured query data:

- `filters.categoryId`
- `filters.brand`
- `filters.minPrice`
- `filters.maxPrice`
- `filters.minDiscount`
- `filters.stores`

It also converts `sort.field` and `sort.direction` into Meilisearch sort syntax and resolves requested facets. If no facets are provided, the API defaults to `category`, `brand`, and `storeNames`.

### Suggestions

Suggestions are intentionally lightweight. The controller performs a limited search and then deduplicates `canonicalName` values to return a short suggestion list. This means suggestions inherit the same index tuning and ranking behavior as normal search.

## Data Model

The search index stores the `MeilisearchProduct` document shape from [apps/backend/src/search/types/meilisearch.types.ts](../apps/backend/src/search/types/meilisearch.types.ts).

Key fields used by the current configuration are:

- `id` and `productId` for identity
- `canonicalName`, `brand`, `description`, and `category` for full-text matching
- `categoryId`, `storeNames`, `bestPrice`, and `currency` for filtering
- `bestPrice`, `discountPercent`, and `updatedAt` for sorting

## Operational Notes

- In tests, the service disables Meilisearch completely instead of talking to a live server.
- If index initialization fails, the service logs a warning and continues, which keeps the API booting while still surfacing the problem.
- The docs and the code both assume Meilisearch is a separate service, usually started via Docker Compose.

## Related Documentation

- [Getting started with search](./GETTING_STARTED_SEARCH.md)
- [Search examples](./SEARCH_EXAMPLES.md)
- [Search API reference](./api/search.html)
- [Architecture overview](./architecture.html)
