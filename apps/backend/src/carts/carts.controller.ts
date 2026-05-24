import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import { CartsService } from "./carts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AddCartItemRequestDto } from "./dto/add-cart-item-request.dto";
import { AddCartItemResponseDto } from "./dto/add-cart-item-response.dto";
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

  @ApiBearerAuth()
  @ApiCreatedResponse({
    type: AddCartItemResponseDto,
    description: "Cart item added or updated successfully",
  })
  @Post("items")
  addCartItem(
    @Request() req: { user: { id: string } },
    @Body() body: AddCartItemRequestDto,
  ) {
    return this.cartsService.addCartItem(req.user.id, body);
  }
}
