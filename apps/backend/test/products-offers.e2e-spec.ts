import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  expectOfferContract,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("Products offers endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns 200 with sorted offers", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/offers`)
      .query({ sort: "price" })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        productId: context.fixture.productDbId,
        total: expect.any(Number),
      }),
    );
    expect(response.body.offers.length).toBeGreaterThan(0);
    expectOfferContract(response.body.offers[0], "E2E Store Brand ");
    expect(response.body.total).toBe(response.body.offers.length);

    const [first, second] = response.body.offers;
    if (first && second) {
      expect(first.effectivePrice).toBeLessThanOrEqual(second.effectivePrice);
    }
  });

  it("returns 404 for unknown product", async () => {
    await request(context.app.getHttpServer())
      .get("/api/v1/products/not-found-product/offers")
      .expect(404);
  });

  it("returns 400 for invalid sort", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/offers`)
      .query({ sort: "cheapest" })
      .expect(400);

    const message = Array.isArray(response.body.message)
      ? response.body.message.join(" ")
      : String(response.body.message);
    expect(message).toContain("sort");
  });

  it("returns 400 for invalid inStock", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/offers`)
      .query({ inStock: "yes" })
      .expect(400);

    const message = Array.isArray(response.body.message)
      ? response.body.message.join(" ")
      : String(response.body.message);
    expect(message).toContain("inStock");
  });
});
