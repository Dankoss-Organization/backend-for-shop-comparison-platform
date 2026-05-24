import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { CartsModule } from "../src/carts/carts.module";
import { LoggerModule } from "../src/logger/logger.module";

describe("CartsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userId = "dev_user";
  const suffix = Date.now();
  let offerId = "";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule, CartsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: "E2E Cart User",
        email: `cart-e2e-${suffix}@example.com`,
        password: "password123",
      },
    });

    const category = await prisma.productCategory.create({
      data: {
        name: `Cart E2E Category ${suffix}`,
      },
    });

    const storeBrand = await prisma.storeBrand.create({
      data: {
        name: `Cart E2E Store Brand ${suffix}`,
      },
    });

    const store = await prisma.localStore.create({
      data: {
        brandId: storeBrand.id,
        city: "Kyiv",
        address: `Cart E2E address ${suffix}`,
        longitude: 30.5,
        latitude: 50.45,
        openingHour: "08:00",
        closingHour: "22:00",
      },
    });

    const product = await prisma.product.create({
      data: {
        productId: `CART-E2E-PRODUCT-${suffix}`,
        canonicalName: "Спагеті Barilla No.5 500г",
        brand: "Barilla",
        categoryId: category.id,
        media: "https://images.unsplash.com/photo-1546549032-9571cd6b27df",
        measurements: { weight: "500g" },
        pricingLogic: { pricePer: "item" },
      },
    });

    const offer = await prisma.offer.create({
      data: {
        storeId: store.id,
        productId: product.id,
        currentPrice: 45.99,
        discountPrice: null,
      },
    });

    offerId = offer.id;

    await prisma.cart.create({
      data: {
        id: `cart_${suffix}`,
        userId,
        isActive: true,
        sum: 91.98,
        discountSum: 0,
        items: {
          create: {
            id: `ci_item_${suffix}`,
            quantity: 2,
            price: 45.99,
            offerId: offer.id,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId,
        },
      },
    });

    await prisma.cart.deleteMany({
      where: {
        userId,
      },
    });

    await prisma.offer.deleteMany({
      where: {
        product: {
          productId: {
            startsWith: `CART-E2E-PRODUCT-${suffix}`,
          },
        },
      },
    });

    await prisma.product.deleteMany({
      where: {
        productId: {
          startsWith: `CART-E2E-PRODUCT-${suffix}`,
        },
      },
    });

    await prisma.localStore.deleteMany({
      where: {
        city: "Kyiv",
        address: {
          contains: `Cart E2E address ${suffix}`,
        },
      },
    });

    await prisma.storeBrand.deleteMany({
      where: {
        name: {
          contains: `Cart E2E Store Brand ${suffix}`,
        },
      },
    });

    await prisma.productCategory.deleteMany({
      where: {
        name: {
          contains: `Cart E2E Category ${suffix}`,
        },
      },
    });

    await prisma.user.delete({
      where: { id: userId },
    });

    await app.close();
  });

  it("returns the current cart payload with aggregated offer and product data", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${userId}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.stringContaining("cart_"),
        isActive: true,
        sum: 91.98,
        discountSum: 0,
        currency: "UAH",
      }),
    );

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        id: `ci_item_${suffix}`,
        quantity: 2,
        price: 45.99,
      }),
    );

    expect(response.body.items[0].offer).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        currentPrice: 45.99,
        discountPrice: null,
      }),
    );

    expect(response.body.items[0].offer.product).toEqual(
      expect.objectContaining({
        productId: expect.stringContaining("CART-E2E-PRODUCT-"),
        canonicalName: "Спагеті Barilla No.5 500г",
        media: "https://images.unsplash.com/photo-1546549032-9571cd6b27df",
      }),
    );

    expect(response.body.items[0].offer.store).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        brand: expect.stringContaining("Cart E2E Store Brand"),
        city: "Kyiv",
      }),
    );
  });

  it("adds an item to the current cart and keeps totals in sync", async () => {
    const addResponse = await request(app.getHttpServer())
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${userId}`)
      .send({
        offerId,
        quantity: 1,
      })
      .expect(201);

    expect(addResponse.body).toEqual({
      success: true,
      cartItemId: `ci_item_${suffix}`,
    });

    const cartResponse = await request(app.getHttpServer())
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${userId}`)
      .expect(200);

    expect(cartResponse.body.items).toHaveLength(1);
    expect(cartResponse.body.items[0]).toEqual(
      expect.objectContaining({
        id: `ci_item_${suffix}`,
        quantity: 3,
        price: 45.99,
      }),
    );
    expect(cartResponse.body.sum).toBe(137.97);
    expect(cartResponse.body.discountSum).toBe(0);
  });

  it("returns an empty cart when there is no active cart for the user", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/cart")
      .set("Authorization", "Bearer missing-cart-user")
      .expect(200);

    expect(response.body).toEqual({
      id: null,
      isActive: false,
      items: [],
      sum: 0,
      discountSum: 0,
      currency: "UAH",
    });
  });
});
