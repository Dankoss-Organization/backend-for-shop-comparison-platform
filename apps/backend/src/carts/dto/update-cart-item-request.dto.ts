import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class UpdateCartItemRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
