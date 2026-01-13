/**
 * Comprehensive Manual Testing Seed Data (Updated Jan 2026)
 *
 * Seeds two conferences:
 * - Published conference with schedule + submissions across statuses
 * - Draft conference for organizer setup workflows
 *
 * Notes:
 * - Deletes ONLY conferences matching the seed slugs before recreating them.
 * - Upserts users by cognitoId/email.
 * - Includes at least one submission with legacy file URLs so file-access flows work without R2.
 */

import {
  AbstractUploadMode,
  ConferenceParticipationRole,
  ConferenceParticipantStatus,
  ConferenceStatus,
  FullTextTiming,
  Prisma,
  PrismaClient,
  PresentationStatus,
  RegistrationQuestionType,
  Role,
  SectionType,
  SubmissionStatus,
  SubmissionType,
  SubmissionsVisibility,
  WebsiteContentArea,
} from '@prisma/client';

const prisma = new PrismaClient();

type SeedUserInput = {
  cognitoId: string;
  email: string;
  name: string;
  role: Role;
};

type SeedConferenceIds = {
  publishedConferenceId: number;
  draftConferenceId: number;
};

type AuthorEntryInput = {
  firstName: string;
  lastName: string;
  email?: string;
  affiliations: string[];
  isPresenter: boolean;
  order: number;
};

const DEFAULT_ORG_COGNITO_ID = '10fc39dc-1021-70df-2771-b3cb73370f46';
const DEFAULT_ORG_EMAIL = '3ninety9@gmail.com';
const DEFAULT_ORG_NAME = 'Manual Test Organizer';

const SEED_PUBLISHED_SLUG = 'manual-test-conference-2026';
const SEED_DRAFT_SLUG = 'manual-test-draft-2026';

const BASE_DATE_ISO = '2026-01-12T12:00:00.000Z';

function envString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function baseDate(): Date {
  return new Date(envString('SEED_BASE_DATE', BASE_DATE_ISO));
}

function daysFromBase(days: number): Date {
  const d = baseDate();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function atUtc(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

async function upsertUser(input: SeedUserInput): Promise<number> {
  const byCognito = await prisma.user.findUnique({ where: { cognitoId: input.cognitoId } });
  if (byCognito) {
    const updated = await prisma.user.update({
      where: { cognitoId: input.cognitoId },
      data: { email: input.email, name: input.name, role: input.role },
      select: { id: true },
    });
    return updated.id;
  }

  const byEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (byEmail) {
    const updated = await prisma.user.update({
      where: { id: byEmail.id },
      data: { cognitoId: input.cognitoId, name: input.name, role: input.role },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.user.create({
    data: {
      cognitoId: input.cognitoId,
      email: input.email,
      name: input.name,
      password: '',
      role: input.role,
      bio: 'Seeded user for manual testing.',
    },
    select: { id: true },
  });

  return created.id;
}

async function deleteConferenceBySlug(slug: string): Promise<void> {
  const existing = await prisma.conference.findUnique({ where: { slug } });
  if (!existing) return;

  const conferenceId = existing.id;

  const sections = await prisma.section.findMany({ where: { conferenceId }, select: { id: true } });
  const sectionIds = sections.map((s) => s.id);

  const presentations = sectionIds.length
    ? await prisma.presentation.findMany({
        where: { sectionId: { in: sectionIds } },
        select: { id: true },
      })
    : [];
  const presentationIds = presentations.map((p) => p.id);

  await prisma.sessionAttendance.deleteMany({ where: { sectionId: { in: sectionIds } } });
  await prisma.presentationFavorite.deleteMany({ where: { presentationId: { in: presentationIds } } });
  await prisma.presentationMaterial.deleteMany({ where: { presentationId: { in: presentationIds } } });
  await prisma.presentationFeedback.deleteMany({ where: { presentationId: { in: presentationIds } } });
  await prisma.authorAssignment.deleteMany({ where: { presentationId: { in: presentationIds } } });
  await prisma.presentationAuthor.deleteMany({ where: { presentationId: { in: presentationIds } } });
  await prisma.impersonationLog.deleteMany({ where: { presentationId: { in: presentationIds } } });

  await prisma.submissionReview.deleteMany({ where: { submission: { conferenceId } } });
  await prisma.submissionAuthorEntry.deleteMany({ where: { submission: { conferenceId } } });
  await prisma.submission.deleteMany({ where: { conferenceId } });

  await prisma.presentation.deleteMany({ where: { id: { in: presentationIds } } });
  await prisma.section.deleteMany({ where: { conferenceId } });
  await prisma.day.deleteMany({ where: { conferenceId } });

  await prisma.conferenceFavorite.deleteMany({ where: { conferenceId } });
  await prisma.conferenceParticipant.deleteMany({ where: { conferenceId } });
  await prisma.conferenceMaterial.deleteMany({ where: { conferenceId } });
  await prisma.conferenceFeedback.deleteMany({ where: { conferenceId } });
  await prisma.registrationQuestion.deleteMany({ where: { conferenceId } });
  await prisma.timelineMilestone.deleteMany({ where: { conferenceId } });
  await prisma.conferenceWebsiteContentBlock.deleteMany({ where: { conferenceId } });
  await prisma.submissionRequirement.deleteMany({ where: { conferenceId } });
  await prisma.presentationType.deleteMany({ where: { conferenceId } });
  await prisma.conferenceCategory.deleteMany({ where: { conferenceId } });
  await prisma.submissionAssistanceConsent.deleteMany({ where: { conferenceId } });
  await prisma.submissionAssistanceRequest.deleteMany({ where: { conferenceId } });

  await prisma.conference.delete({ where: { id: conferenceId } });
}

async function createConferences(organizerId: number): Promise<SeedConferenceIds> {
  await deleteConferenceBySlug(SEED_PUBLISHED_SLUG);
  await deleteConferenceBySlug(SEED_DRAFT_SLUG);

  const publishedStart = daysFromBase(90);
  const publishedEnd = daysFromBase(92);

  const published = await prisma.conference.create({
    data: {
      name: envString(
        'SEED_PUBLISHED_CONFERENCE_NAME',
        'International Conference on Applied AI (Manual Test) 2026'
      ),
      slug: SEED_PUBLISHED_SLUG,
      description:
        'Seeded conference for manual testing. Includes submissions, schedule, participants, favorites, feedback, and file-access examples.',
      startDate: atUtc(publishedStart, 9, 0),
      endDate: atUtc(publishedEnd, 17, 0),
      timezone: 'UTC',
      location: 'Hybrid',
      venue: 'Conference Master Demo Venue',
      status: ConferenceStatus.published,
      isPublic: true,
      createdById: organizerId,
      topics: ['AI', 'ML', 'NLP', 'Systems', 'Data Science'],
      submissionsVisibility: SubmissionsVisibility.public,
      submissionsOpenFrom: daysFromBase(-60),
      submissionsOpenUntil: daysFromBase(30),
      registrationOpenFrom: daysFromBase(-45),
      registrationOpenUntil: daysFromBase(80),
      reviewStartsAt: daysFromBase(35),
      reviewEndsAt: daysFromBase(55),
      schedulePublishedAt: daysFromBase(-2),
      registrationEnabled: true,
      maxAttendees: 500,
      waitlistEnabled: true,
      requireApproval: false,
      organizerName: 'Conference Master Org',
      organizerEmail: 'organizer@conference.test',
      websiteUrl: 'https://example.test/conference',
    },
    select: { id: true },
  });

  const draftStart = daysFromBase(20);
  const draftEnd = daysFromBase(21);

  const draft = await prisma.conference.create({
    data: {
      name: envString('SEED_DRAFT_CONFERENCE_NAME', 'Workshop Sandbox (Manual Test) 2026'),
      slug: SEED_DRAFT_SLUG,
      description: 'Draft conference for testing organizer setup flows.',
      startDate: atUtc(draftStart, 9, 0),
      endDate: atUtc(draftEnd, 17, 0),
      timezone: 'UTC',
      location: 'Online',
      status: ConferenceStatus.draft,
      isPublic: false,
      createdById: organizerId,
      submissionsVisibility: SubmissionsVisibility.invite_only,
      submissionInviteCode: 'INVITE-2026',
      registrationEnabled: false,
    },
    select: { id: true },
  });

  return { publishedConferenceId: published.id, draftConferenceId: draft.id };
}

async function createConferenceSetupData(conferenceId: number): Promise<{
  categoryIds: number[];
  typeIds: number[];
}> {
  await prisma.conferenceCategory.createMany({
    data: [
      { conferenceId, name: 'Research', description: 'Peer-reviewed research track' },
      { conferenceId, name: 'Industry', description: 'Industry case studies' },
      { conferenceId, name: 'Student', description: 'Student submissions' },
      { conferenceId, name: 'Demos', description: 'Interactive demonstrations' },
    ],
  });

  await prisma.presentationType.createMany({
    data: [
      { conferenceId, name: 'Oral', description: 'Standard oral talk', defaultDuration: 20 },
      { conferenceId, name: 'Lightning', description: 'Short lightning talk', defaultDuration: 8 },
      { conferenceId, name: 'Poster', description: 'Poster presentation', defaultDuration: 5 },
      { conferenceId, name: 'Workshop', description: 'Hands-on workshop', defaultDuration: 60 },
    ],
  });

  const categories = await prisma.conferenceCategory.findMany({
    where: { conferenceId },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  const types = await prisma.presentationType.findMany({
    where: { conferenceId },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  await prisma.submissionRequirement.create({
    data: {
      conferenceId,
      minKeywords: 5,
      maxKeywords: 8,
      abstractMinLength: 50,
      abstractMaxLength: 3000,
      authorsEnabled: true,
      collectAuthorEmail: true,
      collectAuthorAffiliation: true,
      collectAuthorPhone: true,
      collectAuthorOrcid: false,
      requiresOrcid: false,
      abstractUploadMode: AbstractUploadMode.BOTH,
      fileFieldLabel: 'Add Abstract File (optional)',
      fileFieldRequired: false,
      maxFileSizeMB: 10,
      allowedFileTypes: ['application/pdf'],
      collectFullText: true,
      fullTextTiming: FullTextTiming.afterAcceptance,
    },
  });

  await prisma.conferenceWebsiteContentBlock.createMany({
    data: [
      {
        conferenceId,
        area: WebsiteContentArea.cfp,
        title: 'Call for Papers',
        markdown:
          'We invite submissions on applied AI across research and industry. Public pages show abstract text only.',
        order: 1,
      },
      {
        conferenceId,
        area: WebsiteContentArea.cfp,
        title: 'Submission Guidelines',
        markdown:
          'Submissions require an abstract and keywords. File uploads are available to authors and organizers only.',
        order: 2,
      },
    ],
  });

  await prisma.timelineMilestone.createMany({
    data: [
      { conferenceId, name: 'CFP Opens', date: daysFromBase(-60), type: 'cfp' },
      { conferenceId, name: 'CFP Closes', date: daysFromBase(30), type: 'cfp' },
      { conferenceId, name: 'Reviews', date: daysFromBase(35), type: 'review' },
      { conferenceId, name: 'Decisions', date: daysFromBase(60), type: 'decision' },
      { conferenceId, name: 'Conference Starts', date: daysFromBase(90), type: 'event' },
    ],
  });

  await prisma.registrationQuestion.createMany({
    data: [
      {
        conferenceId,
        label: 'Dietary restrictions',
        type: RegistrationQuestionType.text,
        required: false,
        order: 1,
        category: 'dietary',
      },
      {
        conferenceId,
        label: 'Accessibility needs',
        type: RegistrationQuestionType.textarea,
        required: false,
        order: 2,
        category: 'accessibility',
      },
      {
        conferenceId,
        label: 'Attendance type',
        type: RegistrationQuestionType.select,
        required: true,
        options: ['in_person', 'virtual'] satisfies Prisma.InputJsonValue,
        order: 3,
        category: 'other',
      },
    ],
  });

  await prisma.conferenceMaterial.createMany({
    data: [
      {
        conferenceId,
        title: 'Attendee Guide (PDF)',
        description: 'Sample public conference material (not submission files).',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'application/pdf',
        isPublic: true,
      },
    ],
  });

  return {
    categoryIds: categories.map((c) => c.id),
    typeIds: types.map((t) => t.id),
  };
}

async function createSchedule(conferenceId: number): Promise<{
  dayIds: number[];
  sectionIds: {
    keynote: number;
    sessionA: number;
    sessionB: number;
    workshop: number;
  };
}> {
  const day1Date = daysFromBase(90);
  const day2Date = daysFromBase(91);
  const day3Date = daysFromBase(92);

  const [day1, day2, day3] = await Promise.all([
    prisma.day.create({
      data: { conferenceId, name: 'Day 1 — Foundations', date: day1Date, order: 1 },
      select: { id: true },
    }),
    prisma.day.create({
      data: { conferenceId, name: 'Day 2 — Applications', date: day2Date, order: 2 },
      select: { id: true },
    }),
    prisma.day.create({
      data: { conferenceId, name: 'Day 3 — Systems & Society', date: day3Date, order: 3 },
      select: { id: true },
    }),
  ]);

  const keynote = await prisma.section.create({
    data: {
      conferenceId,
      dayId: day1.id,
      name: 'Opening Keynote',
      type: SectionType.keynote,
      order: 1,
      room: 'Main Hall',
      startTime: atUtc(day1Date, 9, 0),
      endTime: atUtc(day1Date, 10, 0),
    },
    select: { id: true },
  });

  const sessionA = await prisma.section.create({
    data: {
      conferenceId,
      dayId: day1.id,
      name: 'Session A — ML & NLP',
      type: SectionType.presentation,
      order: 2,
      room: 'Room A',
      startTime: atUtc(day1Date, 10, 30),
      endTime: atUtc(day1Date, 12, 0),
    },
    select: { id: true },
  });

  const sessionB = await prisma.section.create({
    data: {
      conferenceId,
      dayId: day2.id,
      name: 'Session B — Applied AI',
      type: SectionType.presentation,
      order: 1,
      room: 'Room B',
      startTime: atUtc(day2Date, 9, 0),
      endTime: atUtc(day2Date, 10, 30),
    },
    select: { id: true },
  });

  const workshop = await prisma.section.create({
    data: {
      conferenceId,
      dayId: day2.id,
      name: 'Workshop — Practical RAG',
      type: SectionType.workshop,
      order: 2,
      room: 'Workshop Room',
      startTime: atUtc(day2Date, 11, 0),
      endTime: atUtc(day2Date, 12, 30),
    },
    select: { id: true },
  });

  await prisma.section.createMany({
    data: [
      {
        conferenceId,
        dayId: day1.id,
        name: 'Coffee Break',
        type: SectionType.break,
        order: 3,
        startTime: atUtc(day1Date, 12, 0),
        endTime: atUtc(day1Date, 12, 30),
        room: 'Lobby',
      },
      {
        conferenceId,
        dayId: day3.id,
        name: 'Panel — AI Governance',
        type: SectionType.panel,
        order: 1,
        startTime: atUtc(day3Date, 9, 0),
        endTime: atUtc(day3Date, 10, 0),
        room: 'Main Hall',
      },
    ],
  });

  return {
    dayIds: [day1.id, day2.id, day3.id],
    sectionIds: {
      keynote: keynote.id,
      sessionA: sessionA.id,
      sessionB: sessionB.id,
      workshop: workshop.id,
    },
  };
}

async function createSubmissionWithAuthors(input: {
  conferenceId: number;
  authorId: number;
  title: string;
  abstract: string;
  keywords: string[];
  status: SubmissionStatus;
  categoryId?: number;
  typeId?: number;
  authorEmail?: string;
  authorAffiliation?: string;
  locked?: { isLocked: boolean; lockedReason?: string };
  revision?: { requestedAt?: Date; feedback?: string; resubmittedAt?: Date };
  file?:
    | {
        abstractFile: {
          url: string;
          name: string;
          mimeType: string;
          sizeBytes: number;
        };
        fullTextFile?: {
          url: string;
          name: string;
          mimeType: string;
          sizeBytes: number;
        };
      }
    | undefined;
  authors: AuthorEntryInput[];
}): Promise<number> {
  const created = await prisma.submission.create({
    data: {
      conferenceId: input.conferenceId,
      authorId: input.authorId,
      title: input.title,
      abstract: input.abstract,
      keywords: input.keywords,
      status: input.status,
      submittedAt: daysFromBase(-1),
      categoryId: input.categoryId,
      typeId: input.typeId,
      authorEmail: input.authorEmail,
      authorAffiliation: input.authorAffiliation,
      isLocked: input.locked?.isLocked ?? false,
      lockedAt: input.locked?.isLocked ? daysFromBase(-1) : null,
      lockedReason: input.locked?.lockedReason ?? null,
      revisionRequestedAt: input.revision?.requestedAt ?? null,
      revisionFeedback: input.revision?.feedback ?? null,
      resubmittedAt: input.revision?.resubmittedAt ?? null,
      abstractFileUrl: input.file?.abstractFile.url ?? null,
      abstractFileName: input.file?.abstractFile.name ?? null,
      abstractFileMimeType: input.file?.abstractFile.mimeType ?? null,
      abstractFileSizeBytes: input.file?.abstractFile.sizeBytes ?? null,
      fullTextFileUrl: input.file?.fullTextFile?.url ?? null,
      fullTextFileName: input.file?.fullTextFile?.name ?? null,
      fullTextFileMimeType: input.file?.fullTextFile?.mimeType ?? null,
      fullTextFileSizeBytes: input.file?.fullTextFile?.sizeBytes ?? null,
      authors: {
        create: input.authors.map((a) => ({
          name: `${a.firstName} ${a.lastName}`,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          affiliations: a.affiliations,
          order: a.order,
          isPresenter: a.isPresenter,
          isExternal: true,
        })),
      },
    },
    select: { id: true },
  });

  return created.id;
}

async function createPresentationFromSubmission(input: {
  sectionId: number;
  submissionId: number;
  title: string;
  abstract: string;
  keywords: string[];
  affiliations: string[];
  authors: { name: string; email?: string; affiliation?: string; isPresenter: boolean; order: number }[];
  durationMinutes: number;
  order: number;
}): Promise<number> {
  const presentation = await prisma.presentation.create({
    data: {
      sectionId: input.sectionId,
      title: input.title,
      abstract: input.abstract,
      keywords: input.keywords,
      affiliations: input.affiliations,
      duration: input.durationMinutes,
      order: input.order,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      authors: {
        create: input.authors.map((a) => ({
          authorName: a.name,
          authorEmail: a.email,
          affiliation: a.affiliation,
          isPresenter: a.isPresenter,
          isExternal: true,
          order: a.order,
        })),
      },
    },
    select: { id: true },
  });

  await prisma.submission.update({
    where: { id: input.submissionId },
    data: { presentationId: presentation.id },
  });

  return presentation.id;
}

async function seedParticipants(conferenceId: number, userIds: number[]): Promise<void> {
  const data: Array<{
    userId: number;
    conferenceId: number;
    role: ConferenceParticipationRole;
    status: ConferenceParticipantStatus;
    customResponses: Prisma.InputJsonValue;
  }> = [];

  for (const userId of userIds) {
    data.push({
      userId,
      conferenceId,
      role: ConferenceParticipationRole.attendee,
      status: ConferenceParticipantStatus.registered,
      customResponses: { attendanceType: 'virtual', seeded: true } satisfies Prisma.InputJsonValue,
    });
  }

  if (userIds.length >= 3) {
    data.push({
      userId: userIds[0],
      conferenceId,
      role: ConferenceParticipationRole.reviewer,
      status: ConferenceParticipantStatus.registered,
      customResponses: { seeded: true } satisfies Prisma.InputJsonValue,
    });
    data.push({
      userId: userIds[1],
      conferenceId,
      role: ConferenceParticipationRole.presenter,
      status: ConferenceParticipantStatus.registered,
      customResponses: { seeded: true } satisfies Prisma.InputJsonValue,
    });
    data.push({
      userId: userIds[2],
      conferenceId,
      role: ConferenceParticipationRole.author,
      status: ConferenceParticipantStatus.registered,
      customResponses: { seeded: true } satisfies Prisma.InputJsonValue,
    });
  }

  await prisma.conferenceParticipant.createMany({
    data,
    skipDuplicates: true,
  });
}

async function main(): Promise<void> {
  console.log('��� Starting comprehensive manual testing seed (updated)...');

  const organizerId = await upsertUser({
    cognitoId: envString('SEED_ORG_COGNITO_ID', DEFAULT_ORG_COGNITO_ID),
    email: envString('SEED_ORG_EMAIL', DEFAULT_ORG_EMAIL),
    name: envString('SEED_ORG_NAME', DEFAULT_ORG_NAME),
    role: Role.organizer,
  });

  const adminId = await upsertUser({
    cognitoId: 'seed-admin-001',
    email: 'admin@conference.test',
    name: 'Seed Admin',
    role: Role.admin,
  });

  const secondaryOrganizerId = await upsertUser({
    cognitoId: 'seed-organizer-002',
    email: 'organizer2@conference.test',
    name: 'Secondary Organizer',
    role: Role.organizer,
  });

  const userSeeds: SeedUserInput[] = [
    { cognitoId: 'seed-user-001', email: 'author.one@conference.test', name: 'Author One', role: Role.user },
    { cognitoId: 'seed-user-002', email: 'author.two@conference.test', name: 'Author Two', role: Role.user },
    { cognitoId: 'seed-user-003', email: 'attendee.one@conference.test', name: 'Attendee One', role: Role.user },
    { cognitoId: 'seed-user-004', email: 'reviewer.one@conference.test', name: 'Reviewer One', role: Role.user },
    { cognitoId: 'seed-user-005', email: 'presenter.one@conference.test', name: 'Presenter One', role: Role.user },
    { cognitoId: 'seed-user-006', email: 'attendee.two@conference.test', name: 'Attendee Two', role: Role.user },
    { cognitoId: 'seed-user-007', email: 'attendee.three@conference.test', name: 'Attendee Three', role: Role.user },
  ];

  const userIds: number[] = [];
  for (const u of userSeeds) {
    userIds.push(await upsertUser(u));
  }

  const conferences = await createConferences(organizerId);
  const setup = await createConferenceSetupData(conferences.publishedConferenceId);
  const schedule = await createSchedule(conferences.publishedConferenceId);

  await seedParticipants(conferences.publishedConferenceId, [organizerId, secondaryOrganizerId, ...userIds]);

  const keynotePresentation = await prisma.presentation.create({
    data: {
      sectionId: schedule.sectionIds.keynote,
      title: 'Keynote: Building Trustworthy AI Systems',
      abstract:
        'An invited keynote on robust evaluation, reliability, and deployment patterns for trustworthy AI systems.',
      keywords: ['trust', 'evaluation', 'safety', 'deployment', 'governance'],
      affiliations: ['Invited Speaker Institute'],
      duration: 45,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      authors: {
        create: [
          {
            authorName: 'Dr. Key Note',
            authorEmail: 'keynote@conference.test',
            affiliation: 'Invited Speaker Institute',
            isPresenter: true,
            isExternal: true,
            order: 0,
          },
        ],
      },
    },
    select: { id: true },
  });

  const dummyPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const keywords: string[] = ['ai', 'ml', 'nlp', 'systems', 'testing'];

  const draftSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[0],
    title: 'Draft Submission (Editable)',
    abstract:
      'This is a draft submission seeded for manual testing of the author edit and submit flow. It intentionally remains in draft status.',
    keywords,
    status: SubmissionStatus.draft,
    categoryId: setup.categoryIds[0],
    typeId: setup.typeIds[0],
    authorEmail: 'author.one@conference.test',
    authorAffiliation: 'Conference Master QA Lab',
    authors: [
      {
        firstName: 'Author',
        lastName: 'One',
        email: 'author.one@conference.test',
        affiliations: ['Conference Master QA Lab'],
        isPresenter: true,
        order: 0,
      },
    ],
  });

  const submittedSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[1],
    title: 'Submitted Submission (Awaiting Review)',
    abstract:
      'This submission is seeded as submitted, ready for organizer review actions. It has multiple authors to test author list rendering.',
    keywords,
    status: SubmissionStatus.submitted,
    categoryId: setup.categoryIds[1],
    typeId: setup.typeIds[1],
    authorEmail: 'author.two@conference.test',
    authorAffiliation: 'Applied AI Group',
    authors: [
      {
        firstName: 'Author',
        lastName: 'Two',
        email: 'author.two@conference.test',
        affiliations: ['Applied AI Group'],
        isPresenter: true,
        order: 0,
      },
      {
        firstName: 'Co',
        lastName: 'Author',
        email: 'co.author@conference.test',
        affiliations: ['Applied AI Group'],
        isPresenter: false,
        order: 1,
      },
    ],
  });

  const underReviewSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[0],
    title: 'Under Review (Locked)',
    abstract:
      'This submission is under review and locked, to validate organizer review and decision UI as well as lock behavior.',
    keywords,
    status: SubmissionStatus.under_review,
    categoryId: setup.categoryIds[0],
    typeId: setup.typeIds[0],
    authorEmail: 'author.one@conference.test',
    authorAffiliation: 'Conference Master QA Lab',
    locked: { isLocked: true, lockedReason: 'Under review' },
    authors: [
      {
        firstName: 'Author',
        lastName: 'One',
        email: 'author.one@conference.test',
        affiliations: ['Conference Master QA Lab'],
        isPresenter: true,
        order: 0,
      },
    ],
  });

  const revisionRequestedSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[1],
    title: 'Revision Requested (Unlocked)',
    abstract:
      'This submission has a revision requested. It should be editable by the author and display organizer feedback.',
    keywords,
    status: SubmissionStatus.revision_requested,
    categoryId: setup.categoryIds[2],
    typeId: setup.typeIds[0],
    authorEmail: 'author.two@conference.test',
    authorAffiliation: 'Applied AI Group',
    revision: { requestedAt: daysFromBase(-3), feedback: 'Please clarify methods and add an ablation study summary.' },
    authors: [
      {
        firstName: 'Author',
        lastName: 'Two',
        email: 'author.two@conference.test',
        affiliations: ['Applied AI Group'],
        isPresenter: true,
        order: 0,
      },
    ],
  });

  const acceptedScheduledSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[0],
    title: 'Accepted (Scheduled Talk)',
    abstract:
      'An accepted submission that is already scheduled into the program. Useful for validating the public schedule and organizer program views.',
    keywords,
    status: SubmissionStatus.accepted,
    categoryId: setup.categoryIds[0],
    typeId: setup.typeIds[0],
    authorEmail: 'author.one@conference.test',
    authorAffiliation: 'Conference Master QA Lab',
    locked: { isLocked: true, lockedReason: 'Accepted' },
    file: {
      abstractFile: { url: dummyPdf, name: 'accepted-abstract.pdf', mimeType: 'application/pdf', sizeBytes: 13264 },
      fullTextFile: { url: dummyPdf, name: 'accepted-fulltext.pdf', mimeType: 'application/pdf', sizeBytes: 13264 },
    },
    authors: [
      {
        firstName: 'Author',
        lastName: 'One',
        email: 'author.one@conference.test',
        affiliations: ['Conference Master QA Lab'],
        isPresenter: true,
        order: 0,
      },
    ],
  });

  const acceptedUnscheduledSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[1],
    title: 'Accepted (Unscheduled)',
    abstract:
      'An accepted submission that has not yet been converted into a scheduled presentation. Useful for scheduler workflows.',
    keywords,
    status: SubmissionStatus.accepted,
    categoryId: setup.categoryIds[1],
    typeId: setup.typeIds[2],
    authorEmail: 'author.two@conference.test',
    authorAffiliation: 'Applied AI Group',
    locked: { isLocked: true, lockedReason: 'Accepted' },
    authors: [
      {
        firstName: 'Author',
        lastName: 'Two',
        email: 'author.two@conference.test',
        affiliations: ['Applied AI Group'],
        isPresenter: true,
        order: 0,
      },
    ],
  });

  const rejectedSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[0],
    title: 'Rejected (Locked)',
    abstract: 'A rejected submission for testing organizer decisions and locked state display.',
    keywords,
    status: SubmissionStatus.rejected,
    categoryId: setup.categoryIds[3],
    typeId: setup.typeIds[1],
    authorEmail: 'author.one@conference.test',
    authorAffiliation: 'Conference Master QA Lab',
    locked: { isLocked: true, lockedReason: 'Rejected' },
    authors: [
      {
        firstName: 'Author',
        lastName: 'One',
        email: 'author.one@conference.test',
        affiliations: ['Conference Master QA Lab'],
        isPresenter: true,
        order: 0,
      },
    ],
  });

  const withdrawnSubmissionId = await createSubmissionWithAuthors({
    conferenceId: conferences.publishedConferenceId,
    authorId: userIds[1],
    title: 'Withdrawn Submission',
    abstract: 'A withdrawn submission for testing filters and withdrawn state.',
    keywords,
    status: SubmissionStatus.withdrawn,
    categoryId: setup.categoryIds[2],
    typeId: setup.typeIds[0],
    authorEmail: 'author.two@conference.test',
    authorAffiliation: 'Applied AI Group',
    locked: { isLocked: true, lockedReason: 'Withdrawn' },
    authors: [
      {
        firstName: 'Author',
        lastName: 'Two',
        email: 'author.two@conference.test',
        affiliations: ['Applied AI Group'],
        isPresenter: true,
        order: 0,
      },
    ],
  });

  await prisma.submissionReview.createMany({
    data: [
      { submissionId: underReviewSubmissionId, reviewerId: organizerId, score: 4 },
      { submissionId: underReviewSubmissionId, reviewerId: secondaryOrganizerId, score: 3 },
    ],
  });

  const acceptedPresentationId = await createPresentationFromSubmission({
    sectionId: schedule.sectionIds.sessionA,
    submissionId: acceptedScheduledSubmissionId,
    title: 'Accepted (Scheduled Talk)',
    abstract:
      'An accepted submission that is already scheduled into the program. Useful for validating the public schedule and organizer program views.',
    keywords,
    affiliations: ['Conference Master QA Lab'],
    authors: [
      { name: 'Author One', email: 'author.one@conference.test', affiliation: 'Conference Master QA Lab', isPresenter: true, order: 0 },
    ],
    durationMinutes: 20,
    order: 1,
  });

  const internalPresentation = await prisma.presentation.create({
    data: {
      sectionId: schedule.sectionIds.sessionB,
      title: 'Seeded Talk (No Submission Link)',
      abstract:
        'A presentation seeded directly (no submission link) to ensure program browsing is rich and varied.',
      keywords: ['seed', 'program', 'talk', 'demo', 'ui'],
      affiliations: ['Conference Master Demo'],
      duration: 15,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      authors: {
        create: [
          {
            authorName: 'Demo Speaker',
            authorEmail: 'demo.speaker@conference.test',
            affiliation: 'Conference Master Demo',
            isPresenter: true,
            isExternal: true,
            order: 0,
          },
        ],
      },
    },
    select: { id: true },
  });

  await prisma.conferenceFavorite.createMany({
    data: [
      { userId: userIds[2], conferenceId: conferences.publishedConferenceId },
      { userId: userIds[3], conferenceId: conferences.publishedConferenceId },
    ],
    skipDuplicates: true,
  });

  await prisma.presentationFavorite.createMany({
    data: [
      { userId: userIds[2], presentationId: keynotePresentation.id },
      { userId: userIds[2], presentationId: acceptedPresentationId },
      { userId: userIds[3], presentationId: internalPresentation.id },
    ],
    skipDuplicates: true,
  });

  await prisma.conferenceFeedback.createMany({
    data: [
      {
        conferenceId: conferences.publishedConferenceId,
        userId: userIds[2],
        rating: 5,
        comments: 'Great conference experience (seeded feedback).',
      },
    ],
  });

  await prisma.presentationFeedback.createMany({
    data: [
      {
        presentationId: keynotePresentation.id,
        userId: userIds[2],
        rating: 4,
        comments: 'Keynote was engaging and well-structured (seeded).',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: organizerId,
        type: 'seed',
        message: `Manual-test seed completed for ${SEED_PUBLISHED_SLUG}.`,
        read: false,
      },
      {
        userId: userIds[0],
        type: 'submission',
        message: 'Your draft submission is ready to edit and submit.',
        read: false,
      },
    ],
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'SEED_MANUAL_TESTING_DATA',
      entityType: 'Conference',
      entityId: conferences.publishedConferenceId,
      metadata: {
        publishedSlug: SEED_PUBLISHED_SLUG,
        draftSlug: SEED_DRAFT_SLUG,
        baseDate: baseDate().toISOString(),
      },
    },
  });

  console.log('✅ Comprehensive manual-test seed complete.');
  console.log(`   Organizer DB user id: ${organizerId}`);
  console.log(`   Published conference slug: ${SEED_PUBLISHED_SLUG}`);
  console.log(`   Draft conference slug: ${SEED_DRAFT_SLUG}`);
  console.log(
    `   Example submission ids: draft=${draftSubmissionId}, submitted=${submittedSubmissionId}, under_review=${underReviewSubmissionId}`
  );
  console.log(
    `   Example workflow submission ids: revision_requested=${revisionRequestedSubmissionId}, accepted_scheduled=${acceptedScheduledSubmissionId}, accepted_unscheduled=${acceptedUnscheduledSubmissionId}`
  );
  console.log(`   Other statuses: rejected=${rejectedSubmissionId}, withdrawn=${withdrawnSubmissionId}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Seed failed:', message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
