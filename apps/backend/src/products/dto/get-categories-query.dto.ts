import { IsOptional, IsString, MaxLength } from "class-validator";

export class GetCategoriesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentId?: string;
}