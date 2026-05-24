import { Module } from "@nestjs/common";
import { CartOptimizationPricingService } from "./cart-optimization.pricing.service";

@Module({
  providers: [CartOptimizationPricingService],
  exports: [CartOptimizationPricingService],
})
export class CartOptimizationModule {}
