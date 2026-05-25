
ALTER TABLE "product" ADD COLUMN "main_image" TEXT;

ALTER TABLE "product" RENAME COLUMN "media" TO "raw_main_image";

UPDATE "product" SET "main_image" = "raw_main_image";

ALTER TABLE "product" ALTER COLUMN "raw_main_image" DROP NOT NULL;