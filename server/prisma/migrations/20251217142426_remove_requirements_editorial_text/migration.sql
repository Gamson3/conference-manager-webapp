/*
  Warnings:

  - You are about to drop the column `reviewCriteria` on the `SubmissionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCriteriaEnabled` on the `SubmissionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `submissionGuidelines` on the `SubmissionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `submissionGuidelinesEnabled` on the `SubmissionRequirement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SubmissionRequirement" DROP COLUMN "reviewCriteria",
DROP COLUMN "reviewCriteriaEnabled",
DROP COLUMN "submissionGuidelines",
DROP COLUMN "submissionGuidelinesEnabled";
