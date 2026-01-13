-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'revision_requested';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "resubmittedAt" TIMESTAMP(3),
ADD COLUMN     "revisionFeedback" TEXT,
ADD COLUMN     "revisionRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubmissionRequirement" ALTER COLUMN "minKeywords" SET DEFAULT 5;

-- CreateTable
CREATE TABLE "SubmissionAuthorEntry" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "affiliations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPresenter" BOOLEAN NOT NULL DEFAULT false,
    "isExternal" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubmissionAuthorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionAuthorEntry_submissionId_idx" ON "SubmissionAuthorEntry"("submissionId");

-- CreateIndex
CREATE INDEX "SubmissionAuthorEntry_name_idx" ON "SubmissionAuthorEntry"("name");

-- CreateIndex
CREATE INDEX "SubmissionAuthorEntry_email_idx" ON "SubmissionAuthorEntry"("email");

-- AddForeignKey
ALTER TABLE "SubmissionAuthorEntry" ADD CONSTRAINT "SubmissionAuthorEntry_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
