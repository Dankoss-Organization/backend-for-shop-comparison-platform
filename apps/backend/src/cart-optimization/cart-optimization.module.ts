import { Module } from "@nestjs/common";
import { CartOptimizationEvaluatorService } from "./cart-optimization.evaluator.service";
import { CartOptimizationPricingService } from "./cart-optimization.pricing.service";
import { CartOptimizationController } from "./cart-optimization.controller";

@Module({
  controllers: [CartOptimizationController],
  providers: [CartOptimizationPricingService, CartOptimizationEvaluatorService],
  exports: [CartOptimizationPricingService, CartOptimizationEvaluatorService],
})
export class CartOptimizationModule {}
