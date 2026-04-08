-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "brand" TEXT,
    "category_id" TEXT,
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

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_productId_key" ON "Product"("productId");

-- CreateIndex
CREATE INDEX "Product_category_id_idx" ON "Product"("category_id");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
