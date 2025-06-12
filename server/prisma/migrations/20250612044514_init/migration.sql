-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('attendee', 'organizer', 'admin');

-- CreateEnum
CREATE TYPE "PresentationStatus" AS ENUM ('draft', 'submitted', 'scheduled', 'locked');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('internal', 'external');

-- CreateEnum
CREATE TYPE "ConferenceStatus" AS ENUM ('draft', 'published', 'canceled', 'completed');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('presentation', 'break', 'keynote', 'workshop', 'panel', 'networking');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('TIME_SLOT', 'FULL_DAY', 'PERSONAL', 'TRAVEL');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('PRESENTATION', 'BREAK', 'LUNCH', 'NETWORKING', 'OPENING', 'CLOSING');

-- CreateEnum
CREATE TYPE "SlotMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "cognitoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bio" TEXT,
    "profileImage" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "organization" TEXT,
    "jobTitle" TEXT,
    "socialLinks" JSONB,
    "interests" JSONB,
    "preferences" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conference" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "status" "ConferenceStatus" NOT NULL DEFAULT 'draft',
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capacity" INTEGER,
    "registrationDeadline" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT DEFAULT 'UTC',
    "websiteUrl" TEXT,
    "venue" TEXT,
    "venueAddress" TEXT,
    "organizerNotes" TEXT,
    "bannerImageUrl" TEXT,
    "workflowStep" INTEGER DEFAULT 1,
    "workflowStatus" TEXT DEFAULT 'draft',

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Day" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "conferenceId" INTEGER NOT NULL,
    "dayId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "room" TEXT,
    "capacity" INTEGER,
    "description" TEXT,
    "type" "SectionType" NOT NULL DEFAULT 'presentation',
    "categoryId" INTEGER,
    "slotMode" "SlotMode" NOT NULL DEFAULT 'AUTO',
    "slotDuration" INTEGER,
    "breakDuration" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbstractSubmission" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "submitterId" INTEGER NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

-- CreateTable
CREATE TABLE "Presentation" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "affiliations" TEXT[],
    "keywords" TEXT[],
    "duration" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "PresentationStatus" NOT NULL,
    "submissionType" "SubmissionType" NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" INTEGER,
    "categoryId" INTEGER,
    "presentationTypeId" INTEGER,
    "requestedDuration" INTEGER,
    "finalDuration" INTEGER,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3),

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationAuthor" (
    "id" SERIAL NOT NULL,
    "presentationId" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "affiliation" TEXT,
    "isPresenter" BOOLEAN NOT NULL DEFAULT false,
    "isExternal" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "bio" TEXT,
    "profileUrl" TEXT,
    "orcidId" TEXT,
    "department" TEXT,
    "country" TEXT,
    "userId" INTEGER,
    "presenterId" INTEGER,

    CONSTRAINT "PresentationAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "presentationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresentationFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "externalEmail" TEXT,
    "presentationId" INTEGER NOT NULL,
    "assignedById" INTEGER NOT NULL,
    "secureSubmissionLink" TEXT NOT NULL,

    CONSTRAINT "AuthorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkinTime" TIMESTAMP(3),

    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceMaterial" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConferenceMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationMaterial" (
    "id" SERIAL NOT NULL,
    "presentationId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PresentationMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceFeedback" (
    "id" SERIAL NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationFeedback" (
    "id" SERIAL NOT NULL,
    "presentationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresentationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationLog" (
    "id" SERIAL NOT NULL,
    "impersonatorId" INTEGER NOT NULL,
    "impersonatedUserId" INTEGER NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presentationId" INTEGER,

    CONSTRAINT "ImpersonationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "conferenceId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultDuration" INTEGER NOT NULL DEFAULT 20,
    "minDuration" INTEGER NOT NULL DEFAULT 10,
    "maxDuration" INTEGER NOT NULL DEFAULT 30,
    "allowsQA" BOOLEAN NOT NULL DEFAULT true,
    "qaDuration" INTEGER NOT NULL DEFAULT 5,
    "conferenceId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresentationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "slotType" "SlotType" NOT NULL DEFAULT 'PRESENTATION',
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "presentationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presenter" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "affiliation" TEXT,
    "title" TEXT,
    "country" TEXT,
    "profileUrl" TEXT,
    "orcidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenterConflict" (
    "id" SERIAL NOT NULL,
    "presenterId" INTEGER NOT NULL,
    "conflictType" "ConflictType" NOT NULL,
    "conflictDate" TIMESTAMP(3),
    "conflictStartTime" TIMESTAMP(3),
    "conflictEndTime" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresenterConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cognitoId_key" ON "User"("cognitoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Conference_name_idx" ON "Conference"("name");

-- CreateIndex
CREATE INDEX "Conference_topics_idx" ON "Conference"("topics");

-- CreateIndex
CREATE INDEX "Conference_status_idx" ON "Conference"("status");

-- CreateIndex
CREATE INDEX "Conference_startDate_idx" ON "Conference"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceFavorite_userId_conferenceId_key" ON "ConferenceFavorite"("userId", "conferenceId");

-- CreateIndex
CREATE INDEX "Day_conferenceId_date_idx" ON "Day"("conferenceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Day_conferenceId_date_key" ON "Day"("conferenceId", "date");

-- CreateIndex
CREATE INDEX "Section_name_idx" ON "Section"("name");

-- CreateIndex
CREATE INDEX "Section_startTime_idx" ON "Section"("startTime");

-- CreateIndex
CREATE INDEX "Section_type_idx" ON "Section"("type");

-- CreateIndex
CREATE INDEX "Presentation_title_idx" ON "Presentation"("title");

-- CreateIndex
CREATE INDEX "Presentation_keywords_idx" ON "Presentation"("keywords");

-- CreateIndex
CREATE INDEX "PresentationAuthor_authorName_idx" ON "PresentationAuthor"("authorName");

-- CreateIndex
CREATE INDEX "PresentationAuthor_authorEmail_idx" ON "PresentationAuthor"("authorEmail");

-- CreateIndex
CREATE INDEX "PresentationAuthor_country_idx" ON "PresentationAuthor"("country");

-- CreateIndex
CREATE UNIQUE INDEX "PresentationFavorite_userId_presentationId_key" ON "PresentationFavorite"("userId", "presentationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorAssignment_secureSubmissionLink_key" ON "AuthorAssignment"("secureSubmissionLink");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttendance_userId_sectionId_key" ON "SessionAttendance"("userId", "sectionId");

-- CreateIndex
CREATE INDEX "categories_conferenceId_order_idx" ON "categories"("conferenceId", "order");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "PresentationType_conferenceId_order_idx" ON "PresentationType"("conferenceId", "order");

-- CreateIndex
CREATE INDEX "PresentationType_name_idx" ON "PresentationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_presentationId_key" ON "TimeSlot"("presentationId");

-- CreateIndex
CREATE INDEX "TimeSlot_sectionId_order_idx" ON "TimeSlot"("sectionId", "order");

-- CreateIndex
CREATE INDEX "TimeSlot_startTime_idx" ON "TimeSlot"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Presenter_email_key" ON "Presenter"("email");

-- CreateIndex
CREATE INDEX "Presenter_email_idx" ON "Presenter"("email");

-- CreateIndex
CREATE INDEX "Presenter_name_idx" ON "Presenter"("name");

-- CreateIndex
CREATE INDEX "PresenterConflict_presenterId_idx" ON "PresenterConflict"("presenterId");

-- AddForeignKey
ALTER TABLE "Conference" ADD CONSTRAINT "Conference_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceFavorite" ADD CONSTRAINT "ConferenceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceFavorite" ADD CONSTRAINT "ConferenceFavorite_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractSubmission" ADD CONSTRAINT "AbstractSubmission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractSubmission" ADD CONSTRAINT "AbstractSubmission_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractReview" ADD CONSTRAINT "AbstractReview_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "AbstractSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbstractReview" ADD CONSTRAINT "AbstractReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_presentationTypeId_fkey" FOREIGN KEY ("presentationTypeId") REFERENCES "PresentationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationAuthor" ADD CONSTRAINT "PresentationAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationAuthor" ADD CONSTRAINT "PresentationAuthor_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationAuthor" ADD CONSTRAINT "PresentationAuthor_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "Presenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFavorite" ADD CONSTRAINT "PresentationFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFavorite" ADD CONSTRAINT "PresentationFavorite_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorAssignment" ADD CONSTRAINT "AuthorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorAssignment" ADD CONSTRAINT "AuthorAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorAssignment" ADD CONSTRAINT "AuthorAssignment_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceMaterial" ADD CONSTRAINT "ConferenceMaterial_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationMaterial" ADD CONSTRAINT "PresentationMaterial_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceFeedback" ADD CONSTRAINT "ConferenceFeedback_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceFeedback" ADD CONSTRAINT "ConferenceFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFeedback" ADD CONSTRAINT "PresentationFeedback_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationFeedback" ADD CONSTRAINT "PresentationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_impersonatorId_fkey" FOREIGN KEY ("impersonatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_impersonatedUserId_fkey" FOREIGN KEY ("impersonatedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationType" ADD CONSTRAINT "PresentationType_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenterConflict" ADD CONSTRAINT "PresenterConflict_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "Presenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
