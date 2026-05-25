import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
