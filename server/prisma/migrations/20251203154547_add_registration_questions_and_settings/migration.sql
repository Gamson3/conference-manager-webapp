-- CreateEnum
CREATE TYPE "RegistrationQuestionType" AS ENUM ('text', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'number', 'email', 'phone', 'date');

-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "confirmationEmailBody" TEXT,
ADD COLUMN     "earlyBirdDeadline" TIMESTAMP(3),
ADD COLUMN     "earlyBirdFee" DECIMAL(10,2),
ADD COLUMN     "maxAttendees" INTEGER,
ADD COLUMN     "registrationCurrency" TEXT DEFAULT 'USD',
ADD COLUMN     "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "registrationFee" DECIMAL(10,2),
ADD COLUMN     "requireApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ConferenceParticipant" ADD COLUMN     "customResponses" JSONB;

-- CreateTable
CREATE TABLE "RegistrationQuestion" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "RegistrationQuestionType" NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "placeholder" TEXT,
    "validation" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistrationQuestion_conferenceId_order_idx" ON "RegistrationQuestion"("conferenceId", "order");

-- CreateIndex
CREATE INDEX "RegistrationQuestion_conferenceId_category_idx" ON "RegistrationQuestion"("conferenceId", "category");

-- AddForeignKey
ALTER TABLE "RegistrationQuestion" ADD CONSTRAINT "RegistrationQuestion_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
