/*
  Warnings:

  - You are about to drop the column `registrationFee` on the `Conference` table. All the data in the column will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketPurchase` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "TicketPurchase" DROP CONSTRAINT "TicketPurchase_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketPurchase" DROP CONSTRAINT "TicketPurchase_userId_fkey";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'registered';

-- AlterTable
ALTER TABLE "Conference" DROP COLUMN "registrationFee";

-- DropTable
DROP TABLE "Ticket";

-- DropTable
DROP TABLE "TicketPurchase";
