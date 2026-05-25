import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async removeProductFromFavorites(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        productId,
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    const favouriteProduct = await this.prisma.favouriteProduct.findUnique({
      where: {
        productId: product.id,
      },
      select: {
        id: true,
      },
    });

    if (favouriteProduct) {
      await this.prisma.userFavourite.deleteMany({
        where: {
          userId,
          favouriteProductId: favouriteProduct.id,
        },
      });
    }

    return {
      success: true,
      productId: product.productId,
    };
  }

  async addProductToFavorites(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        productId,
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      let favouriteProduct = await tx.favouriteProduct.findUnique({
        where: {
          productId: product.id,
        },
        select: {
          id: true,
        },
      });

      if (!favouriteProduct) {
        favouriteProduct = await tx.favouriteProduct.create({
          data: {
            productId: product.id,
          },
          select: {
            id: true,
          },
        });
      }

      const existingLink = await tx.userFavourite.findFirst({
        where: {
          userId,
          favouriteProductId: favouriteProduct.id,
        },
        select: {
          id: true,
        },
      });

      if (!existingLink) {
        await tx.userFavourite.create({
          data: {
            userId,
            favouriteProductId: favouriteProduct.id,
          },
        });
      }
    });

    return {
      success: true,
      productId: product.productId,
    };
  }

  async getMyFavoriteProductIds(userId: string) {
    const rows = await this.prisma.userFavourite.findMany({
      where: {
        userId,
        favouriteProductId: {
          not: null,
        },
      },
      select: {
        favouriteProduct: {
          select: {
            product: {
              select: {
                productId: true,
              },
            },
          },
        },
      },
    });

    const productIds = Array.from(
      new Set(
        rows
          .map((row) => row.favouriteProduct?.product.productId)
          .filter((productId): productId is string => typeof productId === "string"),
      ),
    );

    return {
      productIds,
    };
  }
}
