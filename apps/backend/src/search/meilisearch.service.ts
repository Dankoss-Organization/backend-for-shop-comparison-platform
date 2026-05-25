import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as MeilisearchSDK from "meilisearch";
import {
  MeilisearchProduct,
  MeilisearchHealthStatus,
  MeilisearchBatchIndexParams,
  IndexationTask,
  MeilisearchIndexStats,
} from "./types/meilisearch.types";

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeilisearchSDK.MeiliSearch;
  private indexName: string;

  constructor(private configService: ConfigService) {
    let host = this.configService.get<string>("MEILISEARCH_HOST");
    const apiKey = this.configService.get<string>("MEILISEARCH_API_KEY");
    this.indexName = this.configService.get<string>(
      "MEILISEARCH_INDEX_NAME",
      "products"
    );

    if (!host) {
      this.logger.warn(
        "MEILISEARCH_HOST is not set — falling back to http://127.0.0.1:7700 for local testing",
      );
      // fallback for local development
      host = "http://127.0.0.1:7700";
    }

    this.client = new MeilisearchSDK.MeiliSearch({ host, apiKey: apiKey || undefined });
  }

  async onModuleInit(): Promise<void> {
    await this.initializeIndex();
  }

  /**
   * Initialize the products index with proper settings
   */
  private async initializeIndex(): Promise<void> {
    try {
      // Check if index exists, if not create it
      const indexes = await this.client.getIndexes();
      const indexExists = indexes.results?.some(
        (idx) => idx.uid === this.indexName
      );

      if (!indexExists) {
        this.logger.log(`Creating index "${this.indexName}"...`);
        await this.client.createIndex(this.indexName, {
          primaryKey: "id",
        });
      }

      const index = this.client.index(this.indexName);

      // Configure index settings for optimal search
      await index.updateSettings({
        searchableAttributes: [
          "canonicalName",
          "brand",
          "description",
          "category",
        ],
        filterableAttributes: [
          "category",
          "categoryId",
          "brand",
          "storeNames",
          "bestPrice",
          "currency",
        ],
        sortableAttributes: ["bestPrice", "discountPercent", "updatedAt"],
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: {
            oneTypo: 5,
            twoTypos: 9,
          },
        },
        pagination: {
          maxTotalHits: 10000,
        },
      });

      this.logger.log(`Index "${this.indexName}" initialized successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize index: ${errorMsg}`, error);
      throw error;
    }
  }

  /**
   * Check health status of Meilisearch instance
   */
  async getHealthStatus(): Promise<MeilisearchHealthStatus> {
    try {
      const health = await this.client.health();
      let version: string | undefined;
      try {
        const versionInfo = await this.client.getVersion();
        version = (versionInfo as any).version || "unknown";
      } catch {
        version = "unknown";
      }

      return {
        status: health ? "healthy" : "unhealthy",
        message: "Meilisearch is running",
        version,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Health check failed: ${errorMsg}`);
      return {
        status: "unhealthy",
        message: `Health check failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<MeilisearchIndexStats> {
    try {
      const index = this.client.index(this.indexName);
      const stats = await index.getStats();

      return {
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
        lastUpdate: new Date((stats as any).updatedAt || Date.now()).getTime(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get index stats: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Index (add or update) products
   */
  async indexProducts(
    params: MeilisearchBatchIndexParams
  ): Promise<IndexationTask> {
    try {
      if (params.documents.length === 0) {
        this.logger.warn("No documents provided for indexing");
        return {} as IndexationTask;
      }

      const index = this.client.index(this.indexName);

      this.logger.debug(
        `Indexing ${params.documents.length} products in index "${this.indexName}"`
      );

      const task = await index.addDocuments(params.documents, {
        primaryKey: params.primaryKey || "id",
      });

      return {
        taskUid: task.taskUid,
        indexUid: task.indexUid,
        status: task.status as any,
        type: task.type as any,
        enqueuedAt: task.enqueuedAt.toISOString(),
      } as unknown as IndexationTask;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to index products: ${errorMsg}`, errorStack);
      throw error;
    }
  }

  /**
   * Delete product from index
   */
  async deleteProduct(productId: string): Promise<IndexationTask> {
    try {
      const index = this.client.index(this.indexName);
      const task = await index.deleteDocument(productId);
      this.logger.debug(`Deleted product "${productId}" from index`);
      return {
        taskUid: task.taskUid,
        indexUid: task.indexUid,
        status: task.status as any,
        type: task.type as any,
        enqueuedAt: task.enqueuedAt.toISOString(),
      } as unknown as IndexationTask;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete product: ${errorMsg}`, errorStack);
      throw error;
    }
  }

  /**
   * Clear all documents from index
   */
  async clearIndex(): Promise<IndexationTask> {
    try {
      const index = this.client.index(this.indexName);
      const task = await index.deleteAllDocuments();
      this.logger.warn(`Cleared all documents from index "${this.indexName}"`);
      return {
        taskUid: task.taskUid,
        indexUid: task.indexUid,
        status: task.status as any,
        type: task.type as any,
        enqueuedAt: task.enqueuedAt.toISOString(),
      } as unknown as IndexationTask;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to clear index: ${errorMsg}`, errorStack);
      throw error;
    }
  }

  /**
   * Search products with query and optional filters
   */
  async searchProducts(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: string;
      sort?: string[];
    }
  ): Promise<{
    results: MeilisearchProduct[];
    totalHits: number;
    query: string;
    processingTimeMs: number;
  }> {
    try {
      const index = this.client.index(this.indexName);

      const searchParams: MeilisearchSDK.SearchParams = {
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      };

      if (options?.filter) {
        searchParams.filter = options.filter;
      }

      if (options?.sort) {
        searchParams.sort = options.sort;
      }

      const result = await index.search<MeilisearchProduct>(
        query,
        searchParams
      );

      return {
        results: result.hits,
        totalHits: result.estimatedTotalHits,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to search products: ${errorMsg}`, errorStack);
      throw error;
    }
  }

  /**
   * Advanced search with facets and statistics
   */
  async advancedSearch(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: string;
      sort?: string[];
      facets?: string[];
    }
  ): Promise<{
    results: MeilisearchProduct[];
    totalHits: number;
    query: string;
    processingTimeMs: number;
    facets?: any[];
    priceStats?: {
      min: number;
      max: number;
      avg: number;
    };
  }> {
    try {
      const index = this.client.index(this.indexName);

      const searchParams: MeilisearchSDK.SearchParams = {
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      };

      if (options?.filter) {
        searchParams.filter = options.filter;
      }

      if (options?.sort) {
        searchParams.sort = options.sort;
      }

      if (options?.facets && options.facets.length > 0) {
        searchParams.facets = options.facets;
      }

      const result = await index.search<MeilisearchProduct>(query, searchParams);

      // Extract facet data
      const facetsArray: any[] = [];
      const facetDistribution = (result as any).facetDistribution;

      if (facetDistribution && options?.facets) {
        for (const facetName of options.facets) {
          if (facetDistribution[facetName]) {
            const facetValues = facetDistribution[facetName];
            const values = Object.entries(facetValues).map(([key, count]) => ({
              value: key,
              count: count as number,
            }));

            facetsArray.push({
              name: facetName,
              values,
            });
          }
        }
      }

      // Calculate price statistics from results
      let priceStats;
      if (result.hits.length > 0) {
        const prices = result.hits
          .map((p) => p.bestPrice)
          .filter((p): p is number => p !== null && p !== undefined);

        if (prices.length > 0) {
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

          priceStats = { min, max, avg };
        }
      }

      return {
        results: result.hits,
        totalHits: result.estimatedTotalHits,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
        facets: facetsArray.length > 0 ? facetsArray : undefined,
        priceStats,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to perform advanced search: ${errorMsg}`, errorStack);
      throw error;
    }
  }

  /**
   * Get task status by ID
   */
  async getTaskStatus(taskId: number): Promise<IndexationTask> {
    try {
      const task = await this.client.getTask(taskId);
      const taskData = task as any;
      return {
        taskUid: taskData.taskUid,
        indexUid: taskData.indexUid,
        status: taskData.status,
        type: taskData.type,
        enqueuedAt: new Date(taskData.enqueuedAt).toISOString(),
        startedAt: taskData.startedAt ? new Date(taskData.startedAt).toISOString() : undefined,
        finishedAt: taskData.finishedAt ? new Date(taskData.finishedAt).toISOString() : undefined,
        duration: taskData.duration,
      } as IndexationTask;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get task status: ${errorMsg}`, errorStack);
      throw error;
    }
  }

  /**
   * Get raw Meilisearch client for advanced operations
   */
  getClient(): MeilisearchSDK.MeiliSearch {
    return this.client;
  }

  /**
   * Get index name
   */
  getIndexName(): string {
    return this.indexName;
  }
}
