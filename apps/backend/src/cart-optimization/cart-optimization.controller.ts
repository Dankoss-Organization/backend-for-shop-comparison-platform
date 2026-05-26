import { Body, Controller, Inject, Post } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CartOptimizationEvaluatorService } from "./cart-optimization.evaluator.service";
import { CartOptimizationPrismaService } from "./cart-optimization.prisma.service";

@Controller("api/v1/cart")
export class CartOptimizationController {
  constructor(
    private readonly evaluator: CartOptimizationEvaluatorService,
    private readonly prismaService: CartOptimizationPrismaService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @Post("optimize")
  async optimize(@Body() payload: any) {
    const itemCount = Array.isArray(payload?.cartItems)
      ? payload.cartItems.length
      : 0;

    this.logger.info("Cart optimization request received", {
      service: CartOptimizationController.name,
      itemCount,
      fulfillmentType: payload?.fulfillmentType,
    });

    const evaluationInput =
      await this.prismaService.buildEvaluationInput(payload);
    const response = this.evaluator.evaluate(evaluationInput);

    this.logger.info("Cart optimization request completed", {
      service: CartOptimizationController.name,
      itemCount,
      fulfillmentType: payload?.fulfillmentType,
    });

    return response;
  }
}

export {};
