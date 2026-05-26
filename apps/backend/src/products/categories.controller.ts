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
}
