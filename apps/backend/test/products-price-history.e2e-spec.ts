import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  expectIsoDate,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("Products price history endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns 200 with history points", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/price-history`)
      .query({ period: "30d" })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        productId: context.fixture.productDbId,
        period: "30d",
      }),
    );
    expect(Array.isArray(response.body.points)).toBe(true);
    expect(response.body.points.length).toBeGreaterThan(0);
    expect(response.body.points[0]).toEqual(
      expect.objectContaining({
        date: expect.any(String),
        price: expect.any(Number),
        regularPrice: expect.any(Number),
        store: expect.objectContaining({
          id: expect.any(String),
          brand: expect.stringContaining("E2E Store Brand "),
          city: expect.any(String),
        }),
      }),
    );
    expectIsoDate(response.body.points[0].date);
    expect(response.body.stats).toEqual(
      expect.objectContaining({
        minPrice: expect.any(Number),
        maxPrice: expect.any(Number),
        avgPrice: expect.any(Number),
        trend: expect.any(String),
      }),
    );
  });

  it("returns 404 for unknown product", async () => {
    await request(context.app.getHttpServer())
      .get("/api/v1/products/not-found-product/price-history")
      .query({ period: "30d" })
      .expect(404);
  });

  it("returns 400 for invalid period", async () => {
    const response = await request(context.app.getHttpServer())
      .get(`/api/v1/products/${context.fixture.productId}/price-history`)
      .query({ period: "qwerty" })
      .expect(400);

    const message = Array.isArray(response.body.message)
      ? response.body.message.join(" ")
      : String(response.body.message);
    expect(message).toContain("period");
  });
});
