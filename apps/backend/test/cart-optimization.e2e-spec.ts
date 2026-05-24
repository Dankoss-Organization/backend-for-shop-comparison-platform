import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CartOptimizationPrismaService } from '../src/cart-optimization/cart-optimization.prisma.service';

describe('Cart Optimization (e2e)', () => {
  let app: INestApplication;

  const mockPrisma = {
    buildEvaluationInput: jest.fn(async (requestPayload) => {
      return {
        request: requestPayload,
        offers: [
          {
            itemId: requestPayload.cartItems[0].itemId,
            productId: requestPayload.cartItems[0].productId,
            quantity: requestPayload.cartItems[0].quantity,
            storeId: 'store-A',
            storeName: 'Store A',
            location: { lat: 50.45, lng: 30.52 },
            supportsDelivery: true,
            supportsPickup: true,
            deliveryBaseFee: 30,
            deliveryFeePerKm: 10,
            pickupRadiusKm: 3,
            unitPrice: 100,
          },
        ],
      };
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CartOptimizationPrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/cart/optimize (POST) returns scenarios', async () => {
    const payload = {
      userLocation: { lat: 50.4501, lng: 30.5234 },
      fulfillmentType: 'delivery',
      cartItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, selectedStoreId: 'store-A', isLocked: false }],
    };

    const res = await request(app.getHttpServer()).post('/api/v1/cart/optimize').send(payload).expect(201);

    expect(res.body).toHaveProperty('baseline');
    expect(res.body).toHaveProperty('cheapest');
    expect(res.body).toHaveProperty('closest');
    expect(res.body).toHaveProperty('optimal');

    expect(typeof res.body.baseline.totalCost).toBe('number');
  });
});

export {};
