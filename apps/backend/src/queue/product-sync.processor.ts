import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ProductsService } from "../products/products.service";
import { PRODUCT_SYNC_QUEUE } from "./product-sync.constants";
import { ProductSyncJobData, ProductSyncJobResult } from "./product-sync.types";

const parsedConcurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const workerConcurrency = Number.isFinite(parsedConcurrency) ? parsedConcurrency : 4;

@Injectable()
@Processor(PRODUCT_SYNC_QUEUE, { concurrency: workerConcurrency })
export class ProductSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductSyncProcessor.name);

  constructor(private readonly productsService: ProductsService) {
    super();
  }

  async process(job: Job<ProductSyncJobData>): Promise<ProductSyncJobResult> {
    this.logger.log(`Processing sync job ${job.id} for product ${job.data.productId}`);
    const productCard = await this.productsService.getProductCard(job.data.productId);

    return {
      productId: productCard.product.id,
      offersCount: productCard.topOffers.length,
      bestPrice: productCard.pricingSummary.bestPrice,
      processedAt: new Date().toISOString(),
    };
  }
}
