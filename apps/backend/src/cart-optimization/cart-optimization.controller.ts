import { Controller, Post, Body } from '@nestjs/common';
import { CartOptimizationEvaluatorService } from './cart-optimization.evaluator.service';
import { CartOptimizationPrismaService } from './cart-optimization.prisma.service';

@Controller('api/v1/cart')
export class CartOptimizationController {
  constructor(
    private readonly evaluator: CartOptimizationEvaluatorService,
    private readonly prismaService: CartOptimizationPrismaService,
  ) {}

  @Post('optimize')
  async optimize(@Body() payload: any) {
    const evaluationInput = await this.prismaService.buildEvaluationInput(payload);
    return this.evaluator.evaluate(evaluationInput);
  }
}

export {};
