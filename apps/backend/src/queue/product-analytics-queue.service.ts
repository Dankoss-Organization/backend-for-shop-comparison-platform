import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { JobState, Queue } from "bullmq";
import {
  PRODUCT_ANALYTICS_JOB,
  PRODUCT_ANALYTICS_QUEUE,
} from "./product-analytics.constants";
import {
  ProductAnalyticsJobData,
  ProductAnalyticsJobResult,
} from "./product-analytics.types";

@Injectable()
export class ProductAnalyticsQueueService {
  constructor(
    @InjectQueue(PRODUCT_ANALYTICS_QUEUE)
    private readonly productAnalyticsQueue: Queue<
      ProductAnalyticsJobData,
      ProductAnalyticsJobResult
    >,
  ) {}

  async enqueueProductAnalytics(productId: string, period: string, source?: string) {
    const job = await this.productAnalyticsQueue.add(
      PRODUCT_ANALYTICS_JOB,
      {
        productId,
        period,
        source: source?.trim() || "api",
        requestedAt: new Date().toISOString(),
      },
      {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    return {
      queue: PRODUCT_ANALYTICS_QUEUE,
      jobName: PRODUCT_ANALYTICS_JOB,
      jobId: String(job.id),
      status: "queued",
      createdAt: new Date().toISOString(),
    };
  }

  async getAnalyticsJobStatus(jobId: string) {
    const job = await this.productAnalyticsQueue.getJob(jobId);
    if (!job) {
      return {
        jobId,
        status: "not_found",
      };
    }

    const state = await job.getState();

    return {
      queue: PRODUCT_ANALYTICS_QUEUE,
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
