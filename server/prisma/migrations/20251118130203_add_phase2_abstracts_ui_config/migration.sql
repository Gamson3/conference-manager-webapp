-- CreateEnum
CREATE TYPE "AbstractUploadMode" AS ENUM ('TEXT', 'FILE', 'BOTH');

-- AlterTable
ALTER TABLE "SubmissionRequirement" ADD COLUMN     "abstractUploadMode" "AbstractUploadMode" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "authorsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bodyTextLabel" TEXT DEFAULT 'Abstract text',
ADD COLUMN     "bodyTextMaxWords" INTEGER,
ADD COLUMN     "bodyTextMinWords" INTEGER,
ADD COLUMN     "collectAuthorAffiliation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "collectAuthorEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "collectAuthorOrcid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collectAuthorPhone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fileFieldLabel" TEXT DEFAULT 'Add Abstract File',
ADD COLUMN     "fileFieldRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewCriteriaEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "submissionGuidelinesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "titleMaxWords" INTEGER;
