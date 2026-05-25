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
      where: {
        OR: [
          { product: { productId: { in: productIds } } },
          { product: { id: { in: productIds } } },
        ],
      },
      include: { store: { include: { brand: true } }, product: true },
    });

    const candidates: CartOptimizationOfferCandidate[] = [];

    for (const cartItem of request.cartItems) {
      const matching = offers.filter(
        (o) =>
          o.product.productId === cartItem.productId ||
          o.product.id === cartItem.productId,
      );
      for (const o of matching) {
        const storeAny = o.store as any;
        candidates.push({
          itemId: cartItem.itemId,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          storeId: o.storeId,
          storeName: `${(o.store as any).brand?.name ?? o.storeId}`,
          location: {
            lat: Number(o.store.latitude) || 50.4501,
            lng: Number(o.store.longitude) || 30.5234,
          },
          supportsDelivery: storeAny.supportsDelivery ?? true,
          supportsPickup: storeAny.supportsPickup ?? true,
          deliveryBaseFee: Number(storeAny.deliveryBaseFee) || 30,
          deliveryFeePerKm: Number(storeAny.deliveryFeePerKm) || 0,
          pickupRadiusKm: storeAny.pickupRadiusKm ?? null,
          unitPrice: Number(o.currentPrice),
        });
      }
    }

    return { request, offers: candidates };
  }
}
