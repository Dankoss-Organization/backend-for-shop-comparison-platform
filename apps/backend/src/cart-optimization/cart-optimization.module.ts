import { Module } from "@nestjs/common";
import { CartOptimizationEvaluatorService } from "./cart-optimization.evaluator.service";
import { CartOptimizationPricingService } from "./cart-optimization.pricing.service";
import { CartOptimizationController } from "./cart-optimization.controller";
import { CartOptimizationPrismaService } from "./cart-optimization.prisma.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [CartOptimizationController],
  providers: [
    CartOptimizationPricingService,
    CartOptimizationEvaluatorService,
    CartOptimizationPrismaService,
  ],
  exports: [
    CartOptimizationPricingService,
    CartOptimizationEvaluatorService,
    CartOptimizationPrismaService,
  ],
})
export class CartOptimizationModule {}
