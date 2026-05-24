import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AddCartItemRequestDto } from "./dto/add-cart-item-request.dto";

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async getCart(userId: string) {
    this.logger.info("Fetching cart", {
      service: "CartsService",
      method: "getCart",
      userId,
    });

    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        isActive: true,
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
                    media: true,
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
    });

    if (!cart) {
      this.logger.warn("Active cart not found, returning empty cart", {
        service: "CartsService",
        method: "getCart",
        userId,
      });

      return {
        id: null,
        isActive: false,
        items: [],
        sum: 0,
        discountSum: 0,
        currency: "UAH",
      };
    }

    this.logger.info("Cart fetched", {
      service: "CartsService",
      method: "getCart",
      cartId: cart.id,
      itemCount: cart.items.length,
    });

    return {
      id: cart.id,
      isActive: cart.isActive,
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
            media: item.offer.product.media,
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
      currency: "UAH",
    };
  }

  async addCartItem(userId: string, dto: AddCartItemRequestDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: dto.offerId },
      select: {
        id: true,
        currentPrice: true,
        discountPrice: true,
      },
    });

    if (!offer) {
      this.logger.warn("Offer not found for cart item add", {
        service: "CartsService",
        method: "addCartItem",
        userId,
        offerId: dto.offerId,
      });
      throw new NotFoundException(`Offer '${dto.offerId}' not found`);
    }

    const effectivePrice = offer.discountPrice ?? offer.currentPrice;
    const discountAmount = offer.discountPrice
      ? Number(offer.currentPrice) - Number(offer.discountPrice)
      : 0;

    const { cartItemId } = await this.prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findFirst({
        where: {
          userId,
          isActive: true,
        },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            userId,
            isActive: true,
            sum: 0,
            discountSum: 0,
          },
        });
      }

      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          offerId: dto.offerId,
        },
      });

      if (existingItem) {
        const updatedItem = await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: {
              increment: dto.quantity,
            },
            price: effectivePrice,
          },
        });

        await tx.cart.update({
          where: { id: cart.id },
          data: {
            sum: Number(cart.sum) + Number(effectivePrice) * dto.quantity,
            discountSum:
              Number(cart.discountSum) + discountAmount * dto.quantity,
          },
        });

        return { cartItemId: updatedItem.id };
      }

      const createdItem = await tx.cartItem.create({
        data: {
          cartId: cart.id,
          offerId: dto.offerId,
          quantity: dto.quantity,
          price: effectivePrice,
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          sum: Number(cart.sum) + Number(effectivePrice) * dto.quantity,
          discountSum: Number(cart.discountSum) + discountAmount * dto.quantity,
        },
      });

      return { cartItemId: createdItem.id };
    });

    this.logger.info("Cart item added", {
      service: "CartsService",
      method: "addCartItem",
      userId,
      offerId: dto.offerId,
      quantity: dto.quantity,
      cartItemId,
    });

    return {
      success: true,
      cartItemId,
    };
  }
}
