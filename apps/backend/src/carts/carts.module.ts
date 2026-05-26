import { Module } from "@nestjs/common";
import { CartsController } from "./carts.controller";
import { CartsService } from "./carts.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CartsController],
  providers: [CartsService],
})
export class CartsModule {}
