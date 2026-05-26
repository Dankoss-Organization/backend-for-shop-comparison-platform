import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { CartsModule } from "../src/carts/carts.module";
import { LoggerModule } from "../src/logger/logger.module";

describe("CartsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = Date.now();
  const userId = "dev_user";
  const sessionToken = `cart-e2e-token-${suffix}`;
  let offerId = "";
  let cartItemId = "";

  beforeAll(async () => {
    // ensure guard fallback uses this test-specific user id
    process.env.DEV_USER_ID = userId;
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

    // ensure any old sessions/carts for this user are removed
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    await prisma.cart.deleteMany({ where: { userId } });

    // create a session token so the guard resolves the correct user
    await prisma.session.create({
      data: {
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId,
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
        category: { connect: { id: category.id } },
        mainImage: "https://images.unsplash.com/photo-1546549032-9571cd6b27df",
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

    cartItemId = `ci_item_${suffix}`;
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
      .set("Authorization", `Bearer ${sessionToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        isActive: true,
        discountSum: 0,
        currency: "UAH",
      }),
    );

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
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

    const prod = response.body.items[0].offer.product;
    expect(prod).toEqual(
      expect.objectContaining({
        productId: expect.stringContaining("CART-E2E-PRODUCT-"),
        canonicalName: "Спагеті Barilla No.5 500г",
      }),
    );
    // API may expose either `mainImage` or legacy `media`
    expect(prod.mainImage || prod.media).toBe(
      "https://images.unsplash.com/photo-1546549032-9571cd6b27df",
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
      .set("Authorization", `Bearer ${sessionToken}`)
      .send({
        offerId,
        quantity: 1,
      })
      .expect(201);

    expect(addResponse.body).toEqual(
      expect.objectContaining({
        success: true,
        cartItemId: expect.any(String),
      }),
    );
    // use returned id for subsequent operations
    cartItemId = addResponse.body.cartItemId;

    const cartResponse = await request(app.getHttpServer())
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${sessionToken}`)
      .expect(200);

    expect(cartResponse.body.items).toHaveLength(1);
    expect(cartResponse.body.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        quantity: 3,
        price: 45.99,
      }),
    );
    expect(cartResponse.body.sum).toBeCloseTo(137.97, 2);
    expect(cartResponse.body.discountSum).toBe(0);
  });

  it("updates the quantity of an existing cart item", async () => {
    const patchResponse = await request(app.getHttpServer())
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set("Authorization", `Bearer ${sessionToken}`)
      .send({
        quantity: 5,
      })
      .expect(200);

    expect(patchResponse.body).toEqual(
      expect.objectContaining({
        success: true,
        cartItemId,
      }),
    );

    const cartResponseAfterPatch = await request(app.getHttpServer())
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${sessionToken}`)
      .expect(200);

    expect(cartResponseAfterPatch.body.items[0]).toEqual(
      expect.objectContaining({
        id: cartItemId,
        quantity: 5,
        price: 45.99,
      }),
    );
    expect(cartResponseAfterPatch.body.sum).toBeCloseTo(229.95, 2);
    expect(cartResponseAfterPatch.body.discountSum).toBe(0);
  });

  it("deletes an existing cart item and recalculates the cart totals", async () => {
    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/cart/items/${cartItemId}`)
      .set("Authorization", `Bearer ${sessionToken}`)
      .expect(200);

    expect(deleteResponse.body).toEqual(
      expect.objectContaining({
        success: true,
        cartItemId,
      }),
    );

    const cartResponse = await request(app.getHttpServer())
      .get("/api/v1/cart")
      .expect(200);

    expect(cartResponse.body.items).toHaveLength(0);
    expect(cartResponse.body.sum).toBe(0);
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
