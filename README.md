# Backend-for-shop-comparison-platform
This repository contains the server-side logic, database management, and business orchestration layer for the Shop Comparison Platform. It serves as the central hub that processes data from various scrapers, manages the product catalog, and provides a high-performance API for the frontend.

## Background Jobs With BullMQ

The backend now supports background product sync jobs through BullMQ.

### Redis configuration

Set `REDIS_URL` to a Redis instance using the `rediss://...` format. That is the only supported Redis configuration now.

Example:

```bash
REDIS_URL=rediss://default:password@ruling-mako-121880.upstash.io:6379
```

The only other Redis-related settings left are queue tuning variables:

- `WORKER_CONCURRENCY=4`
- `ENABLE_WORKER_THREADS=true`
- `CPU_SIGNAL_ITERATIONS=20000`
- `WORKER_THREAD_POOL_SIZE=2`
- `ANALYTICS_WORKER_CONCURRENCY=2`

### Run API and workers

- API: `npm run start:dev`
- Worker: `npm run start:worker:dev`

To run multiple workers, start the worker command in multiple terminals (or run multiple container replicas).

### Docker

The repository now includes a Docker setup for the backend API and worker.

1. Copy [.env.example](.env.example) to `.env` and fill in `DATABASE_URL` and `REDIS_URL`.
2. Build and start both services:

```bash
docker compose up --build
```

The API runs on port `3000`, and the worker runs in a separate container from the same image.

### How to test the containers

1. Verify the image and compose file:

```bash
docker compose config
docker compose build
```

2. Start the stack:

```bash
docker compose up
```

3. Check the API in a second terminal:

```bash
curl http://localhost:3000/
```

4. Run a queue smoke test against an existing product id:

```powershell
.
scripts\queue-smoke-test.ps1 -ProductId <product-id> -ApiBaseUrl http://localhost:3000
```

5. Stop everything when done:

```bash
docker compose down
```

If Docker Desktop is not running, `docker compose build` will fail with a Docker engine connection error. Start Docker Desktop and rerun the commands.

### Troubleshooting

- If `docker build` or `docker compose up` fails with `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`, Docker Desktop is not running on your machine.
- Start Docker Desktop first, wait until the engine is ready, then rerun `docker compose build` and `docker compose up`.
- In this workspace, the project files themselves are valid; the failure is from the local Docker daemon being unavailable.

### New endpoints

- `GET /api/v1/products` to browse the catalog with filters like `page`, `limit`, `search`, `brand`, `categoryId`, `inStock`, and `sort`.
- `GET /api/v1/products/categories` to fetch the category tree, optionally rooted at `parentId`.
- `POST /api/v1/products/:id/sync` to enqueue a sync job.
- `GET /api/v1/products/sync-jobs/:jobId` to check job status.
- `POST /api/v1/products/:id/analytics/rebuild` to enqueue heavy analytics rebuild.
- `GET /api/v1/products/analytics-jobs/:jobId` to check analytics job status.

## Full-Text Search with Meilisearch

The backend now includes integrated full-text search powered by Meilisearch for high-performance product discovery.

### Meilisearch Setup

#### Environment Configuration

Add these variables to your `.env` file:

```env
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=development-key-change-in-prod
MEILISEARCH_INDEX_NAME=products
```

#### Docker Compose

Meilisearch is automatically included in `docker-compose.yml` and runs on port `7700`:

```bash
docker compose up -d meilisearch

# Verify Meilisearch is running
curl http://localhost:7700/health
```

Meilisearch data persists in a Docker volume: `meilisearch_data`.

#### Zero-to-Production Setup

1. **Clone and prepare:**
   ```bash
   git clone <repository>
   cd backend-for-shop-comparison-platform-1
   cp .env.example .env
   ```

2. **Start all services:**
   ```bash
   docker compose up -d
   docker compose ps
   ```

3. **Initialize database:**
   ```bash
   npm install
   npm run prisma:migrate
   npx prisma db seed
   ```

4. **Start dev servers (in separate terminals):**
   
   Terminal 1 - API:
   ```bash
   npm run start:dev
   # API available at http://localhost:3000
   ```

   Terminal 2 - Worker:
   ```bash
   npm run start:worker:dev
   # Background job processor
   ```

5. **Verify everything:**
   ```bash
   # Check Meilisearch
   curl http://localhost:7700/health
   
   # Check API
   curl http://localhost:3000/health
   
   # Check search endpoints
   curl "http://localhost:3000/api/v1/search/stats"
   ```

### Search API Endpoints

#### Basic Search

```http
GET /api/v1/search?q=apple
```

**Parameters:**
- `q` (required) - Search query
- `limit` (optional) - Results per page (1-100, default: 20)
- `offset` (optional) - Pagination offset (default: 0)
- `filter` (optional) - Meilisearch filter syntax
- `sort` (optional) - Sort field (e.g., `bestPrice:asc`)

**Example Response:**
```json
{
  "results": [
    {
      "id": "prod-123",
      "canonicalName": "Apple iPhone 15",
      "brand": "Apple",
      "category": "Electronics",
      "bestPrice": 45999,
      "discountPercent": 17,
      "offersCount": 5,
      "storeNames": ["Foxtrot", "Eldorado"]
    }
  ],
  "totalHits": 150,
  "query": "apple",
  "processingTimeMs": 42,
  "count": 20,
  "offset": 0,
  "limit": 20,
  "totalPages": 8,
  "page": 1
}
```

#### Autocomplete/Suggestions

```http
GET /api/v1/search/suggestions?q=iph&limit=10
```

**Parameters:**
- `q` (required) - Prefix for autocomplete
- `limit` (optional) - Max suggestions (1-50, default: 10)

**Example Response:**
```json
{
  "suggestions": [
    "Apple iPhone 15",
    "Apple iPhone 15 Pro",
    "Apple iPhone 14",
    "Apple iPhone SE"
  ],
  "query": "iph"
}
```

#### Advanced Search with Filters

```http
GET /api/v1/search/advanced?q=phone&filters.minPrice=10000&filters.maxPrice=50000&filters.categoryId=cat-001&sort.field=bestPrice&sort.direction=asc&page=1&limit=20
```

**Query Parameters:**
- `q` (required) - Search query
- `page` (optional) - Page number (1-based, default: 1)
- `limit` (optional) - Results per page (default: 20)

**Filter Object (nested):**
- `filters.category` - Filter by category name
- `filters.categoryId` - Filter by category ID
- `filters.minPrice` - Minimum price in UAH
- `filters.maxPrice` - Maximum price in UAH
- `filters.brand` - Filter by brand
- `filters.stores` - Comma-separated store names
- `filters.minDiscount` - Minimum discount percent

**Sort Object (nested):**
- `sort.field` - Sort field: `bestPrice`, `discountPercent`, `canonicalName`, or `updatedAt`
- `sort.direction` - Sort direction: `asc` or `desc`

**Other Parameters:**
- `facets` - Comma-separated list of facets: `category,brand,storeNames`

**Example Response:**
```json
{
  "results": [...],
  "totalHits": 150,
  "query": "phone",
  "processingTimeMs": 56,
  "count": 20,
  "offset": 0,
  "limit": 20,
  "totalPages": 8,
  "page": 1,
  "facets": [
    {
      "name": "category",
      "values": [
        { "value": "Smartphones", "count": 120 },
        { "value": "Tablets", "count": 30 }
      ]
    },
    {
      "name": "brand",
      "values": [
        { "value": "Apple", "count": 80 },
        { "value": "Samsung", "count": 40 }
      ]
    }
  ],
  "priceStats": {
    "min": 5000,
    "max": 100000,
    "avg": 35000
  },
  "appliedFilters": {
    "minPrice": 10000,
    "maxPrice": 50000,
    "categoryId": "cat-001"
  }
}
```

#### Health Check

```http
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

#### Index Statistics

```http
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

### Usage Examples

#### cURL Examples

**Basic Search:**
```bash
curl "http://localhost:3000/api/v1/search?q=apple"
```

**Search with Pagination:**
```bash
curl "http://localhost:3000/api/v1/search?q=apple&limit=20&offset=40"
```

**Search with Price Filter:**
```bash
curl "http://localhost:3000/api/v1/search/advanced?q=laptop&filters.minPrice=20000&filters.maxPrice=80000"
```

**Search with Sorting:**
```bash
curl "http://localhost:3000/api/v1/search/advanced?q=phone&sort.field=bestPrice&sort.direction=asc"
```

**Search with Facets:**
```bash
curl "http://localhost:3000/api/v1/search/advanced?q=electronics&facets=category,brand,storeNames"
```

**Autocomplete:**
```bash
curl "http://localhost:3000/api/v1/search/suggestions?q=iph"
```

#### JavaScript/TypeScript Examples

**Basic Search:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/search?q=apple&limit=20');
const data = await response.json();
console.log(data.results);
```

**Advanced Search with Filters:**
```javascript
const params = new URLSearchParams({
  q: 'phone',
  page: '1',
  limit: '20',
  'filters.minPrice': '10000',
  'filters.maxPrice': '50000',
  'filters.categoryId': 'cat-001',
  'sort.field': 'bestPrice',
  'sort.direction': 'asc',
  facets: 'category,brand'
});

const response = await fetch(`http://localhost:3000/api/v1/search/advanced?${params}`);
const data = await response.json();

console.log('Results:', data.results);
console.log('Total:', data.totalHits);
console.log('Facets:', data.facets);
console.log('Price Range:', data.priceStats);
```

**With Axios:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1'
});

// Basic search
const { data } = await api.get('/search', {
  params: { q: 'apple', limit: 20 }
});

// Advanced search
const { data: advData } = await api.get('/search/advanced', {
  params: {
    q: 'laptop',
    'filters.minPrice': 20000,
    'filters.maxPrice': 80000,
    'sort.field': 'bestPrice',
    'sort.direction': 'asc',
    facets: 'category,brand'
  }
});

console.log(advData.results);
console.log(advData.facets);
```

### Automatic Indexing

Products are automatically indexed in Meilisearch when:

1. **Product sync completes** - After a product sync job, the product is indexed with latest data
2. **On startup** - Meilisearch module initializes index with proper settings

The indexing is **non-blocking** - if indexing fails, the product sync still succeeds. Check logs for indexing errors.

### Meilisearch Index Settings

The index is configured with:

- **Searchable attributes:** `canonicalName`, `brand`, `description`, `category`
- **Filterable attributes:** `category`, `categoryId`, `brand`, `storeNames`, `bestPrice`, `currency`
- **Sortable attributes:** `bestPrice`, `discountPercent`, `updatedAt`
- **Typo tolerance:** Enabled with automatic typo detection (min 5 chars for 1 typo, 9 for 2 typos)
- **Max total hits:** 10,000

### Development

#### Adding New Searchable Fields

1. Update [MeilisearchProduct](apps/backend/src/search/types/meilisearch.types.ts) interface
2. Update product transformation in [ProductSyncProcessor](apps/backend/src/queue/product-sync.processor.ts)
3. Update index settings in [MeilisearchService.initializeIndex()](apps/backend/src/search/meilisearch.service.ts)

#### Running Tests

```bash
# Unit tests
npm run test -- search

# e2e tests
npm run test:e2e -- search
```

### Troubleshooting

#### Meilisearch Connection Failed
```bash
# Check if Meilisearch container is running
docker compose ps meilisearch

# View logs
docker compose logs meilisearch

# Restart service
docker compose restart meilisearch
```

#### Search Returning Empty Results
1. Check index has documents: `GET /api/v1/search/stats`
2. Verify products were synced: Check `ProductSyncProcessor` logs
3. Check filter syntax in query parameters

#### Slow Search Performance
1. Check index size: `GET /api/v1/search/stats`
2. Monitor Meilisearch CPU: `docker stats meilisearch`
3. Verify network latency to Meilisearch container
4. Increase Meilisearch memory if needed in `docker-compose.yml`

#### Index Out of Sync
Clear and rebuild:
```bash
# Via API - requires direct Meilisearch access
DELETE http://localhost:7700/indexes/products/documents

# Trigger full re-index via product syncs
# Or restart worker to reprocess queue
```
