import { Controller, Get, Query, HttpCode, BadRequestException } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { MeilisearchService } from "./meilisearch.service";
import { SearchProductsQueryDto, SearchSuggestionsQueryDto } from "./dto/search-query.dto";
import {
  SearchResultsDto,
  HealthCheckResponseDto,
  IndexStatsResponseDto,
} from "./dto/search-result.dto";
import {
  SearchAdvancedQueryDto,
  SearchFilterDto,
  SearchSortDto,
} from "./dto/search-filter.dto";
import { SearchAdvancedResultsDto } from "./dto/search-facets.dto";

@ApiTags("search")
@Controller("api/v1/search")
export class SearchController {
  constructor(private readonly meilisearchService: MeilisearchService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: "Search products",
    description: "Full-text search across product catalog with filtering and sorting",
  })
  @ApiOkResponse({
    description: "Products found successfully",
    type: SearchResultsDto,
  })
  @ApiBadRequestResponse({
    description: "Invalid search parameters",
  })
  @ApiInternalServerErrorResponse({
    description: "Search service error",
  })
  async searchProducts(
    @Query() query: SearchProductsQueryDto,
  ): Promise<SearchResultsDto> {
    try {
      if (!query.q || query.q.trim().length === 0) {
        throw new BadRequestException("Search query (q) is required and cannot be empty");
      }

      const limit = query.limit || 20;
      const offset = query.offset || 0;

      const result = await this.meilisearchService.searchProducts(query.q, {
        limit,
        offset,
        filter: query.filter,
        sort: query.sort ? [query.sort] : undefined,
      });

      const totalPages = Math.ceil(result.totalHits / limit);
      const page = Math.floor(offset / limit) + 1;

      return {
        results: result.results,
        totalHits: result.totalHits,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
        count: result.results.length,
        offset,
        limit,
        totalPages,
        page,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Search failed: ${errorMsg}`);
    }
  }

  @Get("advanced")
  @HttpCode(200)
  @ApiOperation({
    summary: "Advanced product search",
    description:
      "Full-text search with advanced filtering, sorting, and faceted results",
  })
  @ApiOkResponse({
    description: "Advanced search results with facets",
    type: SearchAdvancedResultsDto,
  })
  @ApiBadRequestResponse({
    description: "Invalid search parameters",
  })
  @ApiInternalServerErrorResponse({
    description: "Search service error",
  })
  async advancedSearch(
    @Query() query: SearchAdvancedQueryDto,
  ): Promise<SearchAdvancedResultsDto> {
    try {
      if (!query.q || query.q.trim().length === 0) {
        throw new BadRequestException("Search query (q) is required and cannot be empty");
      }

      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      // Build filter string from filter object
      let filterString = "";
      if (query.filters) {
        const conditions: string[] = [];

        if (query.filters.categoryId) {
          conditions.push(`categoryId = "${query.filters.categoryId}"`);
        }

        if (query.filters.brand) {
          conditions.push(`brand = "${query.filters.brand}"`);
        }

        if (query.filters.minPrice !== undefined) {
          conditions.push(`bestPrice >= ${query.filters.minPrice}`);
        }

        if (query.filters.maxPrice !== undefined) {
          conditions.push(`bestPrice <= ${query.filters.maxPrice}`);
        }

        if (query.filters.minDiscount !== undefined) {
          conditions.push(`discountPercent >= ${query.filters.minDiscount}`);
        }

        if (query.filters.stores) {
          const stores = query.filters.stores.split(",").map((s) => `"${s.trim()}"`);
          conditions.push(`storeNames IN [${stores.join(", ")}]`);
        }

        if (conditions.length > 0) {
          filterString = conditions.join(" AND ");
        }
      }

      // Build sort array
      const sortArray: string[] = [];
      if (query.sort?.field) {
        const direction = query.sort.direction || "asc";
        sortArray.push(`${query.sort.field}:${direction}`);
      }

      // Parse facets
      const facetsToRetrieve = query.facets
        ? query.facets.split(",").map((f) => f.trim())
        : ["category", "brand", "storeNames"];

      // Perform search
      const result = await this.meilisearchService.advancedSearch(query.q, {
        limit,
        offset,
        filter: filterString,
        sort: sortArray.length > 0 ? sortArray : undefined,
        facets: facetsToRetrieve,
      });

      const totalPages = Math.ceil(result.totalHits / limit);

      // Prepare response
      const response: SearchAdvancedResultsDto = {
        results: result.results,
        totalHits: result.totalHits,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
        count: result.results.length,
        offset,
        limit,
        totalPages,
        page,
        facets: result.facets,
        priceStats: result.priceStats,
        appliedFilters: {
          ...(query.filters?.categoryId && { category: query.filters.categoryId }),
          ...(query.filters?.brand && { brand: query.filters.brand }),
          ...(query.filters?.minPrice !== undefined && { minPrice: query.filters.minPrice }),
          ...(query.filters?.maxPrice !== undefined && { maxPrice: query.filters.maxPrice }),
          ...(query.filters?.minDiscount !== undefined && {
            minDiscount: query.filters.minDiscount,
          }),
          ...(query.filters?.stores && { stores: query.filters.stores }),
        },
      };

      return response;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Advanced search failed: ${errorMsg}`);
    }
  }

  @Get("suggestions")
  @HttpCode(200)
  @ApiOperation({
    summary: "Get search suggestions (autocomplete)",
    description: "Returns partial matches for autocomplete functionality",
  })
  @ApiOkResponse({
    description: "Suggestions retrieved successfully",
    type: [String],
  })
  @ApiBadRequestResponse({
    description: "Invalid query parameters",
  })
  @ApiInternalServerErrorResponse({
    description: "Suggestion service error",
  })
  async getSearchSuggestions(
    @Query() query: SearchSuggestionsQueryDto,
  ): Promise<{
    suggestions: string[];
    query: string;
  }> {
    try {
      if (!query.q || query.q.trim().length === 0) {
        throw new BadRequestException("Query (q) is required and cannot be empty");
      }

      const limit = query.limit || 10;

      // Get suggestions by searching with partial query
      const result = await this.meilisearchService.searchProducts(query.q, {
        limit,
        offset: 0,
      });

      // Extract unique product names as suggestions
      const suggestions = [...new Set(result.results.map((p) => p.canonicalName))];

      return {
        suggestions: suggestions.slice(0, limit),
        query: query.q,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Suggestions failed: ${errorMsg}`);
    }
  }

  @Get("health")
  @HttpCode(200)
  @ApiOperation({
    summary: "Check Meilisearch health",
    description: "Returns health status of Meilisearch instance",
  })
  @ApiOkResponse({
    description: "Health check completed",
    type: HealthCheckResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: "Health check failed",
  })
  async getHealth(): Promise<HealthCheckResponseDto> {
    const health = await this.meilisearchService.getHealthStatus();
    return {
      ...health,
      timestamp: Date.now(),
    };
  }

  @Get("stats")
  @HttpCode(200)
  @ApiOperation({
    summary: "Get index statistics",
    description: "Returns statistics about the current search index",
  })
  @ApiOkResponse({
    description: "Index statistics retrieved successfully",
    type: IndexStatsResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: "Failed to retrieve statistics",
  })
  async getStats(): Promise<IndexStatsResponseDto> {
    const stats = await this.meilisearchService.getIndexStats();
    return {
      ...stats,
      timestamp: Date.now(),
    };
  }

  @Get("task/:taskId")
  @HttpCode(200)
  @ApiOperation({
    summary: "Get task status",
    description: "Get status of an async indexation task",
  })
  @ApiQuery({
    name: "taskId",
    type: Number,
    description: "Task ID returned from indexation operation",
  })
  @ApiOkResponse({
    description: "Task status retrieved successfully",
    schema: {
      example: {
        taskUid: 1,
        indexUid: "products",
        status: "succeeded",
        type: "documentAdditionOrUpdate",
        enqueuedAt: "2026-05-18T10:00:00Z",
        startedAt: "2026-05-18T10:00:01Z",
        finishedAt: "2026-05-18T10:00:02Z",
        duration: 1000,
      },
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid task ID",
  })
  async getTaskStatus(taskId: number) {
    try {
      const task = await this.meilisearchService.getTaskStatus(Number(taskId));
      return task;
    } catch (error) {
      throw new BadRequestException(`Invalid task ID or task not found`);
    }
  }
}
