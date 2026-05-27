# Jobs / Queue

Endpoints and patterns for background jobs and queue management.

Endpoints

- GET /api/v1/products/sync-jobs/:jobId
  - Check status for a product sync job

- GET /api/v1/products/analytics-jobs/:jobId
  - Check status for analytics job

- GET /api/v1/queues
  - (Admin) list queue stats and worker info

Notes

- Jobs are processed by BullMQ workers. Include guidance how to requeue or cancel jobs.
