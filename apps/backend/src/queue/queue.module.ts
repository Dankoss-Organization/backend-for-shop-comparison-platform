import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PRODUCT_ANALYTICS_QUEUE } from "./product-analytics.constants";
import { ProductAnalyticsQueueService } from "./product-analytics-queue.service";
import { PRODUCT_SYNC_QUEUE } from "./product-sync.constants";
import { ProductSyncQueueService } from "./product-sync-queue.service";
import { buildRedisOptionsFromUrl } from "./queue.connection";

const makeMockQueue = () => ({
  add: async () => ({ id: `mock-${Date.now()}` }),
  getJob: async () => null,
  getClient: () => null,
});

@Module({
  imports: (() => {
    const imports: any[] = [ConfigModule];
    const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV;
    const redisUrl = process.env.REDIS_URL;

    // In test environment or when REDIS_URL is not provided, skip BullMQ setup
    if (appEnv !== "test" && redisUrl) {
      imports.push(
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (config: ConfigService) => {
            const redis = config.get<string>("REDIS_URL");
            return { connection: buildRedisOptionsFromUrl(redis as string) };
          },
          inject: [ConfigService],
        }),
      );

      imports.push(
        BullModule.registerQueue({
          name: PRODUCT_SYNC_QUEUE,
        }),
      );

      imports.push(
        BullModule.registerQueue({
          name: PRODUCT_ANALYTICS_QUEUE,
        }),
      );
    }

    return imports;
  })(),
  providers: (() => {
    const providers: any[] = [ProductSyncQueueService, ProductAnalyticsQueueService];
    const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV;
    const redisUrl = process.env.REDIS_URL;

    if (appEnv === "test" || !redisUrl) {
      providers.push({ provide: `BullQueue_${PRODUCT_SYNC_QUEUE}`, useValue: makeMockQueue() });
      providers.push({ provide: `BullQueue_${PRODUCT_ANALYTICS_QUEUE}`, useValue: makeMockQueue() });
    }

    return providers;
  })(),
  exports: [ProductSyncQueueService, ProductAnalyticsQueueService],
})
export class QueueModule {}
