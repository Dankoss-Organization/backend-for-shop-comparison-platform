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

});
