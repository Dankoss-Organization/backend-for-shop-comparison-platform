import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("Stores endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns 200 with list of stores", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/stores")
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        stores: expect.any(Array),
      }),
    );
    expect(response.body.stores.length).toBeGreaterThan(0);

    const store = response.body.stores[0];
    expect(store).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        brand: expect.any(String),
        logo: expect.any([String, null]),
        website: expect.any([String, null]),
        locationCount: expect.any(Number),
      }),
    );
  });

  it("stores are sorted by brand name", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/stores")
      .expect(200);

    const stores = response.body.stores;
    const brandNames = stores.map((store: { brand: string }) => store.brand);
    const sortedNames = [...brandNames].sort();

    expect(brandNames).toEqual(sortedNames);
  });

  it("locationCount matches store locations in database", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/stores")
      .expect(200);

    expect(response.body.stores.length).toBeGreaterThan(0);
    const store = response.body.stores.find(
      (s: { id: string }) => s.id === context.fixture.storeBrandId,
    );
    expect(store).toBeDefined();
    expect(store.locationCount).toBeGreaterThan(0);
  });

  describe("GET /api/v1/stores/:storeId/products", () => {
    it("returns 200 with store products", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          storeId: context.fixture.storeIds[0],
          storeName: expect.any(String),
          items: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      );
    });

    it("returns products with correct structure", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .expect(200);

      if (response.body.items.length > 0) {
        const item = response.body.items[0];
        expect(item).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            productId: expect.any(String),
            canonicalName: expect.any(String),
            brand: expect.anything(),
            media: expect.any(String),
            currentPrice: expect.any(Number),
            regularPrice: expect.any(Number),
            discountPercent: expect.anything(),
            currency: "UAH",
            availabilityStatus: "in_stock",
          }),
        );
      }
    });

    it("returns 404 for unknown store", async () => {
      const response = await request(context.app.getHttpServer())
        .get("/api/v1/stores/unknown-store/products")
        .expect(404);

      expect(String(response.body.message)).toContain("not found");
    });

    it("filters by minDiscount", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .query({ minDiscount: 50 })
        .expect(200);

      if (response.body.items.length > 0) {
        response.body.items.forEach(
          (item: { discountPercent: number | null }) => {
            if (item.discountPercent !== null) {
              expect(item.discountPercent).toBeGreaterThanOrEqual(50);
            }
          },
        );
      }
    });

    it("sorts by price ascending", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .query({ sort: "price_asc" })
        .expect(200);

      const items = response.body.items;
      if (items.length > 1) {
        for (let i = 1; i < items.length; i++) {
          expect(items[i].currentPrice).toBeGreaterThanOrEqual(
            items[i - 1].currentPrice,
          );
        }
      }
    });

    it("sorts by discount descending", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .query({ sort: "discount" })
        .expect(200);

      const items = response.body.items;
      if (items.length > 1) {
        for (let i = 1; i < items.length; i++) {
          const prevDiscount = items[i - 1].discountPercent ?? 0;
          const currDiscount = items[i].discountPercent ?? 0;
          expect(currDiscount).toBeLessThanOrEqual(prevDiscount);
        }
      }
    });

    it("respects page and limit parameters", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.items.length).toBeLessThanOrEqual(10);
    });

    it("returns 400 for invalid sort", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .query({ sort: "invalid" })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("sort");
    });

    it("returns 400 for invalid minDiscount", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/stores/${context.fixture.storeIds[0]}/products`)
        .query({ minDiscount: 150 })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("minDiscount");
    });
  });
});
