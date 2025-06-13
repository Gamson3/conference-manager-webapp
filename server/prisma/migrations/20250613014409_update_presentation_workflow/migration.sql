-- First, add the conferenceId column as nullable
ALTER TABLE "Presentation" ADD COLUMN "conferenceId" INTEGER;

-- Update existing presentations to get conferenceId from their section
UPDATE "Presentation" 
SET "conferenceId" = (
  SELECT s."conferenceId" 
  FROM "Section" s 
  WHERE s."id" = "Presentation"."sectionId"
)
WHERE "sectionId" IS NOT NULL;

-- For any presentations without sections (shouldn't exist, but just in case)
-- Set them to the first available conference
UPDATE "Presentation" 
SET "conferenceId" = (
  SELECT "id" FROM "Conference" LIMIT 1
)
WHERE "conferenceId" IS NULL;

-- Now make the column required and add the foreign key constraint
ALTER TABLE "Presentation" ALTER COLUMN "conferenceId" SET NOT NULL;
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_conferenceId_fkey" 
FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add any other fields that might be missing
DO $$ 
BEGIN
  -- Add categoryId if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Presentation' AND column_name='categoryId') THEN
    ALTER TABLE "Presentation" ADD COLUMN "categoryId" INTEGER;
  END IF;
  
  -- Add presentationTypeId if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Presentation' AND column_name='presentationTypeId') THEN
    ALTER TABLE "Presentation" ADD COLUMN "presentationTypeId" INTEGER;
  END IF;
  
  -- Add requestedDuration if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Presentation' AND column_name='requestedDuration') THEN
    ALTER TABLE "Presentation" ADD COLUMN "requestedDuration" INTEGER;
  END IF;
  
  -- Add finalDuration if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Presentation' AND column_name='finalDuration') THEN
    ALTER TABLE "Presentation" ADD COLUMN "finalDuration" INTEGER;
  END IF;
  
  -- Add reviewStatus if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Presentation' AND column_name='reviewStatus') THEN
    ALTER TABLE "Presentation" ADD COLUMN "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
  END IF;
  
  -- Add assignedAt if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Presentation' AND column_name='assignedAt') THEN
    ALTER TABLE "Presentation" ADD COLUMN "assignedAt" TIMESTAMP(3);
  END IF;
END $$;

-- Add foreign key constraints for the new relations
DO $$
BEGIN
  -- Add category foreign key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Presentation_categoryId_fkey') THEN
    ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  -- Add presentationType foreign key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Presentation_presentationTypeId_fkey') THEN
    ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_presentationTypeId_fkey" 
    FOREIGN KEY ("presentationTypeId") REFERENCES "PresentationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;