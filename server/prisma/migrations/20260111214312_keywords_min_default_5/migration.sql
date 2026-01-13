-- DropIndex
DROP INDEX "SubmissionAuthorEntry_email_idx";

-- DropIndex
DROP INDEX "SubmissionAuthorEntry_name_idx";

-- DropIndex
DROP INDEX "SubmissionAuthorEntry_submissionId_idx";

-- CreateIndex
CREATE INDEX "SubmissionAuthorEntry_submissionId_order_idx" ON "SubmissionAuthorEntry"("submissionId", "order");
