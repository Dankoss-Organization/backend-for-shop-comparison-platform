-- AlterTable
ALTER TABLE "local_store"
ADD COLUMN     "supports_delivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supports_pickup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "delivery_base_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "delivery_fee_per_km" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pickup_radius_km" DOUBLE PRECISION;
