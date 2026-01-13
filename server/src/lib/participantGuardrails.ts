import prisma from "./prisma";

/**
 * Phase 4: Participant Guardrails Helper
 * 
 * Checks whether a participant can be canceled/removed/reinstated based on structural ties
 * (author, reviewer, presenter, accepted work).
 * 
 * Returns a list of blocking reasons if any exist; empty list means no blockers.
 */

export interface ParticipantBlocker {
  type: "author" | "reviewer" | "presenter" | "chair";
  reason: string;
  details?: string;
}

/**
 * Check if a participant can be canceled/removed.
 * Returns blockers list (empty if allowed).
 */
export async function checkParticipantGuardrails(
  conferenceId: number,
  userId: number
): Promise<ParticipantBlocker[]> {
  const blockers: ParticipantBlocker[] = [];

  // Check if user is author of any submission in this conference
  const authorCount = await prisma.submission.count({
    where: {
      conferenceId,
      authorId: userId,
    },
  });

  if (authorCount > 0) {
    blockers.push({
      type: "author",
      reason: `Cannot remove participant who is an author. User authored ${authorCount} submission(s) in this conference.`,
      details: "Authors must withdraw submissions before account removal.",
    });
  }

  // Check if user is reviewer of any submission in this conference
  const reviewCount = await prisma.submissionReview.count({
    where: {
      submission: { conferenceId },
      reviewerId: userId,
    },
  });

  if (reviewCount > 0) {
    blockers.push({
      type: "reviewer",
      reason: `Cannot remove participant who is a reviewer. User has ${reviewCount} review(s) assigned in this conference.`,
      details: "Reviewers must complete or be unassigned from reviews before removal.",
    });
  }

  // Check if user is presenter in any presentation in this conference
  // PresentationAuthor.userId links internal users to presentations
  const presentationCount = await prisma.presentationAuthor.count({
    where: {
      userId,
      presentation: {
        section: { conference: { id: conferenceId } },
      },
    },
  });

  if (presentationCount > 0) {
    blockers.push({
      type: "presenter",
      reason: `Cannot remove participant who is scheduled to present. User is presenter in ${presentationCount} presentation(s).`,
      details: "Presenters must be unscheduled from the program before removal.",
    });
  }

  // Check if user is chair/session lead (stored in Section.chairs JSON)
  // This is a lighter check since chair data is in JSON; we fetch and inspect
  const sections = await prisma.section.findMany({
    where: {
      conference: { id: conferenceId },
    },
    select: { id: true, chairs: true },
  });

  for (const section of sections) {
    const chairs = Array.isArray(section.chairs) ? section.chairs : [];
    // Assuming chairs is an array of {userId, name} or just userId
    const isChair = chairs.some(
      (c: unknown) => 
        (typeof c === 'object' && c !== null && 'userId' in c && (c as { userId?: number }).userId === userId) ||
        c === userId
    );
    if (isChair) {
      blockers.push({
        type: "chair",
        reason: "Cannot remove participant who is a session chair.",
        details: "Session chairs must be reassigned before removal.",
      });
      break; // Only report once
    }
  }

  return blockers;
}
