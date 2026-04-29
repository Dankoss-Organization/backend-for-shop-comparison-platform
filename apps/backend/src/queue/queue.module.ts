import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PRODUCT_ANALYTICS_QUEUE } from "./product-analytics.constants";
import { ProductAnalyticsQueueService } from "./product-analytics-queue.service";
import { PRODUCT_SYNC_QUEUE } from "./product-sync.constants";
import { ProductSyncQueueService } from "./product-sync-queue.service";
import { getQueueRedisConnection } from "./queue.connection";

@Module({
  imports: [
    BullModule.forRoot({
      connection: getQueueRedisConnection(),
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
