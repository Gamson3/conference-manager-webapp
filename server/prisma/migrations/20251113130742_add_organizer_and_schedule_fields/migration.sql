-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "maxSubmissionsPerUser" INTEGER,
ADD COLUMN     "organizerEmail" TEXT,
ADD COLUMN     "organizerLogoUrl" TEXT,
ADD COLUMN     "organizerName" TEXT,
ADD COLUMN     "organizerPhone" TEXT,
ADD COLUMN     "organizerWebsite" TEXT,
ADD COLUMN     "reviewEndsAt" TIMESTAMP(3),
ADD COLUMN     "reviewStartsAt" TIMESTAMP(3),
ADD COLUMN     "schedulePublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PresentationType" ADD COLUMN     "maxPerConference" INTEGER;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "chairs" JSONB;

-- CreateIndex
CREATE INDEX "Conference_reviewStartsAt_idx" ON "Conference"("reviewStartsAt");

-- CreateIndex
CREATE INDEX "Conference_reviewEndsAt_idx" ON "Conference"("reviewEndsAt");

-- CreateIndex
CREATE INDEX "Conference_schedulePublishedAt_idx" ON "Conference"("schedulePublishedAt");
