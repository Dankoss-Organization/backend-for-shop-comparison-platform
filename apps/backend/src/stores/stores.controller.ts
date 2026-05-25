import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiInternalServerErrorResponse,
  ApiQuery,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
import { StoresService } from "./stores.service";
import { GetStoresResponseDto } from "./dto/get-stores-response.dto";
import {
  GetStoreProductsQueryDto,
  StoreProductsSort,
} from "./dto/get-store-products-query.dto";
import { GetStoreProductsResponseDto } from "./dto/get-store-products-response.dto";

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

  @ApiOperation({ summary: "Get products available in a specific store" })
  @ApiQuery({ name: "page", required: false, type: Number, minimum: 1 })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by product name, productId or brand",
  })
  @ApiQuery({
    name: "categoryId",
    required: false,
    type: String,
    description: "Filter by category id",
  })
  @ApiQuery({
    name: "minDiscount",
    required: false,
    type: Number,
    minimum: 0,
    maximum: 100,
    description: "Filter by minimum discount percentage",
  })
  @ApiQuery({
    name: "maxPrice",
    required: false,
    type: Number,
    minimum: 0,
    description: "Filter by maximum product price",
  })
  @ApiQuery({
    name: "minRating",
    required: false,
    type: Number,
    minimum: 0,
    maximum: 5,
    description: "Filter by minimum rating (currently accepted but not applied)",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ["price_asc", "discount", "updated"],
    description: "Sort field",
  })
  @ApiOkResponse({
    description: "Store products retrieved successfully",
    type: GetStoreProductsResponseDto,
  })
  @ApiNotFoundResponse({ description: "Store not found" })
  @ApiBadRequestResponse({ description: "Invalid query parameters" })
  @ApiInternalServerErrorResponse({ description: "Internal server error" })
  @Get(":storeId/products")
  getStoreProducts(
    @Param("storeId") storeId: string,
    @Query() query: GetStoreProductsQueryDto,
  ): Promise<GetStoreProductsResponseDto> {
    return this.storesService.getStoreProducts(storeId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search?.trim() || undefined,
      categoryId: query.categoryId?.trim() || undefined,
      minDiscount: query.minDiscount,
      maxPrice: query.maxPrice,
      minRating: query.minRating,
      sort: query.sort ?? StoreProductsSort.UPDATED,
    });
  }
}
