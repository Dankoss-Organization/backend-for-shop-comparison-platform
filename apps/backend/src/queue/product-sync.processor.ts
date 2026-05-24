import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ProductsService } from "../products/products.service";
import { MeilisearchService } from "../search/meilisearch.service";
import { MeilisearchProduct } from "../search/types/meilisearch.types";
import { PRODUCT_SYNC_QUEUE } from "./product-sync.constants";
import { ProductSyncJobData, ProductSyncJobResult } from "./product-sync.types";
import { WorkerThreadsService } from "./worker-threads.service";

const parsedConcurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const workerConcurrency = Number.isFinite(parsedConcurrency) ? parsedConcurrency : 4;
const parsedThreadIterations = Number(process.env.CPU_SIGNAL_ITERATIONS ?? 20000);
const cpuSignalIterations = Number.isFinite(parsedThreadIterations)
  ? Math.max(1000, parsedThreadIterations)
  : 20000;
const useWorkerThreads = (process.env.ENABLE_WORKER_THREADS ?? "true") !== "false";

@Injectable()
@Processor(PRODUCT_SYNC_QUEUE, { concurrency: workerConcurrency })
export class ProductSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductSyncProcessor.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly meilisearchService: MeilisearchService,
    private readonly workerThreadsService: WorkerThreadsService,
  ) {
    super();
  }

  async process(job: Job<ProductSyncJobData>): Promise<ProductSyncJobResult> {
    this.logger.log(`Processing sync job ${job.id} for product ${job.data.productId}`);
    const productCard = await this.productsService.getProductCard(job.data.productId);

    const prices = productCard.topOffers.map((offer) => offer.effectivePrice);

    let cpuMetrics: ProductSyncJobResult["cpuMetrics"];
    if (useWorkerThreads) {
      const signal = await this.workerThreadsService.runPriceSignalTask({
        prices,
        iterations: cpuSignalIterations,
      });

      cpuMetrics = {
        checksum: signal.checksum,
        durationMs: signal.durationMs,
        usedWorkerThread: true,
        threadId: signal.threadId,
        iterations: cpuSignalIterations,
      };
    } else {
      const signal = this.workerThreadsService.runPriceSignalTaskSyncFallback({
        prices,
        iterations: cpuSignalIterations,
      });

      cpuMetrics = {
        checksum: signal.checksum,
        durationMs: signal.durationMs,
        usedWorkerThread: false,
        threadId: null,
        iterations: cpuSignalIterations,
      };
    }

    const result = {
      productId: productCard.product.id,
      offersCount: productCard.topOffers.length,
      bestPrice: productCard.pricingSummary.bestPrice,
      cpuMetrics,
      processedAt: new Date().toISOString(),
    };

    // Index product in Meilisearch (async, non-blocking)
    try {
      const storeNames = [...new Set(productCard.topOffers.map((o) => o.store.brand))];
      const categoryId = (productCard.product as any).categoryId || "";

      const meilisearchDoc: MeilisearchProduct = {
        id: productCard.product.id,
        productId: productCard.product.productId,
        canonicalName: productCard.product.canonicalName,
        brand: productCard.product.brand,
        category: productCard.product.category || "",
        categoryId,
        media: productCard.product.media,
        description: productCard.product.description,
        bestPrice: productCard.pricingSummary.bestPrice,
        oldPrice: productCard.pricingSummary.oldPrice,
        discountPercent: productCard.pricingSummary.discountPercent,
        currency: "UAH",
        offersCount: productCard.topOffers.length,
        storeNames,
        updatedAt: new Date().getTime(),
      };

      await this.meilisearchService.indexProducts({
        documents: [meilisearchDoc],
        primaryKey: "id",
      });

      this.logger.debug(
        `Successfully indexed product ${productCard.product.id} in Meilisearch`,
      );
    } catch (indexError) {
      // Log indexing error but don't fail the sync job
      this.logger.warn(
        `Failed to index product ${productCard.product.id} in Meilisearch: ${
          indexError instanceof Error ? indexError.message : String(indexError)
        }`,
      );
    }

    return result;
  }
}
