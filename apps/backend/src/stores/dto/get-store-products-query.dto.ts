import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

export enum StoreProductsSort {
  PRICE_ASC = "price_asc",
  DISCOUNT = "discount",
  UPDATED = "updated",
}

export class GetStoreProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  minDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsEnum(StoreProductsSort, {
    message: `sort must be one of: ${Object.values(StoreProductsSort).join(", ")}`,
  })
  sort?: StoreProductsSort;
}
