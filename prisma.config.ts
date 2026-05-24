import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import process from "process";

const envFile = process.env.ENV_FILE ?? ".env";
config({ path: envFile });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? process.env.DATABASE_TEST_URL,
  },
});