import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateLocationDto {
  @ApiProperty({ example: "Home" })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: "Konovaltsya St, 26" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: "Kyiv" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 50.43 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 30.52 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
