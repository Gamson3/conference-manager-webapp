-- AlterTable
ALTER TABLE "Presentation" ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "typeId" INTEGER;

-- CreateTable
CREATE TABLE "ConferenceCategory" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConferenceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationType" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER,

    CONSTRAINT "PresentationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionRequirement" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "minKeywords" INTEGER,
    "maxAbstractWords" INTEGER,
    "allowFileUpload" BOOLEAN NOT NULL DEFAULT true,
    "allowedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "SubmissionRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineMilestone" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "TimelineMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceCategory_conferenceId_name_key" ON "ConferenceCategory"("conferenceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PresentationType_conferenceId_name_key" ON "PresentationType"("conferenceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionRequirement_conferenceId_key" ON "SubmissionRequirement"("conferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineMilestone_conferenceId_key_key" ON "TimelineMilestone"("conferenceId", "key");

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "PresentationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ConferenceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceCategory" ADD CONSTRAINT "ConferenceCategory_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationType" ADD CONSTRAINT "PresentationType_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionRequirement" ADD CONSTRAINT "SubmissionRequirement_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineMilestone" ADD CONSTRAINT "TimelineMilestone_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
