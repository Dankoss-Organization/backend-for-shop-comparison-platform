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
