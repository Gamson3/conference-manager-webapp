/*
  Warnings:

  - Added the required column `updatedAt` to the `Conference` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
