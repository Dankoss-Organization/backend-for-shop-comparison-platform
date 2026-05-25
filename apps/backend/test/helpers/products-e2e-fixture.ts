import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import { ApiDocumentationService } from "../../src/shared/api-documentation.service";

export interface ProductsE2EFixture {
  productId: string;
  productDbId: string;
  relatedProductDbId: string;
  categoryId: string;
  storeBrandId: string;
  storeIds: string[];
}

export interface ProductsE2EContext {
  app: INestApplication;
  prisma: PrismaService;
  fixture: ProductsE2EFixture;
}

export const expectIsoDate = (value: unknown) => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  expect(typeof value).toBe("string");
  expect(String(value)).toMatch(isoDateRegex);
};

export const expectOfferContract = (
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

export const createProductsE2EContext =
  async (): Promise<ProductsE2EContext> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    ApiDocumentationService.configure(app);
    await app.init();

    const prisma = app.get(PrismaService);
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

    return {
      app,
      prisma,
      fixture: {
        productId: product.productId,
        productDbId: product.id,
        relatedProductDbId: relatedProduct.id,
        categoryId: category.id,
        storeBrandId: storeBrand.id,
        storeIds: [storeA.id, storeB.id],
      },
    };
  };

export const cleanupProductsE2EContext = async ({
  app,
  prisma,
  fixture,
}: ProductsE2EContext) => {
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
};
