/*
  Warnings:

  - The `status` column on the `AbstractSubmission` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AbstractSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "AbstractSubmission" ADD COLUMN     "biography" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "presentationTypeId" INTEGER,
ADD COLUMN     "requestedDuration" INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" "AbstractSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED';

-- CreateTable
CREATE TABLE "conference_members" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isAttendee" BOOLEAN NOT NULL DEFAULT true,
    "isSpeaker" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conference_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conference_members_userId_idx" ON "conference_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conference_members_conferenceId_userId_key" ON "conference_members"("conferenceId", "userId");

-- AddForeignKey
ALTER TABLE "conference_members" ADD CONSTRAINT "conference_members_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_members" ADD CONSTRAINT "conference_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractSubmission" ADD CONSTRAINT "AbstractSubmission_presentationTypeId_fkey" FOREIGN KEY ("presentationTypeId") REFERENCES "presentation_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
