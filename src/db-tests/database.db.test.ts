import { Prisma } from '@prisma/client';
import { clearDatabase, disconnectDatabase, getPrisma, resetSchemaAndMigrate } from './test-db.client';

const prisma = getPrisma();

describe('Prisma Database Unit Tests (Local Test DB)', () => {
  beforeAll(async () => {
    await resetSchemaAndMigrate();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('User and Cart cluster', () => {
    it('creates user and enforces unique email', async () => {
      await prisma.user.create({
        data: {
          name: 'Alice',
          email: 'alice@test.local',
          password: 'secret',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            name: 'Alice Duplicate',
            email: 'alice@test.local',
            password: 'secret',
          },
        }),
      ).rejects.toThrow();
    });

    it('cascades cart deletion when user is removed', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Bob',
          email: 'bob@test.local',
          password: 'secret',
        },
      });

      await prisma.cart.create({
        data: {
          userId: user.id,
          sum: new Prisma.Decimal('0'),
          discountSum: new Prisma.Decimal('0'),
        },
      });

      await prisma.user.delete({ where: { id: user.id } });

      const carts = await prisma.cart.findMany({ where: { userId: user.id } });
      expect(carts.length).toBe(0);
    });
  });

  describe('Category and Product cluster', () => {
    it('creates category hierarchy and product', async () => {
      const rootCategory = await prisma.productCategory.create({
        data: { name: 'Food' },
      });

      const childCategory = await prisma.productCategory.create({
        data: {
          name: 'Dairy',
          parentId: rootCategory.id,
        },
      });

      const product = await prisma.product.create({
        data: {
          productId: 'MILK-001',
          canonicalName: 'Milk',
          brand: 'Local Farm',
          media: 'https://example.com/milk.jpg',
          measurements: { volume: '1L' },
          pricingLogic: { unit: 'item' },
          calories: 61,
          categoryId: childCategory.id,
        },
      });

      expect(product.id).toBeDefined();
      expect(product.categoryId).toBe(childCategory.id);
    });
  });

});
