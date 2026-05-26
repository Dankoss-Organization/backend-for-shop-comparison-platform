# Admin / Internal

Internal and admin endpoints. Protect these endpoints with proper RBAC.

Examples

- GET /api/v1/admin/health
  - Overall system health (aggregated)

- POST /api/v1/admin/reindex
  - Trigger full reindex of Meilisearch (admin only)

- GET /api/v1/admin/metrics
  - Expose internal metrics (requires auth)

Notes

- Avoid exposing admin endpoints in public environments without strict auth.
