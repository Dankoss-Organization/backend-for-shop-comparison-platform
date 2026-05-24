import { Module } from "@nestjs/common";
import { CartOptimizationEvaluatorService } from "./cart-optimization.evaluator.service";
import { CartOptimizationPricingService } from "./cart-optimization.pricing.service";

@Module({
  providers: [CartOptimizationPricingService, CartOptimizationEvaluatorService],
  exports: [CartOptimizationPricingService, CartOptimizationEvaluatorService],
})
export class CartOptimizationModule {}
