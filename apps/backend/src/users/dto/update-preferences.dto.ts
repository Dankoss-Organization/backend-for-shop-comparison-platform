import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    type: "array",
    items: { type: "string" },
    example: ["gluten", "lactose"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({
    type: "array",
    items: { type: "string" },
    example: ["vegan", "low-carb"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diet?: string[];

  @ApiPropertyOptional({
    type: "array",
    items: { type: "string" },
    example: ["weight-loss", "heart-health"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthGoals?: string[];

  @ApiPropertyOptional({
    type: "array",
    items: { type: "string" },
    example: ["active", "sedentary"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lifestyle?: string[];
}
