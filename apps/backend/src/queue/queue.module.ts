import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PRODUCT_ANALYTICS_QUEUE } from "./product-analytics.constants";
import { ProductAnalyticsQueueService } from "./product-analytics-queue.service";
import { PRODUCT_SYNC_QUEUE } from "./product-sync.constants";
import { ProductSyncQueueService } from "./product-sync-queue.service";
import { buildRedisOptionsFromUrl } from "./queue.connection";

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL");
        if (!redisUrl) {
          throw new Error("REDIS_URL must be defined for BullMQ connection.");
        }
        return { connection: buildRedisOptionsFromUrl(redisUrl) };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: PRODUCT_SYNC_QUEUE,
    }),
    BullModule.registerQueue({
      name: PRODUCT_ANALYTICS_QUEUE,
    }),
  ],
  providers: [ProductSyncQueueService, ProductAnalyticsQueueService],
  exports: [ProductSyncQueueService, ProductAnalyticsQueueService],
})
export class QueueModule {}
