-- Remove registration pricing / early-bird fields (money features are not supported)

ALTER TABLE "Conference"
  DROP COLUMN IF EXISTS "registrationFee",
  DROP COLUMN IF EXISTS "registrationCurrency",
  DROP COLUMN IF EXISTS "earlyBirdDeadline",
  DROP COLUMN IF EXISTS "earlyBirdFee";
