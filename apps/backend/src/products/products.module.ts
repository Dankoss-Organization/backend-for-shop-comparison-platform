import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { QueueModule } from "../queue/queue.module";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
