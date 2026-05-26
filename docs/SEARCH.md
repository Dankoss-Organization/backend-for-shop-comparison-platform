# Search Module

Documentation for the search subsystem (Meilisearch integration and indexing).

Sections:
- Indexing pipeline
- Meilisearch settings and tuning
- Search API behavior
- Troubleshooting and reindexing

TODO: link to implementation files in `apps/backend/src/search`.
# Meilisearch Integration Documentation

Complete guide for using and developing Meilisearch integration in the Shop Comparison Platform backend.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Development](#development)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- PostgreSQL database (or Docker)
- Redis instance (or Docker)

### Launch from Scratch

```bash
# 1. Clone repository
git clone <repo-url>
cd backend-for-shop-comparison-platform-1

# 2. Setup environment
cp .env.example .env
# Edit .env with your database and Redis URLs

# 3. Start services
docker compose up -d

# 4. Install dependencies
npm install

# 5. Initialize database
npm run prisma:migrate
npx prisma db seed

# 6. Start API (Terminal 1)
npm run start:dev

# 7. Start Worker (Terminal 2)
npm run start:worker:dev

# 8. Verify setup
curl http://localhost:3000/api/v1/search/stats
curl http://localhost:7700/health
```

**Expected Output:**
- API running on `http://localhost:3000`
- Meilisearch on `http://localhost:7700`
- Worker processing background jobs

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend / Client                     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/JSON
                       ▼
        ┌──────────────────────────────┐
        │    NestJS API (Port 3000)    │
        ├──────────────────────────────┤
        │  SearchController            │
        │  ├─ GET /search              │
        │  ├─ GET /search/advanced     │
        │  ├─ GET /search/suggestions  │
        │  ├─ GET /search/health       │
        │  └─ GET /search/stats        │
        └──────────────────────────────┘
                 │         │
        ┌────────┘         └────────┐
        ▼                           ▼
    ┌─────────────┐      ┌──────────────────┐
    │ PostgreSQL  │      │  Meilisearch     │
    │ (Products)  │      │  (Search Index)  │
    │ Port 5432   │      │  Port 7700       │
    └─────────────┘      └──────────────────┘
        ▲                        ▲
        │ Data Sync              │ Index
        └────────────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │  Worker Process (async)  │
    ├──────────────────────────┤
    │  ProductSyncProcessor    │
    │  ├─ Fetch product data   │
    │  ├─ Update database      │
    │  └─ Index in Meilisearch │
    └──────────────────────────┘
             ▲
             │
    ┌────────┴─────────┐
    │  Redis Queue     │
    │  (Bull MQ)       │
    └──────────────────┘
```

### Data Flow

1. **Sync Trigger** → Product sync job queued
2. **Worker Processing** → Fetch product data, update DB
3. **Auto-Indexing** → Extract searchable fields, send to Meilisearch
4. **Search Query** → User requests search
5. **Meilisearch Response** → Full-text search results with filters/sorting
6. **Format Response** → Add pagination, facets, statistics

## Configuration

### Environment Variables

```env
# Meilisearch Service
MEILISEARCH_HOST=http://meilisearch:7700          # Meilisearch instance URL
MEILISEARCH_API_KEY=development-key               # API key for authentication
MEILISEARCH_INDEX_NAME=products                   # Index name

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis/BullMQ
REDIS_URL=rediss://default:password@host:6379

# Queue Tuning (optional)
WORKER_CONCURRENCY=4                              # Jobs processed concurrently
ENABLE_WORKER_THREADS=true                        # Use worker threads
ANALYTICS_WORKER_CONCURRENCY=2                    # Analytics job concurrency
```

### Meilisearch Settings

The search index is automatically configured with:

```typescript
{
  searchableAttributes: [
    "canonicalName",    // Product name
    "brand",            // Brand name
    "description",      // Product description
    "category"          // Category name
  ],
  filterableAttributes: [
    "category",         // Category name filter
    "categoryId",       // Category ID filter
    "brand",            // Brand filter
    "storeNames",       // Store names filter
    "bestPrice",        // Price range filter
    "currency"          // Currency filter
  ],
  sortableAttributes: [
    "bestPrice",        // Sort by price
    "discountPercent",  // Sort by discount
    "updatedAt"         // Sort by update date
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 5,       // Min 5 chars for 1 typo tolerance
      twoTypos: 9       // Min 9 chars for 2 typos tolerance
    }
  }
}
```

## API Reference

### Endpoints

#### `/api/v1/search` - Basic Search

Full-text search with optional sorting and basic filtering.

```
GET /api/v1/search
```

**Query Parameters:**

| Parameter | Type | Required | Default | Range | Description |
|-----------|------|----------|---------|-------|-------------|
| q | string | Yes | - | 1-200 | Search query |
| limit | number | No | 20 | 1-100 | Results per page |
| offset | number | No | 0 | ≥0 | Pagination offset |
| filter | string | No | - | - | Meilisearch filter syntax |
| sort | string | No | - | - | Sort field and direction |

**Response Schema:**

```json
{
  "results": [
    {
      "id": "string",
      "productId": "string",
      "canonicalName": "string",
      "brand": "string | null",
      "category": "string",
      "categoryId": "string",
      "media": "string",
      "description": "string | null",
      "bestPrice": "number | null",
      "oldPrice": "number | null",
      "discountPercent": "number | null",
      "currency": "UAH",
      "offersCount": "number",
      "storeNames": ["string"],
      "updatedAt": "number"
    }
  ],
  "totalHits": "number",
  "query": "string",
  "processingTimeMs": "number",
  "count": "number",
  "offset": "number",
  "limit": "number",
  "totalPages": "number",
  "page": "number"
}
```

#### `/api/v1/search/advanced` - Advanced Search

Full-featured search with complex filtering, sorting, and faceted results.

```
GET /api/v1/search/advanced
```

**Query Parameters:**

Main parameters:
- `q` (string, required) - Search query
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20) - Results per page
- `facets` (string, optional) - Comma-separated facet names

Nested filter parameters (query object):
- `filters.category` - Category name
- `filters.categoryId` - Category ID
- `filters.minPrice` - Minimum price
- `filters.maxPrice` - Maximum price
- `filters.brand` - Brand name
- `filters.stores` - Comma-separated store names
- `filters.minDiscount` - Minimum discount percent

Nested sort parameters:
- `sort.field` - Sort field (bestPrice, discountPercent, canonicalName, updatedAt)
- `sort.direction` - Sort direction (asc, desc)

**Example Request:**
```
GET /api/v1/search/advanced?q=laptop&page=1&limit=20&filters.minPrice=20000&filters.maxPrice=100000&sort.field=bestPrice&sort.direction=asc&facets=category,brand
```

**Response Schema:**

```json
{
  "results": [...],           // Same as basic search
  "totalHits": "number",
  "query": "string",
  "processingTimeMs": "number",
  "count": "number",
  "offset": "number",
  "limit": "number",
  "totalPages": "number",
  "page": "number",
  "facets": [
    {
      "name": "category",
      "values": [
        {
          "value": "Electronics",
          "count": 150
        }
      ]
    }
  ],
  "priceStats": {
    "min": 5000,
    "max": 100000,
    "avg": 45000
  },
  "appliedFilters": {
    "minPrice": 20000,
    "maxPrice": 100000
  }
}
```

#### `/api/v1/search/suggestions` - Autocomplete

Get search suggestions based on query prefix.

```
GET /api/v1/search/suggestions
```

**Parameters:**
- `q` (string, required) - Prefix for autocomplete
- `limit` (number, optional, default: 10) - Max suggestions (1-50)

**Response:**
```json
{
  "suggestions": [
    "Apple iPhone 15",
    "Apple iPhone 15 Pro",
    "Apple iPhone 14"
  ],
  "query": "iph"
}
```

#### `/api/v1/search/health` - Health Check

Check Meilisearch instance health.

```
GET /api/v1/search/health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "Meilisearch is running",
  "version": "1.10.2",
  "timestamp": 1716030000000
}
```

#### `/api/v1/search/stats` - Index Statistics

Get search index statistics.

```
GET /api/v1/search/stats
```

**Response:**
```json
{
  "numberOfDocuments": 10000,
  "isIndexing": false,
  "lastUpdate": 1716030000000,
  "timestamp": 1716030000123
}
```

## Examples

### cURL

#### Simple Search
```bash
curl "http://localhost:3000/api/v1/search?q=iphone"
```

#### With Pagination
```bash
curl "http://localhost:3000/api/v1/search?q=iphone&limit=30&offset=60"
```

#### With Price Filter
```bash
curl "http://localhost:3000/api/v1/search/advanced?q=phone&filters.minPrice=15000&filters.maxPrice=70000"
```

#### With Sorting
```bash
curl "http://localhost:3000/api/v1/search/advanced?q=laptop&sort.field=bestPrice&sort.direction=asc"
```

#### With Category Filter
```bash
curl "http://localhost:3000/api/v1/search/advanced?q=samsung&filters.categoryId=cat-phones&facets=category,brand"
```

### JavaScript/Node.js

#### Fetch API
```javascript
// Basic search
const response = await fetch(
  'http://localhost:3000/api/v1/search?q=iphone&limit=20'
);
const data = await response.json();
console.log(data.results);
console.log(`Found ${data.totalHits} products`);

// Advanced search
const advResponse = await fetch(
  'http://localhost:3000/api/v1/search/advanced?' +
  'q=phone&' +
  'filters.minPrice=10000&' +
  'filters.maxPrice=50000&' +
  'sort.field=bestPrice&' +
  'sort.direction=asc&' +
  'facets=category,brand'
);
const advData = await advResponse.json();
console.log(advData.facets);
console.log(advData.priceStats);
```

#### Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1'
});

// Search with parameters
const { data } = await api.get('/search/advanced', {
  params: {
    q: 'laptop',
    page: 1,
    limit: 20,
    'filters.minPrice': 20000,
    'filters.maxPrice': 100000,
    'sort.field': 'bestPrice',
    'sort.direction': 'asc',
    facets: 'category,brand,storeNames'
  }
});

console.log(`${data.totalHits} results found`);
console.log('Facets:', data.facets);
console.log('Price range:', data.priceStats);

// Autocomplete
const suggestions = await api.get('/search/suggestions', {
  params: { q: 'iph' }
});
console.log(suggestions.data.suggestions);
```

## Development

### Adding New Searchable Fields

1. **Update type definition** (`apps/backend/src/search/types/meilisearch.types.ts`):
```typescript
export interface MeilisearchProduct {
  // ... existing fields
  newField: string;
}
```

2. **Update product indexing** (`apps/backend/src/queue/product-sync.processor.ts`):
```typescript
const meilisearchDoc: MeilisearchProduct = {
  // ... existing fields
  newField: productCard.someData.newField,
};
```

3. **Update index settings** (`apps/backend/src/search/meilisearch.service.ts`):
```typescript
searchableAttributes: [
  // ... existing
  "newField"
],
```

4. **Test the changes:**
```bash
npm run build
npm run test -- search
```

### Modifying Filter Options

Edit `SearchFilterDto` in `apps/backend/src/search/dto/search-filter.dto.ts`:

```typescript
export class SearchFilterDto {
  @IsOptional()
  @IsString()
  @Type(() => String)
  newFilterOption?: string;
}
```

Then update the advanced search endpoint to use this filter.

### Testing

```bash
# Unit tests
npm run test -- search

# e2e tests
npm run test:e2e -- search

# Watch mode
npm run test:watch -- search
```

## Performance Tuning

### Meilisearch Memory

Edit `docker-compose.yml`:
```yaml
meilisearch:
  environment:
    MEILI_MAX_INDEXING_MEMORY: 512MB
  deploy:
    resources:
      limits:
        memory: 1G
```

### Index Optimization

1. **Check index size:**
   ```bash
   curl http://localhost:7700/indexes/products/stats
   ```

2. **Monitor indexing time:**
   - Check `processingTimeMs` in API responses
   - Target < 100ms for typical queries

3. **Optimize queries:**
   - Use specific filters instead of broad searches
   - Limit result count to necessary data
   - Cache frequent queries at application level

### Redis Queue Tuning

```env
WORKER_CONCURRENCY=4              # Increase for more parallel jobs
ENABLE_WORKER_THREADS=true        # Use worker threads
WORKER_THREAD_POOL_SIZE=2         # Threads per worker
CPU_SIGNAL_ITERATIONS=20000       # CPU work iterations
```

## Troubleshooting

### Meilisearch Connection Error

**Problem:** "Cannot connect to Meilisearch"

**Solution:**
```bash
# Check if container is running
docker compose ps meilisearch

# Check logs
docker compose logs meilisearch

# Restart service
docker compose restart meilisearch

# Verify connection
curl http://localhost:7700/health
```

### Empty Search Results

**Problem:** Search returns 0 results even though products exist

**Solution:**
1. Check index statistics:
   ```bash
   curl http://localhost:3000/api/v1/search/stats
   ```

2. Verify products were indexed:
   - Check ProductSyncProcessor logs
   - Ensure product sync jobs completed

3. Check filter syntax:
   - Verify filter parameters are valid Meilisearch syntax
   - Test with simpler filters first

### Slow Search Performance

**Problem:** Search queries take > 1000ms

**Solution:**
1. Monitor Meilisearch:
   ```bash
   docker stats meilisearch
   ```

2. Check index size:
   ```bash
   curl http://localhost:7700/indexes/products/stats
   ```

3. Increase memory:
   - Edit `docker-compose.yml`
   - Increase `MEILI_MAX_INDEXING_MEMORY`
   - Restart container

4. Check network latency:
   - Verify Docker network connectivity
   - Check firewall rules

### Index Out of Sync

**Problem:** Search doesn't include recently synced products

**Solution:**
1. Check worker is running:
   ```bash
   npm run start:worker:dev
   ```

2. Check queue status:
   - Monitor worker logs for errors
   - Verify Redis connection

3. Manual reindex:
   ```bash
   # Clear index (requires direct Meilisearch access)
   DELETE http://localhost:7700/indexes/products/documents
   
   # Restart worker to reprocess queue
   npm run start:worker:dev
   ```

### High Indexing Latency

**Problem:** Products take long time to appear in search results

**Solution:**
1. Check CPU usage:
   ```bash
   docker stats meilisearch api worker
   ```

2. Reduce indexing batch size:
   - Modify `ProductSyncProcessor` to index fewer products per batch
   - Trade throughput for latency

3. Increase concurrency:
   ```env
   WORKER_CONCURRENCY=8
   ```
