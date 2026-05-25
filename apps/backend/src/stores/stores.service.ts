import {
  Injectable,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { GetStoresResponseDto, StoreDto } from "./dto/get-stores-response.dto";
import {
  GetStoreProductsResponseDto,
  StoreProductItem,
} from "./dto/get-store-products-response.dto";
import { StoreProductsSort } from "./dto/get-store-products-query.dto";

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async getStores(): Promise<GetStoresResponseDto> {
    try {
      this.logger.info("Fetching stores", {
        service: "StoresService",
        method: "getStores",
      });

      const brands = await this.prisma.storeBrand.findMany({
        include: {
          _count: {
            select: { localStores: true },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      const stores: StoreDto[] = brands.map((brand) => ({
        id: brand.id,
        brand: brand.name,
        logo: brand.logo ?? null,
        website: brand.website ?? null,
        locationCount: brand._count.localStores,
      }));

      this.logger.info("Stores fetched successfully", {
        service: "StoresService",
        method: "getStores",
        count: stores.length,
      });

      return { stores };
    } catch (error) {
      this.logger.error("Failed to fetch stores", {
        service: "StoresService",
        method: "getStores",
        error: error instanceof Error ? error.message : String(error),
      });

      throw new InternalServerErrorException("Failed to fetch stores");
    }
  }

  async getStoreProducts(
    storeId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      categoryId?: string;
      minDiscount?: number;
      maxPrice?: number;
      minRating?: number;
      sort: StoreProductsSort;
    },
  ): Promise<GetStoreProductsResponseDto> {
    try {
      this.logger.info("Fetching store products", {
        service: "StoresService",
        method: "getStoreProducts",
        storeId,
        ...options,
      });

      if (options.minRating !== undefined) {
        this.logger.info(
          "Ignoring minRating filter for store products because rating data is not available in the current product/store model",
          {
            service: "StoresService",
            method: "getStoreProducts",
            storeId,
            minRating: options.minRating,
          },
        );
      }

      // Verify store exists
      const store = await this.prisma.localStore.findFirst({
        where: { id: storeId },
        include: { brand: true },
      });

      if (!store) {
        throw new NotFoundException(`Store with id ${storeId} not found`);
      }

      // Build product where clause
      const productWhere: Prisma.ProductWhereInput = {
        ...(options.categoryId ? { categoryId: options.categoryId } : {}),
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
                {
                  brand: {
                    contains: options.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        offers: {
          some: {
            storeId,
            currentPrice: {
              gt: 0,
              ...(options.maxPrice !== undefined
                ? {
                    lte: options.maxPrice,
                  }
                : {}),
            },
          },
        },
      };

      // Fetch products with their offers
      const products = await this.prisma.product.findMany({
        where: productWhere,
        include: {
          offers: {
            where: {
              storeId,
              currentPrice: {
                gt: 0,
                ...(options.maxPrice !== undefined
                  ? {
                      lte: options.maxPrice,
                    }
                  : {}),
              },
            },
            include: {
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

      // Build items with filtering and sorting
      type ProductWithOffers = (typeof products)[0];
      type StoreProductItemWithMeta = StoreProductItem & {
        updatedAt: Date;
        bestDiscount: number;
      };

      const items: StoreProductItemWithMeta[] = products
        .filter((product) => product.offers.length > 0)
        .map((product) => {
          const offer = product.offers[0]; // First offer (already filtered by storeId)
          const priceHistory = offer.priceHistory[0];
          const regularPrice = priceHistory?.regularPrice
            ? Number(priceHistory.regularPrice)
            : Number(offer.currentPrice);
          const currentPrice = Number(offer.currentPrice);
          const discountPercent =
            regularPrice > currentPrice
              ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
              : null;

          return {
            id: offer.id,
            productId: product.productId,
            canonicalName: product.canonicalName,
            brand: product.brand,
            media: product.media,
            currentPrice,
            regularPrice,
            discountPercent,
            currency: "UAH",
            availabilityStatus: "in_stock",
            updatedAt: offer.updatedAt,
            bestDiscount: discountPercent || 0,
          };
        })
        .filter((item): item is StoreProductItemWithMeta => {
          // Apply minDiscount filter
          if (
            options.minDiscount !== undefined &&
            item.bestDiscount < options.minDiscount
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          switch (options.sort) {
            case StoreProductsSort.PRICE_ASC:
              return a.currentPrice - b.currentPrice;
            case StoreProductsSort.DISCOUNT:
              return b.bestDiscount - a.bestDiscount;
            case StoreProductsSort.UPDATED:
            default:
              return b.updatedAt.getTime() - a.updatedAt.getTime();
          }
        });

      const total = items.length;
      const start = (options.page - 1) * options.limit;
      const pageItems = items
        .slice(start, start + options.limit)
        .map(({ updatedAt, bestDiscount, ...item }) => item);

      this.logger.info("Store products fetched successfully", {
        service: "StoresService",
        method: "getStoreProducts",
        storeId,
        total,
        page: options.page,
      });

      return {
        storeId,
        storeName: store.brand.name,
        items: pageItems,
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.max(1, Math.ceil(total / options.limit)),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error("Failed to fetch store products", {
        service: "StoresService",
        method: "getStoreProducts",
        storeId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new InternalServerErrorException("Failed to fetch store products");
    }
  }
}
