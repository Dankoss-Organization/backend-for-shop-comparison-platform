import { ApiProperty } from "@nestjs/swagger";

export class AddCartItemResponseDto {
  @ApiProperty({
    example: true,
    description: "Whether the cart item operation succeeded",
  })
  success: boolean;

  @ApiProperty({
    example: "ci_item_001",
    description: "Identifier of the cart item that was created or updated",
  })
  cartItemId: string;
}
