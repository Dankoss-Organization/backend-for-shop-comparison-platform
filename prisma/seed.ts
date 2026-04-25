import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const envFile = process.env.ENV_FILE ?? '.env';
config({ path: envFile });

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_TEST_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL (or DATABASE_TEST_URL) is not defined in environment variables.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting database seeding...');
  await clearDatabase();

  // --- 1. USERS ---
  // Using upsert to prevent duplicates on multiple runs
  const admin = await prisma.user.upsert({
    where: { email: 'admin@platform.com' },
    update: {},
    create: {
      email: 'admin@platform.com',
      name: 'System Admin',
      password: 'hashed_admin_password',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: 'hashed_user_password',
      phoneNumber: '+380501234567',
    },
  });

  console.log('✅ Users seeded');

  // --- 2. STORE BRANDS & LOCAL STORES ---
  const silpoBrand = await prisma.storeBrand.create({
    data: {
      name: 'Silpo',
      website: 'https://silpo.ua',
      localStores: {
        create: [
          { address: 'Konovaltsya St, 26', city: 'Kyiv', longitude: 30.52, latitude: 50.43, openingHour: '08:00', closingHour: '23:00' },
          { address: 'Svobody Ave, 1', city: 'Lviv', longitude: 24.02, latitude: 49.84, openingHour: '00:00', closingHour: '23:59' }
        ]
      }
    }
  });

  const atbBrand = await prisma.storeBrand.create({
    data: {
      name: 'ATB-Market',
      website: 'https://atbmarket.com',
      localStores: {
        create: [
          { address: 'Polyarna St, 20', city: 'Kyiv', longitude: 30.46, latitude: 50.52, openingHour: '00:00', closingHour: '23:59' }
        ]
      }
    }
  });

  const stores = await prisma.localStore.findMany();
  console.log(`✅ Stores seeded: ${stores.length} locations found`);

  // --- 3. PRODUCT CATEGORIES (Hierarchy) ---
  const grocery = await prisma.productCategory.create({
    data: {
      name: 'Grocery',
      subcategories: {
        create: [
          { name: 'Cereals & Pasta' },
          { name: 'Oils & Sauces' }
        ]
      }
    },
    include: { subcategories: true }
  });

  const dairy = await prisma.productCategory.create({
    data: {
      name: 'Dairy & Eggs',
      subcategories: {
        create: [{ name: 'Cheese' }, { name: 'Milk & Yogurt' }]
      }
    },
    include: { subcategories: true }
  });

  console.log('✅ Categories created');

  // --- 4. PRODUCTS & PRICE HISTORY ---
  const productsToSeed = [
    { name: 'Spaghetti No.5', brand: 'Barilla', sku: 'BAR-005', catId: grocery.subcategories[0].id, basePrice: 65.00 },
    { name: 'Sunflower Oil', brand: 'Oleina', sku: 'OLN-001', catId: grocery.subcategories[1].id, basePrice: 55.00 },
    { name: 'Gouda Cheese', brand: 'Komo', sku: 'KMO-112', catId: dairy.subcategories[0].id, basePrice: 310.00 },
    { name: 'Kefir 2.5%', brand: 'Galychyna', sku: 'GAL-025', catId: dairy.subcategories[1].id, basePrice: 40.00 }
  ];

  for (const p of productsToSeed) {
    const product = await prisma.product.upsert({
      where: { productId: p.sku },
      update: {
        productId: p.sku,
        canonicalName: p.name,
        brand: p.brand,
        categoryId: p.catId,
        measurements: { weight: "500g", volume: "N/A" },
        media: `https://images.com/${p.sku}.jpg`,
        pricingLogic: { pricePer: "item" }
      },
      create: {
        productId: p.sku,
        canonicalName: p.name,
        brand: p.brand,
        categoryId: p.catId,
        measurements: { weight: "500g", volume: "N/A" },
        media: `https://images.com/${p.sku}.jpg`,
        pricingLogic: { pricePer: "item" }
      }
    });

    for (const store of stores) {
      const currentPrice = p.basePrice + (Math.random() * 8);
      const offer = await prisma.offer.upsert({
        where: {
          storeId_productId: {
            storeId: store.id,
            productId: product.id
          }
        },
        update: {
          currentPrice
        },
        create: {
          storeId: store.id,
          productId: product.id,
          currentPrice
        }
      });

      await prisma.priceHistory.createMany({
        data: [
          { offerId: offer.id, price: p.basePrice - 5, regularPrice: p.basePrice, startDate: new Date(Date.now() - 604800000) },
          { offerId: offer.id, price: p.basePrice, regularPrice: p.basePrice + 2, startDate: new Date() }
        ]
      });
    }
  }

  console.log('✅ Products and Price History seeded');

  // --- 5. RECIPES & REVIEWS ---
  const recipeCat = await prisma.recipeCategory.create({ data: { name: 'Quick Dinner' } });
  
  await prisma.recipe.create({
    data: {
      name: 'Classic Pasta with Cheese',
      instructions: '1. Boil water. 2. Cook pasta. 3. Add grated cheese and oil.',
      difficulty: 'Easy',
      prepTime: 15,
      servings: 2,
      categoryId: recipeCat.id,
      reviews: {
        create: [
          { rate: 5, comment: 'Simple and delicious!' },
          { rate: 4, comment: 'Good basic recipe.' }
        ]
      }
    }
  });

  // --- 6. CARTS & FAVORITES ---
  const firstOffer = await prisma.offer.findFirst();
  if (firstOffer) {
    await prisma.cart.create({
      data: {
        userId: customer.id,
        sum: 130.00,
        items: {
          create: {
            offerId: firstOffer.id,
            quantity: 2,
            price: 65.00
          }
        }
      }
    });
  }

  console.log('✅ Carts and social features seeded');
  console.log('--- Seeding completed successfully! ---');
}

async function clearDatabase() {
  console.log('--- Cleaning database content ---');

  // 1. Delete child records first (those that depend on others)
  await prisma.cartItem.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.userFavourite.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeEquipment.deleteMany();
  await prisma.review.deleteMany();

  // 2. Delete mid-level records
  await prisma.offer.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.favouriteProduct.deleteMany();
  await prisma.favouriteRecipe.deleteMany();
  await prisma.favouriteStore.deleteMany();
  await prisma.diet.deleteMany();
  await prisma.allergen.deleteMany();

  // 3. Delete parent records (base entities)
  await prisma.product.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.localStore.deleteMany();
  await prisma.storeBrand.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.recipeCategory.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database is now empty. Starting to seed...');

}

main()
  .catch((e: unknown) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });