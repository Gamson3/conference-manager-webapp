/*
  Warnings:

  - The `type` column on the `Section` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Favorite` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('presentation', 'break', 'keynote', 'workshop', 'panel', 'networking');

-- DropForeignKey
ALTER TABLE "AuthorAssignment" DROP CONSTRAINT "AuthorAssignment_presentationId_fkey";

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_presentationId_fkey";

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_userId_fkey";

-- DropForeignKey
ALTER TABLE "Presentation" DROP CONSTRAINT "Presentation_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationFeedback" DROP CONSTRAINT "PresentationFeedback_presentationId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationMaterial" DROP CONSTRAINT "PresentationMaterial_presentationId_fkey";

-- DropForeignKey
ALTER TABLE "SessionAttendance" DROP CONSTRAINT "SessionAttendance_sectionId_fkey";

-- AlterTable
ALTER TABLE "Presentation" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "dayId" INTEGER,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "type",
ADD COLUMN     "type" "SectionType" NOT NULL DEFAULT 'presentation';

-- AlterTable
ALTER TABLE "SessionAttendance" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Favorite";

-- CreateTable
CREATE TABLE "ConferenceFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Day" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationAuthor" (
    "id" SERIAL NOT NULL,
    "presentationId" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "affiliation" TEXT,
    "isPresenter" BOOLEAN NOT NULL DEFAULT false,
    "isExternal" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER,

    CONSTRAINT "PresentationAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "presentationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresentationFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceFavorite_userId_conferenceId_key" ON "ConferenceFavorite"("userId", "conferenceId");

-- CreateIndex
CREATE INDEX "Day_conferenceId_date_idx" ON "Day"("conferenceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Day_conferenceId_date_key" ON "Day"("conferenceId", "date");

-- CreateIndex
CREATE INDEX "PresentationAuthor_authorName_idx" ON "PresentationAuthor"("authorName");

-- CreateIndex
CREATE INDEX "PresentationAuthor_authorEmail_idx" ON "PresentationAuthor"("authorEmail");

-- CreateIndex
CREATE UNIQUE INDEX "PresentationFavorite_userId_presentationId_key" ON "PresentationFavorite"("userId", "presentationId");

-- CreateIndex
CREATE INDEX "Conference_name_idx" ON "Conference"("name");

-- CreateIndex
CREATE INDEX "Conference_topics_idx" ON "Conference"("topics");

-- CreateIndex
CREATE INDEX "Conference_status_idx" ON "Conference"("status");

-- CreateIndex
CREATE INDEX "Conference_startDate_idx" ON "Conference"("startDate");

-- CreateIndex
CREATE INDEX "Presentation_title_idx" ON "Presentation"("title");

-- CreateIndex
CREATE INDEX "Presentation_keywords_idx" ON "Presentation"("keywords");

-- CreateIndex
CREATE INDEX "Section_name_idx" ON "Section"("name");

-- CreateIndex
CREATE INDEX "Section_startTime_idx" ON "Section"("startTime");

-- CreateIndex
CREATE INDEX "Section_type_idx" ON "Section"("type");

-- AddForeignKey
ALTER TABLE "ConferenceFavorite" ADD CONSTRAINT "ConferenceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceFavorite" ADD CONSTRAINT "ConferenceFavorite_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationAuthor" ADD CONSTRAINT "PresentationAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationAuthor" ADD CONSTRAINT "PresentationAuthor_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFavorite" ADD CONSTRAINT "PresentationFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFavorite" ADD CONSTRAINT "PresentationFavorite_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorAssignment" ADD CONSTRAINT "AuthorAssignment_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFeedback" ADD CONSTRAINT "PresentationFeedback_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationMaterial" ADD CONSTRAINT "PresentationMaterial_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
