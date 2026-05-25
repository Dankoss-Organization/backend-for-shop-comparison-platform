import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  expectIsoDate,
  expectOfferContract,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("Products card endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns 200 with product card", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/card`)
      .expect(200);

    expect(response.body.product).toEqual(
      expect.objectContaining({
        id: context.fixture.productDbId,
        productId: context.fixture.productId,
        canonicalName: "E2E Main Product",
        brand: "E2E Brand",
        category: expect.any(String),
        media: expect.any(String),
        measurements: expect.any(Object),
        description: null,
        calories: null,
      }),
    );
    expect(response.body.pricingSummary).toEqual(
      expect.objectContaining({
        bestPrice: expect.any(Number),
        currency: "UAH",
      }),
    );
    expect(response.body.topOffers.length).toBeGreaterThan(0);
    expectOfferContract(response.body.topOffers[0], "E2E Store Brand ");
    expect(response.body.stats).toEqual(
      expect.objectContaining({
        minPrice30d: expect.any(Number),
        maxPrice30d: expect.any(Number),
        avgPrice30d: expect.any(Number),
        priceTrend: expect.any(String),
      }),
    );
    expect(response.body.badges).toEqual(expect.any(Array));
    expect(response.body.availabilityStatus).toEqual(expect.any(String));
    expect(response.body.userContext).toEqual(
      expect.objectContaining({
        favorite: expect.any(Boolean),
        inComparison: expect.any(Boolean),
        inCart: expect.any(Boolean),
      }),
    );
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        fetchedAt: expect.any(String),
        cacheTtlSeconds: expect.any(Number),
      }),
    );
    expectIsoDate(response.body.meta.fetchedAt);
  });

  it("returns 404 for unknown product", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products/not-found-product/card")
      .expect(404);

    expect(String(response.body.message)).toContain("not found");
  });
});
