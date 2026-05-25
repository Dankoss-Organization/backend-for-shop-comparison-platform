import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("Products categories endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns 200 with category tree", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products/categories")
      .expect(200);

    expect(Array.isArray(response.body.categories)).toBe(true);
    expect(response.body.categories.length).toBeGreaterThan(0);
    expect(response.body.categories[0]).toEqual(
      expect.objectContaining({
        id: context.fixture.categoryId,
        name: expect.any(String),
        parentId: null,
        productCount: expect.any(Number),
        children: expect.any(Array),
      }),
    );
  });

  it("returns 404 for unknown parent category", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products/categories")
      .query({ parentId: "missing-category" })
      .expect(404);

    expect(String(response.body.message)).toContain("not found");
  });
});
