-- CreateTable
CREATE TABLE "UserFavourites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT,
    "prId" TEXT,
    "repId" TEXT,

    CONSTRAINT "UserFavourites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavouriteStore" (
    "id" TEXT NOT NULL,

    CONSTRAINT "FavouriteStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavouritePr" (
    "id" TEXT NOT NULL,

    CONSTRAINT "FavouritePr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavouriteRep" (
    "id" TEXT NOT NULL,

    CONSTRAINT "FavouriteRep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFavourites_userId_idx" ON "UserFavourites"("userId");

-- CreateIndex
CREATE INDEX "UserFavourites_storeId_idx" ON "UserFavourites"("storeId");

-- CreateIndex
CREATE INDEX "UserFavourites_prId_idx" ON "UserFavourites"("prId");

-- CreateIndex
CREATE INDEX "UserFavourites_repId_idx" ON "UserFavourites"("repId");

-- AddForeignKey
ALTER TABLE "UserFavourites" ADD CONSTRAINT "UserFavourites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavourites" ADD CONSTRAINT "UserFavourites_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "FavouriteStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavourites" ADD CONSTRAINT "UserFavourites_prId_fkey" FOREIGN KEY ("prId") REFERENCES "FavouritePr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavourites" ADD CONSTRAINT "UserFavourites_repId_fkey" FOREIGN KEY ("repId") REFERENCES "FavouriteRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
