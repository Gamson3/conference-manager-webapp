-- AlterTable
ALTER TABLE "PresentationAuthor" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "orcidId" TEXT,
ADD COLUMN     "profileUrl" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "PresentationAuthor_country_idx" ON "PresentationAuthor"("country");
