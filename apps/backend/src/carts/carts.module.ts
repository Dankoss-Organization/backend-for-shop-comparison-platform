import { Module } from "@nestjs/common";
import { CartsController } from "./carts.controller";
import { CartsService } from "./carts.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [CartsController],
  providers: [CartsService],
})
export class CartsModule {}
