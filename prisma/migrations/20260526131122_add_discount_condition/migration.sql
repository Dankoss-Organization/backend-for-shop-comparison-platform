-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "discount_condition" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updatedAt" DROP DEFAULT;
