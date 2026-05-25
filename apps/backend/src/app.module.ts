import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { LoggerModule } from "./logger/logger.module";
import { MeilisearchModule } from "./search/meilisearch.module";
import { StoresModule } from "./stores/stores.module";
import { CartOptimizationModule } from "./cart-optimization/cart-optimization.module";
import { CartsModule } from "./carts/carts.module";

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
    PrismaModule,
    AuthModule,
    MeilisearchModule,
    ProductsModule,
    LoggerModule,
    StoresModule,
    CartOptimizationModule,
    CartsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
