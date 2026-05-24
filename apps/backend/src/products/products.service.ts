import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type OffersSort = "price" | "discount" | "updated";
type ProductsSort =
  | "updated"
  | "name"
  | "price_asc"
  | "price_desc"
  | "discount";

type ProductCatalogOffer = {
  id: string;
  storeId: string;
  price: number;
  regularPrice: number;
  discountPercent: number | null;
};

type ProductCatalogItem = {
  id: string;
  canonicalName: string;
  brand: string | null;
  categoryId: string | null;
  offers: ProductCatalogOffer[];
};

type ProductCatalogItemWithMeta = ProductCatalogItem & {
  updatedAt: Date;
  bestPrice: number;
  bestDiscount: number;
};

const productRelationsInclude = {
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
} as const;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productRelationsInclude;
}>;

type CategoryTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  productCount: number;
  children: CategoryTreeNode[];
};

interface HistoryAggregateRow {
  min_price: number | null;
  max_price: number | null;
  avg_price: number | null;
  first_price: number | null;
  last_price: number | null;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts(options: {
    page: number;
    limit: number;
    search?: string;
    brand?: string;
    categoryId?: string;
    storeId?: string;
    minPrice?: number;
    maxPrice?: number;
    minDiscount?: number;
    minRating?: number;
    inStock?: boolean;
    sort: ProductsSort;
  }) {
    this.logger.info("Fetching products", {
      service: "ProductsService",
      method: "getProducts",
      ...options,
    });

    if (options.minRating !== undefined) {
      this.logger.info(
        "Ignoring minRating filter for catalog queries because product rating data is not available in the current catalog model",
        {
          service: "ProductsService",
          method: "getProducts",
          minRating: options.minRating,
        },
      );
    }

    const where: Prisma.ProductWhereInput = {
      ...(options.categoryId ? { categoryId: options.categoryId } : {}),
      ...(options.brand
        ? {
            brand: {
              contains: options.brand,
              mode: "insensitive",
            },
          }
        : {}),
      ...(options.search
        ? {
            OR: [
              {
                canonicalName: {
                  contains: options.search,
                  mode: "insensitive",
                },
              },
              {
                productId: {
                  contains: options.search,
                  mode: "insensitive",
                },
              },
              options.brand
                ? undefined
                : {
                    brand: {
                      contains: options.search,
                      mode: "insensitive",
                    },
                  },
            ].filter(Boolean) as Prisma.ProductWhereInput[],
          }
        : {}),
    };

    const offerWhere: Prisma.OfferWhereInput = {};
    if (options.storeId) {
      offerWhere.storeId = options.storeId;
    }

    const currentPriceFilter: Prisma.DecimalFilter = {};
    if (options.inStock) {
      currentPriceFilter.gt = 0;
    }
    if (options.minPrice !== undefined) {
      currentPriceFilter.gte = options.minPrice;
    }
    if (options.maxPrice !== undefined) {
      currentPriceFilter.lte = options.maxPrice;
    }

    if (Object.keys(currentPriceFilter).length > 0) {
      offerWhere.currentPrice = currentPriceFilter;
    }

    if (
      options.storeId ||
      options.inStock ||
      options.minPrice !== undefined ||
      options.maxPrice !== undefined
    ) {
      where.offers = {
        some: offerWhere,
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: productRelationsInclude,
    });

    const items = products
      .map((product) => this.buildCatalogItem(product, options))
      .filter((item): item is ProductCatalogItemWithMeta => item !== null)
      .sort((left, right) =>
        this.compareCatalogItems(left, right, options.sort),
      );

    const total = items.length;
    const start = (options.page - 1) * options.limit;
    const pageItems = items
      .slice(start, start + options.limit)
      .map(({ updatedAt, bestPrice, bestDiscount, ...item }) => item);

    return {
      items: pageItems,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.max(1, Math.ceil(total / options.limit)),
    };
  }

  async getCategories(parentId?: string) {
    const [categories, productCounts] = await this.prisma.$transaction([
      this.prisma.productCategory.findMany({
        orderBy: {
          name: "asc",
        },
      }),
      this.prisma.product.groupBy({
        by: ["categoryId"],
        _count: {
          _all: true,
        },
      }),
    ]);

    const countsByCategoryId = new Map<string, number>();
    for (const row of productCounts) {
      if (row.categoryId) {
        countsByCategoryId.set(row.categoryId, row._count._all);
      }
    }

    const nodesById = new Map<string, CategoryTreeNode>();
    for (const category of categories) {
      nodesById.set(category.id, {
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        productCount: countsByCategoryId.get(category.id) ?? 0,
        children: [],
      });
    }

    for (const category of categories) {
      if (!category.parentId) {
        continue;
      }

      const parent = nodesById.get(category.parentId);
      const child = nodesById.get(category.id);
      if (parent && child) {
        parent.children.push(child);
      }
    }

    if (parentId) {
      const selectedRoot = nodesById.get(parentId);
      if (!selectedRoot) {
        throw new NotFoundException(`Category '${parentId}' not found`);
      }

      return {
        categories: [this.sortCategoryTree(selectedRoot)],
      };
    }

    const roots = categories
      .filter((category) => category.parentId === null)
      .map((category) => nodesById.get(category.id))
      .filter(Boolean) as CategoryTreeNode[];

    return {
      categories: roots.map((node) => this.sortCategoryTree(node)),
    };
  }

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
        proteins_g: product.proteins ?? null,
        fats_g: product.fats ?? null,
        carbohydrates_g: product.carbohydrates ?? null,
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
    const historyData = await this.collectHistoryStats(
      product.id,
      period,
      true,
    );

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

    const orConditions: Prisma.ProductWhereInput[] = [];
    if (product.categoryId) {
      orConditions.push({ categoryId: product.categoryId });
    }
    if (product.brand) {
      orConditions.push({ brand: product.brand });
    }

    if (orConditions.length === 0) {
      return { productId: product.id, related: [] };
    }

    const related = await this.prisma.product.findMany({
      where: {
        id: { not: product.id },
        OR: orConditions,
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
      include: productRelationsInclude,
    });

    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    return product;
  }

  private mapCatalogItem(
    product: ProductWithRelations,
  ): ProductCatalogItemWithMeta | null {
    return this.buildCatalogItem(product, {});
  }

  private sortCategoryTree(node: CategoryTreeNode): CategoryTreeNode {
    return {
      ...node,
      children: node.children
        .map((child) => this.sortCategoryTree(child))
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
  }

  private buildCatalogItem(
    product: ProductWithRelations,
    options: {
      minPrice?: number;
      maxPrice?: number;
      minDiscount?: number;
      storeId?: string;
      inStock?: boolean;
    },
  ): ProductCatalogItemWithMeta | null {
    const offers = this.mapOffers(product.offers)
      .filter((offer) => {
        if (options.storeId && offer.store.id !== options.storeId) {
          return false;
        }

        if (options.inStock && offer.currentPrice <= 0) {
          return false;
        }

        if (
          options.minPrice !== undefined &&
          offer.effectivePrice < options.minPrice
        ) {
          return false;
        }

        if (
          options.maxPrice !== undefined &&
          offer.effectivePrice > options.maxPrice
        ) {
          return false;
        }

        if (
          options.minDiscount !== undefined &&
          (offer.discountPercent ?? 0) < options.minDiscount
        ) {
          return false;
        }

        return true;
      })
      .sort((left, right) => left.effectivePrice - right.effectivePrice);

    if (offers.length === 0) {
      return null;
    }

    const bestDiscount = offers.reduce(
      (currentBest, offer) => Math.max(currentBest, offer.discountPercent ?? 0),
      0,
    );

    return {
      id: product.id,
      canonicalName: product.canonicalName,
      brand: product.brand,
      categoryId: product.categoryId ?? null,
      offers: offers.map((offer) => ({
        id: offer.id,
        storeId: offer.store.id,
        price: offer.effectivePrice,
        regularPrice: offer.oldPrice,
        discountPercent: offer.discountPercent,
      })),
      updatedAt: product.updatedAt,
      bestPrice: offers[0].effectivePrice,
      bestDiscount,
    };
  }

  private compareCatalogItems(
    left: ProductCatalogItemWithMeta,
    right: ProductCatalogItemWithMeta,
    sort: ProductsSort,
  ) {
    switch (sort) {
      case "name":
        return left.canonicalName.localeCompare(right.canonicalName);
      case "price_asc":
        return left.bestPrice - right.bestPrice;
      case "price_desc":
        return right.bestPrice - left.bestPrice;
      case "discount":
        return right.bestDiscount - left.bestDiscount;
      default:
        return right.updatedAt.getTime() - left.updatedAt.getTime();
    }
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
      const discountPrice = offer.discountPrice
        ? Number(offer.discountPrice)
        : null;
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
    bestOffer: {
      discountPercent: number | null;
    } | null,
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

    if (amount <= 0) {
      throw new BadRequestException("Period amount must be greater than 0.");
    }

    if (
      (unit === "d" && amount > 3650) ||
      (unit === "w" && amount > 520) ||
      (unit === "m" && amount > 120)
    ) {
      throw new BadRequestException(
        "Period is too large. Maximum allowed range is 10 years.",
      );
    }

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
    const aggregateRows = await this.prisma.$queryRaw<
      HistoryAggregateRow[]
    >(Prisma.sql`
      SELECT
        MIN(ph.price)::float8 AS min_price,
        MAX(ph.price)::float8 AS max_price,
        AVG(ph.price)::float8 AS avg_price,
        (ARRAY_AGG(ph.price::float8 ORDER BY ph.start_date ASC))[1] AS first_price,
        (ARRAY_AGG(ph.price::float8 ORDER BY ph.start_date DESC))[1] AS last_price
      FROM price_history ph
      INNER JOIN offers o ON o.id = ph.offer_id
      WHERE o.product_id = ${productId}
        AND ph.start_date >= ${from}
    `);

    const aggregate = aggregateRows[0] ?? {
      min_price: null,
      max_price: null,
      avg_price: null,
      first_price: null,
      last_price: null,
    };

    const minPrice =
      aggregate.min_price === null ? null : Number(aggregate.min_price);
    const maxPrice =
      aggregate.max_price === null ? null : Number(aggregate.max_price);
    const avgPrice =
      aggregate.avg_price === null
        ? null
        : Number(aggregate.avg_price.toFixed(2));

    let trend = "stable";
    if (aggregate.first_price !== null && aggregate.last_price !== null) {
      if (aggregate.last_price > aggregate.first_price) {
        trend = "up";
      } else if (aggregate.last_price < aggregate.first_price) {
        trend = "down";
      }
    }

    const history = includePoints
      ? await this.prisma.priceHistory.findMany({
          where: {
            offer: {
              productId,
            },
            startDate: { gte: from },
          },
          orderBy: {
            startDate: "asc",
          },
          include: {
            offer: {
              include: {
                store: {
                  include: {
                    brand: true,
                  },
                },
              },
            },
          },
        })
      : [];

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
