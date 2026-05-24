import { Controller, Post, Body } from '@nestjs/common';
import { CartOptimizationEvaluatorService } from './cart-optimization.evaluator.service';

@Controller('api/v1/cart')
export class CartOptimizationController {
  constructor(private readonly evaluator: CartOptimizationEvaluatorService) {}

  @Post('optimize')
  optimize(@Body() payload: any) {
    return this.evaluator.evaluate(payload);
  }
}

export {};
