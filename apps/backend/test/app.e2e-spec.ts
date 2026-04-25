import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("ProductsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const fixture = {
    productId: "",
    productDbId: "",
    relatedProductDbId: "",
    categoryId: "",
    storeBrandId: "",
    storeIds: [] as string[],
  };
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  const expectIsoDate = (value: unknown) => {
    expect(typeof value).toBe("string");
    expect(String(value)).toMatch(isoDateRegex);
  };

  const expectOfferContract = (
    offer: Record<string, unknown>,
    expectedBrandPrefix: string,
  ) => {
    expect(offer).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        currentPrice: expect.any(Number),
        discountPrice: expect.anything(),
        effectivePrice: expect.any(Number),
        oldPrice: expect.any(Number),
        discountPercent: expect.anything(),
        availability: "in_stock",
        updatedAt: expect.any(String),
      }),
    );

    expect(offer.store).toEqual(expect.any(Object));
    const store = offer.store as Record<string, unknown>;
    expect(store).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        brand: expect.any(String),
        city: expect.any(String),
        address: expect.any(String),
      }),
    );
    expect(String(store.brand)).toContain(expectedBrandPrefix);
    expect(offer.effectivePrice).toBeLessThanOrEqual(Number(offer.currentPrice));
    expectIsoDate(offer.updatedAt);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    const suffix = Date.now();
    const category = await prisma.productCategory.create({
      data: {
        name: `E2E Category ${suffix}`,
      },
    });

    const storeBrand = await prisma.storeBrand.create({
      data: {
        name: `E2E Store Brand ${suffix}`,
      },
    });

    const [storeA, storeB] = await Promise.all([
      prisma.localStore.create({
        data: {
          brandId: storeBrand.id,
          city: "Kyiv",
          address: `E2E address A ${suffix}`,
          longitude: 30.5,
          latitude: 50.45,
          openingHour: "08:00",
          closingHour: "22:00",
        },
      }),
      prisma.localStore.create({
        data: {
          brandId: storeBrand.id,
          city: "Lviv",
          address: `E2E address B ${suffix}`,
          longitude: 24.03,
          latitude: 49.84,
          openingHour: "08:00",
          closingHour: "22:00",
        },
      }),
    ]);

    const product = await prisma.product.create({
      data: {
        productId: `E2E-PRODUCT-${suffix}`,
        canonicalName: "E2E Main Product",
        brand: "E2E Brand",
        categoryId: category.id,
        media: "https://example.com/e2e-main.jpg",
        measurements: { weight: "500g" },
        pricingLogic: { pricePer: "item" },
      },
    });

    const relatedProduct = await prisma.product.create({
      data: {
        productId: `E2E-RELATED-${suffix}`,
        canonicalName: "E2E Related Product",
        brand: "E2E Brand",
        categoryId: category.id,
        media: "https://example.com/e2e-related.jpg",
        measurements: { weight: "450g" },
        pricingLogic: { pricePer: "item" },
      },
    });

    const [mainOfferA, mainOfferB, relatedOffer] = await Promise.all([
      prisma.offer.create({
        data: {
          storeId: storeA.id,
          productId: product.id,
          currentPrice: 100,
          discountPrice: 90,
        },
      }),
      prisma.offer.create({
        data: {
          storeId: storeB.id,
          productId: product.id,
          currentPrice: 95,
        },
      }),
      prisma.offer.create({
        data: {
          storeId: storeA.id,
          productId: relatedProduct.id,
          currentPrice: 88,
        },
      }),
    ]);

    await prisma.priceHistory.createMany({
      data: [
        {
          offerId: mainOfferA.id,
          price: 98,
          regularPrice: 105,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          offerId: mainOfferA.id,
          price: 90,
          regularPrice: 100,
          startDate: new Date(),
        },
        {
          offerId: mainOfferB.id,
          price: 96,
          regularPrice: 99,
          startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
        {
          offerId: mainOfferB.id,
          price: 95,
          regularPrice: 97,
          startDate: new Date(),
        },
        {
          offerId: relatedOffer.id,
          price: 88,
          regularPrice: 92,
          startDate: new Date(),
        },
      ],
    });

    fixture.productId = product.productId;
    fixture.productDbId = product.id;
    fixture.relatedProductDbId = relatedProduct.id;
    fixture.categoryId = category.id;
    fixture.storeBrandId = storeBrand.id;
    fixture.storeIds = [storeA.id, storeB.id];
  });

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: {
        id: {
          in: [fixture.productDbId, fixture.relatedProductDbId],
        },
      },
    });

    await prisma.localStore.deleteMany({
      where: {
        id: {
          in: fixture.storeIds,
        },
      },
    });

    await prisma.storeBrand.deleteMany({
      where: {
        id: fixture.storeBrandId,
      },
    });

    await prisma.productCategory.deleteMany({
      where: {
        id: fixture.categoryId,
      },
    });

    await app.close();
  });

  describe("GET /api/v1/products/:id/card", () => {
    it("returns 200 with product card", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/card`)
        .expect(200);

      expect(response.body.product).toEqual(
        expect.objectContaining({
          id: fixture.productDbId,
          productId: fixture.productId,
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
      const response = await request(app.getHttpServer())
        .get("/api/v1/products/not-found-product/card")
        .expect(404);

      expect(String(response.body.message)).toContain("not found");
    });
  });

  describe("GET /api/v1/products/:id/offers", () => {
    it("returns 200 with sorted offers", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/offers`)
        .query({ sort: "price" })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          productId: fixture.productDbId,
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
      await request(app.getHttpServer())
        .get("/api/v1/products/not-found-product/offers")
        .expect(404);
    });

    it("returns 400 for invalid sort", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/offers`)
        .query({ sort: "cheapest" })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("sort");
    });

    it("returns 400 for invalid inStock", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/offers`)
        .query({ inStock: "yes" })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("inStock");
    });
  });

  describe("GET /api/v1/products/:id/price-history", () => {
    it("returns 200 with history points", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/price-history`)
        .query({ period: "30d" })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          productId: fixture.productDbId,
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
      await request(app.getHttpServer())
        .get("/api/v1/products/not-found-product/price-history")
        .query({ period: "30d" })
        .expect(404);
    });

    it("returns 400 for invalid period", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/price-history`)
        .query({ period: "qwerty" })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("period");
    });
  });

  describe("GET /api/v1/products/:id/related", () => {
    it("returns 200 with related products", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/related`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          productId: fixture.productDbId,
        }),
      );
      expect(Array.isArray(response.body.related)).toBe(true);
      expect(response.body.related.length).toBeGreaterThan(0);
      expect(response.body.related[0]).toEqual(
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
      expect(
        response.body.related.some(
          (item: { id: string }) => item.id === fixture.relatedProductDbId,
        ),
      ).toBe(true);
    });

    it("returns 404 for unknown product", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/products/not-found-product/related")
        .expect(404);
    });

    it("returns 400 when limit is below minimum", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/related`)
        .query({ limit: 0 })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("limit");
    });

    it("returns 400 when limit is above maximum", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/related`)
        .query({ limit: 21 })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("limit");
    });

    it("returns 400 when limit is not an integer", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${fixture.productId}/related`)
        .query({ limit: "abc" })
        .expect(400);

      const message = Array.isArray(response.body.message)
        ? response.body.message.join(" ")
        : String(response.body.message);
      expect(message).toContain("limit");
    });
  });
});
