-- AlterTable
ALTER TABLE "SubmissionRequirement" ADD COLUMN     "allowedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxFileSizeMB" INTEGER DEFAULT 10,
ADD COLUMN     "reviewCriteria" TEXT,
ADD COLUMN     "submissionGuidelines" TEXT;
