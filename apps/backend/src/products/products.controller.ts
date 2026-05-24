import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiTags,
} from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { ProductAnalyticsQueueService } from "../queue/product-analytics-queue.service";
import { ProductSyncQueueService } from "../queue/product-sync-queue.service";
import { GetCategoriesQueryDto } from "./dto/get-categories-query.dto";
import { GetProductOffersQueryDto } from "./dto/get-product-offers-query.dto";
import { GetProductPriceHistoryQueryDto } from "./dto/get-product-price-history-query.dto";
import { GetProductsQueryDto } from "./dto/get-products-query.dto";
import { GetRelatedProductsQueryDto } from "./dto/get-related-products-query.dto";
import { ProductsService } from "./products.service";

class EnqueueProductSyncDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}

class EnqueueProductAnalyticsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  period?: string;
}

@ApiTags("products")
@Controller("api/v1/products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productSyncQueueService: ProductSyncQueueService,
    private readonly productAnalyticsQueueService: ProductAnalyticsQueueService,
  ) {}

  @ApiOperation({ summary: "Get product catalog" })
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
    name: "brand",
    required: false,
    type: String,
    description: "Filter by brand name",
  })
  @ApiQuery({
    name: "categoryId",
    required: false,
    type: String,
    description: "Filter by category id",
  })
  @ApiQuery({
    name: "storeId",
    required: false,
    type: String,
    description: "Filter by store id",
  })
  @ApiQuery({
    name: "minPrice",
    required: false,
    type: Number,
    description: "Minimum effective offer price",
  })
  @ApiQuery({
    name: "maxPrice",
    required: false,
    type: Number,
    description: "Maximum effective offer price",
  })
  @ApiQuery({
    name: "minDiscount",
    required: false,
    type: Number,
    description: "Minimum discount percentage",
  })
  @ApiQuery({
    name: "minRating",
    required: false,
    type: Number,
    description:
      "Minimum rating threshold. Currently accepted for compatibility with the UI contract.",
  })
  @ApiQuery({
    name: "inStock",
    required: false,
    type: Boolean,
    description: "When true, return only products with active offers",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ["updated", "name", "price_asc", "price_desc", "discount"],
    description: "Sort field",
  })
  @ApiOkResponse({ description: "Product catalog returned successfully." })
  @ApiBadRequestResponse({ description: "Invalid query parameters." })
  @Get()
  getProducts(@Query() query: GetProductsQueryDto) {
    return this.productsService.getProducts({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search?.trim() || undefined,
      brand: query.brand?.trim() || undefined,
      categoryId: query.categoryId?.trim() || undefined,
      storeId: query.storeId?.trim() || undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minDiscount: query.minDiscount,
      minRating: query.minRating,
      inStock: query.inStock ?? false,
      sort: query.sort ?? "updated",
    });
  }

  @ApiOperation({ summary: "Get product categories" })
  @ApiQuery({
    name: "parentId",
    required: false,
    type: String,
    description: "Return a subtree rooted at the selected category",
  })
  @ApiOkResponse({ description: "Categories returned successfully." })
  @ApiNotFoundResponse({ description: "Category was not found." })
  @Get("categories")
  getCategories(@Query() query: GetCategoriesQueryDto) {
    return this.productsService.getCategories(
      query.parentId?.trim() || undefined,
    );
  }

  @ApiOperation({
    summary: "Enqueue product sync job for background processing",
  })
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
  @ApiCreatedResponse({
    description: "Product sync job enqueued successfully.",
  })
  @Post(":id/sync")
  enqueueProductSync(
    @Param("id") id: string,
    @Body() body: EnqueueProductSyncDto,
  ) {
    return this.productSyncQueueService.enqueueProductSync(id, body?.source);
  }

  @ApiOperation({
    summary: "Get status of a previously enqueued product sync job",
  })
  @ApiOkResponse({ description: "Sync job status returned successfully." })
  @Get("sync-jobs/:jobId")
  getSyncJobStatus(@Param("jobId") jobId: string) {
    return this.productSyncQueueService.getSyncJobStatus(jobId);
  }

  @ApiOperation({ summary: "Enqueue heavy product analytics rebuild job" })
  @ApiBody({
    required: false,
    schema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          example: "manual-analytics",
        },
        period: {
          type: "string",
          example: "30d",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Product analytics rebuild job enqueued successfully.",
  })
  @Post(":id/analytics/rebuild")
  enqueueProductAnalyticsRebuild(
    @Param("id") id: string,
    @Body() body: EnqueueProductAnalyticsDto,
  ) {
    return this.productAnalyticsQueueService.enqueueProductAnalytics(
      id,
      body?.period?.trim() || "30d",
      body?.source,
    );
  }

  @ApiOperation({
    summary: "Get status of a previously enqueued analytics rebuild job",
  })
  @ApiOkResponse({ description: "Analytics job status returned successfully." })
  @Get("analytics-jobs/:jobId")
  getAnalyticsJobStatus(@Param("jobId") jobId: string) {
    return this.productAnalyticsQueueService.getAnalyticsJobStatus(jobId);
  }

  @ApiOperation({
    summary: "Get a product card with top offers and summary stats",
  })
  @ApiOkResponse({ description: "Product card returned successfully." })
  @ApiNotFoundResponse({ description: "Product was not found." })
  @Get(":id/card")
  getProductCard(@Param("id") id: string) {
    return this.productsService.getProductCard(id);
  }

  @ApiOperation({
    summary: "Get product offers with sorting and stock filtering",
  })
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
  @ApiOkResponse({
    description: "Product price history returned successfully.",
  })
  @ApiNotFoundResponse({ description: "Product was not found." })
  @ApiBadRequestResponse({ description: "Invalid period format." })
  @Get(":id/price-history")
  getProductPriceHistory(
    @Param("id") id: string,
    @Query() query: GetProductPriceHistoryQueryDto,
  ) {
    return this.productsService.getProductPriceHistory(
      id,
      query.period ?? "30d",
    );
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
