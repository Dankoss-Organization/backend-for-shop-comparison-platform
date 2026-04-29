import { RedisOptions } from "ioredis";

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getQueueRedisConnection(): RedisOptions {
  const password = process.env.REDIS_PASSWORD;

  return {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: parseNumber(process.env.REDIS_PORT, 6379),
    db: parseNumber(process.env.REDIS_DB, 0),
    password: password && password.length > 0 ? password : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
