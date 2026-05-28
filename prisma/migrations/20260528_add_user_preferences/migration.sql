-- Add healthGoals and lifestyle columns to users
ALTER TABLE "users" ADD COLUMN "health_goals" JSONB;
ALTER TABLE "users" ADD COLUMN "lifestyle" JSONB;
