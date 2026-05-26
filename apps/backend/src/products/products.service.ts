import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

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

type CategoryProductsSort = ProductsSort;

type CategoryProductsQueryOptions = {
  page: number;
  limit: number;
  search?: string;
  brand?: string[];
  storeId?: string[];
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  minRating?: number;
  inStock?: boolean;
  sort: CategoryProductsSort;
};

type CategoryProductAvailabilityStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock";

type CategoryProductResponseItem = {
  id: string;
  productId: string;
  canonicalName: string;
  brand: string | null;
  media: string[];
  currentPrice: number;
  regularPrice: number;
  discountPercent: number;
  currency: "UAH";
  rating: number;
  reviewsCount: number;
  availabilityStatus: CategoryProductAvailabilityStatus;
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

export type CategoryTreeNode = {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string;
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

const CATEGORY_THUMBNAIL_BASE_URL = "https://assets.dankoss.ua/categories";
const CATEGORY_BANNER_BASE_URL = "https://assets.dankoss.ua/categories/banners";
const CATALOG_BREADCRUMB = {
  id: "catalog",
  name: "Каталог",
  slug: "catalog",
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

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

    this.logger.info("Products fetched", {
      service: "ProductsService",
      method: "getProducts",
      total,
      page: options.page,
    });

    return {
      items: pageItems,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.max(1, Math.ceil(total / options.limit)),
    };
  }

  async getCategories(parentId?: string) {
    this.logger.info("Fetching categories", {
      service: "ProductsService",
      method: "getCategories",
      parentId,
    });

    const { nodesById, categories } = await this.loadCategoryNodes();

    const selectedRoot = parentId ? nodesById.get(parentId) : undefined;
    if (parentId && !selectedRoot) {
      this.logger.warn("Category not found", {
        service: "ProductsService",
        method: "getCategories",
        parentId,
      });
      throw new NotFoundException(`Category '${parentId}' not found`);
    }

    const roots = parentId
      ? [selectedRoot as CategoryTreeNode]
      : (categories
          .filter((category) => category.parentId === null)
          .map((category) => nodesById.get(category.id))
          .filter(Boolean) as CategoryTreeNode[]);

    for (const root of roots) {
      this.aggregateCategoryProductCounts(root);
    }

    return {
      categories: roots.map((node) => this.sortCategoryTree(node)),
    };
  }

  async getCategoryBySlug(categorySlug: string) {
    this.logger.info("Fetching category metadata", {
      service: "ProductsService",
      method: "getCategoryBySlug",
      categorySlug,
    });

    const { categoryNode } = await this.resolveCategoryNode(categorySlug);

    const parent = categoryNode.parentId
      ? nodesById.get(categoryNode.parentId)
      : null;

    const children = categoryNode.children.map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      productCount: child.productCount,
    }));

    const breadcrumbs = [CATALOG_BREADCRUMB];
    const chain: Array<{ id: string; name: string; slug: string }> = [];
    let currentNode: CategoryTreeNode | null = categoryNode;
    while (currentNode) {
      chain.push({
        id: currentNode.id,
        name: currentNode.name,
        slug: currentNode.slug,
      });
      currentNode = currentNode.parentId
        ? (nodesById.get(currentNode.parentId) ?? null)
        : null;
    }

    for (let index = chain.length - 1; index >= 0; index -= 1) {
      breadcrumbs.push(chain[index]);
    }

    return {
      id: categoryNode.id,
      slug: categoryNode.slug,
      name: categoryNode.name,
      description: this.buildCategoryDescription(categoryNode.name),
      bannerUrl: this.buildCategoryBannerUrl(categoryNode.slug),
      thumbnailUrl: categoryNode.thumbnailUrl,
      parent: parent
        ? {
            id: parent.id,
            slug: parent.slug,
            name: parent.name,
          }
        : null,
      children,
      productCount: categoryNode.productCount,
      breadcrumbs,
      seo: this.buildCategorySeo(categoryNode.name),
    };
  }

  private async resolveCategoryNode(categorySlug: string) {
    const { nodesById } = await this.loadCategoryNodes();
    const categoryNode = Array.from(nodesById.values()).find(
      (node) => node.slug === categorySlug,
    );

    if (!categoryNode) {
      this.logger.warn("Category not found", {
        service: "ProductsService",
        method: "resolveCategoryNode",
        categorySlug,
      });
      throw new NotFoundException(`Category '${categorySlug}' not found`);
    }

    return { categoryNode, nodesById };
  }

  async getCategoryProducts(
    categorySlug: string,
    options: CategoryProductsQueryOptions,
  ) {
    this.logger.info("Fetching category products", {
      service: "ProductsService",
      method: "getCategoryProducts",
      categorySlug,
      ...options,
    });

    if (options.minRating !== undefined) {
      this.logger.info(
        "Ignoring minRating filter for category product queries because product rating data is not available in the current catalog model",
        {
          service: "ProductsService",
          method: "getCategoryProducts",
          minRating: options.minRating,
        },
      );
    }

    const { categoryNode, nodesById } =
      await this.resolveCategoryNode(categorySlug);

    const categoryIds = this.collectCategoryIds(categoryNode, nodesById);

    const searchConditions: Prisma.ProductWhereInput[] = options.search
      ? [
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
          {
            brand: {
              contains: options.search,
              mode: "insensitive",
            },
          },
        ]
      : [];

    const brandConditions: Prisma.ProductWhereInput[] = (
      options.brand ?? []
    ).map((brand) => ({
      brand: {
        contains: brand,
        mode: "insensitive",
      },
    }));

    const where: Prisma.ProductWhereInput = {
      categoryId: {
        in: categoryIds,
      },
      ...(searchConditions.length > 0 || brandConditions.length > 0
        ? {
            OR: [...searchConditions, ...brandConditions],
          }
        : {}),
    };

    const offerWhere: Prisma.OfferWhereInput = {
      ...(options.storeId?.length
        ? {
            storeId: {
              in: options.storeId,
            },
          }
        : {}),
      ...(options.inStock
        ? {
            currentPrice: {
              gt: 0,
            },
          }
        : {}),
    };

    if (
      options.minPrice !== undefined ||
      options.maxPrice !== undefined ||
      options.inStock ||
      options.storeId?.length
    ) {
      where.offers = {
        some: offerWhere,
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: productRelationsInclude,
    });

    const candidates = products
      .map((product) => this.buildCategoryProductCandidate(product, options))
      .filter(
        (candidate): candidate is NonNullable<typeof candidate> =>
          candidate !== null,
      )
      .sort((left, right) =>
        this.compareCategoryProductCandidates(left, right, options.sort),
      );

    const total = candidates.length;
    const start = (options.page - 1) * options.limit;
    const items = candidates
      .slice(start, start + options.limit)
      .map((candidate) => candidate.item);

    this.logger.info("Category products fetched", {
      service: "ProductsService",
      method: "getCategoryProducts",
      categorySlug,
      total,
      page: options.page,
    });

    return {
      category: {
        id: categoryNode.id,
        slug: categoryNode.slug,
        name: categoryNode.name,
      },
      items,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.max(1, Math.ceil(total / options.limit)),
    };
  }

  async getCategoryFacets(categorySlug: string) {
    this.logger.info("Fetching category facets", {
      service: "ProductsService",
      method: "getCategoryFacets",
      categorySlug,
    });

    const { categoryNode, nodesById } =
      await this.resolveCategoryNode(categorySlug);
    const categoryIds = this.collectCategoryIds(categoryNode, nodesById);

    const brandRows = await this.prisma.product.groupBy({
      by: ["brand"],
      where: {
        categoryId: {
          in: categoryIds,
        },
        brand: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    });

    const brands = brandRows
      .filter(
        (row): row is { brand: string; _count: { _all: number } } =>
          row.brand !== null,
      )
      .map((row) => ({
        name: row.brand,
        count: row._count._all,
      }))
      .sort((left, right) => right.count - left.count);

    const storeRows = await this.prisma.offer.groupBy({
      by: ["storeId"],
      where: {
        product: {
          categoryId: {
            in: categoryIds,
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    const storeIds = storeRows.map((row) => row.storeId);
    const storesById = new Map(
      (
        await this.prisma.localStore.findMany({
          where: {
            id: {
              in: storeIds,
            },
          },
          select: {
            id: true,
            brand: {
              select: {
                name: true,
              },
            },
          },
        })
      ).map((store) => [store.id, store.brand.name]),
    );

    const stores = storeRows
      .map((row) => ({
        id: row.storeId,
        name: storesById.get(row.storeId) ?? row.storeId,
        count: row._count._all,
      }))
      .sort((left, right) => right.count - left.count);

    const priceRangeRows = await this.prisma.$queryRaw<
      Array<{ min_price: number | null; max_price: number | null }>
    >(Prisma.sql`
      SELECT
        MIN(COALESCE(o.discount_price, o.current_price)) AS min_price,
        MAX(COALESCE(o.discount_price, o.current_price)) AS max_price
      FROM offers o
      INNER JOIN product p ON p.id = o.product_id
      WHERE p.category_id IN (${Prisma.join(categoryIds)})
        AND COALESCE(o.discount_price, o.current_price) > 0
    `);

    const priceRangeRow = priceRangeRows[0] ?? {
      min_price: null,
      max_price: null,
    };

    const inStockCount = await this.prisma.offer.count({
      where: {
        product: {
          categoryId: {
            in: categoryIds,
          },
        },
        currentPrice: {
          gt: 0,
        },
      },
    });

    const outOfStockCount = await this.prisma.offer.count({
      where: {
        product: {
          categoryId: {
            in: categoryIds,
          },
        },
        currentPrice: {
          lte: 0,
        },
      },
    });

    return {
      brands,
      priceRange: {
        min: priceRangeRow.min_price,
        max: priceRangeRow.max_price,
      },
      ratings: [],
      stores,
      availability: {
        inStock: inStockCount,
        outOfStock: outOfStockCount,
      },
    };
  }

  async getProductCard(id: string) {
    this.logger.info("Fetching product card", {
      service: "ProductsService",
      method: "getProductCard",
      productId: id,
    });

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
        media: (product as any).media ?? product.mainImage ?? null,
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
    this.logger.info("Fetching product offers", {
      service: "ProductsService",
      method: "getProductOffers",
      productId: id,
      ...options,
    });

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
    this.logger.info("Fetching price history", {
      service: "ProductsService",
      method: "getProductPriceHistory",
      productId: id,
      period,
    });

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
    this.logger.info("Fetching related products", {
      service: "ProductsService",
      method: "getRelatedProducts",
      productId: id,
      limit,
    });

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
          media: (item as any).media ?? item.mainImage,
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
      this.logger.warn("Product not found", {
        service: "ProductsService",
        method: "getProductOrThrow",
        productId: id,
      });
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
      this.logger.warn("Product not found", {
        service: "ProductsService",
        method: "getProductWithRelationsOrThrow",
        productId: id,
      });
      throw new NotFoundException(`Product '${id}' not found`);
    }

    return product;
  }

  private mapCatalogItem(
    product: ProductWithRelations,
  ): ProductCatalogItemWithMeta | null {
    return this.buildCatalogItem(product, {});
  }

  private async loadCategoryNodes() {
    const [categories, productCounts] = await Promise.all([
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
      const slug = this.toCategorySlug(category.name);
      nodesById.set(category.id, {
        id: category.id,
        slug,
        name: category.name,
        thumbnailUrl: this.buildCategoryThumbnailUrl(slug),
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

    return {
      categories,
      nodesById,
    };
  }

  private toCategorySlug(name: string): string {
    const normalized = name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalized || "category";
  }

  private buildCategoryThumbnailUrl(slug: string): string {
    return `${CATEGORY_THUMBNAIL_BASE_URL}/${slug}_thumb.png`;
  }

  private buildCategoryBannerUrl(slug: string): string {
    return `${CATEGORY_BANNER_BASE_URL}/${slug}_bg.png`;
  }

  private buildCategoryDescription(name: string): string {
    return `Оберіть ${name.toLowerCase()} зі знижками та зручно порівняйте ціни в каталозі.`;
  }

  private buildCategorySeo(name: string) {
    const keywords = this.extractCategoryKeywords(name);

    return {
      title: `${name} — купити онлайн`,
      description: `${name} доступний у каталозі з актуальними цінами та знижками.`,
      keywords,
    };
  }

  private collectCategoryIds(
    node: CategoryTreeNode,
    nodesById: Map<string, CategoryTreeNode>,
  ): string[] {
    const ids = [node.id];

    for (const child of node.children) {
      ids.push(...this.collectCategoryIds(child, nodesById));
    }

    return ids;
  }

  private extractCategoryKeywords(name: string): string[] {
    const tokens = name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    return tokens.length > 0 ? tokens : ["каталог"];
  }

  private aggregateCategoryProductCounts(node: CategoryTreeNode): number {
    const descendantCount = node.children.reduce(
      (total, child) => total + this.aggregateCategoryProductCounts(child),
      0,
    );

    node.productCount += descendantCount;
    return node.productCount;
  }

  private sortCategoryTree(node: CategoryTreeNode): CategoryTreeNode {
    return {
      ...node,
      children: node.children
        .map((child) => this.sortCategoryTree(child))
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
  }

  private buildCategoryProductCandidate(
    product: ProductWithRelations,
    options: CategoryProductsQueryOptions,
  ): {
    item: CategoryProductResponseItem;
    updatedAt: number;
    price: number;
    discount: number;
  } | null {
    const offers = this.mapOffers(product.offers)
      .filter((offer) => {
        if (
          options.storeId?.length &&
          !options.storeId.includes(offer.store.id)
        ) {
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

    if (options.inStock && offers.length === 0) {
      return null;
    }

    const bestOffer = offers[0];
    const currentPrice = bestOffer?.effectivePrice ?? 0;
    const regularPrice = bestOffer?.oldPrice ?? 0;
    const discountPercent = bestOffer?.discountPercent ?? 0;
    const media = product.mainImage ? [product.mainImage] : [];

    const availabilityStatus: CategoryProductAvailabilityStatus =
      offers.length === 0
        ? "out_of_stock"
        : offers.length === 1
          ? "low_stock"
          : "in_stock";

    return {
      item: {
        id: product.id,
        productId: product.productId,
        canonicalName: product.canonicalName,
        brand: product.brand,
        media,
        currentPrice,
        regularPrice,
        discountPercent,
        currency: "UAH",
        rating: 0,
        reviewsCount: 0,
        availabilityStatus,
      },
      updatedAt: bestOffer
        ? Date.parse(bestOffer.updatedAt)
        : product.updatedAt.getTime(),
      price: currentPrice,
      discount: discountPercent,
    };
  }

  private compareCategoryProductCandidates(
    left: {
      item: CategoryProductResponseItem;
      updatedAt: number;
      price: number;
      discount: number;
    },
    right: {
      item: CategoryProductResponseItem;
      updatedAt: number;
      price: number;
      discount: number;
    },
    sort: CategoryProductsSort,
  ) {
    switch (sort) {
      case "name":
        return left.item.canonicalName.localeCompare(right.item.canonicalName);
      case "price_asc":
        return left.price - right.price;
      case "price_desc":
        return right.price - left.price;
      case "discount":
        return right.discount - left.discount;
      default:
        return right.updatedAt - left.updatedAt;
    }
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
      this.logger.warn("Invalid period format", {
        service: "ProductsService",
        method: "parsePeriod",
        period,
      });
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
    this.logger.info("Collecting history stats", {
      service: "ProductsService",
      method: "collectHistoryStats",
      productId,
      period,
      includePoints,
    });

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
