import { ApiProperty } from "@nestjs/swagger";

export class StoreProductItem {
  @ApiProperty({
    example: "off_shopp_771",
    description: "Offer ID",
  })
  id: string;

  @ApiProperty({
    example: "BAR-005",
    description: "Product ID",
  })
  productId: string;

  @ApiProperty({
    example: "Спагеті Barilla No.5 500г",
    description: "Product canonical name",
  })
  canonicalName: string;

  @ApiProperty({
    example: "Barilla",
    description: "Product brand",
    nullable: true,
  })
  brand: string | null;

  @ApiProperty({
    example: "https://images.unsplash.com/...",
    description: "Product media URL",
  })
  media: string;

  @ApiProperty({
    example: 45.99,
    description: "Current offer price",
  })
  currentPrice: number;

  @ApiProperty({
    example: 59.99,
    description: "Regular price before discount",
  })
  regularPrice: number;

  @ApiProperty({
    example: 23,
    description: "Discount percentage",
    nullable: true,
  })
  discountPercent: number | null;

  @ApiProperty({
    example: "UAH",
    description: "Currency code",
  })
  currency: string;

  @ApiProperty({
    example: "in_stock",
    description: "Availability status",
  })
  availabilityStatus: string;
}

export class GetStoreProductsResponseDto {
  @ApiProperty({
    example: "s_silpo",
    description: "Store brand ID",
  })
  storeId: string;

  @ApiProperty({
    example: "Сільпо",
    description: "Store brand name",
  })
  storeName: string;

  @ApiProperty({
    type: [StoreProductItem],
    description: "List of products available in the store",
  })
  items: StoreProductItem[];

  @ApiProperty({
    example: 85,
    description: "Total number of products",
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: "Current page number",
  })
  page: number;

  @ApiProperty({
    example: 20,
    description: "Items per page",
  })
  limit: number;

  @ApiProperty({
    example: 5,
    description: "Total number of pages",
  })
  totalPages: number;
}
