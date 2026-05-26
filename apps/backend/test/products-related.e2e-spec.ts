import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("Products related endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns 200 with related products", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/related`)
      .query({ limit: 5 })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        productId: context.fixture.productDbId,
      }),
    );
    expect(Array.isArray(response.body.related)).toBe(true);
    expect(response.body.related.length).toBeGreaterThan(0);
    // make the assertion resilient to ordering: find any related item that has offers
    const relatedWithOffers = response.body.related.find(
      (r: any) => r.offersCount && r.offersCount > 0,
    );
    expect(relatedWithOffers).toBeDefined();
    expect(relatedWithOffers).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        productId: expect.any(String),
        canonicalName: expect.any(String),
        brand: expect.anything(),
        media: expect.any(String),
        bestPrice: expect.anything(),
        offersCount: expect.any(Number),
      }),
    );
    // ensure the related product we created appears in the list (match by canonical name)
    expect(
      response.body.related.some(
        (item: { canonicalName: string }) =>
          item.canonicalName === "E2E Related Product",
      ),
    ).toBe(true);
  });

  it("returns 404 for unknown product", async () => {
    await request(context.app.getHttpServer())
      .get("/api/v1/products/not-found-product/related")
      .expect(404);
  });

  it("returns 400 when limit is below minimum", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/related`)
      .query({ limit: 0 })
      .expect(400);

    const message = Array.isArray(response.body.message)
      ? response.body.message.join(" ")
      : String(response.body.message);
    expect(message).toContain("limit");
  });

  it("returns 400 when limit is above maximum", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/related`)
      .query({ limit: 21 })
      .expect(400);

    const message = Array.isArray(response.body.message)
      ? response.body.message.join(" ")
      : String(response.body.message);
    expect(message).toContain("limit");
  });

  it("returns 400 when limit is not an integer", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/related`)
      .query({ limit: "abc" })
      .expect(400);

    const message = Array.isArray(response.body.message)
      ? response.body.message.join(" ")
      : String(response.body.message);
    expect(message).toContain("limit");
  });
});
