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

  describe('Store, Offer and Price History cluster', () => {
    it('enforces unique storeId + productId in offers', async () => {
      const category = await prisma.productCategory.create({ data: { name: 'Snacks' } });
      const product = await prisma.product.create({
        data: {
          productId: 'SNACK-001',
          canonicalName: 'Chips',
          media: 'https://example.com/chips.jpg',
          measurements: { weight: '150g' },
          pricingLogic: { unit: 'pack' },
          categoryId: category.id,
        },
      });
      const brand = await prisma.storeBrand.create({ data: { name: 'LocalMart' } });
      const store = await prisma.localStore.create({
        data: {
          longitude: 30.5,
          latitude: 50.4,
          address: 'Main st 1',
          openingHour: '08:00',
          closingHour: '22:00',
          city: 'Kyiv',
          brandId: brand.id,
        },
      });

      await prisma.offer.create({
        data: {
          storeId: store.id,
          productId: product.id,
          currentPrice: new Prisma.Decimal('55.50'),
        },
      });

      await expect(
        prisma.offer.create({
          data: {
            storeId: store.id,
            productId: product.id,
            currentPrice: new Prisma.Decimal('60.00'),
          },
        }),
      ).rejects.toThrow();
    });

    it('stores price history for an offer', async () => {
      const category = await prisma.productCategory.create({ data: { name: 'Drinks' } });
      const product = await prisma.product.create({
        data: {
          productId: 'DRINK-001',
          canonicalName: 'Juice',
          media: 'https://example.com/juice.jpg',
          measurements: { volume: '1L' },
          pricingLogic: { unit: 'item' },
          categoryId: category.id,
        },
      });
      const brand = await prisma.storeBrand.create({ data: { name: 'SuperStore' } });
      const store = await prisma.localStore.create({
        data: {
          longitude: 30.6,
          latitude: 50.45,
          address: 'Main st 2',
          openingHour: '08:00',
          closingHour: '22:00',
          city: 'Kyiv',
          brandId: brand.id,
        },
      });
      const offer = await prisma.offer.create({
        data: {
          storeId: store.id,
          productId: product.id,
          currentPrice: new Prisma.Decimal('49.99'),
        },
      });

      await prisma.priceHistory.create({
        data: {
          offerId: offer.id,
          price: new Prisma.Decimal('45.99'),
          regularPrice: new Prisma.Decimal('49.99'),
        },
      });

      const history = await prisma.priceHistory.findMany({ where: { offerId: offer.id } });
      expect(history.length).toBe(1);
    });
  });

  describe('Diet and Allergen cluster', () => {
    it('enforces unique diet name per user', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Diet User',
          email: 'diet@test.local',
          password: 'secret',
        },
      });

      await prisma.diet.create({
        data: {
          userId: user.id,
          name: 'Keto',
        },
      });

      await expect(
        prisma.diet.create({
          data: {
            userId: user.id,
            name: 'Keto',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Recipe cluster', () => {
    it('creates recipe with ingredients, equipment and reviews', async () => {
      const productCategory = await prisma.productCategory.create({ data: { name: 'Vegetables' } });
      const recipeCategory = await prisma.recipeCategory.create({ data: { name: 'Dinner' } });
      const ingredient = await prisma.ingredient.create({
        data: {
          name: 'Tomato',
          categoryId: productCategory.id,
        },
      });
      const equipment = await prisma.equipment.create({
        data: {
          name: 'Pan',
        },
      });

      const recipe = await prisma.recipe.create({
        data: {
          name: 'Tomato Pasta',
          instructions: 'Cook pasta and add tomato sauce',
          difficulty: 'Easy',
          prepTime: 20,
          servings: 2,
          categoryId: recipeCategory.id,
        },
      });

      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          quantity: 2,
          unit: 'pcs',
        },
      });

      await prisma.recipeEquipment.create({
        data: {
          recipeId: recipe.id,
          equipmentId: equipment.id,
          quantity: 1,
        },
      });

      await prisma.review.create({
        data: {
          recipeId: recipe.id,
          rate: 5,
          comment: 'Excellent',
        },
      });

      const fullRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          ingredients: true,
          equipment: true,
          reviews: true,
        },
      });

      expect(fullRecipe?.ingredients.length).toBe(1);
      expect(fullRecipe?.equipment.length).toBe(1);
      expect(fullRecipe?.reviews.length).toBe(1);
    });
  });

});
