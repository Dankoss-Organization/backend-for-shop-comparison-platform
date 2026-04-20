const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

if (!process.env.DATABASE_TEST_URL) {
  throw new Error(
    'DATABASE_TEST_URL is required for database unit tests. Create .env.test with a local PostgreSQL URL.',
  );
}
