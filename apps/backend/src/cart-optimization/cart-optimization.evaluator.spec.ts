const { CartOptimizationEvaluatorService } = require('./cart-optimization.evaluator.service');
const { CartOptimizationPricingService } = require('./cart-optimization.pricing.service');

describe('CartOptimizationEvaluatorService', () => {
  const pricing = new CartOptimizationPricingService();
  const evaluator = new CartOptimizationEvaluatorService(pricing);

  it('keeps locked items assigned and computes baseline', () => {
    const input = {
      request: {
        userLocation: { lat: 50.4501, lng: 30.5234 },
        fulfillmentType: 'delivery',
        cartItems: [
          { itemId: 'i1', productId: 'p1', quantity: 1, selectedStoreId: 'A', isLocked: true },
        ],
      },
      offers: [
        {
          itemId: 'i1',
          productId: 'p1',
          quantity: 1,
          storeId: 'A',
          storeName: 'A',
          unitPrice: 100,
          location: { lat: 50.45, lng: 30.52 },
          supportsDelivery: true,
          supportsPickup: true,
          deliveryBaseFee: 30,
          deliveryFeePerKm: 10,
        },
      ],
    };

    const out = evaluator.evaluate(input);
    expect(out.baseline.isFeasible).toBe(true);
    expect(out.baseline.items.length).toBe(1);
    expect(out.baseline.items[0].isLocked).toBe(true);
  });

  it('chooses single-store when second delivery negates item savings', () => {
    const input = {
      request: {
        userLocation: { lat: 50.4501, lng: 30.5234 },
        fulfillmentType: 'delivery',
        cartItems: [
          { itemId: 'i1', productId: 'p1', quantity: 1, selectedStoreId: 'A', isLocked: true },
          { itemId: 'i2', productId: 'p2', quantity: 2, selectedStoreId: 'B', isLocked: false },
        ],
      },
      offers: [
        {
          itemId: 'i1', productId: 'p1', quantity: 1, storeId: 'A', storeName: 'A', unitPrice: 120,
          location: { lat: 50.451, lng: 30.52 }, supportsDelivery: true, deliveryBaseFee: 40, deliveryFeePerKm: 10,
        },
        {
          itemId: 'i2', productId: 'p2', quantity: 2, storeId: 'A', storeName: 'A', unitPrice: 90,
          location: { lat: 50.451, lng: 30.52 }, supportsDelivery: true, deliveryBaseFee: 40, deliveryFeePerKm: 10,
        },
        {
          itemId: 'i2', productId: 'p2', quantity: 2, storeId: 'B', storeName: 'B', unitPrice: 80,
          location: { lat: 50.46, lng: 30.53 }, supportsDelivery: true, deliveryBaseFee: 35, deliveryFeePerKm: 9,
        },
      ],
    };

    const out = evaluator.evaluate(input);

    expect(out.baseline.storeCount).toBeGreaterThanOrEqual(1);
    expect(out.cheapest.storeCount).toBe(1);
    expect(out.cheapest.totalCost).toBeLessThanOrEqual(out.baseline.totalCost);
  });
});

export {};
