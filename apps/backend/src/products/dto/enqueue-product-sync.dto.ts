import { IsOptional, IsString, MaxLength } from "class-validator";

export class EnqueueProductSyncDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
