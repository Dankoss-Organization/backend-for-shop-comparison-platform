import { ApiProperty } from "@nestjs/swagger";

export class CartOfferProductDto {
  @ApiProperty({
    example: "BAR-005",
    description: "Product identifier",
  })
  productId: string;

  @ApiProperty({
    example: "Спагеті Barilla No.5 500г",
    description: "Canonical product name",
  })
  canonicalName: string;

  @ApiProperty({
    example: "https://images.unsplash.com/...",
    description: "Product media URL",
  })
  media: string;
}

export class CartOfferStoreDto {
  @ApiProperty({
    example: "s_silpo",
    description: "Store identifier",
  })
  id: string;

  @ApiProperty({
    example: "Silpo",
    description: "Store brand name",
  })
  brand: string;

  @ApiProperty({
    example: "Kyiv",
    description: "Store city",
  })
  city: string;
}

export class CartOfferDto {
  @ApiProperty({
    example: "off_shopp_771",
    description: "Offer identifier",
  })
  id: string;

  @ApiProperty({
    example: 45.99,
    description: "Current offer price",
  })
  currentPrice: number;

  @ApiProperty({
    example: null,
    description: "Discounted offer price if available",
    nullable: true,
  })
  discountPrice: number | null;

  @ApiProperty({
    type: CartOfferProductDto,
    description: "Basic product information for the offer",
  })
  product: CartOfferProductDto;

  @ApiProperty({
    type: CartOfferStoreDto,
    description: "Store information for the offer",
  })
  store: CartOfferStoreDto;
}

export class CartItemDto {
  @ApiProperty({
    example: "ci_item_001",
    description: "Cart item identifier",
  })
  id: string;

  @ApiProperty({
    example: 2,
    description: "Cart item quantity",
  })
  quantity: number;

  @ApiProperty({
    example: 45.99,
    description: "Item price per unit",
  })
  price: number;

  @ApiProperty({
    type: CartOfferDto,
    description: "Offer data aggregated for this cart item",
  })
  offer: CartOfferDto;
}

export class GetCartResponseDto {
  @ApiProperty({
    example: "cart_usr_9921",
    description: "Cart identifier",
    nullable: true,
  })
  id: string | null;

  @ApiProperty({
    example: true,
    description: "Whether the cart is the active one",
  })
  isActive: boolean;

  @ApiProperty({
    type: [CartItemDto],
    description: "Cart items aggregated with offer and product details",
  })
  items: CartItemDto[];

  @ApiProperty({
    example: 91.98,
    description: "Total cart sum",
  })
  sum: number;

  @ApiProperty({
    example: 0,
    description: "Total discount sum",
  })
  discountSum: number;

  @ApiProperty({
    example: "UAH",
    description: "Currency code",
  })
  currency: string;
}
