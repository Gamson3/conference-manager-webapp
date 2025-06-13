-- DropForeignKey
ALTER TABLE "Presentation" DROP CONSTRAINT "Presentation_sectionId_fkey";

-- AlterTable
ALTER TABLE "Presentation" ALTER COLUMN "sectionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
