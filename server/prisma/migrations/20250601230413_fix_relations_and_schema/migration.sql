-- DropForeignKey
ALTER TABLE "Presentation" DROP CONSTRAINT "Presentation_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationAuthor" DROP CONSTRAINT "PresentationAuthor_presentationId_fkey";

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationAuthor" ADD CONSTRAINT "PresentationAuthor_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
