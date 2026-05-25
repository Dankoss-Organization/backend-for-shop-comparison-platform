import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PrismaService } from "../prisma/prisma.service";
import {
  CartOptimizationEvaluationInput,
  CartOptimizationOfferCandidate,
  CartOptimizationRequest,
} from "./cart-optimization.contracts";

@Injectable()
export class CartOptimizationPrismaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async buildEvaluationInput(
    request: CartOptimizationRequest,
  ): Promise<CartOptimizationEvaluationInput> {
    const itemCount = request.cartItems.length;
    const productCount = new Set(request.cartItems.map((c) => c.productId))
      .size;

    this.logger.info("Building cart optimization evaluation input", {
      service: CartOptimizationPrismaService.name,
      itemCount,
      productCount,
    });

    try {
      const productIds = request.cartItems.map((c) => c.productId);

      const offers = await this.prisma.offer.findMany({
        where: { product: { productId: { in: productIds } } },
        include: {
          store: { include: { brand: true } },
          product: true,
        },
      });

      const candidates: CartOptimizationOfferCandidate[] = [];

      for (const cartItem of request.cartItems) {
        const matching = offers.filter(
          (o) => o.product.productId === cartItem.productId,
        );
        for (const o of matching) {
          const storeAny = o.store as any;
          candidates.push({
            itemId: cartItem.itemId,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            storeId: o.storeId,
            storeName: `${(o.store as any).brand?.name ?? o.storeId}`,
            location: { lat: o.store.latitude, lng: o.store.longitude },
            supportsDelivery: true,
            supportsPickup: true,
            deliveryBaseFee: storeAny.deliveryBaseFee
              ? Number(storeAny.deliveryBaseFee)
              : 30,
            deliveryFeePerKm: storeAny.deliveryFeePerKm
              ? Number(storeAny.deliveryFeePerKm)
              : 8,
            pickupRadiusKm: storeAny.pickupRadiusKm ?? null,
            unitPrice: Number(o.currentPrice),
          });
        }
      }

      this.logger.info("Cart optimization evaluation input built", {
        service: CartOptimizationPrismaService.name,
        itemCount,
        productCount,
        offersCount: candidates.length,
      });

      return { request, offers: candidates };
    } catch (error) {
      this.logger.error("Failed to build cart optimization evaluation input", {
        service: CartOptimizationPrismaService.name,
        itemCount,
        productCount,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
