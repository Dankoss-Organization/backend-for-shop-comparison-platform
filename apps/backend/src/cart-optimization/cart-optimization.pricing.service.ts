import { Injectable } from "@nestjs/common";
import {
  CART_OPTIMIZATION_DEFAULTS,
  FulfillmentType,
  GeoPoint,
  CartOptimizationStorePricingInput,
} from "./cart-optimization.contracts";

export interface CartOptimizationStoreQuote {
  storeId: string;
  storeName?: string;
  fulfillmentType: FulfillmentType;
  distanceKm: number;
  deliveryFee: number;
  pickupPenalty: number;
  logisticsCost: number;
  isAvailable: boolean;
  notes: string[];
}

@Injectable()
export class CartOptimizationPricingService {
  calculateDistanceKm(userLocation: GeoPoint, storeLocation: GeoPoint): number {
    const earthRadiusKm = 6371;
    const userLatitude = this.toRadians(userLocation.lat);
    const storeLatitude = this.toRadians(storeLocation.lat);
    const latitudeDelta = this.toRadians(storeLocation.lat - userLocation.lat);
    const longitudeDelta = this.toRadians(storeLocation.lng - userLocation.lng);

    const a =
      Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
      Math.cos(userLatitude) *
        Math.cos(storeLatitude) *
        Math.sin(longitudeDelta / 2) *
        Math.sin(longitudeDelta / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.roundToDecimals(earthRadiusKm * c, 2);
  }

  calculateDeliveryFee(
    userLocation: GeoPoint,
    storeLocation: GeoPoint,
    baseFee = 0,
    feePerKm = 0,
  ): number {
    const distanceKm = this.calculateDistanceKm(userLocation, storeLocation);
    return this.roundToMoney(baseFee + distanceKm * feePerKm);
  }

  calculatePickupPenalty(
    userLocation: GeoPoint,
    storeLocation: GeoPoint,
    walkingPenaltyPerKm = CART_OPTIMIZATION_DEFAULTS.pickupWalkingPenaltyPerKm,
  ): number {
    const distanceKm = this.calculateDistanceKm(userLocation, storeLocation);
    return this.roundToMoney(distanceKm * walkingPenaltyPerKm);
  }

  quoteStore(
    userLocation: GeoPoint,
    store: CartOptimizationStorePricingInput,
    fulfillmentType: FulfillmentType,
  ): CartOptimizationStoreQuote {
    const distanceKm = this.calculateDistanceKm(userLocation, store.location);

    if (fulfillmentType === "delivery") {
      if (store.supportsDelivery === false) {
        return this.buildUnavailableQuote(store, fulfillmentType, distanceKm, [
          "delivery_not_supported",
        ]);
      }

      const deliveryFee = this.calculateDeliveryFee(
        userLocation,
        store.location,
        store.deliveryBaseFee ?? 0,
        store.deliveryFeePerKm ?? 0,
      );

      return {
        storeId: store.storeId,
        storeName: store.storeName,
        fulfillmentType,
        distanceKm,
        deliveryFee,
        pickupPenalty: 0,
        logisticsCost: deliveryFee,
        isAvailable: true,
        notes: [],
      };
    }

    if (store.supportsPickup === false) {
      return this.buildUnavailableQuote(store, fulfillmentType, distanceKm, [
        "pickup_not_supported",
      ]);
    }

    const pickupRadiusKm = store.pickupRadiusKm ?? CART_OPTIMIZATION_DEFAULTS.pickupSearchRadiusKm;
    if (distanceKm > pickupRadiusKm) {
      return this.buildUnavailableQuote(store, fulfillmentType, distanceKm, [
        "pickup_out_of_radius",
      ]);
    }

    const pickupPenalty = this.calculatePickupPenalty(userLocation, store.location);

    return {
      storeId: store.storeId,
      storeName: store.storeName,
      fulfillmentType,
      distanceKm,
      deliveryFee: 0,
      pickupPenalty,
      logisticsCost: pickupPenalty,
      isAvailable: true,
      notes: [],
    };
  }

  private buildUnavailableQuote(
    store: CartOptimizationStorePricingInput,
    fulfillmentType: FulfillmentType,
    distanceKm: number,
    notes: string[],
  ): CartOptimizationStoreQuote {
    return {
      storeId: store.storeId,
      storeName: store.storeName,
      fulfillmentType,
      distanceKm,
      deliveryFee: 0,
      pickupPenalty: 0,
      logisticsCost: 0,
      isAvailable: false,
      notes,
    };
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private roundToMoney(value: number): number {
    return this.roundToDecimals(value, 2);
  }

  private roundToDecimals(value: number, precision: number): number {
    const factor = 10 ** precision;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
