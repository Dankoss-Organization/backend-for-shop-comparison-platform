import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class SearchProductsQueryDto {
  @ApiProperty({
    description: "Search query string",
    example: "apple iphone",
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Type(() => String)
  q: string;

  @ApiProperty({
    description: "Number of results to return (pagination)",
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: "Offset for pagination (skip N results)",
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number = 0;

  @ApiProperty({
    description:
      'Filter by category (Meilisearch filter syntax, e.g., "category = electronics")',
    example: 'category = "Electronics"',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  filter?: string;

  @ApiProperty({
    description: "Sort by field (e.g., 'bestPrice:asc' or 'discountPercent:desc')",
    example: "bestPrice:asc",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  sort?: string;
}

export class SearchSuggestionsQueryDto {
  @ApiProperty({
    description: "Query prefix for autocomplete",
    example: "iph",
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @Type(() => String)
  q: string;

  @ApiProperty({
    description: "Maximum number of suggestions",
    example: 10,
    minimum: 1,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
