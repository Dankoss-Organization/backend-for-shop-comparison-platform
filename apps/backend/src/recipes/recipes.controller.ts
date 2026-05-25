import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { GetRecipesQueryDto } from "./dto/get-recipes-query.dto";
import { RecipesService } from "./recipes.service";

@ApiTags("recipes")
@Controller("api/v1/recipes")
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @ApiOperation({ summary: "Get recipes list" })
  @ApiQuery({ name: "page", required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by recipe name" })
  @ApiQuery({ name: "categoryId", required: false, type: String, description: "Filter by category id" })
  @ApiQuery({ name: "difficulty", required: false, enum: ["easy", "medium", "hard"] })
  @ApiQuery({ name: "sort", required: false, enum: ["rating", "newest", "prepTime"] })
  @ApiOkResponse({ description: "Recipes returned successfully." })
  @ApiBadRequestResponse({ description: "Invalid query parameters." })
  @Get()
  getRecipes(@Query() query: GetRecipesQueryDto) {
    return this.recipesService.getRecipes({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search?.trim() || undefined,
      categoryId: query.categoryId?.trim() || undefined,
      difficulty: query.difficulty,
      sort: query.sort ?? "rating",
    });
  }

  @ApiOperation({ summary: "Get recipe details" })
  @ApiOkResponse({ description: "Recipe details returned successfully." })
  @ApiNotFoundResponse({ description: "Recipe was not found." })
  @Get(":id")
  getRecipeById(@Param("id") id: string) {
    return this.recipesService.getRecipeById(id);
  }
}