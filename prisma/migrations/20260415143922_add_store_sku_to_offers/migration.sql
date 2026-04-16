/*
  Warnings:

  - Added the required column `store_sku` to the `offers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "store_sku" TEXT NOT NULL;
