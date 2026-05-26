import { ApiProperty } from "@nestjs/swagger";

export class StoreDto {
  @ApiProperty({
    example: "s_silpo",
    description: "Unique store brand identifier",
  })
  id: string;

  @ApiProperty({
    example: "Silpo",
    description: "Store brand name",
  })
  brand: string;

  @ApiProperty({
    example: "https://assets.dankoss.ua/logos/silpo.png",
    description: "Store brand logo URL",
    nullable: true,
  })
  logo: string | null;

  @ApiProperty({
    example: "https://silpo.ua",
    description: "Store brand website URL",
    nullable: true,
  })
  website: string | null;

  @ApiProperty({
    example: 42,
    description: "Number of store locations",
  })
  locationCount: number;
}

export class GetStoresResponseDto {
  @ApiProperty({
    type: [StoreDto],
    description: "List of available store brands",
  })
  stores: StoreDto[];
}
