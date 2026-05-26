import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class GetRelatedRecipesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}