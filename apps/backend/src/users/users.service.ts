import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    return {
      name: user.name,
      email: user.email,
      avatarUrl: user.image ?? null,
      city: null,
    };
  }

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
          .filter(
            (productId): productId is string => typeof productId === "string",
          ),
      ),
    );

    return {
      productIds,
    };
  }

  async updateMyProfile(
    userId: string,
    data: { name?: string; city?: string },
  ) {
    // Prepare update object only with provided fields
    const updateData: any = {};
    if (typeof data.name === "string") updateData.name = data.name;
    if (typeof data.city === "string") updateData.city = data.city;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { name: true, email: true, image: true, city: true },
    });

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    return {
      name: user.name,
      email: user.email,
      avatarUrl: user.image ?? null,
      city: user.city ?? null,
    };
  }

  async uploadUserAvatar(userId: string, avatarPath: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { image: avatarPath },
      select: { name: true, email: true, image: true, city: true },
    });

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    return {
      avatarUrl: user.image ?? null,
    };
  }

  async getMyBaskets(userId: string) {
    const carts = await this.prisma.cart.findMany({
      where: {
        userId,
        isFinished: true,
      },
      include: {
        items: {
          include: {
            offer: {
              include: {
                product: {
                  select: {
                    productId: true,
                    canonicalName: true,
                    mainImage: true,
                  },
                },
                store: {
                  include: {
                    brand: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return carts.map((cart) => ({
      id: cart.id,
      paidTime: cart.paidTime ?? null,
      items: cart.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price),
        offer: {
          id: item.offer.id,
          currentPrice: Number(item.offer.currentPrice),
          discountPrice: item.offer.discountPrice
            ? Number(item.offer.discountPrice)
            : null,
          product: {
            productId: item.offer.product.productId,
            canonicalName: item.offer.product.canonicalName,
            media: item.offer.product.mainImage,
          },
          store: {
            id: item.offer.store.id,
            brand: item.offer.store.brand.name,
            city: item.offer.store.city,
          },
        },
      })),
      sum: Number(cart.sum),
      discountSum: Number(cart.discountSum),
    }));
  }
}
