/*
  Warnings:

  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Presentation" DROP CONSTRAINT "Presentation_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_conferenceId_fkey";

-- DropTable
DROP TABLE "categories";

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "conferenceId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_conferenceId_order_idx" ON "Category"("conferenceId", "order");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
