-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "abstractFileMimeType" TEXT,
ADD COLUMN     "abstractFileName" TEXT,
ADD COLUMN     "abstractFileSizeBytes" INTEGER,
ADD COLUMN     "abstractFileUrl" TEXT,
ADD COLUMN     "fullTextFileMimeType" TEXT,
ADD COLUMN     "fullTextFileName" TEXT,
ADD COLUMN     "fullTextFileSizeBytes" INTEGER,
ADD COLUMN     "fullTextFileUrl" TEXT,
ALTER COLUMN "abstract" DROP NOT NULL;
