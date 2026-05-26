import { IsOptional, IsString, MaxLength } from "class-validator";

export class GetRecipeCategoriesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentId?: string;
}