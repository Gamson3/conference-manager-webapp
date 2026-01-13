-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "typeId" INTEGER;

-- CreateIndex
CREATE INDEX "Submission_typeId_idx" ON "Submission"("typeId");

-- CreateIndex
CREATE INDEX "Submission_categoryId_idx" ON "Submission"("categoryId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "PresentationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ConferenceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
