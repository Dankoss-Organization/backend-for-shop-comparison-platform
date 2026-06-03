-- Add user locations table for saved user locations
CREATE TABLE "user_locations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "label" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_locations_user_id_idx" ON "user_locations"("user_id");

ALTER TABLE "user_locations"
  ADD CONSTRAINT "user_locations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
