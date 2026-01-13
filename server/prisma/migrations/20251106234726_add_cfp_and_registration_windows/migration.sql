-- CreateEnum
CREATE TYPE "SubmissionsVisibility" AS ENUM ('public', 'invite_only', 'private');

-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "registrationOpenFrom" TIMESTAMP(3),
ADD COLUMN     "registrationOpenUntil" TIMESTAMP(3),
ADD COLUMN     "submissionInviteCode" TEXT,
ADD COLUMN     "submissionsOpenFrom" TIMESTAMP(3),
ADD COLUMN     "submissionsOpenUntil" TIMESTAMP(3),
ADD COLUMN     "submissionsVisibility" "SubmissionsVisibility" NOT NULL DEFAULT 'public';

-- CreateIndex
CREATE INDEX "Conference_submissionsOpenFrom_idx" ON "Conference"("submissionsOpenFrom");

-- CreateIndex
CREATE INDEX "Conference_submissionsOpenUntil_idx" ON "Conference"("submissionsOpenUntil");

-- CreateIndex
CREATE INDEX "Conference_registrationOpenFrom_idx" ON "Conference"("registrationOpenFrom");

-- CreateIndex
CREATE INDEX "Conference_registrationOpenUntil_idx" ON "Conference"("registrationOpenUntil");
