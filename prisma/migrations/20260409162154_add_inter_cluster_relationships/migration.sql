/*
  Warnings:

  - A unique constraint covering the columns `[recipe_id]` on the table `FavouriteRep` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `Cart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipe_id` to the `FavouriteRep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `Ingredients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FavouriteRep" ADD COLUMN     "recipe_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ingredients" ADD COLUMN     "category_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserFavourites" ADD COLUMN     "recipe_id" TEXT;

-- CreateIndex
CREATE INDEX "Cart_user_id_idx" ON "Cart"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "FavouriteRep_recipe_id_key" ON "FavouriteRep"("recipe_id");

-- CreateIndex
CREATE INDEX "UserFavourites_recipe_id_idx" ON "UserFavourites"("recipe_id");

-- AddForeignKey
ALTER TABLE "UserFavourites" ADD CONSTRAINT "UserFavourites_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavouriteRep" ADD CONSTRAINT "FavouriteRep_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredients" ADD CONSTRAINT "Ingredients_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
