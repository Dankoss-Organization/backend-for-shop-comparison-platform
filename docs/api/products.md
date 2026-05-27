# Products

Endpoints related to products, categories and offers.

Endpoints

- GET /api/v1/products
  - Query params: page, limit, search, brand, categoryId, inStock, sort
  - Response: paginated product list with `bestPrice`, `offersCount`, `storeNames`.

- GET /api/v1/products/:id
  - Description: fetch product details by internal id.

- GET /api/v1/products/categories
  - Query params: parentId (optional)
  - Response: category tree or subtree

- POST /api/v1/products/:id/sync
  - Description: enqueue a sync job for the product
  - Response: { jobId }

- POST /api/v1/products/:id/analytics/rebuild
  - Description: enqueue analytics rebuild job

Offers

- POST /api/v1/products/:id/offers
  - Create or update offer for a store

- GET /api/v1/products/:id/offers
  - List offers for product

Error codes

- 400 Bad Request — invalid params
- 404 Not Found — product not found
- 429 Too Many Requests — rate limiting
