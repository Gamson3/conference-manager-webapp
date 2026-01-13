-- CreateEnum
CREATE TYPE "WebsiteContentArea" AS ENUM ('cfp');

-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "submissionPortalUrl" TEXT;

-- CreateTable
CREATE TABLE "ConferenceWebsiteContentBlock" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "area" "WebsiteContentArea" NOT NULL,
    "title" TEXT,
    "markdown" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceWebsiteContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConferenceWebsiteContentBlock_conferenceId_area_idx" ON "ConferenceWebsiteContentBlock"("conferenceId", "area");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceWebsiteContentBlock_conferenceId_area_order_key" ON "ConferenceWebsiteContentBlock"("conferenceId", "area", "order");

-- AddForeignKey
ALTER TABLE "ConferenceWebsiteContentBlock" ADD CONSTRAINT "ConferenceWebsiteContentBlock_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
