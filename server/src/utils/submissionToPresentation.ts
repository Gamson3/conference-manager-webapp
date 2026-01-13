import { Prisma, PresentationStatus, SubmissionType } from "@prisma/client";

export interface SubmissionAuthorEntryData {
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  affiliations: string[];
  phone: string | null;
  orcid: string | null;
  order: number;
  isPresenter: boolean;
  isExternal: boolean;
}

export type SubmissionWithAuthor = {
  id: number;
  title: string;
  abstract: string | null;
  keywords: string[];
  authorId: number;
  conferenceId: number;
  presentationId: number | null;
  typeId: number | null;
  categoryId: number | null;
  /** @deprecated Use authorEntries instead - this is the User account, not filled-in author data */
  author: {
    name: string;
    email: string;
    organization: string | null;
  };
  /** Author entries from SubmissionAuthorEntry - the actual filled-in submission author data */
  authorEntries?: SubmissionAuthorEntryData[];
};

const UNSCHEDULED_SECTION_NAME = "Unscheduled";

const getOrCreateUnscheduledSectionId = async (
  tx: Prisma.TransactionClient,
  conferenceId: number
): Promise<number> => {
  const existing = await tx.section.findFirst({
    where: {
      conferenceId,
      dayId: null,
      name: UNSCHEDULED_SECTION_NAME,
    },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await tx.section.create({
    data: {
      conferenceId,
      dayId: null,
      name: UNSCHEDULED_SECTION_NAME,
      type: "presentation",
      order: 0,
      startTime: null,
      endTime: null,
      room: null,
      capacity: null,
      description: "Automatically created holding session for accepted presentations not yet scheduled.",
    },
    select: { id: true },
  });

  return created.id;
};

export const ensurePresentationForAcceptedSubmission = async (
  tx: Prisma.TransactionClient,
  submission: SubmissionWithAuthor
): Promise<number> => {
  if (submission.presentationId) return submission.presentationId;

  const defaultDurationMins = submission.typeId
    ? (await tx.presentationType.findUnique({
        where: { id: submission.typeId },
        select: { defaultDuration: true },
      }))?.defaultDuration ?? null
    : null;

  const sectionId = await getOrCreateUnscheduledSectionId(tx, submission.conferenceId);

  const lastPresentation = await tx.presentation.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  // Build author data: prefer filled-in authorEntries, fall back to User account data
  const authorEntries = submission.authorEntries ?? [];
  const presentationAuthorsData = authorEntries.length > 0
    ? authorEntries.map((entry, idx) => {
        // Prefer firstName+lastName, fall back to legacy name field
        const displayName = `${entry.firstName} ${entry.lastName}`.trim() || entry.name;
        return {
          authorName: displayName,
          authorEmail: entry.email,
          affiliation: entry.affiliations?.join(", ") || null,
          isPresenter: entry.isPresenter,
          isExternal: entry.isExternal,
          order: entry.order ?? idx,
          orcidId: entry.orcid || null,
          // Link to submitter's userId only for the first internal author (the submitter)
          userId: idx === 0 && !entry.isExternal ? submission.authorId : null,
        };
      })
    : [
        // Fallback: use User account data (legacy behavior)
        {
          authorName: submission.author.name,
          authorEmail: submission.author.email,
          affiliation: submission.author.organization,
          isPresenter: true,
          isExternal: false,
          order: 0,
          orcidId: null,
          userId: submission.authorId,
        },
      ];

  const created = await tx.presentation.create({
    data: {
      title: submission.title,
      abstract: submission.abstract,
      keywords: submission.keywords ?? [],
      affiliations: [],
      duration: defaultDurationMins,
      order: (lastPresentation?.order ?? 0) + 1,
      status: PresentationStatus.draft,
      submissionType: SubmissionType.internal,
      sectionId,
      typeId: submission.typeId ?? undefined,
      categoryId: submission.categoryId ?? undefined,
      authors: {
        create: presentationAuthorsData,
      },
    },
    select: { id: true },
  });

  await tx.submission.update({
    where: { id: submission.id },
    data: { presentationId: created.id },
    select: { id: true },
  });

  return created.id;
};
