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

  it("returns category products with pagination, sorting, search and child aggregation", async () => {
    const prisma = context.prisma as any;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const childCategory = await prisma.productCategory.create({
      data: {
        name: `E2E Category Products Child ${suffix}`,
        parentId: context.fixture.categoryId,
      },
    });

    const childProduct = await prisma.product.create({
      data: {
        productId: `E2E-CATEGORY-PRODUCT-${suffix}`,
        canonicalName: `E2E Child Product ${suffix}`,
        brand: "E2E Brand",
        categoryId: childCategory.id,
        measurements: { weight: "1kg" },
        pricingLogic: { pricePer: "item" },
        mainImage: "https://example.com/e2e-child-category.jpg",
      },
    });

    const childOffer = await prisma.offer.create({
      data: {
        storeId: context.fixture.storeIds[0],
        productId: childProduct.id,
        currentPrice: 40,
        discountPrice: 32,
      },
    });

    await prisma.priceHistory.create({
      data: {
        offerId: childOffer.id,
        price: 40,
        regularPrice: 50,
        startDate: new Date(),
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
        .get(`/api/v1/categories/${root.slug}/products`)
        .query({ page: 1, limit: 10, sort: "name" })
        .expect(200);

      expect(response.body.category).toEqual({
        id: context.fixture.categoryId,
        slug: root.slug,
        name: root.name,
      });
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(1);
      expect(
        response.body.items.some(
          (item: { productId: string }) =>
            item.productId === childProduct.productId,
        ),
      ).toBe(true);
      expect(response.body.items[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          productId: expect.any(String),
          canonicalName: expect.any(String),
          brand: expect.anything(),
          media: expect.any(Array),
          currentPrice: expect.any(Number),
          regularPrice: expect.any(Number),
          discountPercent: expect.anything(),
          currency: "UAH",
          availabilityStatus: expect.stringMatching(
            /in_stock|low_stock|out_of_stock/,
          ),
        }),
      );

      const searchResponse = await request(context.app.getHttpServer())
        .get(`/api/v1/categories/${root.slug}/products`)
        .query({ search: "Child Product", limit: 10 })
        .expect(200);

      expect(searchResponse.body.total).toBe(1);
      expect(searchResponse.body.items[0].productId).toBe(
        childProduct.productId,
      );
    } finally {
      await prisma.product.delete({ where: { id: childProduct.id } });
      await prisma.productCategory.delete({ where: { id: childCategory.id } });
    }
  });

  it("returns category facets scoped to the selected category", async () => {
    const prisma = context.prisma as any;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const categoryTreeResponse = await request(context.app.getHttpServer())
      .get("/api/v1/categories")
      .expect(200);

    const root = categoryTreeResponse.body.categories.find(
      (category: { id: string }) => category.id === context.fixture.categoryId,
    );

    const foreignCategory = await prisma.productCategory.create({
      data: {
        name: `E2E Foreign Category ${suffix}`,
      },
    });

    const foreignProduct = await prisma.product.create({
      data: {
        productId: `E2E-FOREIGN-${suffix}`,
        canonicalName: `E2E Foreign Product ${suffix}`,
        brand: "Foreign Brand",
        categoryId: foreignCategory.id,
        measurements: { weight: "1kg" },
        pricingLogic: { pricePer: "item" },
        mainImage: "https://example.com/e2e-foreign.jpg",
      },
    });

    await prisma.offer.create({
      data: {
        storeId: context.fixture.storeIds[0],
        productId: foreignProduct.id,
        currentPrice: 10,
      },
    });

    try {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/categories/${root.slug}/facets`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          brands: expect.arrayContaining([
            expect.objectContaining({
              name: "E2E Brand",
              count: 2,
            }),
          ]),
          priceRange: {
            min: 88,
            max: 95,
          },
          ratings: [],
          stores: expect.arrayContaining([
            expect.objectContaining({
              id: context.fixture.storeIds[0],
              name: expect.any(String),
              count: expect.any(Number),
            }),
          ]),
          availability: {
            inStock: 3,
            outOfStock: 0,
          },
        }),
      );

      expect(
        response.body.brands.some(
          (brand: { name: string }) => brand.name === "Foreign Brand",
        ),
      ).toBe(false);
      expect(response.body.priceRange.min).toBe(88);
      expect(response.body.priceRange.max).toBe(95);
    } finally {
      await prisma.offer.deleteMany({
        where: {
          productId: foreignProduct.id,
        },
      });
      await prisma.product.delete({ where: { id: foreignProduct.id } });
      await prisma.productCategory.delete({ where: { id: foreignCategory.id } });
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
