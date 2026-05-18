import { RedisOptions } from "ioredis";

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildRedisOptionsFromUrl(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);
  const parsedDb = Number(url.pathname.replace(/^\//, ""));
  const useTls = url.protocol === "rediss:";

  const options: RedisOptions = {
    host: url.hostname,
    port: parseNumber(url.port, useTls ? 6380 : 6379),
    db: Number.isFinite(parsedDb) ? parsedDb : 0,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (useTls) {
    options.tls = {};
  }

  return options;
}

export function getQueueRedisConnection(): RedisOptions {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error("REDIS_URL must be defined for BullMQ connection.");
  }

  return buildRedisOptionsFromUrl(redisUrl);
}
