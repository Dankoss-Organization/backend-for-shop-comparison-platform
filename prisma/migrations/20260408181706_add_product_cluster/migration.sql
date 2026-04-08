/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[localStoreId]` on the table `FavouriteStore` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `localStoreId` to the `FavouriteStore` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FavouriteStore" ADD COLUMN     "localStoreId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Product";

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

-- CreateIndex
CREATE UNIQUE INDEX "product_productId_key" ON "product"("productId");

-- CreateIndex
CREATE INDEX "product_category_id_idx" ON "product"("category_id");

-- CreateIndex
CREATE INDEX "product_brand_idx" ON "product"("brand");

-- CreateIndex
CREATE INDEX "pr_categories_parent_id_idx" ON "pr_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "FavouriteStore_localStoreId_key" ON "FavouriteStore"("localStoreId");

-- AddForeignKey
ALTER TABLE "FavouriteStore" ADD CONSTRAINT "FavouriteStore_localStoreId_fkey" FOREIGN KEY ("localStoreId") REFERENCES "local_store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_categories" ADD CONSTRAINT "pr_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pr_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_store" ADD CONSTRAINT "local_store_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "store_brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
