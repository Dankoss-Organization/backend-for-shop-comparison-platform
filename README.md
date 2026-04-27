# Backend-for-shop-comparison-platform
This repository contains the server-side logic, database management, and business orchestration layer for the Shop Comparison Platform. It serves as the central hub that processes data from various scrapers, manages the product catalog, and provides a high-performance API for the frontend.

## Background Jobs With BullMQ

The backend now supports background product sync jobs through BullMQ.

### Redis configuration

Set these environment variables (optional defaults are shown):

- `REDIS_HOST=127.0.0.1`
- `REDIS_PORT=6379`
- `REDIS_DB=0`
- `REDIS_PASSWORD=`
- `WORKER_CONCURRENCY=4`
- `ENABLE_WORKER_THREADS=true`
- `CPU_SIGNAL_ITERATIONS=20000`
- `WORKER_THREAD_POOL_SIZE=2`
- `ANALYTICS_WORKER_CONCURRENCY=2`

### Run API and workers

- API: `npm run start:dev`
- Worker: `npm run start:worker:dev`

To run multiple workers, start the worker command in multiple terminals (or run multiple container replicas).

### New endpoints

- `POST /api/v1/products/:id/sync` to enqueue a sync job.
- `GET /api/v1/products/sync-jobs/:jobId` to check job status.
- `POST /api/v1/products/:id/analytics/rebuild` to enqueue heavy analytics rebuild.
- `GET /api/v1/products/analytics-jobs/:jobId` to check analytics job status.
