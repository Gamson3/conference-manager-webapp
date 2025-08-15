-- Create the BreakType enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'breaktype') THEN
        CREATE TYPE "BreakType" AS ENUM ('COFFEE_BREAK', 'LUNCH_BREAK', 'NETWORKING_BREAK', 'REST_BREAK', 'GENERAL_BREAK');
    END IF;
END $$;

-- Add columns to time_slots table if they don't exist
ALTER TABLE "time_slots" ADD COLUMN IF NOT EXISTS "breakType" "BreakType";
ALTER TABLE "time_slots" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "time_slots" ADD COLUMN IF NOT EXISTS "isFixed" BOOLEAN NOT NULL DEFAULT false;