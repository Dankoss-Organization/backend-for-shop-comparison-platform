-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photo" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favourites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT,
    "prId" TEXT,
    "repId" TEXT,
    "recipe_id" TEXT,

    CONSTRAINT "user_favourites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favourite_stores" (
    "id" TEXT NOT NULL,
    "localStoreId" TEXT NOT NULL,

    CONSTRAINT "favourite_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favourite_products" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "favourite_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favourite_recipes" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,

    CONSTRAINT "favourite_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "sum" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountSum" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "cartId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "brand" TEXT,
    "country" TEXT,
    "media" JSONB NOT NULL,
    "measurements" JSONB NOT NULL,
    "pricing_logic" JSONB NOT NULL,
    "description" TEXT,
    "calories" DOUBLE PRECISION,
    "proteins_g" DOUBLE PRECISION,
    "fats_g" DOUBLE PRECISION,
    "carbohydrates_g" DOUBLE PRECISION,
    "alcohol_percentage" DOUBLE PRECISION,
    "is_tobacco" BOOLEAN NOT NULL DEFAULT false,
    "is_18_plus" BOOLEAN NOT NULL DEFAULT false,
    "is_national_cashback_eligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category_id" TEXT,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "current_price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL(12,2) NOT NULL,
    "regular_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,

    CONSTRAINT "pr_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logo" TEXT,

    CONSTRAINT "store_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_store" (
    "id" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "opening_hour" TEXT NOT NULL,
    "closing_hour" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,

    CONSTRAINT "local_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT,

    CONSTRAINT "diets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT,

    CONSTRAINT "allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "prepTime" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "image_url" TEXT,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rec_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "rec_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipeId" TEXT NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_equipment" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "recipeId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "recipe_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_favourites_userId_idx" ON "user_favourites"("userId");

-- CreateIndex
CREATE INDEX "user_favourites_storeId_idx" ON "user_favourites"("storeId");

-- CreateIndex
CREATE INDEX "user_favourites_prId_idx" ON "user_favourites"("prId");

-- CreateIndex
CREATE INDEX "user_favourites_repId_idx" ON "user_favourites"("repId");

-- CreateIndex
CREATE INDEX "user_favourites_recipe_id_idx" ON "user_favourites"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "favourite_stores_localStoreId_key" ON "favourite_stores"("localStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "favourite_products_product_id_key" ON "favourite_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "favourite_recipes_recipe_id_key" ON "favourite_recipes"("recipe_id");

-- CreateIndex
CREATE INDEX "carts_user_id_idx" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_offerId_idx" ON "cart_items"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "product_productId_key" ON "product"("productId");

-- CreateIndex
CREATE INDEX "product_category_id_idx" ON "product"("category_id");

-- CreateIndex
CREATE INDEX "product_brand_idx" ON "product"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "offers_store_id_product_id_key" ON "offers"("store_id", "product_id");

-- CreateIndex
CREATE INDEX "price_history_offer_id_idx" ON "price_history"("offer_id");

-- CreateIndex
CREATE INDEX "pr_categories_parent_id_idx" ON "pr_categories"("parent_id");

-- CreateIndex
CREATE INDEX "diets_user_id_idx" ON "diets"("user_id");

-- CreateIndex
CREATE INDEX "diets_category_id_idx" ON "diets"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "diets_user_id_name_key" ON "diets"("user_id", "name");

-- CreateIndex
CREATE INDEX "allergens_user_id_idx" ON "allergens"("user_id");

-- CreateIndex
CREATE INDEX "allergens_category_id_idx" ON "allergens"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "allergens_user_id_name_key" ON "allergens"("user_id", "name");

-- CreateIndex
CREATE INDEX "recipes_categoryId_idx" ON "recipes"("categoryId");

-- CreateIndex
CREATE INDEX "rec_categories_parentId_idx" ON "rec_categories"("parentId");

-- CreateIndex
CREATE INDEX "reviews_recipeId_idx" ON "reviews"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE INDEX "recipe_equipment_recipeId_idx" ON "recipe_equipment"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_equipment_equipmentId_idx" ON "recipe_equipment"("equipmentId");

-- AddForeignKey
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "favourite_stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_prId_fkey" FOREIGN KEY ("prId") REFERENCES "favourite_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_repId_fkey" FOREIGN KEY ("repId") REFERENCES "favourite_recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourite_stores" ADD CONSTRAINT "favourite_stores_localStoreId_fkey" FOREIGN KEY ("localStoreId") REFERENCES "local_store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourite_products" ADD CONSTRAINT "favourite_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourite_recipes" ADD CONSTRAINT "favourite_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "local_store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_categories" ADD CONSTRAINT "pr_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pr_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_store" ADD CONSTRAINT "local_store_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "store_brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diets" ADD CONSTRAINT "diets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diets" ADD CONSTRAINT "diets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergens" ADD CONSTRAINT "allergens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergens" ADD CONSTRAINT "allergens_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "rec_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rec_categories" ADD CONSTRAINT "rec_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "rec_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_equipment" ADD CONSTRAINT "recipe_equipment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_equipment" ADD CONSTRAINT "recipe_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

