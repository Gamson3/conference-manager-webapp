/*
  Warnings:

  - You are about to drop the column `order` on the `ConferenceCategory` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `ConferenceFeedback` table. All the data in the column will be lost.
  - You are about to drop the column `actionTaken` on the `ImpersonationLog` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `ImpersonationLog` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `PresentationFeedback` table. All the data in the column will be lost.
  - You are about to drop the column `durationMin` on the `PresentationType` table. All the data in the column will be lost.
  - You are about to drop the column `allowFileUpload` on the `SubmissionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `allowedFileTypes` on the `SubmissionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `maxAbstractWords` on the `SubmissionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `TimelineMilestone` table. All the data in the column will be lost.
  - You are about to drop the `AbstractReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AbstractSubmission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sectionId,order]` on the table `Presentation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `ImpersonationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `TimelineMilestone` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConferenceParticipationRole" AS ENUM ('attendee', 'presenter', 'author', 'reviewer', 'sponsor', 'volunteer');

-- CreateEnum
CREATE TYPE "ConferenceParticipantStatus" AS ENUM ('registered', 'canceled', 'waitlisted', 'withdrawn');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn');

-- DropForeignKey
ALTER TABLE "AbstractReview" DROP CONSTRAINT "AbstractReview_abstractId_fkey";

-- DropForeignKey
ALTER TABLE "AbstractReview" DROP CONSTRAINT "AbstractReview_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "AbstractSubmission" DROP CONSTRAINT "AbstractSubmission_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "AbstractSubmission" DROP CONSTRAINT "AbstractSubmission_submitterId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationFeedback" DROP CONSTRAINT "PresentationFeedback_presentationId_fkey";

-- DropIndex
DROP INDEX "ConferenceCategory_conferenceId_name_key";

-- DropIndex
DROP INDEX "PresentationType_conferenceId_name_key";

-- DropIndex
DROP INDEX "TimelineMilestone_conferenceId_key_key";

-- AlterTable
ALTER TABLE "ConferenceCategory" DROP COLUMN "order";

-- AlterTable
ALTER TABLE "ConferenceFeedback" DROP COLUMN "submittedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ImpersonationLog" DROP COLUMN "actionTaken",
DROP COLUMN "timestamp",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "isRead",
DROP COLUMN "title",
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PresentationFeedback" DROP COLUMN "submittedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PresentationType" DROP COLUMN "durationMin",
ADD COLUMN     "defaultDuration" INTEGER;

-- AlterTable
ALTER TABLE "SubmissionRequirement" DROP COLUMN "allowFileUpload",
DROP COLUMN "allowedFileTypes",
DROP COLUMN "maxAbstractWords",
ADD COLUMN     "abstractMaxLength" INTEGER DEFAULT 3000,
ADD COLUMN     "abstractMinLength" INTEGER DEFAULT 50,
ADD COLUMN     "maxKeywords" INTEGER DEFAULT 8,
ADD COLUMN     "requiresOrcid" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "minKeywords" SET DEFAULT 3;

-- AlterTable
ALTER TABLE "TimelineMilestone" DROP COLUMN "key",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';

-- DropTable
DROP TABLE "AbstractReview";

-- DropTable
DROP TABLE "AbstractSubmission";

-- DropTable
DROP TABLE "Attendance";

-- CreateTable
CREATE TABLE "ConferenceParticipant" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "role" "ConferenceParticipationRole" NOT NULL,
    "status" "ConferenceParticipantStatus" NOT NULL DEFAULT 'registered',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" INTEGER NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "presentationId" INTEGER,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionReview" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "SubmissionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConferenceParticipant_conferenceId_role_idx" ON "ConferenceParticipant"("conferenceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceParticipant_userId_conferenceId_role_key" ON "ConferenceParticipant"("userId", "conferenceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_presentationId_key" ON "Submission"("presentationId");

-- CreateIndex
CREATE INDEX "Submission_conferenceId_status_idx" ON "Submission"("conferenceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Presentation_sectionId_order_key" ON "Presentation"("sectionId", "order");

-- AddForeignKey
ALTER TABLE "ConferenceParticipant" ADD CONSTRAINT "ConferenceParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceParticipant" ADD CONSTRAINT "ConferenceParticipant_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReview" ADD CONSTRAINT "SubmissionReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReview" ADD CONSTRAINT "SubmissionReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFeedback" ADD CONSTRAINT "PresentationFeedback_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
