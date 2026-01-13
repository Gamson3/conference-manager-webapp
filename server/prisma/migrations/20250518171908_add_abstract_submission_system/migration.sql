-- CreateTable
CREATE TABLE "AbstractSubmission" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "submitterId" INTEGER NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "AbstractSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbstractReview" (
    "id" SERIAL NOT NULL,
    "abstractId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "comments" TEXT,
    "recommendation" TEXT NOT NULL,

    CONSTRAINT "AbstractReview_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AbstractSubmission" ADD CONSTRAINT "AbstractSubmission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractSubmission" ADD CONSTRAINT "AbstractSubmission_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractReview" ADD CONSTRAINT "AbstractReview_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "AbstractSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractReview" ADD CONSTRAINT "AbstractReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
