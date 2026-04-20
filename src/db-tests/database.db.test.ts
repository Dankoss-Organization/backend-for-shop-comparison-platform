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

  it('runs a placeholder test', async () => {
    expect(true).toBe(true);
  });

});
