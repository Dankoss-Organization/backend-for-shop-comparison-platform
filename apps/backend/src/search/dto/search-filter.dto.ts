import { IsString, IsOptional, IsNumber, Min, Max, IsArray, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

export class SearchFilterDto {
  @ApiProperty({
    description: "Filter by category name",
    example: "Electronics",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  category?: string;

  @ApiProperty({
    description: "Filter by category ID",
    example: "cat-001",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  categoryId?: string;

  @ApiProperty({
    description: "Minimum price (UAH)",
    example: 5000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @ApiProperty({
    description: "Maximum price (UAH)",
    example: 50000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    description: "Filter by brand",
    example: "Apple",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  brand?: string;

  @ApiProperty({
    description: "Filter by store names (comma-separated)",
    example: "Foxtrot,Eldorado",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  stores?: string;

  @ApiProperty({
    description: "Minimum discount percent",
    example: 10,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  minDiscount?: number;
}

export class SearchSortDto {
  @ApiProperty({
    description: "Sort by field",
    enum: ["bestPrice", "discountPercent", "canonicalName", "updatedAt"],
    example: "bestPrice",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  field?: "bestPrice" | "discountPercent" | "canonicalName" | "updatedAt";

  @ApiProperty({
    description: "Sort direction",
    enum: [SortDirection.ASC, SortDirection.DESC],
    example: SortDirection.ASC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  @Type(() => String)
  direction?: SortDirection;
}

export class SearchAdvancedQueryDto {
  @ApiProperty({
    description: "Search query string",
    example: "iphone 15",
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Type(() => String)
  q: string;

  @ApiProperty({
    description: "Results per page",
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
    description: "Page number (1-based)",
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: "Filters for search",
    type: SearchFilterDto,
    required: false,
  })
  @IsOptional()
  @Type(() => SearchFilterDto)
  filters?: SearchFilterDto;

  @ApiProperty({
    description: "Sort configuration",
    type: SearchSortDto,
    required: false,
  })
  @IsOptional()
  @Type(() => SearchSortDto)
  sort?: SearchSortDto;

  @ApiProperty({
    description: "Facets to retrieve (comma-separated)",
    example: "category,brand,storeNames",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  facets?: string;
}
