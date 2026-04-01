import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env[
      "postgresql://neondb_owner:npg_MFJdke9Ejz4o@ep-withered-sunset-aji5wk12-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=requireL"
    ],
  },
});
