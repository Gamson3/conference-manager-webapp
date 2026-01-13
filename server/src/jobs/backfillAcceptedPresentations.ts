import prisma from "../lib/prisma";
import { ensurePresentationForAcceptedSubmission, SubmissionWithAuthor } from "../utils/submissionToPresentation";

const BATCH_SIZE = 200;
const ADVISORY_LOCK_KEY = BigInt("912345678901234567");

export const backfillAcceptedPresentations = async (): Promise<{
  scanned: number;
  createdOrLinked: number;
}> => {
  return prisma.$transaction(
    async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>
        `SELECT pg_try_advisory_xact_lock(${ADVISORY_LOCK_KEY}) AS locked`;
      const locked = lockRows[0]?.locked === true;
      if (!locked) return { scanned: 0, createdOrLinked: 0 };

      let totalScanned = 0;
      let totalCreatedOrLinked = 0;

      for (;;) {
        const batch = await tx.submission.findMany({
          where: {
            status: "accepted",
            presentationId: null,
          },
          select: {
            id: true,
            title: true,
            abstract: true,
            keywords: true,
            authorId: true,
            conferenceId: true,
            presentationId: true,
            typeId: true,
            categoryId: true,
            author: {
              select: {
                name: true,
                email: true,
                organization: true,
              },
            },
            authors: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
                email: true,
                affiliations: true,
                phone: true,
                orcid: true,
                order: true,
                isPresenter: true,
                isExternal: true,
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { submittedAt: "asc" },
          take: BATCH_SIZE,
        });

        if (batch.length === 0) break;
        totalScanned += batch.length;

        for (const s of batch) {
          const shaped: SubmissionWithAuthor = {
            id: s.id,
            title: s.title,
            abstract: s.abstract,
            keywords: s.keywords,
            authorId: s.authorId,
            conferenceId: s.conferenceId,
            presentationId: s.presentationId,
            typeId: s.typeId,
            categoryId: s.categoryId,
            author: {
              name: s.author.name,
              email: s.author.email,
              organization: s.author.organization,
            },
            authorEntries: s.authors,
          };

          await ensurePresentationForAcceptedSubmission(tx, shaped);
          totalCreatedOrLinked += 1;
        }
      }

      return { scanned: totalScanned, createdOrLinked: totalCreatedOrLinked };
    },
    { timeout: 600_000 }
  );
};
