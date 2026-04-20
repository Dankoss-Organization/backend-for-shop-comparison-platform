import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let pool: Pool | null = null;
let prisma: PrismaClient | null = null;

function getLocalTestDatabaseUrl(): string {
  const url = process.env.DATABASE_TEST_URL;

  if (!url) {
    throw new Error('DATABASE_TEST_URL is not set. Configure a local PostgreSQL test database URL.');
  }

  const isLocal = /localhost|127\.0\.0\.1|::1/.test(url);
  if (!isLocal) {
    throw new Error('DATABASE_TEST_URL must point to localhost/127.0.0.1 for safe local testing.');
  }

  return url;
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getLocalTestDatabaseUrl() });
  }
  return pool;
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      adapter: new PrismaPg(getPool()),
    });
  }
  return prisma;
}

export async function resetSchemaAndMigrate(): Promise<void> {
  const pg = getPool();

  const exists = await pg.query("SELECT to_regclass('public.users') AS regclass");
  const usersTableExists = Boolean(exists.rows[0]?.regclass);

  if (usersTableExists) {
    return;
  }

  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of migrationFolders) {
    const migrationSqlPath = join(migrationsDir, folder, 'migration.sql');
    const sql = readFileSync(migrationSqlPath, 'utf8').trim();
    if (sql.length > 0) {
      await pg.query(sql);
    }
  }
}

export async function clearDatabase(): Promise<void> {
  const pg = getPool();

  await pg.query(`
    TRUNCATE TABLE
      cart_items,
      price_history,
      user_favourites,
      recipe_ingredients,
      recipe_equipment,
      reviews,
      offers,
      carts,
      favourite_products,
      favourite_recipes,
      favourite_stores,
      diets,
      allergens,
      product,
      recipes,
      ingredients,
      equipment,
      local_store,
      store_brand,
      pr_categories,
      rec_categories,
      users
    RESTART IDENTITY CASCADE;
  `);
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}
