import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { GetCategoriesQueryDto } from "./dto/get-categories-query.dto";
import { GetCategoryProductsQueryDto } from "./dto/get-category-products-query.dto";
import { GetCategoryFacetsResponseDto } from "./dto/get-category-facets-response.dto";
import { ProductsService } from "./products.service";

@ApiTags("categories")
@Controller("api/v1")
export class CategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: "Get product categories tree" })
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

  @ApiOperation({ summary: "Get category metadata by slug" })
  @ApiParam({
    name: "categorySlug",
    type: String,
    description: "Slug of the category to fetch",
  })
  @ApiOkResponse({ description: "Category metadata returned successfully." })
  @ApiNotFoundResponse({ description: "Category was not found." })
  @Get("categories/:categorySlug")
  getCategoryBySlug(@Param("categorySlug") categorySlug: string) {
    return this.productsService.getCategoryBySlug(categorySlug.trim());
  }

  @ApiOperation({ summary: "Get products for a category" })
  @ApiParam({
    name: "categorySlug",
    type: String,
    description: "Slug of the category to fetch products for",
  })
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
    type: [String],
    description: "Filter by one or more brands",
  })
  @ApiQuery({
    name: "storeId",
    required: false,
    type: [String],
    description: "Filter by one or more stores",
  })
  @ApiQuery({ name: "minPrice", required: false, type: Number })
  @ApiQuery({ name: "maxPrice", required: false, type: Number })
  @ApiQuery({ name: "minDiscount", required: false, type: Number })
  @ApiQuery({ name: "minRating", required: false, type: Number })
  @ApiQuery({
    name: "inStock",
    required: false,
    type: Boolean,
    description: "When true, return only products with available offers",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ["updated", "name", "price_asc", "price_desc", "discount"],
    description: "Sort field",
  })
  @ApiOkResponse({ description: "Category products returned successfully." })
  @ApiNotFoundResponse({ description: "Category was not found." })
  @Get("categories/:categorySlug/products")
  getCategoryProducts(
    @Param("categorySlug") categorySlug: string,
    @Query() query: GetCategoryProductsQueryDto,
  ) {
    return this.productsService.getCategoryProducts(categorySlug.trim(), {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search?.trim() || undefined,
      brand: query.brand,
      storeId: query.storeId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minDiscount: query.minDiscount,
      minRating: query.minRating,
      inStock: query.inStock ?? false,
      sort: query.sort ?? "updated",
    });
  }

  @ApiOperation({ summary: "Get category facets for filters" })
  @ApiParam({
    name: "categorySlug",
    type: String,
    description: "Slug of the category to fetch facets for",
  })
  @ApiOkResponse({
    description: "Category facets returned successfully.",
    type: GetCategoryFacetsResponseDto,
  })
  @ApiNotFoundResponse({ description: "Category was not found." })
  @Get("categories/:categorySlug/facets")
  getCategoryFacets(@Param("categorySlug") categorySlug: string) {
    return this.productsService.getCategoryFacets(categorySlug.trim());
  }
}
