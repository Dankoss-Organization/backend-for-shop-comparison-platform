import { ApiProperty } from "@nestjs/swagger";

export class CategoryFacetBrandDto {
  @ApiProperty({ example: "Селянське", description: "Brand name" })
  name: string;

  @ApiProperty({
    example: 84,
    description: "Product count for this brand in the category",
  })
  count: number;
}

export class CategoryFacetStoreDto {
  @ApiProperty({ example: "novus", description: "Store identifier" })
  id: string;

  @ApiProperty({ example: "Novus", description: "Store display name" })
  name: string;

  @ApiProperty({
    example: 213,
    description: "Offer/product count for this store in the category",
  })
  count: number;
}

export class CategoryFacetPriceRangeDto {
  @ApiProperty({
    example: 20,
    description: "Minimum effective price for the category",
  })
  min: number | null;

  @ApiProperty({
    example: 150,
    description: "Maximum effective price for the category",
  })
  max: number | null;
}

export class CategoryFacetRatingDto {
  @ApiProperty({ example: 5, description: "Rating value" })
  value: number;

  @ApiProperty({ example: 142, description: "Product count for this rating" })
  count: number;
}

export class CategoryFacetAvailabilityDto {
  @ApiProperty({
    example: 280,
    description: "Number of in-stock offers/products in the category",
  })
  inStock: number;

  @ApiProperty({
    example: 40,
    description: "Number of out-of-stock offers/products in the category",
  })
  outOfStock: number;
}

export class GetCategoryFacetsResponseDto {
  @ApiProperty({
    type: [CategoryFacetBrandDto],
    description: "Available brands in the category",
  })
  brands: CategoryFacetBrandDto[];

  @ApiProperty({
    type: CategoryFacetPriceRangeDto,
    description: "Price range available in the category",
  })
  priceRange: CategoryFacetPriceRangeDto;

  @ApiProperty({
    type: [CategoryFacetRatingDto],
    description: "Ratings available in the category",
    nullable: true,
  })
  ratings: CategoryFacetRatingDto[];

  @ApiProperty({
    type: [CategoryFacetStoreDto],
    description: "Available stores in the category",
  })
  stores: CategoryFacetStoreDto[];

  @ApiProperty({
    type: CategoryFacetAvailabilityDto,
    description: "Availability counts in the category",
  })
  availability: CategoryFacetAvailabilityDto;
}
