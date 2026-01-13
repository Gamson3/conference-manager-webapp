-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "bannerImageKey" TEXT,
ADD COLUMN     "organizerLogoKey" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "abstractFileKey" TEXT,
ADD COLUMN     "fullTextFileKey" TEXT;
