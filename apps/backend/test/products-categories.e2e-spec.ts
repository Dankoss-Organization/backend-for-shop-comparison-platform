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
    const found = response.body.categories.find(
      (c: { id: string }) => c.id === context.fixture.categoryId,
    );
    expect(found).toBeDefined();
    expect(found).toEqual(
      expect.objectContaining({
        id: context.fixture.categoryId,
        name: expect.any(String),
        parentId: null,
        productCount: expect.any(Number),
      }),
    );
  });

  it("returns SEO-friendly category tree at /api/v1/categories", async () => {
    const prisma = context.prisma as any;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const childCategory = await prisma.productCategory.create({
      data: {
        name: `E2E Child Category ${suffix}`,
        parentId: context.fixture.categoryId,
      },
    });
    const childProduct = await prisma.product.create({
      data: {
        productId: `E2E-CHILD-${suffix}`,
        canonicalName: `E2E Child Product ${suffix}`,
        brand: "E2E Brand",
        categoryId: childCategory.id,
        measurements: { weight: "1kg" },
        pricingLogic: { pricePer: "item" },
        mainImage: "https://example.com/e2e-child.jpg",
      },
    });

    try {
      const response = await request(context.app.getHttpServer())
        .get("/api/v1/categories")
        .expect(200);

      expect(Array.isArray(response.body.categories)).toBe(true);
      const root = response.body.categories.find(
        (category: { id: string }) =>
          category.id === context.fixture.categoryId,
      );

      expect(root).toEqual(
        expect.objectContaining({
          id: context.fixture.categoryId,
          slug: expect.any(String),
          thumbnailUrl: expect.any(String),
          parentId: null,
          productCount: 3,
        }),
      );

      const child = root.children.find(
        (category: { id: string }) => category.id === childCategory.id,
      );

      expect(child).toEqual(
        expect.objectContaining({
          id: childCategory.id,
          slug: expect.any(String),
          thumbnailUrl: expect.any(String),
          parentId: context.fixture.categoryId,
          productCount: 1,
        }),
      );
    } finally {
      await prisma.product.delete({ where: { id: childProduct.id } });
      await prisma.productCategory.delete({ where: { id: childCategory.id } });
    }
  });

  it("returns category metadata by slug", async () => {
    const prisma = context.prisma as any;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const childCategory = await prisma.productCategory.create({
      data: {
        name: `E2E Metadata Child ${suffix}`,
        parentId: context.fixture.categoryId,
      },
    });

    try {
      const categoryTreeResponse = await request(context.app.getHttpServer())
        .get("/api/v1/categories")
        .expect(200);

      const root = categoryTreeResponse.body.categories.find(
        (category: { id: string }) =>
          category.id === context.fixture.categoryId,
      );

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/categories/${root.slug}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: context.fixture.categoryId,
          slug: root.slug,
          name: root.name,
          description: expect.any(String),
          bannerUrl: expect.stringContaining(
            "https://assets.dankoss.ua/categories/banners/",
          ),
          thumbnailUrl: root.thumbnailUrl,
          parent: null,
          children: expect.arrayContaining([
            expect.objectContaining({
              id: childCategory.id,
              slug: expect.any(String),
              name: `E2E Metadata Child ${suffix}`,
              productCount: 0,
            }),
          ]),
          productCount: 2,
          breadcrumbs: [
            { id: "catalog", name: "Каталог", slug: "catalog" },
            {
              id: context.fixture.categoryId,
              name: root.name,
              slug: root.slug,
            },
          ],
          seo: {
            title: expect.stringContaining(root.name),
            description: expect.any(String),
            keywords: expect.arrayContaining([expect.any(String)]),
          },
        }),
      );
    } finally {
      await prisma.productCategory.delete({ where: { id: childCategory.id } });
    }
  });

  it("returns 404 for unknown parent category", async () => {
    const response = await request(context.app.getHttpServer())
      .get("/api/v1/products/categories")
      .query({ parentId: "missing-category" })
      .expect(404);

    expect(String(response.body.message)).toContain("not found");
  });
});
