import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("Products list endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns 200 with a product catalog page", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products")
      .query({ page: 1, limit: 10, categoryId: context.fixture.categoryId })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
      }),
    );
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        canonicalName: expect.any(String),
        brand: expect.anything(),
        categoryId: context.fixture.categoryId,
        media: expect.any(String),
        offers: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            storeId: expect.any(String),
            price: expect.any(Number),
            regularPrice: expect.any(Number),
            discountPercent: expect.anything(),
          }),
        ]),
      }),
    );
  });

  it("filters products by store and price range and returns offers for the selected filters", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products")
      .query({
        page: 1,
        limit: 10,
        storeId: context.fixture.storeIds[1],
        minPrice: 95,
        maxPrice: 95,
        sort: "price_asc",
        // target the fixture product to make this assertion deterministic
        search: context.fixture.productId,
      })
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);

    const items = response.body.items as Array<Record<string, unknown>>;
    items.forEach((item) => {
      expect(Array.isArray(item.offers)).toBe(true);

      const offers = item.offers as Array<Record<string, unknown>>;
      expect(offers.length).toBeGreaterThan(0);
    });

    // Ensure across all items there's at least one offer from the requested store
    const allOffers = items.flatMap((it) => (it.offers as Array<Record<string, unknown>>) || []);
    const matching = allOffers.filter((o) => o.storeId === context.fixture.storeIds[1]);
    expect(matching.length).toBeGreaterThan(0);
  });

  it("accepts extended sort values", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products")
      .query({ sort: "discount" })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
  });

  it("returns 400 for invalid paging query", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products")
      .query({ page: 0 })
      .expect(400);

    const message = Array.isArray(response.body.message)
      ? response.body.message.join(" ")
      : String(response.body.message);
    expect(message).toContain("page");
  });
});
