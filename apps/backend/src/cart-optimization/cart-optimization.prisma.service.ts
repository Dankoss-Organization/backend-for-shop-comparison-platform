import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CartOptimizationEvaluationInput,
  CartOptimizationOfferCandidate,
  CartOptimizationRequest,
} from "./cart-optimization.contracts";

@Injectable()
export class CartOptimizationPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  async buildEvaluationInput(
    request: CartOptimizationRequest,
  ): Promise<CartOptimizationEvaluationInput> {
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

    return { request, offers: candidates };
  }
}
