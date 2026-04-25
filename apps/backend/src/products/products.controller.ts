import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiCreatedResponse,
  ApiTags,
} from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { ProductSyncQueueService } from "../queue/product-sync-queue.service";
import { GetProductOffersQueryDto } from "./dto/get-product-offers-query.dto";
import { GetProductPriceHistoryQueryDto } from "./dto/get-product-price-history-query.dto";
import { GetRelatedProductsQueryDto } from "./dto/get-related-products-query.dto";
import { ProductsService } from "./products.service";

class EnqueueProductSyncDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}

@ApiTags("products")
@Controller("api/v1/products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productSyncQueueService: ProductSyncQueueService,
  ) {}

  @ApiOperation({ summary: "Enqueue product sync job for background processing" })
  @ApiBody({
    required: false,
    schema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          example: "manual-refresh",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Product sync job enqueued successfully." })
  @Post(":id/sync")
  enqueueProductSync(
    @Param("id") id: string,
    @Body() body: EnqueueProductSyncDto,
  ) {
    return this.productSyncQueueService.enqueueProductSync(id, body?.source);
  }

  @ApiOperation({ summary: "Get status of a previously enqueued product sync job" })
  @ApiOkResponse({ description: "Sync job status returned successfully." })
  @Get("sync-jobs/:jobId")
  getSyncJobStatus(@Param("jobId") jobId: string) {
    return this.productSyncQueueService.getSyncJobStatus(jobId);
  }

  @ApiOperation({ summary: "Get a product card with top offers and summary stats" })
  @ApiOkResponse({ description: "Product card returned successfully." })
  @ApiNotFoundResponse({ description: "Product was not found." })
  @Get(":id/card")
  getProductCard(@Param("id") id: string) {
    return this.productsService.getProductCard(id);
  }

  @ApiOperation({ summary: "Get product offers with sorting and stock filtering" })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ["price", "discount", "updated"],
    description: "Sort field for offers",
  })
  @ApiQuery({
    name: "inStock",
    required: false,
    type: Boolean,
    description: "When true, return only in-stock offers",
  })
  @ApiOkResponse({ description: "Product offers returned successfully." })
  @ApiNotFoundResponse({ description: "Product was not found." })
  @ApiBadRequestResponse({ description: "Invalid query parameters." })
  @Get(":id/offers")
  getProductOffers(
    @Param("id") id: string,
    @Query() query: GetProductOffersQueryDto,
  ) {
    return this.productsService.getProductOffers(id, {
      sort: query.sort ?? "price",
      inStock: query.inStock ?? false,
    });
  }

  @ApiOperation({ summary: "Get product price history for a given period" })
  @ApiQuery({
    name: "period",
    required: false,
    schema: {
      type: "string",
      pattern: "^(\\d+)(d|w|m)$",
      default: "30d",
    },
    description: "Time period, e.g. 30d, 2w, 3m",
  })
  @ApiOkResponse({ description: "Product price history returned successfully." })
  @ApiNotFoundResponse({ description: "Product was not found." })
  @ApiBadRequestResponse({ description: "Invalid period format." })
  @Get(":id/price-history")
  getProductPriceHistory(
    @Param("id") id: string,
    @Query() query: GetProductPriceHistoryQueryDto,
  ) {
    return this.productsService.getProductPriceHistory(id, query.period ?? "30d");
  }

  @ApiOperation({ summary: "Get related products" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    minimum: 1,
    maximum: 20,
    description: "Maximum related products count",
  })
  @ApiOkResponse({ description: "Related products returned successfully." })
  @ApiNotFoundResponse({ description: "Product was not found." })
  @ApiBadRequestResponse({ description: "Invalid limit value." })
  @Get(":id/related")
  getRelatedProducts(
    @Param("id") id: string,
    @Query() query: GetRelatedProductsQueryDto,
  ) {
    return this.productsService.getRelatedProducts(id, query.limit ?? 8);
  }
}
