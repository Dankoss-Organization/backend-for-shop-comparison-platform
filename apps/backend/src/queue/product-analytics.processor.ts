import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import {
  PRODUCT_ANALYTICS_JOB,
  PRODUCT_ANALYTICS_QUEUE,
} from "./product-analytics.constants";
import {
  AnalyticsPriceTrend,
  ProductAnalyticsJobData,
  ProductAnalyticsJobResult,
} from "./product-analytics.types";

const parsedConcurrency = Number(process.env.ANALYTICS_WORKER_CONCURRENCY ?? 2);
const analyticsConcurrency = Number.isFinite(parsedConcurrency)
  ? Math.max(1, parsedConcurrency)
  : 2;

interface AggregateRow {
  min_price: number | null;
  max_price: number | null;
  avg_price: number | null;
  first_price: number | null;
  last_price: number | null;
  history_points: number;
  stores_count: number;
}

interface CheapestStoreRow {
  store_id: string;
  brand: string;
  city: string;
  effective_price: number;
}

@Injectable()
@Processor(PRODUCT_ANALYTICS_QUEUE, {
  concurrency: analyticsConcurrency,
})
export class ProductAnalyticsProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ProductAnalyticsJobData>): Promise<ProductAnalyticsJobResult> {
    if (job.name !== PRODUCT_ANALYTICS_JOB) {
      throw new Error(`Unsupported job name '${job.name}'`);
    }

    const period = job.data.period ?? "30d";
    const from = this.parsePeriod(period);
    const startedAt = Date.now();

    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: job.data.productId }, { productId: job.data.productId }],
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${job.data.productId}' not found`);
    }

    const aggregates = await this.prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
      SELECT
        MIN(ph.price)::float8 AS min_price,
        MAX(ph.price)::float8 AS max_price,
        AVG(ph.price)::float8 AS avg_price,
        (ARRAY_AGG(ph.price::float8 ORDER BY ph.start_date ASC))[1] AS first_price,
        (ARRAY_AGG(ph.price::float8 ORDER BY ph.start_date DESC))[1] AS last_price,
        COUNT(*)::int AS history_points,
        COUNT(DISTINCT o.store_id)::int AS stores_count
      FROM price_history ph
      INNER JOIN offers o ON o.id = ph.offer_id
      WHERE o.product_id = ${product.id}
        AND ph.start_date >= ${from}
    `);

    const cheapestStores = await this.prisma.$queryRaw<CheapestStoreRow[]>(Prisma.sql`
      SELECT
        ls.id AS store_id,
        sb.name AS brand,
        ls.city AS city,
        MIN(COALESCE(o.discount_price, o.current_price))::float8 AS effective_price
      FROM offers o
      INNER JOIN local_store ls ON ls.id = o.store_id
      INNER JOIN store_brand sb ON sb.id = ls.brand_id
      WHERE o.product_id = ${product.id}
      GROUP BY ls.id, sb.name, ls.city
      ORDER BY effective_price ASC
      LIMIT 1
    `);

    const aggregate = aggregates[0] ?? {
      min_price: null,
      max_price: null,
      avg_price: null,
      first_price: null,
      last_price: null,
      history_points: 0,
      stores_count: 0,
    };

    const trend = this.resolveTrend(aggregate.first_price, aggregate.last_price);
    const cheapestStore = cheapestStores[0]
      ? {
          id: cheapestStores[0].store_id,
          brand: cheapestStores[0].brand,
          city: cheapestStores[0].city,
          effectivePrice: Number(cheapestStores[0].effective_price),
        }
      : null;

    return {
      product: {
        id: product.id,
        productId: product.productId,
      },
      period,
      summary: {
        historyPoints: Number(aggregate.history_points ?? 0),
        minPrice: this.toRoundedNullable(aggregate.min_price),
        maxPrice: this.toRoundedNullable(aggregate.max_price),
        avgPrice: this.toRoundedNullable(aggregate.avg_price),
        trend,
        storesCount: Number(aggregate.stores_count ?? 0),
        cheapestStore,
      },
      performance: {
        queryDurationMs: Date.now() - startedAt,
      },
      computedAt: new Date().toISOString(),
    };
  }

  private parsePeriod(period: string) {
    const match = /^(\d+)(d|w|m)$/i.exec(period.trim());
    if (!match) {
      throw new Error("Invalid period format. Use values like 30d, 2w or 3m.");
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const from = new Date();

    if (unit === "d") {
      from.setDate(from.getDate() - amount);
    } else if (unit === "w") {
      from.setDate(from.getDate() - amount * 7);
    } else {
      from.setMonth(from.getMonth() - amount);
    }

    return from;
  }

  private resolveTrend(
    firstPrice: number | null,
    lastPrice: number | null,
  ): AnalyticsPriceTrend {
    if (firstPrice === null || lastPrice === null) {
      return "stable";
    }

    if (lastPrice > firstPrice) {
      return "up";
    }

    if (lastPrice < firstPrice) {
      return "down";
    }

    return "stable";
  }

  private toRoundedNullable(value: number | null) {
    if (value === null) {
      return null;
    }

    return Number(value.toFixed(2));
  }
}
