const { CartOptimizationPricingService } = require('./cart-optimization.pricing.service');

describe('CartOptimizationPricingService', () => {
  const service = new CartOptimizationPricingService();

  it('calculates distance and delivery fee from user location', () => {
    const user = { lat: 50.4501, lng: 30.5234 };
    const store = { lat: 50.4547, lng: 30.5151 };

    const distance = service.calculateDistanceKm(user, store);
    expect(typeof distance).toBe('number');
    expect(distance).toBeGreaterThan(0);

    const fee = service.calculateDeliveryFee(user, store, 40, 10);
    expect(typeof fee).toBe('number');
    expect(fee).toBeGreaterThanOrEqual(40);
  });

  it('applies pickup penalty and respects radius', () => {
    const user = { lat: 50.4501, lng: 30.5234 };
    const farStore = { lat: 50.6, lng: 30.9 };

    const penalty = service.calculatePickupPenalty(user, farStore, 5);
    expect(penalty).toBeGreaterThan(0);
  });
});

export {};
