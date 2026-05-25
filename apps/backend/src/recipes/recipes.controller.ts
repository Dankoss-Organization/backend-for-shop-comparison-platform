import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { GetRecipeCategoriesQueryDto } from "./dto/get-recipe-categories-query.dto";
import { GetRelatedRecipesQueryDto } from "./dto/get-related-recipes-query.dto";
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

  @ApiOperation({ summary: "Get recipe categories tree" })
  @ApiQuery({
    name: "parentId",
    required: false,
    type: String,
    description: "Return a subtree rooted at the selected category",
  })
  @ApiOkResponse({ description: "Recipe categories returned successfully." })
  @ApiNotFoundResponse({ description: "Category was not found." })
  @Get("categories")
  getRecipeCategories(@Query() query: GetRecipeCategoriesQueryDto) {
    return this.recipesService.getRecipeCategories(query.parentId?.trim() || undefined);
  }

  @ApiOperation({ summary: "Get related recipes" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    minimum: 1,
    maximum: 20,
    description: "Maximum related recipes count",
  })
  @ApiOkResponse({ description: "Related recipes returned successfully." })
  @ApiNotFoundResponse({ description: "Recipe was not found." })
  @ApiBadRequestResponse({ description: "Invalid limit value." })
  @Get(":id/related")
  getRelatedRecipes(
    @Param("id") id: string,
    @Query() query: GetRelatedRecipesQueryDto,
  ) {
    return this.recipesService.getRelatedRecipes(id, query.limit ?? 8);
  }

  @ApiOperation({ summary: "Get recipe details" })
  @ApiOkResponse({ description: "Recipe details returned successfully." })
  @ApiNotFoundResponse({ description: "Recipe was not found." })
  @Get(":id")
  getRecipeById(@Param("id") id: string) {
    return this.recipesService.getRecipeById(id);
  }
}