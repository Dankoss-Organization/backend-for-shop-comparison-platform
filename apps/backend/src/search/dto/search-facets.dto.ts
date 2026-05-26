import { ApiProperty } from "@nestjs/swagger";
import { SearchResultsDto } from "./search-result.dto";

export class FacetCountDto {
  @ApiProperty({ description: "Facet value", example: "Electronics" })
  value: string;

  @ApiProperty({ description: "Number of products with this facet value", example: 150 })
  count: number;
}

export class FacetDto {
  @ApiProperty({ description: "Facet name", example: "category" })
  name: string;

  @ApiProperty({
    description: "Facet counts by value",
    isArray: true,
    type: FacetCountDto,
  })
  values: FacetCountDto[];
}

export class PriceRangeDto {
  @ApiProperty({ description: "Minimum price in results", example: 1000 })
  min: number;

  @ApiProperty({ description: "Maximum price in results", example: 100000 })
  max: number;

  @ApiProperty({ description: "Average price in results", example: 45000 })
  avg: number;
}

export class SearchAdvancedResultsDto extends SearchResultsDto {
  @ApiProperty({
    description: "Faceted results for filtering",
    isArray: true,
    type: FacetDto,
  })
  facets?: FacetDto[];

  @ApiProperty({
    description: "Price statistics for results",
    type: PriceRangeDto,
  })
  priceStats?: PriceRangeDto;

  @ApiProperty({
    description: "Applied filters",
    isArray: false,
    example: {
      category: "Electronics",
      minPrice: 1000,
      maxPrice: 50000,
    },
  })
  appliedFilters?: Record<string, any>;
}
