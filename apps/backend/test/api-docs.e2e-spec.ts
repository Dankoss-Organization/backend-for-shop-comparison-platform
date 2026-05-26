import request from "supertest";
import {
  cleanupProductsE2EContext,
  createProductsE2EContext,
  ProductsE2EContext,
} from "./helpers/products-e2e-fixture";

describe("API documentation endpoints (e2e)", () => {
  let context: ProductsE2EContext;

  beforeAll(async () => {
    context = await createProductsE2EContext();
  });

  afterAll(async () => {
    await cleanupProductsE2EContext(context);
  });

  it("returns OpenAPI spec json", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/docs-json")
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        openapi: expect.any(String),
        info: expect.objectContaining({
          title: "Shop Comparison Platform API",
          version: "1.0",
        }),
      }),
    );
  });

  it("documents products endpoints", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/docs-json")
      .expect(200);

    expect(response.body.paths).toEqual(
      expect.objectContaining({
        "/api/v1/products": expect.any(Object),
        "/api/v1/products/categories": expect.any(Object),
        "/api/v1/categories": expect.any(Object),
        "/api/v1/categories/{categorySlug}": expect.any(Object),
        "/api/v1/products/{id}/card": expect.any(Object),
        "/api/v1/products/{id}/offers": expect.any(Object),
        "/api/v1/products/{id}/price-history": expect.any(Object),
        "/api/v1/products/{id}/related": expect.any(Object),
        "/api/v1/stores": expect.any(Object),
        "/api/v1/stores/{storeId}/products": expect.any(Object),
      }),
    );
  });

  it("documents query parameters for offers, price-history and related", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/docs-json")
      .expect(200);

    const productsParams =
      response.body.paths["/api/v1/products"].get.parameters;
    expect(productsParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "page", in: "query" }),
        expect.objectContaining({ name: "limit", in: "query" }),
        expect.objectContaining({ name: "search", in: "query" }),
        expect.objectContaining({ name: "brand", in: "query" }),
        expect.objectContaining({ name: "categoryId", in: "query" }),
        expect.objectContaining({ name: "inStock", in: "query" }),
        expect.objectContaining({ name: "sort", in: "query" }),
      ]),
    );

    const categoriesParams =
      response.body.paths["/api/v1/products/categories"].get.parameters;
    expect(categoriesParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "parentId", in: "query" }),
      ]),
    );

    const categoriesAliasParams =
      response.body.paths["/api/v1/categories"].get.parameters;
    expect(categoriesAliasParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "parentId", in: "query" }),
      ]),
    );

    const offersParams =
      response.body.paths["/api/v1/products/{id}/offers"].get.parameters;
    expect(offersParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sort", in: "query" }),
        expect.objectContaining({ name: "inStock", in: "query" }),
      ]),
    );

    const periodParam = response.body.paths[
      "/api/v1/products/{id}/price-history"
    ].get.parameters.find((param: { name: string }) => param.name === "period");
    expect(periodParam).toBeDefined();
    expect(periodParam.schema).toEqual(
      expect.objectContaining({
        type: "string",
        pattern: "^(\\d+)(d|w|m)$",
        default: "30d",
      }),
    );

    const limitParam = response.body.paths[
      "/api/v1/products/{id}/related"
    ].get.parameters.find((param: { name: string }) => param.name === "limit");
    expect(limitParam).toBeDefined();
    expect(limitParam.schema).toEqual(
      expect.objectContaining({
        type: "number",
        minimum: 1,
        maximum: 20,
      }),
    );

    const storeProductsParams =
      response.body.paths["/api/v1/stores/{storeId}/products"].get.parameters;
    expect(storeProductsParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "page", in: "query" }),
        expect.objectContaining({ name: "limit", in: "query" }),
        expect.objectContaining({ name: "search", in: "query" }),
        expect.objectContaining({ name: "categoryId", in: "query" }),
        expect.objectContaining({ name: "minDiscount", in: "query" }),
        expect.objectContaining({ name: "sort", in: "query" }),
      ]),
    );
  });
});
