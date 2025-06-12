/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PresentationType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Presenter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PresenterConflict` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TimeSlot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "Presentation" DROP CONSTRAINT "Presentation_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Presentation" DROP CONSTRAINT "Presentation_presentationTypeId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationAuthor" DROP CONSTRAINT "PresentationAuthor_presenterId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationType" DROP CONSTRAINT "PresentationType_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "PresenterConflict" DROP CONSTRAINT "PresenterConflict_presenterId_fkey";

-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "TimeSlot" DROP CONSTRAINT "TimeSlot_presentationId_fkey";

-- DropForeignKey
ALTER TABLE "TimeSlot" DROP CONSTRAINT "TimeSlot_sectionId_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "PresentationType";

-- DropTable
DROP TABLE "Presenter";

-- DropTable
DROP TABLE "PresenterConflict";

-- DropTable
DROP TABLE "TimeSlot";

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "conferenceId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultDuration" INTEGER NOT NULL DEFAULT 20,
    "minDuration" INTEGER NOT NULL DEFAULT 10,
    "maxDuration" INTEGER NOT NULL DEFAULT 30,
    "allowsQA" BOOLEAN NOT NULL DEFAULT true,
    "qaDuration" INTEGER NOT NULL DEFAULT 5,
    "conferenceId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presentation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "slotType" "SlotType" NOT NULL DEFAULT 'PRESENTATION',
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "presentationId" INTEGER,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presenters" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "affiliation" TEXT,
    "title" TEXT,
    "country" TEXT,
    "profileUrl" TEXT,
    "orcidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presenters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presenter_conflicts" (
    "id" SERIAL NOT NULL,
    "presenterId" INTEGER NOT NULL,
    "conflictType" "ConflictType" NOT NULL,
    "conflictDate" TIMESTAMP(3),
    "conflictStartTime" TIMESTAMP(3),
    "conflictEndTime" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presenter_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_conferenceId_order_idx" ON "categories"("conferenceId", "order");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "presentation_types_conferenceId_order_idx" ON "presentation_types"("conferenceId", "order");

-- CreateIndex
CREATE INDEX "presentation_types_name_idx" ON "presentation_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_presentationId_key" ON "time_slots"("presentationId");

-- CreateIndex
CREATE INDEX "time_slots_sectionId_order_idx" ON "time_slots"("sectionId", "order");

-- CreateIndex
CREATE INDEX "time_slots_startTime_idx" ON "time_slots"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "presenters_email_key" ON "presenters"("email");

-- CreateIndex
CREATE INDEX "presenters_email_idx" ON "presenters"("email");

-- CreateIndex
CREATE INDEX "presenters_name_idx" ON "presenters"("name");

-- CreateIndex
CREATE INDEX "presenter_conflicts_presenterId_idx" ON "presenter_conflicts"("presenterId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_presentationTypeId_fkey" FOREIGN KEY ("presentationTypeId") REFERENCES "presentation_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationAuthor" ADD CONSTRAINT "PresentationAuthor_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "presenters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_types" ADD CONSTRAINT "presentation_types_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenter_conflicts" ADD CONSTRAINT "presenter_conflicts_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "presenters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
