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
 * - Scope aligned with thesis expectations in docs/thesis/build/BSC-Diplomawork-Final.md.
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
  primaryPublishedConferenceId: number;
  publishedConferenceIds: number[];
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

const DEFAULT_ORG_COGNITO_ID = 'e384f882-8001-70d2-4e57-6f7134a64db1';
const DEFAULT_ORG_EMAIL = '99.gamson@gmail.com';
const DEFAULT_ORG_NAME = 'Gideon Gamson';

const SEED_PRIMARY_PUBLISHED_SLUG = 'manual-test-conference-2026';
const SEED_PUBLISHED_SLUGS: string[] = [
  SEED_PRIMARY_PUBLISHED_SLUG,
  'global-ai-summit-2026',
  'data-science-symposium-2026',
  'cybersecurity-forum-2026',
  'hci-design-summit-2026',
  'robotics-workshop-2026',
];

const SEED_DRAFT_SLUG = 'manual-test-draft-2026';
const SEED_DRAFT_SLUGS: string[] = [SEED_DRAFT_SLUG, 'manual-test-draft-setup-2026'];

function envString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function baseDate(): Date {
  return new Date();
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

function utcMidnight(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function listConferenceDays(startDate: Date, endDate: Date): Date[] {
  const start = utcMidnight(startDate);
  const end = utcMidnight(endDate);
  const result: Date[] = [];

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addUtcDays(cursor, 1)) {
    result.push(new Date(cursor));
  }

  return result;
}

async function upsertUser(input: SeedUserInput): Promise<number> {
  const byCognito = await prisma.user.findUnique({ where: { cognitoId: input.cognitoId } });
  if (byCognito) {
    const emailOwner = await prisma.user.findUnique({ where: { email: input.email } });
    const canUpdateEmail = !emailOwner || emailOwner.id === byCognito.id;

    const updated = await prisma.user.update({
      where: { cognitoId: input.cognitoId },
      data: {
        ...(canUpdateEmail ? { email: input.email } : {}),
        name: input.name,
        role: input.role,
      },
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

  await prisma.adminAuditLog.deleteMany({
    where: { entityType: 'Conference', entityId: conferenceId },
  });

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
  for (const slug of [...SEED_PUBLISHED_SLUGS, ...SEED_DRAFT_SLUGS]) {
    await deleteConferenceBySlug(slug);
  }

  const publishedSeeds: Array<{
    slug: string;
    name: string;
    description: string;
    location: string;
    venue: string;
    timezone: string;
    topics: string[];
    startOffsetDays: number;
    endOffsetDays: number;
    submissionsOpenFromOffsetDays: number;
    submissionsOpenUntilOffsetDays: number;
    registrationOpenFromOffsetDays: number;
    registrationOpenUntilOffsetDays: number;
    schedulePublishedAtOffsetDays: number;
    websiteUrl: string;
    organizerName: string;
    organizerEmail: string;
    submissionPortalUrl: string;
  }> = [
    {
      slug: SEED_PRIMARY_PUBLISHED_SLUG,
      name: envString('SEED_PUBLISHED_CONFERENCE_NAME', 'International Conference on Applied AI 2026'),
      description:
        'A complete published conference with schedule and submission lifecycle examples for end-to-end manual testing across public browsing, attendee flows, and organizer workflows.',
      location: 'Hybrid — Pécs, Hungary',
      venue: 'University of Pécs Conference Hall',
      timezone: 'UTC',
      topics: ['AI', 'Machine Learning', 'NLP', 'Systems', 'Data Science'],
      startOffsetDays: 60,
      endOffsetDays: 62,
      submissionsOpenFromOffsetDays: -21,
      submissionsOpenUntilOffsetDays: 14,
      registrationOpenFromOffsetDays: -14,
      registrationOpenUntilOffsetDays: 45,
      schedulePublishedAtOffsetDays: -3,
      websiteUrl: 'https://example.test/applied-ai-2026',
      organizerName: 'Conference Master Org',
      organizerEmail: DEFAULT_ORG_EMAIL,
      submissionPortalUrl: 'https://example.test/applied-ai-2026/submit',
    },
    {
      slug: 'global-ai-summit-2026',
      name: 'Global AI Summit 2026',
      description:
        'A public conference used to validate explore listings, conference detail views, and schedule browsing at scale.',
      location: 'Vienna, Austria',
      venue: 'City Conference Center',
      timezone: 'UTC',
      topics: ['Artificial Intelligence', 'Responsible AI', 'Applications'],
      startOffsetDays: 120,
      endOffsetDays: 122,
      submissionsOpenFromOffsetDays: -10,
      submissionsOpenUntilOffsetDays: 30,
      registrationOpenFromOffsetDays: -7,
      registrationOpenUntilOffsetDays: 90,
      schedulePublishedAtOffsetDays: -1,
      websiteUrl: 'https://example.test/global-ai-summit-2026',
      organizerName: 'Global AI Summit Committee',
      organizerEmail: 'organizer@globalai.test',
      submissionPortalUrl: 'https://example.test/global-ai-summit-2026/submit',
    },
    {
      slug: 'data-science-symposium-2026',
      name: 'Data Science Symposium 2026',
      description:
        'A data-focused conference to validate topics, program navigation, and attendee personalization features (favorites).',
      location: 'Budapest, Hungary',
      venue: 'Innovation Center',
      timezone: 'UTC',
      topics: ['Data Engineering', 'Statistics', 'ML Ops'],
      startOffsetDays: 150,
      endOffsetDays: 150,
      submissionsOpenFromOffsetDays: -5,
      submissionsOpenUntilOffsetDays: 10,
      registrationOpenFromOffsetDays: -5,
      registrationOpenUntilOffsetDays: 120,
      schedulePublishedAtOffsetDays: -2,
      websiteUrl: 'https://example.test/dss-2026',
      organizerName: 'DSS Organizing Team',
      organizerEmail: 'organizer@dss.test',
      submissionPortalUrl: 'https://example.test/dss-2026/submit',
    },
    {
      slug: 'cybersecurity-forum-2026',
      name: 'Cybersecurity Forum 2026',
      description:
        'A security-focused conference to validate admin and organizer workflows as well as public viewing of published content.',
      location: 'Prague, Czech Republic',
      venue: 'Tech Campus Auditorium',
      timezone: 'UTC',
      topics: ['Security', 'Privacy', 'Systems'],
      startOffsetDays: 200,
      endOffsetDays: 202,
      submissionsOpenFromOffsetDays: -30,
      submissionsOpenUntilOffsetDays: 5,
      registrationOpenFromOffsetDays: -14,
      registrationOpenUntilOffsetDays: 160,
      schedulePublishedAtOffsetDays: -4,
      websiteUrl: 'https://example.test/cyber-forum-2026',
      organizerName: 'Cyber Forum Org',
      organizerEmail: 'organizer@cyber.test',
      submissionPortalUrl: 'https://example.test/cyber-forum-2026/submit',
    },
    {
      slug: 'hci-design-summit-2026',
      name: 'HCI & Design Summit 2026',
      description:
        'A UX-oriented conference to validate public conference pages and schedule browsing with varied session types.',
      location: 'Berlin, Germany',
      venue: 'Design Innovation Hub',
      timezone: 'UTC',
      topics: ['HCI', 'Design', 'Accessibility'],
      startOffsetDays: 240,
      endOffsetDays: 242,
      submissionsOpenFromOffsetDays: -20,
      submissionsOpenUntilOffsetDays: 20,
      registrationOpenFromOffsetDays: -10,
      registrationOpenUntilOffsetDays: 210,
      schedulePublishedAtOffsetDays: -7,
      websiteUrl: 'https://example.test/hci-summit-2026',
      organizerName: 'HCI Summit Team',
      organizerEmail: 'organizer@hci.test',
      submissionPortalUrl: 'https://example.test/hci-summit-2026/submit',
    },
    {
      slug: 'robotics-workshop-2026',
      name: 'Robotics Workshop 2026',
      description:
        'A workshop-style conference used to validate short multi-day schedules and public program displays.',
      location: 'Online',
      venue: 'Virtual Venue',
      timezone: 'UTC',
      topics: ['Robotics', 'Control', 'Perception'],
      startOffsetDays: 300,
      endOffsetDays: 301,
      submissionsOpenFromOffsetDays: -15,
      submissionsOpenUntilOffsetDays: 25,
      registrationOpenFromOffsetDays: -15,
      registrationOpenUntilOffsetDays: 260,
      schedulePublishedAtOffsetDays: -5,
      websiteUrl: 'https://example.test/robotics-workshop-2026',
      organizerName: 'Robotics Workshop Org',
      organizerEmail: 'organizer@robotics.test',
      submissionPortalUrl: 'https://example.test/robotics-workshop-2026/submit',
    },
  ];

  const publishedConferenceIds: number[] = [];
  for (const seed of publishedSeeds) {
    const start = daysFromBase(seed.startOffsetDays);
    const end = daysFromBase(seed.endOffsetDays);

    const created = await prisma.conference.create({
      data: {
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        startDate: atUtc(start, 9, 0),
        endDate: atUtc(end, 17, 0),
        timezone: seed.timezone,
        location: seed.location,
        venue: seed.venue,
        status: ConferenceStatus.published,
        isPublic: true,
        createdById: organizerId,
        topics: seed.topics,
        submissionsVisibility: SubmissionsVisibility.public,
        submissionsOpenFrom: daysFromBase(seed.submissionsOpenFromOffsetDays),
        submissionsOpenUntil: daysFromBase(seed.submissionsOpenUntilOffsetDays),
        registrationOpenFrom: daysFromBase(seed.registrationOpenFromOffsetDays),
        registrationOpenUntil: daysFromBase(seed.registrationOpenUntilOffsetDays),
        schedulePublishedAt: daysFromBase(seed.schedulePublishedAtOffsetDays),
        registrationEnabled: true,
        maxAttendees: 500,
        waitlistEnabled: true,
        requireApproval: false,
        organizerName: seed.organizerName,
        organizerEmail: seed.organizerEmail,
        websiteUrl: seed.websiteUrl,
        submissionPortalUrl: seed.submissionPortalUrl,
      },
      select: { id: true },
    });
    publishedConferenceIds.push(created.id);
  }

  const primaryPublishedConferenceId = publishedConferenceIds[0];

  const draftStart = daysFromBase(20);
  const draftEnd = daysFromBase(21);

  const draft = await prisma.conference.create({
    data: {
      name: envString('SEED_DRAFT_CONFERENCE_NAME', 'Workshop Sandbox (Draft) 2026'),
      slug: SEED_DRAFT_SLUG,
      description: 'Draft conference for testing organizer setup flows (not public).',
      startDate: atUtc(draftStart, 9, 0),
      endDate: atUtc(draftEnd, 17, 0),
      timezone: 'UTC',
      location: 'Online',
      venue: 'Virtual Venue',
      status: ConferenceStatus.draft,
      isPublic: false,
      createdById: organizerId,
      submissionsVisibility: SubmissionsVisibility.invite_only,
      submissionInviteCode: 'THESIS2026',
      registrationEnabled: false,
      organizerName: DEFAULT_ORG_NAME,
      organizerEmail: DEFAULT_ORG_EMAIL,
      websiteUrl: 'https://example.test/draft-sandbox',
      submissionPortalUrl: 'https://example.test/draft-sandbox/submit',
    },
    select: { id: true },
  });

  const draft2Start = daysFromBase(35);
  const draft2End = daysFromBase(36);
  await prisma.conference.create({
    data: {
      name: 'Thesis Demo Draft Conference 2026',
      slug: 'manual-test-draft-setup-2026',
      description: 'Second draft conference to validate multi-conference organizer navigation and setup workflows.',
      startDate: atUtc(draft2Start, 9, 0),
      endDate: atUtc(draft2End, 17, 0),
      timezone: 'UTC',
      location: 'Pécs, Hungary',
      venue: 'Thesis Hall A',
      status: ConferenceStatus.draft,
      isPublic: false,
      createdById: organizerId,
      submissionsVisibility: SubmissionsVisibility.invite_only,
      submissionInviteCode: 'THESIS2026',
      registrationEnabled: false,
      organizerName: DEFAULT_ORG_NAME,
      organizerEmail: DEFAULT_ORG_EMAIL,
      websiteUrl: 'https://example.test/thesis-draft-2026',
      submissionPortalUrl: 'https://example.test/thesis-draft-2026/submit',
    },
    select: { id: true },
  });

  return { primaryPublishedConferenceId, publishedConferenceIds, draftConferenceId: draft.id };
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
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { startDate: true, endDate: true },
  });

  if (!conference) {
    throw new Error(`Conference not found for schedule creation: ${conferenceId}`);
  }

  const dayDates = listConferenceDays(conference.startDate, conference.endDate);
  if (dayDates.length < 3) {
    throw new Error(
      `Primary conference must span 3 days for this seed script (got ${dayDates.length}). Update seed conference offsets or schedule generator.`
    );
  }

  const [day1Date, day2Date, day3Date] = dayDates;

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

async function createPublishedConferenceProgram(input: {
  conferenceId: number;
  startDate: Date;
  endDate: Date;
  setup: { categoryIds: number[]; typeIds: number[] };
  authorUserIds: number[];
}): Promise<void> {
  const dayDates = listConferenceDays(input.startDate, input.endDate);
  const days = await Promise.all(
    dayDates.map((date, index) =>
      prisma.day.create({
        data: {
          conferenceId: input.conferenceId,
          name: dayDates.length > 1 ? `Day ${index + 1}` : 'Day 1',
          date,
          order: index + 1,
        },
        select: { id: true },
      })
    )
  );

  const day1Date = dayDates[0];
  const day1Id = days[0].id;

  const keynoteSection = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: day1Id,
      name: 'Opening Keynote',
      type: SectionType.keynote,
      order: 1,
      room: 'Main Hall',
      startTime: atUtc(day1Date, 9, 0),
      endTime: atUtc(day1Date, 10, 0),
    },
    select: { id: true },
  });

  await prisma.presentation.create({
    data: {
      sectionId: keynoteSection.id,
      title: 'Keynote: From Prototype to Thesis Demo',
      abstract: 'An invited keynote used to populate the public program with a realistic headline session.',
      keywords: ['keynote', 'systems', 'product', 'quality', 'demo'],
      affiliations: ['Invited Speaker Institute'],
      duration: 45,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      authors: {
        create: [
          {
            authorName: 'Invited Keynote Speaker',
            authorEmail: 'keynote.speaker@conference.test',
            affiliation: 'Invited Speaker Institute',
            isPresenter: true,
            isExternal: true,
            order: 0,
          },
        ],
      },
    },
  });

  const coffeeBreak = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: day1Id,
      name: 'Coffee Break',
      type: SectionType.break,
      order: 2,
      room: 'Lobby',
      startTime: atUtc(day1Date, 10, 0),
      endTime: atUtc(day1Date, 10, 30),
    },
    select: { id: true },
  });

  void coffeeBreak;

  const morningA = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: day1Id,
      name: 'Morning Session A',
      type: SectionType.presentation,
      order: 3,
      room: 'Room A',
      startTime: atUtc(day1Date, 10, 30),
      endTime: atUtc(day1Date, 12, 0),
    },
    select: { id: true },
  });

  const morningB = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: day1Id,
      name: 'Morning Session B',
      type: SectionType.presentation,
      order: 4,
      room: 'Room B',
      startTime: atUtc(day1Date, 10, 30),
      endTime: atUtc(day1Date, 12, 0),
    },
    select: { id: true },
  });

  const lunchBreak = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: day1Id,
      name: 'Lunch Break',
      type: SectionType.break,
      order: 5,
      room: 'Cafeteria',
      startTime: atUtc(day1Date, 12, 0),
      endTime: atUtc(day1Date, 13, 0),
    },
    select: { id: true },
  });

  void lunchBreak;

  const afternoon = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: day1Id,
      name: 'Afternoon Session',
      type: SectionType.presentation,
      order: 6,
      room: 'Room A',
      startTime: atUtc(day1Date, 13, 0),
      endTime: atUtc(day1Date, 14, 30),
    },
    select: { id: true },
  });

  const panel = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: day1Id,
      name: 'Panel Discussion',
      type: SectionType.panel,
      order: 7,
      room: 'Main Hall',
      startTime: atUtc(day1Date, 15, 0),
      endTime: atUtc(day1Date, 16, 0),
    },
    select: { id: true },
  });

  await prisma.presentation.create({
    data: {
      sectionId: panel.id,
      title: 'Panel: Lessons Learned from End-to-End Delivery',
      abstract: 'A panel entry used for public program completeness and realistic session variety.',
      keywords: ['panel', 'delivery', 'testing', 'architecture', 'lessons'],
      affiliations: ['Conference Master Demo'],
      duration: 45,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      authors: {
        create: [
          {
            authorName: 'Panel Chair',
            authorEmail: 'panel.chair@conference.test',
            affiliation: 'Conference Master Demo',
            isPresenter: true,
            isExternal: true,
            order: 0,
          },
        ],
      },
    },
  });

  // Optional day-2 workshop for multi-day conferences.
  let workshopSectionId: number | null = null;
  if (days.length >= 2) {
    const day2Date = dayDates[1];
    const day2Id = days[1].id;
    const workshop = await prisma.section.create({
      data: {
        conferenceId: input.conferenceId,
        dayId: day2Id,
        name: 'Workshop Session',
        type: SectionType.workshop,
        order: 1,
        room: 'Workshop Room',
        startTime: atUtc(day2Date, 11, 0),
        endTime: atUtc(day2Date, 12, 30),
      },
      select: { id: true },
    });
    workshopSectionId = workshop.id;
  }

  const talkSections: number[] = [morningA.id, morningB.id, afternoon.id];
  if (workshopSectionId) talkSections.push(workshopSectionId);

  const acceptedTalkCount = Math.max(4, dayDates.length * 4);
  const keywords: string[] = ['ai', 'systems', 'testing', 'design', 'workflow'];

  for (let i = 0; i < acceptedTalkCount; i += 1) {
    const authorIndex = i % input.authorUserIds.length;
    const authorId = input.authorUserIds[authorIndex];
    const title = `Accepted Talk ${i + 1}: Demo-Ready Conference Flow`;

    const submissionId = await createSubmissionWithAuthors({
      conferenceId: input.conferenceId,
      authorId,
      title,
      abstract:
        'An accepted submission seeded to ensure the public schedule is populated with internal (submission-linked) presentations.',
      keywords,
      status: SubmissionStatus.accepted,
      categoryId: input.setup.categoryIds[i % input.setup.categoryIds.length],
      typeId: input.setup.typeIds[i % input.setup.typeIds.length],
      authors: [
        {
          firstName: 'Seed',
          lastName: `Author ${authorIndex + 1}`,
          email: `seed.author.${authorIndex + 1}@conference.test`,
          affiliations: ['Conference Master QA Lab'],
          isPresenter: true,
          order: 0,
        },
      ],
    });

    const sectionId = talkSections[i % talkSections.length];
    const order = Math.floor(i / talkSections.length) + 1;

    await createPresentationFromSubmission({
      sectionId,
      submissionId,
      title,
      abstract:
        'An accepted submission that appears as a scheduled program item for browsing, searching, and favorites.',
      keywords,
      affiliations: ['Conference Master QA Lab'],
      authors: [
        {
          name: `Seed Author ${authorIndex + 1}`,
          email: `seed.author.${authorIndex + 1}@conference.test`,
          affiliation: 'Conference Master QA Lab',
          isPresenter: true,
          order: 0,
        },
      ],
      durationMinutes: 20,
      order,
    });
  }
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

  const adminId = await upsertUser({
    cognitoId: envString('SEED_ADMIN_COGNITO_ID', 'seed-admin-001'),
    email: envString('SEED_ADMIN_EMAIL', 'admin@conference.test'),
    name: envString('SEED_ADMIN_NAME', 'Seed Admin'),
    role: Role.admin,
  });

  const organizerId = await upsertUser({
    cognitoId: envString('SEED_ORG_COGNITO_ID', DEFAULT_ORG_COGNITO_ID),
    email: envString('SEED_ORG_EMAIL', DEFAULT_ORG_EMAIL),
    name: envString('SEED_ORG_NAME', DEFAULT_ORG_NAME),
    role: Role.organizer,
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
    { cognitoId: 'seed-user-004', email: 'presenter.one@conference.test', name: 'Presenter One', role: Role.user },
    { cognitoId: 'seed-user-005', email: 'author.three@conference.test', name: 'Author Three', role: Role.user },
    { cognitoId: 'seed-user-006', email: 'attendee.two@conference.test', name: 'Attendee Two', role: Role.user },
    { cognitoId: 'seed-user-007', email: 'attendee.three@conference.test', name: 'Attendee Three', role: Role.user },
    { cognitoId: 'seed-user-008', email: 'attendee.four@conference.test', name: 'Attendee Four', role: Role.user },
    { cognitoId: 'seed-user-009', email: 'attendee.five@conference.test', name: 'Attendee Five', role: Role.user },
  ];

  const userIds: number[] = [];
  for (const u of userSeeds) {
    userIds.push(await upsertUser(u));
  }

  const conferences = await createConferences(organizerId);
  const setupByConferenceId = new Map<number, { categoryIds: number[]; typeIds: number[] }>();

  for (const conferenceId of conferences.publishedConferenceIds) {
    setupByConferenceId.set(conferenceId, await createConferenceSetupData(conferenceId));

    const c = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { startDate: true, endDate: true },
    });
    if (!c) continue;
    if (conferenceId === conferences.primaryPublishedConferenceId) continue;

    const setup = setupByConferenceId.get(conferenceId);
    if (!setup) {
      throw new Error(`Setup data missing for conference ${conferenceId}`);
    }

    await createPublishedConferenceProgram({
      conferenceId,
      startDate: c.startDate,
      endDate: c.endDate,
      setup,
      authorUserIds: userIds,
    });
  }

  const setup = setupByConferenceId.get(conferences.primaryPublishedConferenceId);
  if (!setup) {
    throw new Error('Primary conference setup data missing.');
  }
  const schedule = await createSchedule(conferences.primaryPublishedConferenceId);

  // Seed participants broadly so organizer/attendee/admin lists are not empty.
  for (const conferenceId of conferences.publishedConferenceIds) {
    await seedParticipants(conferenceId, [organizerId, secondaryOrganizerId, ...userIds]);
  }

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
    conferenceId: conferences.primaryPublishedConferenceId,
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
    conferenceId: conferences.primaryPublishedConferenceId,
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
    conferenceId: conferences.primaryPublishedConferenceId,
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
    conferenceId: conferences.primaryPublishedConferenceId,
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
    conferenceId: conferences.primaryPublishedConferenceId,
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
    conferenceId: conferences.primaryPublishedConferenceId,
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
    conferenceId: conferences.primaryPublishedConferenceId,
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
    conferenceId: conferences.primaryPublishedConferenceId,
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

  const acceptedSecondPresentationId = await createPresentationFromSubmission({
    sectionId: schedule.sectionIds.sessionB,
    submissionId: acceptedUnscheduledSubmissionId,
    title: 'Accepted (Scheduled Poster Slot)',
    abstract:
      'An accepted submission seeded as a second scheduled presentation to keep the public program coherent (accepted → scheduled presentation).',
    keywords,
    affiliations: ['Applied AI Group'],
    authors: [
      {
        name: 'Author Two',
        email: 'author.two@conference.test',
        affiliation: 'Applied AI Group',
        isPresenter: true,
        order: 0,
      },
    ],
    durationMinutes: 8,
    order: 1,
  });

  // Populate the seeded panel section (type=panel) with a single external entry.
  const panelSection = await prisma.section.findFirst({
    where: {
      conferenceId: conferences.primaryPublishedConferenceId,
      type: SectionType.panel,
    },
    orderBy: [{ startTime: 'asc' }, { order: 'asc' }],
    select: { id: true },
  });

  if (panelSection) {
    await prisma.presentation.create({
      data: {
        sectionId: panelSection.id,
        title: 'Panel: Responsible AI in Practice',
        abstract: 'A seeded panel entry for a complete-looking published program. This is intentionally external.',
        keywords: ['panel', 'responsible ai', 'governance', 'practice', 'policy'],
        affiliations: ['Conference Master Demo'],
        duration: 45,
        order: 1,
        status: PresentationStatus.scheduled,
        submissionType: SubmissionType.external,
        authors: {
          create: [
            {
              authorName: 'Panel Chair',
              authorEmail: 'panel.chair@conference.test',
              affiliation: 'Conference Master Demo',
              isPresenter: true,
              isExternal: true,
              order: 0,
            },
          ],
        },
      },
    });
  }

  await prisma.conferenceFavorite.createMany({
    data: [
      { userId: userIds[2], conferenceId: conferences.primaryPublishedConferenceId },
      { userId: userIds[6], conferenceId: conferences.primaryPublishedConferenceId },
    ],
    skipDuplicates: true,
  });

  await prisma.presentationFavorite.createMany({
    data: [
      { userId: userIds[2], presentationId: keynotePresentation.id },
      { userId: userIds[2], presentationId: acceptedPresentationId },
      { userId: userIds[3], presentationId: acceptedSecondPresentationId },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Comprehensive manual-test seed complete.');
  console.log(`   Admin DB user id: ${adminId}`);
  console.log(`   Organizer DB user id: ${organizerId}`);
  console.log(`   Primary published conference slug: ${SEED_PRIMARY_PUBLISHED_SLUG}`);
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
