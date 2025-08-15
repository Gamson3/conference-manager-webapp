-- DropIndex
DROP INDEX "time_slots_sectionId_order_idx";

-- DropIndex
DROP INDEX "time_slots_startTime_idx";

-- AlterTable
ALTER TABLE "Presentation" ADD COLUMN     "reviewComments" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);
