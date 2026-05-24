import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CartOptimizationModule } from "./cart-optimization/cart-optimization.module";

@Module({
  imports: [CartOptimizationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
