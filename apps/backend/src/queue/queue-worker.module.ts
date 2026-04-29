import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProductsModule } from "../products/products.module";
import { ProductAnalyticsProcessor } from "./product-analytics.processor";
import { ProductSyncProcessor } from "./product-sync.processor";
import { WorkerThreadsService } from "./worker-threads.service";

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV;
const envFilePath =
  appEnv === "test"
    ? [".env.test", ".env", "../../.env.test", "../../.env"]
    : [".env", ".env.test", "../../.env", "../../.env.test"];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
    }),
    ProductsModule,
  ],
  providers: [ProductSyncProcessor, ProductAnalyticsProcessor, WorkerThreadsService],
})
export class QueueWorkerModule {}
