-- CreateEnum
CREATE TYPE "SubmissionAssistanceRequestStatus" AS ENUM ('pending', 'approved', 'denied', 'expired');

-- CreateTable
CREATE TABLE "SubmissionAssistanceConsent" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "organizerId" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SubmissionAssistanceConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionAssistanceRequest" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "organizerId" INTEGER NOT NULL,
    "message" TEXT,
    "status" "SubmissionAssistanceRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "responseNote" TEXT,

    CONSTRAINT "SubmissionAssistanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionAssistanceConsent_conferenceId_idx" ON "SubmissionAssistanceConsent"("conferenceId");

-- CreateIndex
CREATE INDEX "SubmissionAssistanceConsent_authorId_idx" ON "SubmissionAssistanceConsent"("authorId");

-- CreateIndex
CREATE INDEX "SubmissionAssistanceConsent_organizerId_idx" ON "SubmissionAssistanceConsent"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionAssistanceConsent_conferenceId_authorId_organizer_key" ON "SubmissionAssistanceConsent"("conferenceId", "authorId", "organizerId");

-- CreateIndex
CREATE INDEX "SubmissionAssistanceRequest_conferenceId_idx" ON "SubmissionAssistanceRequest"("conferenceId");

-- CreateIndex
CREATE INDEX "SubmissionAssistanceRequest_authorId_status_idx" ON "SubmissionAssistanceRequest"("authorId", "status");

-- CreateIndex
CREATE INDEX "SubmissionAssistanceRequest_organizerId_status_idx" ON "SubmissionAssistanceRequest"("organizerId", "status");

-- AddForeignKey
ALTER TABLE "SubmissionAssistanceConsent" ADD CONSTRAINT "SubmissionAssistanceConsent_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAssistanceConsent" ADD CONSTRAINT "SubmissionAssistanceConsent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAssistanceConsent" ADD CONSTRAINT "SubmissionAssistanceConsent_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAssistanceRequest" ADD CONSTRAINT "SubmissionAssistanceRequest_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAssistanceRequest" ADD CONSTRAINT "SubmissionAssistanceRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAssistanceRequest" ADD CONSTRAINT "SubmissionAssistanceRequest_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
