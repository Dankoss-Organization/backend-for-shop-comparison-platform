# Getting Started with Meilisearch

Quick start guide for setting up and using Meilisearch in the Shop Comparison Platform.

## 5-Minute Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Git

### Step-by-Step

```bash
# 1. Clone the repository
git clone <repository-url>
cd backend-for-shop-comparison-platform-1

# 2. Configure environment
cp .env.example .env

# Edit .env and set:
# DATABASE_URL=<your-postgres-url>
# REDIS_URL=<your-redis-url>
# MEILISEARCH_HOST=http://meilisearch:7700
# MEILISEARCH_API_KEY=development-key-change-in-prod

# 3. Start services
docker compose up -d

# 4. Install dependencies
npm install

# 5. Initialize database
npm run prisma:migrate
npx prisma db seed

# 6. Start API (Terminal 1)
npm run start:dev
# Output: Application running on http://localhost:3000

# 7. Start Worker (Terminal 2)
npm run start:worker:dev
# Output: Worker processing jobs

# 8. Verify setup
curl http://localhost:3000/api/v1/search/health
curl http://localhost:3000/api/v1/search/stats
```

✅ **You're ready!** API is running at `http://localhost:3000`

## First Search

### Via cURL

```bash
# Simple search
curl "http://localhost:3000/api/v1/search?q=iphone"

# Pretty print
curl -s "http://localhost:3000/api/v1/search?q=iphone" | jq .
```

### Via JavaScript

```javascript
// In browser console or Node.js
const response = await fetch('http://localhost:3000/api/v1/search?q=iphone');
const data = await response.json();
console.log(data.results);
```

## Key Concepts

### Full-Text Search

Finds products by any searchable field:
- Product name (canonicalName)
- Brand
- Description
- Category

```bash
curl "http://localhost:3000/api/v1/search?q=apple+iphone"
```

### Filtering

Narrow results by specific criteria:

```bash
# Price range
curl "http://localhost:3000/api/v1/search/advanced?q=phone&filters.minPrice=15000&filters.maxPrice=50000"

# Category
curl "http://localhost:3000/api/v1/search/advanced?q=samsung&filters.categoryId=cat-phones"

# Brand
curl "http://localhost:3000/api/v1/search/advanced?q=camera&filters.brand=Canon"
```

### Sorting

Order results by:
- Price (bestPrice)
- Discount (discountPercent)
- Name (canonicalName)
- Update date (updatedAt)

```bash
curl "http://localhost:3000/api/v1/search/advanced?q=laptop&sort.field=bestPrice&sort.direction=asc"
```

### Faceted Search

Get counts of products by category, brand, store:

```bash
curl "http://localhost:3000/api/v1/search/advanced?q=electronics&facets=category,brand"
```

Response includes:
```json
{
  "facets": [
    {
      "name": "category",
      "values": [
        { "value": "Electronics", "count": 150 },
        { "value": "Accessories", "count": 45 }
      ]
    }
  ]
}
```

## Troubleshooting

### "Cannot connect to Meilisearch"

```bash
# Check if running
docker compose ps meilisearch

# Check logs
docker compose logs meilisearch

# Restart
docker compose restart meilisearch
```

### "No results found"

1. Check if products were indexed:
   ```bash
   curl http://localhost:3000/api/v1/search/stats
   ```

2. Verify worker is running:
   ```bash
   # Check terminal where you started worker
   npm run start:worker:dev
   ```

3. Check if products exist in database:
   ```bash
   # Via database query
   SELECT COUNT(*) FROM products;
   ```

### "API not responding"

```bash
# Check if API is running
curl http://localhost:3000

# Check API logs (Terminal 1)
npm run start:dev

# Check port 3000 is not in use
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

## API Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/search` | GET | Basic full-text search |
| `/api/v1/search/advanced` | GET | Advanced search with filters |
| `/api/v1/search/suggestions` | GET | Autocomplete suggestions |
| `/api/v1/search/health` | GET | Check Meilisearch health |
| `/api/v1/search/stats` | GET | Index statistics |

## What's Next?

- **Learn Advanced Search:** See [SEARCH_EXAMPLES.md](SEARCH_EXAMPLES.md)
- **Full Documentation:** See [SEARCH.md](SEARCH.md)
- **API Documentation:** Available at `http://localhost:3000/api` (Swagger UI)

## Common Commands

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f meilisearch

# Rebuild containers
docker compose up -d --build

# Check Meilisearch directly
curl http://localhost:7700/health
curl http://localhost:7700/indexes

# Run database migrations
npm run prisma:migrate

# Seed database
npx prisma db seed

# Reset everything
docker compose down -v  # Remove volumes too
npm install
npm run prisma:migrate
npx prisma db seed
```

## Environment Variables Reference

```env
# Meilisearch
MEILISEARCH_HOST=http://meilisearch:7700    # Service URL
MEILISEARCH_API_KEY=dev-key                 # API Key
MEILISEARCH_INDEX_NAME=products             # Index name

# Database
DATABASE_URL=postgresql://...               # PostgreSQL URL

# Redis
REDIS_URL=rediss://...                      # Redis URL

# Queue
WORKER_CONCURRENCY=4                        # Parallel jobs
ENABLE_WORKER_THREADS=true                  # Use worker threads
```

## Next Steps

1. ✅ Start all services (docker compose up)
2. ✅ Initialize database (npm run prisma:migrate)
3. ✅ Start API and Worker
4. ✅ Run first search
5. 📖 Read [SEARCH_EXAMPLES.md](SEARCH_EXAMPLES.md) for advanced usage
6. 🔍 Integrate search into your application
7. 📚 Check [SEARCH.md](SEARCH.md) for complete API reference
