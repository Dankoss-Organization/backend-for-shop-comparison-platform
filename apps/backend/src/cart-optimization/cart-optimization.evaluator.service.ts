import { Inject, Injectable, Optional } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import {
  CartOptimizationEvaluationInput,
  CartOptimizationItemAllocation,
  CartOptimizationOfferCandidate,
  CartOptimizationResponse,
  CartOptimizationScenario,
  CartOptimizationStoreAllocation,
  CART_OPTIMIZATION_DEFAULTS,
  FulfillmentType,
  CartOptimizationScenarioName,
} from "./cart-optimization.contracts";
import {
  CartOptimizationPricingService,
  CartOptimizationStoreQuote,
} from "./cart-optimization.pricing.service";

type AssignmentState = {
  itemAllocations: CartOptimizationItemAllocation[];
  storeBuckets: Map<string, CartOptimizationStoreBucket>;
  itemsCost: number;
};

type CartOptimizationStoreBucket = {
  storeId: string;
  storeName?: string;
  location: { lat: number; lng: number };
  quote: CartOptimizationStoreQuote;
  itemIds: string[];
  itemsTotal: number;
};

type CandidateChoice = {
  offer: CartOptimizationOfferCandidate;
  quote: CartOptimizationStoreQuote;
};

@Injectable()
export class CartOptimizationEvaluatorService {
  private readonly logger: Logger;

  constructor(
    private readonly pricingService: CartOptimizationPricingService,
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    logger?: Logger,
  ) {
    this.logger =
      logger ??
      ({
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      } as unknown as Logger);
  }

  evaluate(input: CartOptimizationEvaluationInput): CartOptimizationResponse {
    const itemCount = input.request.cartItems.length;
    const offerCount = input.offers.length;

    this.logger.info("Starting cart optimization evaluation", {
      service: CartOptimizationEvaluatorService.name,
      itemCount,
      offerCount,
      fulfillmentType: input.request.fulfillmentType,
    });

    const groupedOffers = this.groupOffersByItem(input.offers);
    const lockedItemIds = new Set(
      input.request.cartItems
        .filter((item) => item.isLocked)
        .map((item) => item.itemId),
    );

    const baseline = this.buildBaselineScenario(input, groupedOffers);
    const lockedStoreCount = new Set(
      input.request.cartItems
        .filter((item) => item.isLocked)
        .map((item) => item.selectedStoreId),
    ).size;
    const maxStoreCount = Math.max(
      CART_OPTIMIZATION_DEFAULTS.maxDeliveryStoreSplit,
      lockedStoreCount,
    );

    const candidatesByItem = input.request.cartItems.map((cartItem) => {
      const itemOffers = groupedOffers.get(cartItem.itemId) ?? [];
      const choices = itemOffers
        .filter((offer) => offer.quantity >= cartItem.quantity)
        .map((offer) => ({
          offer,
          quote: this.pricingService.quoteStore(
            input.request.userLocation,
            offer,
            input.request.fulfillmentType,
          ),
        }))
        .filter((choice) => choice.quote.isAvailable);

      return {
        cartItem,
        choices: this.prioritizeChoices(cartItem, choices),
      };
    });

    const orderedItems = [...candidatesByItem].sort((left, right) => {
      if (left.cartItem.isLocked !== right.cartItem.isLocked) {
        return left.cartItem.isLocked ? -1 : 1;
      }

      return left.choices.length - right.choices.length;
    });

    const searchResult = this.searchBestAssignments({
      orderedItems,
      maxStoreCount,
      userLocation: input.request.userLocation,
      fulfillmentType: input.request.fulfillmentType,
      lockedStoreCount,
    });

    const cheapest = this.toScenario(
      "cheapest",
      searchResult.cheapest ?? baseline,
      input.request.fulfillmentType,
      lockedStoreCount,
    );

    const closest = this.toScenario(
      "closest",
      searchResult.closest ?? baseline,
      input.request.fulfillmentType,
      lockedStoreCount,
    );

    const optimal = this.toScenario(
      "optimal",
      searchResult.optimal ?? baseline,
      input.request.fulfillmentType,
      lockedStoreCount,
    );

    const baselineScenario = this.toScenario(
      "baseline",
      baseline,
      input.request.fulfillmentType,
      lockedStoreCount,
    );

    this.logger.info("Cart optimization evaluation completed", {
      service: CartOptimizationEvaluatorService.name,
      itemCount,
      offerCount,
      maxStoreCount,
      baselineItems: baselineScenario.items.length,
      cheapestItems: cheapest?.items.length ?? 0,
      closestItems: closest?.items.length ?? 0,
      optimalItems: optimal?.items.length ?? 0,
    });

    return {
      baseline: baselineScenario,
      cheapest,
      closest,
      optimal,
    };
  }

  private buildBaselineScenario(
    input: CartOptimizationEvaluationInput,
    groupedOffers: Map<string, CartOptimizationOfferCandidate[]>,
  ): AssignmentState {
    const state: AssignmentState = {
      itemAllocations: [],
      storeBuckets: new Map(),
      itemsCost: 0,
    };

    for (const cartItem of input.request.cartItems) {
      const selectedOffer = (groupedOffers.get(cartItem.itemId) ?? []).find(
        (offer) => offer.storeId === cartItem.selectedStoreId,
      );

      if (!selectedOffer) {
        return state;
      }

      const quote = this.pricingService.quoteStore(
        input.request.userLocation,
        selectedOffer,
        input.request.fulfillmentType,
      );

      if (!quote.isAvailable) {
        return state;
      }

      this.addAllocation(state, cartItem, selectedOffer, quote);
    }

    return state;
  }

  private searchBestAssignments(input: {
    orderedItems: Array<{
      cartItem: CartOptimizationEvaluationInput["request"]["cartItems"][number];
      choices: CandidateChoice[];
    }>;
    maxStoreCount: number;
    userLocation: { lat: number; lng: number };
    fulfillmentType: CartOptimizationEvaluationInput["request"]["fulfillmentType"];
    lockedStoreCount: number;
  }): {
    cheapest: AssignmentState | null;
    closest: AssignmentState | null;
    optimal: AssignmentState | null;
  } {
    let cheapest: AssignmentState | null = null;
    let closest: AssignmentState | null = null;
    let optimal: AssignmentState | null = null;

    const dfs = (index: number, state: AssignmentState) => {
      if (state.storeBuckets.size > input.maxStoreCount) {
        return;
      }

      if (index >= input.orderedItems.length) {
        if (state.itemAllocations.length === 0) {
          return;
        }

        cheapest = this.pickBetter(cheapest, state, (left, right) =>
          this.compareCheapest(left, right),
        );
        closest = this.pickBetter(closest, state, (left, right) =>
          this.compareClosest(left, right),
        );
        optimal = this.pickBetter(optimal, state, (left, right) =>
          this.compareOptimal(left, right),
        );
        return;
      }

      const current = input.orderedItems[index];
      const cartItem = current.cartItem;
      const choices = current.choices.filter(
        (choice) =>
          !cartItem.isLocked ||
          choice.offer.storeId === cartItem.selectedStoreId,
      );

      for (const choice of choices) {
        const nextState = this.cloneState(state);
        this.addAllocation(nextState, cartItem, choice.offer, choice.quote);
        dfs(index + 1, nextState);
      }
    };

    dfs(0, {
      itemAllocations: [],
      storeBuckets: new Map(),
      itemsCost: 0,
    });

    return { cheapest, closest, optimal };
  }

  private prioritizeChoices(
    cartItem: CartOptimizationEvaluationInput["request"]["cartItems"][number],
    choices: CandidateChoice[],
  ): CandidateChoice[] {
    return [...choices].sort((left, right) => {
      const leftIsSelected = left.offer.storeId === cartItem.selectedStoreId;
      const rightIsSelected = right.offer.storeId === cartItem.selectedStoreId;

      if (leftIsSelected !== rightIsSelected) {
        return leftIsSelected ? -1 : 1;
      }

      const leftDistance = left.quote.distanceKm;
      const rightDistance = right.quote.distanceKm;

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.offer.unitPrice - right.offer.unitPrice;
    });
  }

  private addAllocation(
    state: AssignmentState,
    cartItem: CartOptimizationEvaluationInput["request"]["cartItems"][number],
    offer: CartOptimizationOfferCandidate,
    quote: CartOptimizationStoreQuote,
  ): void {
    const quantity = cartItem.quantity;
    const lineTotal = this.roundMoney(offer.unitPrice * quantity);

    state.itemAllocations.push({
      itemId: cartItem.itemId,
      productId: cartItem.productId,
      quantity,
      storeId: offer.storeId,
      storeName: offer.storeName,
      selectedStoreId: cartItem.selectedStoreId,
      unitPrice: offer.unitPrice,
      lineTotal,
      isLocked: cartItem.isLocked,
    });

    state.itemsCost = this.roundMoney(state.itemsCost + lineTotal);

    const bucket = state.storeBuckets.get(offer.storeId);
    if (bucket) {
      bucket.itemIds.push(cartItem.itemId);
      bucket.itemsTotal = this.roundMoney(bucket.itemsTotal + lineTotal);
      return;
    }

    state.storeBuckets.set(offer.storeId, {
      storeId: offer.storeId,
      storeName: offer.storeName,
      location: offer.location,
      quote,
      itemIds: [cartItem.itemId],
      itemsTotal: lineTotal,
    });
  }

  private toScenario(
    name: CartOptimizationScenarioName,
    state: AssignmentState,
    fulfillmentType: FulfillmentType,
    lockedStoreCount: number,
  ): CartOptimizationScenario {
    const stores = [...state.storeBuckets.values()].map((bucket) => ({
      storeId: bucket.storeId,
      storeName: bucket.storeName,
      distanceKm: bucket.quote.distanceKm,
      itemsTotal: bucket.itemsTotal,
      deliveryFee: bucket.quote.logisticsCost,
      itemIds: [...bucket.itemIds],
    }));

    const deliveryCost = this.roundMoney(
      stores.reduce((sum, store) => sum + store.deliveryFee, 0),
    );
    const totalCost = this.roundMoney(state.itemsCost + deliveryCost);

    return {
      name,
      isFeasible: state.itemAllocations.length > 0,
      itemsCost: state.itemsCost,
      deliveryCost,
      totalCost,
      storeCount: stores.length,
      stores,
      items: [...state.itemAllocations],
      notes: [
        fulfillmentType === "delivery"
          ? "delivery_pricing_applied"
          : "pickup_penalty_applied",
        lockedStoreCount > CART_OPTIMIZATION_DEFAULTS.maxDeliveryStoreSplit
          ? "locked_store_split_exception_applied"
          : "store_split_limited",
      ],
    };
  }

  private emptyScenario(
    name: CartOptimizationScenario["name"],
    notes: string[],
  ): CartOptimizationScenario {
    return {
      name,
      isFeasible: false,
      itemsCost: 0,
      deliveryCost: 0,
      totalCost: 0,
      storeCount: 0,
      stores: [],
      items: [],
      notes,
    };
  }

  private compareCheapest(
    left: AssignmentState,
    right: AssignmentState,
  ): number {
    const leftStoreCost = this.sumStoreCost(left);
    const rightStoreCost = this.sumStoreCost(right);

    if (leftStoreCost !== rightStoreCost) {
      return leftStoreCost - rightStoreCost;
    }

    if (left.storeBuckets.size !== right.storeBuckets.size) {
      return left.storeBuckets.size - right.storeBuckets.size;
    }

    return left.itemsCost - right.itemsCost;
  }

  private compareClosest(
    left: AssignmentState,
    right: AssignmentState,
  ): number {
    const leftDistance = this.sumDistance(left);
    const rightDistance = this.sumDistance(right);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    if (left.storeBuckets.size !== right.storeBuckets.size) {
      return left.storeBuckets.size - right.storeBuckets.size;
    }

    return this.sumStoreCost(left) - this.sumStoreCost(right);
  }

  private compareOptimal(
    left: AssignmentState,
    right: AssignmentState,
  ): number {
    const leftScore = this.scoreOptimal(left);
    const rightScore = this.scoreOptimal(right);
    return leftScore - rightScore;
  }

  private scoreOptimal(state: AssignmentState): number {
    return (
      this.sumStoreCost(state) +
      this.sumDistance(state) * 4 +
      state.storeBuckets.size * 25
    );
  }

  private sumDistance(state: AssignmentState): number {
    return this.roundMoney(
      [...state.storeBuckets.values()].reduce(
        (sum, bucket) => sum + bucket.quote.distanceKm,
        0,
      ),
    );
  }

  private sumStoreCost(state: AssignmentState): number {
    return this.roundMoney(
      state.itemsCost +
        [...state.storeBuckets.values()].reduce(
          (sum, bucket) => sum + bucket.quote.logisticsCost,
          0,
        ),
    );
  }

  private pickBetter(
    existing: AssignmentState | null,
    candidate: AssignmentState,
    comparator: (left: AssignmentState, right: AssignmentState) => number,
  ): AssignmentState {
    if (!existing) {
      return this.cloneState(candidate);
    }

    return comparator(candidate, existing) < 0
      ? this.cloneState(candidate)
      : existing;
  }

  private cloneState(state: AssignmentState): AssignmentState {
    return {
      itemAllocations: [...state.itemAllocations],
      storeBuckets: new Map(
        [...state.storeBuckets.entries()].map(([storeId, bucket]) => [
          storeId,
          {
            ...bucket,
            itemIds: [...bucket.itemIds],
          },
        ]),
      ),
      itemsCost: state.itemsCost,
    };
  }

  private groupOffersByItem(
    offers: CartOptimizationOfferCandidate[],
  ): Map<string, CartOptimizationOfferCandidate[]> {
    const grouped = new Map<string, CartOptimizationOfferCandidate[]>();

    for (const offer of offers) {
      const bucket = grouped.get(offer.itemId) ?? [];
      bucket.push(offer);
      grouped.set(offer.itemId, bucket);
    }

    return grouped;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
