import { Controller, Get } from "@nestjs/common";
import {
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";
import { StoresService } from "./stores.service";
import { GetStoresResponseDto } from "./dto/get-stores-response.dto";

@ApiTags("stores")
@Controller("api/v1/stores")
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @ApiOperation({ summary: "Get list of available store brands" })
  @ApiOkResponse({
    description: "List of store brands retrieved successfully",
    type: GetStoresResponseDto,
  })
  @ApiInternalServerErrorResponse({ description: "Internal server error" })
  @Get()
  getStores(): Promise<GetStoresResponseDto> {
    return this.storesService.getStores();
  }
}
