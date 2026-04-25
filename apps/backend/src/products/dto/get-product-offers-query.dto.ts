import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional } from "class-validator";

export class GetProductOffersQueryDto {
  @IsOptional()
  @IsIn(["price", "discount", "updated"])
  sort?: "price" | "discount" | "updated";

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === true || value === "true") {
      return true;
    }
    if (value === false || value === "false") {
      return false;
    }
    return value;
  })
  @IsBoolean()
  inStock?: boolean;
}
