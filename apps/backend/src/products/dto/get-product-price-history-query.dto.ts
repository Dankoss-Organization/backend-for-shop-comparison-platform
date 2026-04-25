import { IsOptional, Matches } from "class-validator";

export class GetProductPriceHistoryQueryDto {
  @IsOptional()
  @Matches(/^(\d+)(d|w|m)$/i, {
    message: "period must match format like 30d, 2w or 3m",
  })
  period?: string;
}
