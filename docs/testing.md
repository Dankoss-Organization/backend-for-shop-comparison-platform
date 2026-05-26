
# Testing

This guide covers how to run unit, DB integration, and E2E tests in this backend.

## Test commands

```bash
npm test
npm run test:watch
npm run test:db
npm run test:db:watch
npm run test:e2e
```

## Test layers

- `npm test`: default Jest suite for unit/service-level checks.
- `npm run test:db`: database-focused integration tests in `src/db-tests/**/*.db.test.ts`.
- `npm run test:e2e`: HTTP/API end-to-end tests in `apps/backend/test/*.e2e-spec.ts`.

## Local DB setup for `test:db`

DB tests require a dedicated local PostgreSQL instance and `.env.test` file.

1. Start local test DB container:

```bash
docker compose -f docker-compose.dbtest.yml up -d
```

2. Create `.env.test` in project root:

```bash
DATABASE_TEST_URL=postgresql://postgres:postgres@localhost:5433/shop_comparison_test
```

3. Run DB tests:

```bash
npm run test:db
```

Notes:

- `src/db-tests/jest.db.setup.js` loads `.env.test` and requires `DATABASE_TEST_URL`.
- `src/db-tests/test-db.client.ts` enforces localhost-only DB URL for safety.
- DB helpers auto-apply migrations (if schema is not initialized) and truncate test tables between tests.

## E2E tests

- Config: `apps/backend/test/jest-e2e.json`.
- E2E specs use real NestJS app modules and Supertest for endpoint contract checks.
- Some suites create and clean deterministic fixture data in `beforeAll`/`afterAll`.

Run:

```bash
npm run test:e2e
```

## Recommended local flow

1. `npm install`
2. `docker compose -f docker-compose.dbtest.yml up -d`
3. `npm run test:db`
4. `npm run test:e2e`
5. `npm test`

## CI notes


6) Test file template

Use the following basic Jest test template for new unit or integration tests:

```ts
import { describe, it, expect } from '@jest/globals';

describe('MyFeature', () => {
	it('does something expected', async () => {
		// arrange

		// act

		// assert
		expect(true).toBe(true);
	});
});
```

For DB integration tests, follow the pattern in `src/db-tests/database.db.test.ts` using the provided helpers (`resetSchemaAndMigrate`, `clearDatabase`).

7) Checklist for adding tests

- [ ] Add tests under `src/` or `apps/backend/test/` according to scope.
- [ ] If DB access is required, use `src/db-tests` helpers and update seeds as needed.
- [ ] Add any long-running tests to a separate `e2e` suite and mark them accordingly in CI.
- [ ] Run `npm run test` locally and fix flakiness before opening a PR.

