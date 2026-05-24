import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse } from "@nestjs/swagger";
import { CartsService } from "./carts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetCartResponseDto } from "./dto/get-cart-response.dto";

@Controller("api/v1/cart")
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @ApiBearerAuth()
  @ApiOkResponse({
    type: GetCartResponseDto,
    description: "Current active cart with aggregated offer and product data",
  })
  @Get()
  getCart(@Request() req: { user: { id: string } }) {
    return this.cartsService.getCart(req.user.id);
  }
}
