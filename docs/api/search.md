# Search

Search-related endpoints (Meilisearch-backed).

Endpoints

- GET /api/v1/search
  - Query params: q (required), limit, offset, filter, sort
  - Response: { results: [...], totalHits, processingTimeMs }

- GET /api/v1/search/suggestions
  - Query params: q, limit
  - Response: { suggestions: [...] }

- GET /api/v1/search/advanced
  - Accepts nested filter and sort parameters (see implementation details).

- GET /api/v1/search/health
  - Health check for search subsystem

- GET /api/v1/search/stats
  - Index statistics: numberOfDocuments, isIndexing, lastUpdate

Notes

- Document expected filter shapes and sortable fields in this file.
