-- CreateEnum
CREATE TYPE "FullTextTiming" AS ENUM ('onSubmission', 'afterAcceptance');

-- AlterTable
ALTER TABLE "SubmissionRequirement" ADD COLUMN     "collectFullText" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fullTextTiming" "FullTextTiming" DEFAULT 'onSubmission';
