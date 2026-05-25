import { CartOptimizationEvaluatorService } from "./cart-optimization.evaluator.service";
import { CartOptimizationPricingService } from "./cart-optimization.pricing.service";

const evaluator = new CartOptimizationEvaluatorService(new CartOptimizationPricingService());

const result = evaluator.evaluate({
  request: {
    userLocation: { lat: 50.4501, lng: 30.5234 },
    fulfillmentType: "delivery",
    cartItems: [
      {
        itemId: "item-1",
        productId: "prod-1",
        quantity: 1,
        selectedStoreId: "store-a",
        isLocked: true,
      },
      {
        itemId: "item-2",
        productId: "prod-2",
        quantity: 2,
        selectedStoreId: "store-b",
        isLocked: false,
      },
    ],
  },
  offers: [
    {
      itemId: "item-1",
      productId: "prod-1",
      quantity: 1,
      storeId: "store-a",
      storeName: "Store A",
      unitPrice: 120,
      location: { lat: 50.451, lng: 30.52 },
      supportsDelivery: true,
      supportsPickup: true,
      deliveryBaseFee: 40,
      deliveryFeePerKm: 10,
      pickupRadiusKm: 3,
    },
    {
      itemId: "item-2",
      productId: "prod-2",
      quantity: 2,
      storeId: "store-a",
      storeName: "Store A",
      unitPrice: 90,
      location: { lat: 50.451, lng: 30.52 },
      supportsDelivery: true,
      supportsPickup: true,
      deliveryBaseFee: 40,
      deliveryFeePerKm: 10,
      pickupRadiusKm: 3,
    },
    {
      itemId: "item-2",
      productId: "prod-2",
      quantity: 2,
      storeId: "store-b",
      storeName: "Store B",
      unitPrice: 80,
      location: { lat: 50.46, lng: 30.53 },
      supportsDelivery: true,
      supportsPickup: true,
      deliveryBaseFee: 35,
      deliveryFeePerKm: 9,
      pickupRadiusKm: 3,
    },
  ],
});

console.log(JSON.stringify(result, null, 2));
