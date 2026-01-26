import {
  AbstractUploadMode,
  ConferenceParticipationRole,
  ConferenceParticipantStatus,
  ConferenceStatus,
  Prisma,
  PrismaClient,
  PresentationStatus,
  Role,
  SectionType,
  SubmissionStatus,
  SubmissionType,
  SubmissionsVisibility,
  WebsiteContentArea,
} from "@prisma/client";

let prisma = new PrismaClient();

type SeedUserInput = {
  cognitoId: string;
  email: string;
  name: string;
  role: Role;
  organization?: string;
  jobTitle?: string;
};

type ConferenceSeedInput = {
  slug: string;
  name: string;
  description: string;
  status: ConferenceStatus;
  isPublic: boolean;
  startDate: Date;
  endDate: Date;
  organizerId: number;
  location: string;
  venue: string;
  topics: string[];
  submissionPortalUrl?: string;
  schedulePublishedAt?: Date | null;
};

function envString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function isRetryablePrismaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1017";
  }
  if (error instanceof Error) {
    return error.message.includes("Server has closed the connection");
  }
  return false;
}

async function resetPrismaClient(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect failures during retry.
  }
  prisma = new PrismaClient();
}

function daysFrom(date: Date, offsetDays: number): Date {
  const ms = offsetDays * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + ms);
}

async function upsertUser(input: SeedUserInput): Promise<number> {
  const byCognito = await prisma.user.findUnique({ where: { cognitoId: input.cognitoId } });
  if (byCognito) {
    const updated = await prisma.user.update({
      where: { cognitoId: input.cognitoId },
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        organization: input.organization,
        jobTitle: input.jobTitle,
      },
      select: { id: true },
    });
    return updated.id;
  }

  const byEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (byEmail) {
    const updated = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        cognitoId: input.cognitoId,
        name: input.name,
        role: input.role,
        organization: input.organization,
        jobTitle: input.jobTitle,
      },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.user.create({
    data: {
      cognitoId: input.cognitoId,
      email: input.email,
      name: input.name,
      role: input.role,
      organization: input.organization,
      jobTitle: input.jobTitle,
    },
    select: { id: true },
  });

  return created.id;
}

async function upsertConference(input: ConferenceSeedInput): Promise<number> {
  const existing = await prisma.conference.findUnique({ where: { slug: input.slug } });
  if (existing) {
    const updated = await prisma.conference.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        description: input.description,
        status: input.status,
        isPublic: input.isPublic,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: input.organizerId,
        location: input.location,
        venue: input.venue,
        topics: input.topics,
        submissionsVisibility: SubmissionsVisibility.public,
        submissionPortalUrl: input.submissionPortalUrl,
        schedulePublishedAt: input.schedulePublishedAt ?? null,
      },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.conference.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      status: input.status,
      isPublic: input.isPublic,
      startDate: input.startDate,
      endDate: input.endDate,
      createdById: input.organizerId,
      location: input.location,
      venue: input.venue,
      topics: input.topics,
      submissionsVisibility: SubmissionsVisibility.public,
      submissionPortalUrl: input.submissionPortalUrl,
      schedulePublishedAt: input.schedulePublishedAt ?? null,
    },
    select: { id: true },
  });

  return created.id;
}

async function upsertConferenceCategory(conferenceId: number, name: string, description: string): Promise<number> {
  const existing = await prisma.conferenceCategory.findFirst({ where: { conferenceId, name } });
  if (existing) {
    const updated = await prisma.conferenceCategory.update({
      where: { id: existing.id },
      data: { description },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.conferenceCategory.create({
    data: { conferenceId, name, description },
    select: { id: true },
  });

  return created.id;
}

async function upsertPresentationType(
  conferenceId: number,
  name: string,
  description: string,
  defaultDuration: number
): Promise<number> {
  const existing = await prisma.presentationType.findFirst({ where: { conferenceId, name } });
  if (existing) {
    const updated = await prisma.presentationType.update({
      where: { id: existing.id },
      data: { description, defaultDuration },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.presentationType.create({
    data: { conferenceId, name, description, defaultDuration },
    select: { id: true },
  });

  return created.id;
}

async function upsertDay(
  conferenceId: number,
  date: Date,
  name: string,
  order: number
): Promise<number> {
  const day = await prisma.day.upsert({
    where: { conferenceId_date: { conferenceId, date } },
    update: { name, order },
    create: { conferenceId, date, name, order },
    select: { id: true },
  });

  return day.id;
}

async function upsertSection(input: {
  conferenceId: number;
  dayId?: number | null;
  name: string;
  startTime?: Date | null;
  endTime?: Date | null;
  order: number;
  type: SectionType;
  room?: string;
}): Promise<number> {
  const existing = await prisma.section.findFirst({
    where: {
      conferenceId: input.conferenceId,
      dayId: input.dayId ?? null,
      name: input.name,
    },
  });

  if (existing) {
    const updated = await prisma.section.update({
      where: { id: existing.id },
      data: {
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        order: input.order,
        type: input.type,
        room: input.room,
      },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.section.create({
    data: {
      conferenceId: input.conferenceId,
      dayId: input.dayId ?? null,
      name: input.name,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      order: input.order,
      type: input.type,
      room: input.room,
    },
    select: { id: true },
  });

  return created.id;
}

async function ensureSubmissionRequirement(conferenceId: number): Promise<void> {
  await prisma.submissionRequirement.upsert({
    where: { conferenceId },
    update: {
      minKeywords: 5,
      maxKeywords: 8,
      abstractMinLength: 50,
      abstractMaxLength: 3000,
      authorsEnabled: true,
      collectAuthorEmail: true,
      collectAuthorAffiliation: true,
      abstractUploadMode: AbstractUploadMode.TEXT,
    },
    create: {
      conferenceId,
      minKeywords: 5,
      maxKeywords: 8,
      abstractMinLength: 50,
      abstractMaxLength: 3000,
      authorsEnabled: true,
      collectAuthorEmail: true,
      collectAuthorAffiliation: true,
      abstractUploadMode: AbstractUploadMode.TEXT,
    },
  });
}

async function upsertRegistrationQuestions(conferenceId: number): Promise<void> {
  const questionLabel = "Affiliation";
  const existing = await prisma.registrationQuestion.findFirst({
    where: { conferenceId, label: questionLabel },
    select: { id: true },
  });

  if (existing) {
    await prisma.registrationQuestion.update({
      where: { id: existing.id },
      data: {
        description: "Your primary institution or organization",
        required: true,
        order: 1,
      },
    });
  } else {
    await prisma.registrationQuestion.create({
      data: {
        conferenceId,
        label: questionLabel,
        description: "Your primary institution or organization",
        required: true,
        order: 1,
      },
    });
  }

  const dietaryLabel = "Dietary requirements";
  const existingDietary = await prisma.registrationQuestion.findFirst({
    where: { conferenceId, label: dietaryLabel },
    select: { id: true },
  });

  if (existingDietary) {
    await prisma.registrationQuestion.update({
      where: { id: existingDietary.id },
      data: {
        type: "textarea",
        required: false,
        order: 2,
      },
    });
  } else {
    await prisma.registrationQuestion.create({
      data: {
        conferenceId,
        label: dietaryLabel,
        type: "textarea",
        required: false,
        order: 2,
      },
    });
  }
}

async function upsertCfpContent(conferenceId: number): Promise<void> {
  const existing = await prisma.conferenceWebsiteContentBlock.findFirst({
    where: { conferenceId, area: WebsiteContentArea.cfp, order: 1 },
    select: { id: true },
  });

  if (existing) {
    await prisma.conferenceWebsiteContentBlock.update({
      where: { id: existing.id },
      data: {
        title: "Submission Guidelines",
        markdown:
          "Please submit original research aligned with the conference topics. Submissions must include at least 5 keywords and at least one presenter.\n\n**Important dates** will be displayed on the CFP page.",
      },
    });
  } else {
    await prisma.conferenceWebsiteContentBlock.create({
      data: {
        conferenceId,
        area: WebsiteContentArea.cfp,
        title: "Submission Guidelines",
        markdown:
          "Please submit original research aligned with the conference topics. Submissions must include at least 5 keywords and at least one presenter.\n\n**Important dates** will be displayed on the CFP page.",
        order: 1,
      },
    });
  }
}

async function upsertParticipant(
  userId: number,
  conferenceId: number,
  role: ConferenceParticipationRole
): Promise<void> {
  await prisma.conferenceParticipant.upsert({
    where: { userId_conferenceId_role: { userId, conferenceId, role } },
    update: { status: ConferenceParticipantStatus.registered },
    create: {
      userId,
      conferenceId,
      role,
      status: ConferenceParticipantStatus.registered,
      customResponses: {
        affiliation: "Conference Master QA Lab",
      },
    },
  });
}

async function main(): Promise<void> {
  const now = new Date();

  const adminId = await upsertUser({
    cognitoId: envString("SEED_ADMIN_COGNITO_ID", "prod-admin-001"),
    email: envString("SEED_ADMIN_EMAIL", "admin@conference-master.prod"),
    name: envString("SEED_ADMIN_NAME", "Production Admin"),
    role: Role.admin,
    organization: "Conference Master",
    jobTitle: "Platform Administrator",
  });

  const organizerId = await upsertUser({
    cognitoId: envString("SEED_ORG_COGNITO_ID", "prod-org-001"),
    email: envString("SEED_ORG_EMAIL", "organizer@conference-master.prod"),
    name: envString("SEED_ORG_NAME", "Production Organizer"),
    role: Role.organizer,
    organization: "Conference Master",
    jobTitle: "Conference Organizer",
  });

  const authorId = await upsertUser({
    cognitoId: envString("SEED_AUTHOR_COGNITO_ID", "prod-author-001"),
    email: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
    name: envString("SEED_AUTHOR_NAME", "Production Author"),
    role: Role.user,
    organization: "Conference Master QA Lab",
    jobTitle: "Researcher",
  });

  const attendeeId = await upsertUser({
    cognitoId: envString("SEED_ATTENDEE_COGNITO_ID", "prod-attendee-001"),
    email: envString("SEED_ATTENDEE_EMAIL", "attendee@conference-master.prod"),
    name: envString("SEED_ATTENDEE_NAME", "Production Attendee"),
    role: Role.user,
    organization: "Conference Master QA Lab",
    jobTitle: "Graduate Student",
  });

  const reviewOrganizerId = await upsertUser({
    cognitoId: envString("SEED_REVIEW_ORG_COGNITO_ID", "e384f882-8001-70d2-4e57-6f7134a64db1"),
    email: envString("SEED_REVIEW_ORG_EMAIL", "99.gamson@gmail.com"),
    name: envString("SEED_REVIEW_ORG_NAME", "Gideon Gamson"),
    role: Role.organizer,
    organization: "Review Panel Committee",
    jobTitle: "Program Chair",
  });

  const publicConferenceId = await upsertConference({
    slug: envString("SEED_PUBLIC_CONF_SLUG", "global-ai-summit-2026"),
    name: envString("SEED_PUBLIC_CONF_NAME", "Global AI Summit 2026"),
    description:
      "A public, published conference with a complete schedule used for testing public browsing, program viewing, and submission workflows.",
    status: ConferenceStatus.published,
    isPublic: true,
    startDate: daysFrom(now, 30),
    endDate: daysFrom(now, 32),
    organizerId,
    location: "Pécs, Hungary",
    venue: "University of Pécs Conference Hall",
    topics: ["Artificial Intelligence", "Machine Learning", "Ethics"],
    submissionPortalUrl: "https://conference-master.example/submit",
    schedulePublishedAt: daysFrom(now, 20),
  });

  const draftConferenceId = await upsertConference({
    slug: envString("SEED_DRAFT_CONF_SLUG", "emerging-systems-lab-2026"),
    name: envString("SEED_DRAFT_CONF_NAME", "Emerging Systems Lab 2026"),
    description:
      "A draft-only conference used to validate organizer workflows before public publication.",
    status: ConferenceStatus.draft,
    isPublic: false,
    startDate: daysFrom(now, 60),
    endDate: daysFrom(now, 62),
    organizerId,
    location: "Budapest, Hungary",
    venue: "Innovation Center",
    topics: ["Systems", "Security", "Distributed Computing"],
    submissionPortalUrl: "https://conference-master.example/draft-submit",
    schedulePublishedAt: null,
  });

  const reviewDraftConferenceId = await upsertConference({
    slug: envString("SEED_REVIEW_DRAFT_CONF_SLUG", "review-panel-draft-2026"),
    name: envString("SEED_REVIEW_DRAFT_CONF_NAME", "Review Panel Draft Conference 2026"),
    description:
      "A fully configured conference that remains unpublished for organizer-only testing.",
    status: ConferenceStatus.draft,
    isPublic: false,
    startDate: daysFrom(now, 90),
    endDate: daysFrom(now, 92),
    organizerId: reviewOrganizerId,
    location: "Vienna, Austria",
    venue: "Innovation Lab Auditorium",
    topics: ["Systems", "Security", "Platforms"],
    submissionPortalUrl: "https://conference-master.example/review-draft-submit",
    schedulePublishedAt: null,
  });

  const reviewPublishedConferenceId = await upsertConference({
    slug: envString("SEED_REVIEW_PUBLISHED_CONF_SLUG", "review-panel-published-2026"),
    name: envString("SEED_REVIEW_PUBLISHED_CONF_NAME", "Review Panel Published Conference 2026"),
    description:
      "A fully configured and published conference for end-to-end public testing.",
    status: ConferenceStatus.published,
    isPublic: true,
    startDate: daysFrom(now, 120),
    endDate: daysFrom(now, 122),
    organizerId: reviewOrganizerId,
    location: "Vienna, Austria",
    venue: "City Conference Center",
    topics: ["AI Systems", "Applied ML", "Security"],
    submissionPortalUrl: "https://conference-master.example/review-submit",
    schedulePublishedAt: daysFrom(now, 110),
  });

  await ensureSubmissionRequirement(publicConferenceId);
  await ensureSubmissionRequirement(draftConferenceId);
  await ensureSubmissionRequirement(reviewDraftConferenceId);
  await ensureSubmissionRequirement(reviewPublishedConferenceId);
  await upsertRegistrationQuestions(publicConferenceId);
  await upsertRegistrationQuestions(reviewDraftConferenceId);
  await upsertRegistrationQuestions(reviewPublishedConferenceId);
  await upsertCfpContent(publicConferenceId);
  await upsertCfpContent(reviewDraftConferenceId);
  await upsertCfpContent(reviewPublishedConferenceId);

  const aiCategoryId = await upsertConferenceCategory(
    publicConferenceId,
    "Artificial Intelligence",
    "Research advances in AI, ML, and societal impact."
  );
  const systemsCategoryId = await upsertConferenceCategory(
    draftConferenceId,
    "Distributed Systems",
    "Systems engineering, reliability, and scalability."
  );

  const reviewDraftCategoryId = await upsertConferenceCategory(
    reviewDraftConferenceId,
    "Secure Platforms",
    "Systems security, trust, and platform integrity."
  );

  const reviewPublishedCategoryId = await upsertConferenceCategory(
    reviewPublishedConferenceId,
    "Applied AI",
    "Real-world applied AI systems and evaluations."
  );

  const talkTypeId = await upsertPresentationType(
    publicConferenceId,
    "Full Talk",
    "30-minute standard research presentation",
    30
  );
  const posterTypeId = await upsertPresentationType(
    draftConferenceId,
    "Poster",
    "Poster session presentation",
    15
  );

  const reviewDraftTypeId = await upsertPresentationType(
    reviewDraftConferenceId,
    "Research Talk",
    "25-minute research presentation",
    25
  );

  const reviewPublishedTypeId = await upsertPresentationType(
    reviewPublishedConferenceId,
    "Industry Talk",
    "20-minute industry presentation",
    20
  );

  const publicDay1Id = await upsertDay(
    publicConferenceId,
    daysFrom(now, 30),
    "Day 1 — Foundations",
    1
  );

  const publicDay2Id = await upsertDay(
    publicConferenceId,
    daysFrom(now, 31),
    "Day 2 — Applications",
    2
  );

  const keynoteSectionId = await upsertSection({
    conferenceId: publicConferenceId,
    dayId: publicDay1Id,
    name: "Opening Keynote",
    startTime: daysFrom(now, 30),
    endTime: daysFrom(now, 30 + 0.04),
    order: 1,
    type: SectionType.keynote,
    room: "Main Hall",
  });

  const researchSectionId = await upsertSection({
    conferenceId: publicConferenceId,
    dayId: publicDay2Id,
    name: "Research Session A",
    startTime: daysFrom(now, 31),
    endTime: daysFrom(now, 31 + 0.05),
    order: 2,
    type: SectionType.presentation,
    room: "Room 101",
  });

  await upsertSection({
    conferenceId: publicConferenceId,
    dayId: publicDay1Id,
    name: "Networking Break",
    startTime: daysFrom(now, 30 + 0.02),
    endTime: daysFrom(now, 30 + 0.03),
    order: 2,
    type: SectionType.networking,
    room: "Lobby",
  });

  const unscheduledSectionId = await upsertSection({
    conferenceId: publicConferenceId,
    dayId: null,
    name: "Unscheduled",
    order: 0,
    type: SectionType.presentation,
  });

  const draftDay1Id = await upsertDay(
    draftConferenceId,
    daysFrom(now, 60),
    "Draft Day 1 — Systems Track",
    1
  );

  const reviewDraftDay1Id = await upsertDay(
    reviewDraftConferenceId,
    daysFrom(now, 90),
    "Draft Day 1 — Platform Security",
    1
  );

  const reviewPublishedDay1Id = await upsertDay(
    reviewPublishedConferenceId,
    daysFrom(now, 120),
    "Day 1 — Applied AI",
    1
  );

  const reviewPublishedDay2Id = await upsertDay(
    reviewPublishedConferenceId,
    daysFrom(now, 121),
    "Day 2 — Trusted Systems",
    2
  );

  const draftResearchSectionId = await upsertSection({
    conferenceId: draftConferenceId,
    dayId: draftDay1Id,
    name: "Draft Research Session",
    startTime: daysFrom(now, 60),
    endTime: daysFrom(now, 60 + 0.05),
    order: 1,
    type: SectionType.presentation,
    room: "Lab Auditorium",
  });

  const reviewDraftSectionId = await upsertSection({
    conferenceId: reviewDraftConferenceId,
    dayId: reviewDraftDay1Id,
    name: "Security Review Session",
    startTime: daysFrom(now, 90),
    endTime: daysFrom(now, 90 + 0.05),
    order: 1,
    type: SectionType.presentation,
    room: "Innovation Lab",
  });

  const reviewPublishedKeynoteSectionId = await upsertSection({
    conferenceId: reviewPublishedConferenceId,
    dayId: reviewPublishedDay1Id,
    name: "Opening Keynote",
    startTime: daysFrom(now, 120),
    endTime: daysFrom(now, 120 + 0.04),
    order: 1,
    type: SectionType.keynote,
    room: "Main Stage",
  });

  const reviewPublishedResearchSectionId = await upsertSection({
    conferenceId: reviewPublishedConferenceId,
    dayId: reviewPublishedDay2Id,
    name: "Applied AI Session",
    startTime: daysFrom(now, 121),
    endTime: daysFrom(now, 121 + 0.05),
    order: 2,
    type: SectionType.presentation,
    room: "Room B",
  });

  const reviewPublishedUnscheduledSectionId = await upsertSection({
    conferenceId: reviewPublishedConferenceId,
    dayId: null,
    name: "Unscheduled",
    order: 0,
    type: SectionType.presentation,
  });

  const keynotePresentation = await prisma.presentation.upsert({
    where: { sectionId_order: { sectionId: keynoteSectionId, order: 1 } },
    update: {
      title: "Keynote: Responsible AI in Practice",
      abstract: "A systems-level overview of responsible AI deployment in public institutions.",
      keywords: ["AI", "Ethics", "Governance"],
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      typeId: talkTypeId,
      categoryId: aiCategoryId,
    },
    create: {
      title: "Keynote: Responsible AI in Practice",
      abstract: "A systems-level overview of responsible AI deployment in public institutions.",
      affiliations: ["University of Pécs"],
      keywords: ["AI", "Ethics", "Governance"],
      duration: 30,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      sectionId: keynoteSectionId,
      typeId: talkTypeId,
      categoryId: aiCategoryId,
    },
  });

  const researchPresentation = await prisma.presentation.upsert({
    where: { sectionId_order: { sectionId: researchSectionId, order: 1 } },
    update: {
      title: "Adaptive Scheduling for Conference Programs",
      abstract: "Scheduling strategy alignment with lifecycle state and publication rules.",
      keywords: ["Scheduling", "Workflows", "Conference"],
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      typeId: talkTypeId,
      categoryId: aiCategoryId,
    },
    create: {
      title: "Adaptive Scheduling for Conference Programs",
      abstract: "Scheduling strategy alignment with lifecycle state and publication rules.",
      affiliations: ["Conference Master QA Lab"],
      keywords: ["Scheduling", "Workflows", "Conference"],
      duration: 25,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      sectionId: researchSectionId,
      typeId: talkTypeId,
      categoryId: aiCategoryId,
    },
  });

  const draftPresentation = await prisma.presentation.upsert({
    where: { sectionId_order: { sectionId: draftResearchSectionId, order: 1 } },
    update: {
      title: "Reliability Signals in Distributed Systems",
      abstract: "Draft conference presentation retained for organizer-only review.",
      keywords: ["Resilience", "Distributed", "Signals"],
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      typeId: posterTypeId,
      categoryId: systemsCategoryId,
    },
    create: {
      title: "Reliability Signals in Distributed Systems",
      abstract: "Draft conference presentation retained for organizer-only review.",
      affiliations: ["Conference Master QA Lab"],
      keywords: ["Resilience", "Distributed", "Signals"],
      duration: 20,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      sectionId: draftResearchSectionId,
      typeId: posterTypeId,
      categoryId: systemsCategoryId,
    },
  });

  const reviewDraftPresentation = await prisma.presentation.upsert({
    where: { sectionId_order: { sectionId: reviewDraftSectionId, order: 1 } },
    update: {
      title: "Trust Signals for Secure Platforms",
      abstract: "Draft conference presentation retained for organizer review workflows.",
      keywords: ["Security", "Platforms", "Governance"],
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      typeId: reviewDraftTypeId,
      categoryId: reviewDraftCategoryId,
    },
    create: {
      title: "Trust Signals for Secure Platforms",
      abstract: "Draft conference presentation retained for organizer review workflows.",
      affiliations: ["Review Panel Committee"],
      keywords: ["Security", "Platforms", "Governance"],
      duration: 25,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      sectionId: reviewDraftSectionId,
      typeId: reviewDraftTypeId,
      categoryId: reviewDraftCategoryId,
    },
  });

  const reviewPublishedKeynote = await prisma.presentation.upsert({
    where: { sectionId_order: { sectionId: reviewPublishedKeynoteSectionId, order: 1 } },
    update: {
      title: "Keynote: Applied AI Reliability",
      abstract: "An industry keynote on deploying reliable AI systems.",
      keywords: ["AI", "Reliability", "Deployment"],
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      typeId: reviewPublishedTypeId,
      categoryId: reviewPublishedCategoryId,
    },
    create: {
      title: "Keynote: Applied AI Reliability",
      abstract: "An industry keynote on deploying reliable AI systems.",
      affiliations: ["Conference Master Review Board"],
      keywords: ["AI", "Reliability", "Deployment"],
      duration: 20,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      sectionId: reviewPublishedKeynoteSectionId,
      typeId: reviewPublishedTypeId,
      categoryId: reviewPublishedCategoryId,
    },
  });

  const reviewPublishedPresentation = await prisma.presentation.upsert({
    where: { sectionId_order: { sectionId: reviewPublishedResearchSectionId, order: 1 } },
    update: {
      title: "Operational Metrics for Applied ML",
      abstract: "Measuring reliability and fairness in applied ML services.",
      keywords: ["Monitoring", "ML", "Operations"],
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      typeId: reviewPublishedTypeId,
      categoryId: reviewPublishedCategoryId,
    },
    create: {
      title: "Operational Metrics for Applied ML",
      abstract: "Measuring reliability and fairness in applied ML services.",
      affiliations: ["Review Panel Committee"],
      keywords: ["Monitoring", "ML", "Operations"],
      duration: 20,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      sectionId: reviewPublishedResearchSectionId,
      typeId: reviewPublishedTypeId,
      categoryId: reviewPublishedCategoryId,
    },
  });

  await prisma.presentationAuthor.deleteMany({ where: { presentationId: keynotePresentation.id } });
  await prisma.presentationAuthor.createMany({
    data: [
      {
        presentationId: keynotePresentation.id,
        authorName: "Dr. Leah Kovacs",
        authorEmail: "leah.kovacs@up.hu",
        affiliation: "University of Pécs",
        isPresenter: true,
        isExternal: true,
        order: 0,
      },
    ],
  });

  await prisma.presentationAuthor.deleteMany({ where: { presentationId: researchPresentation.id } });
  await prisma.presentationAuthor.createMany({
    data: [
      {
        presentationId: researchPresentation.id,
        authorName: "Production Author",
        authorEmail: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
        affiliation: "Conference Master QA Lab",
        isPresenter: true,
        isExternal: false,
        order: 0,
        userId: authorId,
      },
    ],
  });

  await prisma.presentationAuthor.deleteMany({ where: { presentationId: reviewDraftPresentation.id } });
  await prisma.presentationAuthor.createMany({
    data: [
      {
        presentationId: reviewDraftPresentation.id,
        authorName: "Review Panel Organizer",
        authorEmail: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
        affiliation: "Review Panel Committee",
        isPresenter: true,
        isExternal: false,
        order: 0,
        userId: reviewOrganizerId,
      },
    ],
  });

  await prisma.presentationAuthor.deleteMany({ where: { presentationId: reviewPublishedKeynote.id } });
  await prisma.presentationAuthor.createMany({
    data: [
      {
        presentationId: reviewPublishedKeynote.id,
        authorName: "Dr. Mira Kovacs",
        authorEmail: "mira.kovacs@reviewboard.org",
        affiliation: "Conference Master Review Board",
        isPresenter: true,
        isExternal: true,
        order: 0,
      },
    ],
  });

  await prisma.presentationAuthor.deleteMany({ where: { presentationId: reviewPublishedPresentation.id } });
  await prisma.presentationAuthor.createMany({
    data: [
      {
        presentationId: reviewPublishedPresentation.id,
        authorName: "Review Panel Organizer",
        authorEmail: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
        affiliation: "Review Panel Committee",
        isPresenter: true,
        isExternal: false,
        order: 0,
        userId: reviewOrganizerId,
      },
    ],
  });

  const acceptedSubmission = await prisma.submission.upsert({
    where: { presentationId: researchPresentation.id },
    update: {
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Accepted and scheduled",
      title: "Adaptive Scheduling for Conference Programs",
      keywords: ["Scheduling", "Workflow", "Program"],
      conferenceId: publicConferenceId,
      authorId,
      presentationId: researchPresentation.id,
      categoryId: aiCategoryId,
      typeId: talkTypeId,
      authorEmail: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
      authorAffiliation: "Conference Master QA Lab",
    },
    create: {
      title: "Adaptive Scheduling for Conference Programs",
      abstract:
        "A sample submission that demonstrates the accepted-to-presentation workflow for published conferences.",
      keywords: ["Scheduling", "Workflow", "Program"],
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Accepted and scheduled",
      authorId,
      conferenceId: publicConferenceId,
      presentationId: researchPresentation.id,
      categoryId: aiCategoryId,
      typeId: talkTypeId,
      authorEmail: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
      authorAffiliation: "Conference Master QA Lab",
    },
  });

  await prisma.submission.upsert({
    where: { presentationId: draftPresentation.id },
    update: {
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Scheduled but not published",
      title: "Reliability Signals in Distributed Systems",
      keywords: ["Resilience", "Distributed", "Systems"],
      conferenceId: draftConferenceId,
      authorId,
      presentationId: draftPresentation.id,
      categoryId: systemsCategoryId,
      typeId: posterTypeId,
      authorEmail: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
      authorAffiliation: "Conference Master QA Lab",
    },
    create: {
      title: "Reliability Signals in Distributed Systems",
      abstract:
        "Accepted content for the draft conference to validate full workflows without public visibility.",
      keywords: ["Resilience", "Distributed", "Systems"],
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Scheduled but not published",
      authorId,
      conferenceId: draftConferenceId,
      presentationId: draftPresentation.id,
      categoryId: systemsCategoryId,
      typeId: posterTypeId,
      authorEmail: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
      authorAffiliation: "Conference Master QA Lab",
    },
  });

  const reviewDraftSubmission = await prisma.submission.upsert({
    where: { presentationId: reviewDraftPresentation.id },
    update: {
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Organizer-complete draft conference",
      title: "Trust Signals for Secure Platforms",
      keywords: ["Security", "Platforms", "Governance"],
      conferenceId: reviewDraftConferenceId,
      authorId: reviewOrganizerId,
      presentationId: reviewDraftPresentation.id,
      categoryId: reviewDraftCategoryId,
      typeId: reviewDraftTypeId,
      authorEmail: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
      authorAffiliation: "Review Panel Committee",
    },
    create: {
      title: "Trust Signals for Secure Platforms",
      abstract:
        "Accepted content for the draft conference to validate completed but unpublished workflows.",
      keywords: ["Security", "Platforms", "Governance"],
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Organizer-complete draft conference",
      authorId: reviewOrganizerId,
      conferenceId: reviewDraftConferenceId,
      presentationId: reviewDraftPresentation.id,
      categoryId: reviewDraftCategoryId,
      typeId: reviewDraftTypeId,
      authorEmail: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
      authorAffiliation: "Review Panel Committee",
    },
  });

  const reviewPublishedSubmission = await prisma.submission.upsert({
    where: { presentationId: reviewPublishedPresentation.id },
    update: {
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Accepted and scheduled",
      title: "Operational Metrics for Applied ML",
      keywords: ["Monitoring", "ML", "Operations"],
      conferenceId: reviewPublishedConferenceId,
      authorId: reviewOrganizerId,
      presentationId: reviewPublishedPresentation.id,
      categoryId: reviewPublishedCategoryId,
      typeId: reviewPublishedTypeId,
      authorEmail: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
      authorAffiliation: "Review Panel Committee",
    },
    create: {
      title: "Operational Metrics for Applied ML",
      abstract:
        "Accepted content for a published conference used to validate public program and schedule workflows.",
      keywords: ["Monitoring", "ML", "Operations"],
      status: SubmissionStatus.accepted,
      isLocked: true,
      lockedAt: now,
      lockedReason: "Accepted and scheduled",
      authorId: reviewOrganizerId,
      conferenceId: reviewPublishedConferenceId,
      presentationId: reviewPublishedPresentation.id,
      categoryId: reviewPublishedCategoryId,
      typeId: reviewPublishedTypeId,
      authorEmail: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
      authorAffiliation: "Review Panel Committee",
    },
  });

  const draftSubmission = await prisma.submission.findFirst({
    where: {
      conferenceId: draftConferenceId,
      authorId,
      title: "Draft Submission: Resilient Systems",
    },
    select: { id: true },
  });

  if (!draftSubmission) {
    await prisma.submission.create({
      data: {
        title: "Draft Submission: Resilient Systems",
        abstract:
          "Draft submission for a private conference. This is used to validate draft handling and organizer review flow.",
        keywords: ["Resilience", "Distributed", "Systems", "Reliability", "Testing"],
        status: SubmissionStatus.draft,
        authorId,
        conferenceId: draftConferenceId,
        categoryId: systemsCategoryId,
        typeId: posterTypeId,
        authorEmail: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
        authorAffiliation: "Conference Master QA Lab",
        authors: {
          create: [
            {
              name: "Production Author",
              firstName: "Production",
              lastName: "Author",
              email: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
              affiliations: ["Conference Master QA Lab"],
              order: 0,
              isPresenter: true,
              isExternal: false,
            },
          ],
        },
      },
    });
  }

  await prisma.submissionAuthorEntry.deleteMany({ where: { submissionId: acceptedSubmission.id } });
  await prisma.submissionAuthorEntry.createMany({
    data: [
      {
        submissionId: acceptedSubmission.id,
        name: "Production Author",
        firstName: "Production",
        lastName: "Author",
        email: envString("SEED_AUTHOR_EMAIL", "author@conference-master.prod"),
        affiliations: ["Conference Master QA Lab"],
        order: 0,
        isPresenter: true,
        isExternal: false,
      },
    ],
  });

  await prisma.submissionAuthorEntry.deleteMany({ where: { submissionId: reviewDraftSubmission.id } });
  await prisma.submissionAuthorEntry.createMany({
    data: [
      {
        submissionId: reviewDraftSubmission.id,
        name: "Review Panel Organizer",
        firstName: "Review",
        lastName: "Organizer",
        email: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
        affiliations: ["Review Panel Committee"],
        order: 0,
        isPresenter: true,
        isExternal: false,
      },
    ],
  });

  await prisma.submissionAuthorEntry.deleteMany({ where: { submissionId: reviewPublishedSubmission.id } });
  await prisma.submissionAuthorEntry.createMany({
    data: [
      {
        submissionId: reviewPublishedSubmission.id,
        name: "Review Panel Organizer",
        firstName: "Review",
        lastName: "Organizer",
        email: envString("SEED_REVIEW_ORG_EMAIL", "review.organizer@conference-master.prod"),
        affiliations: ["Review Panel Committee"],
        order: 0,
        isPresenter: true,
        isExternal: false,
      },
    ],
  });

  await upsertParticipant(authorId, publicConferenceId, ConferenceParticipationRole.author);
  await upsertParticipant(attendeeId, publicConferenceId, ConferenceParticipationRole.attendee);
  await upsertParticipant(organizerId, publicConferenceId, ConferenceParticipationRole.reviewer);
  await upsertParticipant(reviewOrganizerId, reviewDraftConferenceId, ConferenceParticipationRole.reviewer);
  await upsertParticipant(reviewOrganizerId, reviewPublishedConferenceId, ConferenceParticipationRole.reviewer);
  await upsertParticipant(authorId, reviewPublishedConferenceId, ConferenceParticipationRole.author);
  await upsertParticipant(attendeeId, reviewPublishedConferenceId, ConferenceParticipationRole.attendee);

  await prisma.conferenceFavorite.upsert({
    where: { userId_conferenceId: { userId: attendeeId, conferenceId: publicConferenceId } },
    update: {},
    create: { userId: attendeeId, conferenceId: publicConferenceId },
  });

  await prisma.presentationFavorite.upsert({
    where: { userId_presentationId: { userId: attendeeId, presentationId: keynotePresentation.id } },
    update: {},
    create: { userId: attendeeId, presentationId: keynotePresentation.id },
  });

  await prisma.section.update({
    where: { id: unscheduledSectionId },
    data: { order: 0 },
  });

  await prisma.section.update({
    where: { id: reviewPublishedUnscheduledSectionId },
    data: { order: 0 },
  });

  console.log("✅ Production sample seed complete:");
  console.log(`- Admin user ID: ${adminId}`);
  console.log(`- Organizer user ID: ${organizerId}`);
  console.log(`- Review organizer user ID: ${reviewOrganizerId}`);
  console.log(`- Public conference ID: ${publicConferenceId}`);
  console.log(`- Draft conference ID: ${draftConferenceId}`);
  console.log(`- Review draft conference ID: ${reviewDraftConferenceId}`);
  console.log(`- Review published conference ID: ${reviewPublishedConferenceId}`);
}

const runSeedWithRetry = async (): Promise<void> => {
  const maxAttempts = Number(envString("SEED_RETRY_ATTEMPTS", "3"));
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await main();
      return;
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isRetryablePrismaError(error);
      if (!shouldRetry) {
        throw error;
      }
      console.warn(`Seed attempt ${attempt} failed. Retrying...`);
      await resetPrismaClient();
      await new Promise<void>((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
};

runSeedWithRetry()
  .catch((error: Error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
