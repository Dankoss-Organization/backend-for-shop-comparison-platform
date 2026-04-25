import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
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
  ],
  providers: [ProductSyncQueueService],
  exports: [ProductSyncQueueService],
})
export class QueueModule {}
