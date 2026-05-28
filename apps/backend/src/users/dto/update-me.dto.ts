import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class UpdateMeDto {
  @ApiPropertyOptional({ example: "Ivan Petrov" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ example: "Kyiv" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;
}
