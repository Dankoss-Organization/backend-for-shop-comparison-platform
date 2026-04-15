/*
  Warnings:

  - You are about to drop the column `store_sku` on the `offers` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `price_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "offers" DROP COLUMN "store_sku",
ADD COLUMN     "discount_price" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "price_history" DROP COLUMN "date",
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "product" ALTER COLUMN "media" SET DATA TYPE TEXT;
