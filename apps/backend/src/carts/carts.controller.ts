import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { CartsService } from "./carts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("api/v1/cart")
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  getCart(@Request() req: { user: { id: string } }) {
    return this.cartsService.getCart(req.user.id);
  }
}
