import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type OffersSort = "price" | "discount" | "updated";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductCard(id: string) {
    const product = await this.getProductWithRelationsOrThrow(id);
    const topOffers = this.mapOffers(product.offers)
      .sort((a, b) => a.effectivePrice - b.effectivePrice)
      .slice(0, 5);

    const bestOffer = topOffers[0] ?? null;
    const historyData = await this.collectHistoryStats(product.id, "30d");

    return {
      product: {
        id: product.id,
        productId: product.productId,
        canonicalName: product.canonicalName,
        brand: product.brand,
        category: product.category?.name ?? null,
        media: product.media,
        description: product.description,
        measurements: product.measurements,
        calories: product.calories,
      },
      pricingSummary: {
        bestPrice: bestOffer?.effectivePrice ?? null,
        oldPrice: bestOffer?.oldPrice ?? null,
        discountPercent: bestOffer?.discountPercent ?? null,
        currency: "UAH",
      },
      topOffers,
      stats: {
        priceTrend: historyData.trend,
        minPrice30d: historyData.minPrice,
        maxPrice30d: historyData.maxPrice,
        avgPrice30d: historyData.avgPrice,
      },
      badges: this.buildBadges(bestOffer),
      availabilityStatus: topOffers.length > 0 ? "in_stock" : "out_of_stock",
      userContext: {
        favorite: false,
        inComparison: false,
        inCart: false,
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        cacheTtlSeconds: 60,
      },
    };
  }

  async getProductOffers(
    id: string,
    options: { sort: OffersSort; inStock: boolean },
  ) {
    const product = await this.getProductWithRelationsOrThrow(id);

    let offers = this.mapOffers(product.offers);
    if (options.inStock) {
      offers = offers.filter((offer) => offer.currentPrice > 0);
    }

    offers.sort((a, b) => {
      if (options.sort === "discount") {
        return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      }
      if (options.sort === "updated") {
        return +new Date(b.updatedAt) - +new Date(a.updatedAt);
      }
      return a.effectivePrice - b.effectivePrice;
    });

    return {
      productId: product.id,
      offers,
      total: offers.length,
    };
  }

  async getProductPriceHistory(id: string, period: string) {
    const product = await this.getProductOrThrow(id);
    const historyData = await this.collectHistoryStats(product.id, period, true);

    return {
      productId: product.id,
      period,
      points: historyData.points,
      stats: {
        minPrice: historyData.minPrice,
        maxPrice: historyData.maxPrice,
        avgPrice: historyData.avgPrice,
        trend: historyData.trend,
      },
    };
  }

  async getRelatedProducts(id: string, limit: number) {
    const cappedLimit = Math.max(1, Math.min(limit, 20));
    const product = await this.getProductOrThrow(id);

    const related = await this.prisma.product.findMany({
      where: {
        id: { not: product.id },
        OR: [
          product.categoryId ? { categoryId: product.categoryId } : undefined,
          product.brand ? { brand: product.brand } : undefined,
        ].filter(Boolean) as Prisma.ProductWhereInput[],
      },
      include: {
        offers: {
          include: {
            store: {
              include: {
                brand: true,
              },
            },
            priceHistory: {
              orderBy: {
                startDate: "desc",
              },
              take: 1,
            },
          },
        },
      },
      take: cappedLimit,
      orderBy: {
        updatedAt: "desc",
      },
    });

    return {
      productId: product.id,
      related: related.map((item) => {
        const mappedOffers = this.mapOffers(item.offers);
        const bestPrice = mappedOffers.length
          ? Math.min(...mappedOffers.map((offer) => offer.effectivePrice))
          : null;

        return {
          id: item.id,
          productId: item.productId,
          canonicalName: item.canonicalName,
          brand: item.brand,
          media: item.media,
          bestPrice,
          offersCount: mappedOffers.length,
        };
      }),
    };
  }

  private async getProductOrThrow(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id }, { productId: id }],
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    return product;
  }

  private async getProductWithRelationsOrThrow(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id }, { productId: id }],
      },
      include: {
        category: true,
        offers: {
          include: {
            store: {
              include: {
                brand: true,
              },
            },
            priceHistory: {
              orderBy: {
                startDate: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    return product;
  }

  private mapOffers(
    offers: Array<{
      id: string;
      currentPrice: Prisma.Decimal;
      discountPrice: Prisma.Decimal | null;
      updatedAt: Date;
      store: {
        id: string;
        city: string;
        address: string;
        brand: { id: string; name: string };
      };
      priceHistory: Array<{ regularPrice: Prisma.Decimal }>;
    }>,
  ) {
    return offers.map((offer) => {
      const currentPrice = Number(offer.currentPrice);
      const discountPrice = offer.discountPrice ? Number(offer.discountPrice) : null;
      const effectivePrice = discountPrice ?? currentPrice;
      const oldPrice = offer.priceHistory[0]
        ? Number(offer.priceHistory[0].regularPrice)
        : currentPrice;
      const discountPercent =
        oldPrice > effectivePrice
          ? Number((((oldPrice - effectivePrice) / oldPrice) * 100).toFixed(1))
          : null;

      return {
        id: offer.id,
        store: {
          id: offer.store.id,
          brand: offer.store.brand.name,
          city: offer.store.city,
          address: offer.store.address,
        },
        currentPrice,
        discountPrice,
        effectivePrice,
        oldPrice,
        discountPercent,
        availability: "in_stock",
        updatedAt: offer.updatedAt.toISOString(),
      };
    });
  }

  private buildBadges(
    bestOffer:
      | {
          discountPercent: number | null;
        }
      | null,
  ) {
    const badges: string[] = [];

    if (bestOffer) {
      badges.push("Best price");
      if ((bestOffer.discountPercent ?? 0) >= 20) {
        badges.push(`-${Math.round(bestOffer.discountPercent ?? 0)}%`);
      }
    }

    return badges;
  }

  private parsePeriod(period: string) {
    const match = /^(\d+)(d|w|m)$/i.exec(period.trim());
    if (!match) {
      throw new BadRequestException(
        "Invalid period format. Use values like 30d, 2w or 3m.",
      );
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

  private async collectHistoryStats(
    productId: string,
    period: string,
    includePoints = false,
  ) {
    const from = this.parsePeriod(period);
    const offers = await this.prisma.offer.findMany({
      where: { productId },
      select: { id: true },
    });

    if (!offers.length) {
      return {
        points: [],
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        trend: "stable",
      };
    }

    const history = await this.prisma.priceHistory.findMany({
      where: {
        offerId: { in: offers.map((offer) => offer.id) },
        startDate: { gte: from },
      },
      orderBy: {
        startDate: "asc",
      },
      include: includePoints
        ? {
            offer: {
              include: {
                store: {
                  include: {
                    brand: true,
                  },
                },
              },
            },
          }
        : undefined,
    });

    const prices = history.map((point) => Number(point.price));
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const avgPrice = prices.length
      ? Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2))
      : null;

    let trend = "stable";
    if (prices.length >= 2) {
      const first = prices[0];
      const last = prices[prices.length - 1];
      if (last > first) {
        trend = "up";
      } else if (last < first) {
        trend = "down";
      }
    }

    return {
      points: includePoints
        ? history.map((point) => ({
            date: point.startDate.toISOString(),
            price: Number(point.price),
            regularPrice: Number(point.regularPrice),
            store: {
              id: point.offer.store.id,
              brand: point.offer.store.brand.name,
              city: point.offer.store.city,
            },
          }))
        : [],
      minPrice,
      maxPrice,
      avgPrice,
      trend,
    };
  }
}
