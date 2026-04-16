import { Module } from "@nestjs/common";
import { ShopComparisonPlatformBackendController } from "./app.controller";
import { ShopComparisonPlatformBackendService } from "./app.service";

@Module({
  imports: [],
  controllers: [ShopComparisonPlatformBackendController],
  providers: [ShopComparisonPlatformBackendService],
})
export class ShopComparisonPlatformBackendModule {}
