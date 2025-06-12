-- AlterEnum
ALTER TYPE "ConferenceStatus" ADD VALUE 'call_for_papers';

-- CreateTable
CREATE TABLE "submission_settings" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "allowLateSubmissions" BOOLEAN NOT NULL DEFAULT false,
    "requireAbstract" BOOLEAN NOT NULL DEFAULT true,
    "maxAbstractLength" INTEGER NOT NULL DEFAULT 500,
    "requireFullPaper" BOOLEAN NOT NULL DEFAULT true,
    "allowedFileTypes" TEXT[],
    "maxFileSize" INTEGER NOT NULL DEFAULT 10,
    "reviewProcess" TEXT NOT NULL DEFAULT 'manual',
    "requireAuthorBio" BOOLEAN NOT NULL DEFAULT true,
    "requireAffiliation" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmails" TEXT[],
    "submissionGuidelines" TEXT,
    "enableSubmissions" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_settings_conferenceId_key" ON "submission_settings"("conferenceId");

-- AddForeignKey
ALTER TABLE "submission_settings" ADD CONSTRAINT "submission_settings_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
