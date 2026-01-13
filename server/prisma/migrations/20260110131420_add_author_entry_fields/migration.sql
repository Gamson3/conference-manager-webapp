-- AlterTable
ALTER TABLE "SubmissionAuthorEntry" ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "orcid" TEXT,
ADD COLUMN     "phone" TEXT;
