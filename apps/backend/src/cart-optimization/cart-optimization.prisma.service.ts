import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  CartOptimizationEvaluationInput,
  CartOptimizationOfferCandidate,
  CartOptimizationRequest,
} from './cart-optimization.contracts';

const prisma = new PrismaClient();

@Injectable()
export class CartOptimizationPrismaService {
  async buildEvaluationInput(request: CartOptimizationRequest): Promise<CartOptimizationEvaluationInput> {
    const productIds = request.cartItems.map((c) => c.productId);

    const offers = await prisma.offer.findMany({
      where: { productId: { in: productIds } },
      include: { store: true },
    });

    const candidates: CartOptimizationOfferCandidate[] = [];

    for (const cartItem of request.cartItems) {
      const matching = offers.filter((o) => o.productId === cartItem.productId);
      for (const o of matching) {
        const storeAny = o.store as any;
        candidates.push({
          itemId: cartItem.itemId,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          storeId: o.storeId,
          storeName: o.store?.address ?? undefined,
          location: { lat: o.store.latitude, lng: o.store.longitude },
          supportsDelivery: !!storeAny.supportsDelivery,
          supportsPickup: !!storeAny.supportsPickup,
          deliveryBaseFee: storeAny.deliveryBaseFee ? Number(storeAny.deliveryBaseFee) : 0,
          deliveryFeePerKm: storeAny.deliveryFeePerKm ? Number(storeAny.deliveryFeePerKm) : 0,
          pickupRadiusKm: storeAny.pickupRadiusKm ?? null,
          unitPrice: Number(o.currentPrice),
        });
      }
    }

    return {
      request,
      offers: candidates,
    };
  }
}

export {};
