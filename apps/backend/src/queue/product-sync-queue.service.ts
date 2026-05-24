import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { JobState, Queue } from "bullmq";
import { PRODUCT_SYNC_JOB, PRODUCT_SYNC_QUEUE } from "./product-sync.constants";
import { ProductSyncJobData, ProductSyncJobResult } from "./product-sync.types";

@Injectable()
export class ProductSyncQueueService {
  constructor(
    @InjectQueue(PRODUCT_SYNC_QUEUE)
    private readonly productSyncQueue: Queue<ProductSyncJobData, ProductSyncJobResult>,
  ) {}

  async enqueueProductSync(productId: string, source?: string) {
    const job = await this.productSyncQueue.add(
      PRODUCT_SYNC_JOB,
      {
        productId,
        source: source?.trim() || "api",
        requestedAt: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    return {
      queue: PRODUCT_SYNC_QUEUE,
      jobName: PRODUCT_SYNC_JOB,
      jobId: String(job.id),
      status: "queued",
      createdAt: new Date().toISOString(),
    };
  }

  async getSyncJobStatus(jobId: string) {
    const job = await this.productSyncQueue.getJob(jobId);
    if (!job) {
      return {
        jobId,
        status: "not_found",
      };
    }

    const state = await job.getState();

    return {
      queue: PRODUCT_SYNC_QUEUE,
      jobId,
      name: job.name,
      status: this.mapJobStatus(state),
      attemptsMade: job.attemptsMade,
      data: job.data,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    };
  }

  private mapJobStatus(status: JobState | "unknown") {
    if (status === "completed") {
      return "completed";
    }

    if (status === "failed") {
      return "failed";
    }

    if (status === "active") {
      return "processing";
    }

    if (status === "waiting" || status === "prioritized" || status === "delayed") {
      return "queued";
    }

    return status;
  }
}
