export type FulfillmentType = "delivery" | "pickup";

export type CartOptimizationStrategyName = "cheapest" | "closest" | "optimal";

export type CartOptimizationScenarioName = CartOptimizationStrategyName | "baseline";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CartOptimizationItemInput {
  itemId: string;
  productId: string;
  quantity: number;
  selectedStoreId: string;
  isLocked: boolean;
}

export interface CartOptimizationRequest {
  userLocation: GeoPoint;
  fulfillmentType: FulfillmentType;
  cartItems: CartOptimizationItemInput[];
}

export interface CartOptimizationStorePricingInput {
  storeId: string;
  storeName?: string;
  location: GeoPoint;
  supportsDelivery?: boolean;
  supportsPickup?: boolean;
  deliveryBaseFee?: number;
  deliveryFeePerKm?: number;
  pickupRadiusKm?: number | null;
}

export interface CartOptimizationOfferCandidate extends CartOptimizationStorePricingInput {
  itemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CartOptimizationEvaluationInput {
  request: CartOptimizationRequest;
  offers: CartOptimizationOfferCandidate[];
}

export interface CartOptimizationItemAllocation {
  itemId: string;
  productId: string;
  quantity: number;
  storeId: string;
  storeName?: string;
  selectedStoreId: string;
  unitPrice: number;
  lineTotal: number;
  isLocked: boolean;
}

export interface CartOptimizationStoreAllocation {
  storeId: string;
  storeName?: string;
  distanceKm: number;
  itemsTotal: number;
  deliveryFee: number;
  itemIds: string[];
}

export interface CartOptimizationScenario {
  name: CartOptimizationScenarioName;
  isFeasible: boolean;
  itemsCost: number;
  deliveryCost: number;
  totalCost: number;
  storeCount: number;
  stores: CartOptimizationStoreAllocation[];
  items: CartOptimizationItemAllocation[];
  notes?: string[];
}

export interface CartOptimizationResponse {
  baseline: CartOptimizationScenario;
  cheapest: CartOptimizationScenario;
  closest: CartOptimizationScenario;
  optimal: CartOptimizationScenario;
}

export const CART_OPTIMIZATION_DEFAULTS = {
  maxDeliveryStoreSplit: 2,
  pickupSearchRadiusKm: 3,
  pickupWalkingPenaltyPerKm: 0,
} as const;
