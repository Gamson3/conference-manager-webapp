import {
  AbstractUploadMode,
  ConferenceParticipationRole,
  ConferenceParticipantStatus,
  ConferenceStatus,
  PrismaClient,
  Role,
  SubmissionsVisibility,
} from '@prisma/client';

const prisma = new PrismaClient();

type SeedOrganizer = {
  cognitoId: string;
  email: string;
  name: string;
};

type SeedAuthor = {
  cognitoId: string;
  email: string;
  name: string;
};

function envString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

async function upsertUserByCognitoOrEmail(input: {
  cognitoId: string;
  email: string;
  name: string;
  role: Role;
}): Promise<number> {
  const byCognito = await prisma.user.findUnique({ where: { cognitoId: input.cognitoId } });
  if (byCognito) {
    const updated = await prisma.user.update({
      where: { cognitoId: input.cognitoId },
      data: {
        email: input.email,
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
      data: {
        cognitoId: input.cognitoId,
        name: input.name,
        role: input.role,
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
      password: '',
      role: input.role,
    },
    select: { id: true },
  });

  return created.id;
}

async function upsertConference(organizerId: number): Promise<{ id: number; slug: string }> {
  const slug = envString('SEED_CONFERENCE_SLUG', 'manual-test-conference');
  const name = envString('SEED_CONFERENCE_NAME', 'Manual Test Conference');

  const startDate = new Date('2026-03-01T09:00:00.000Z');
  const endDate = new Date('2026-03-03T17:00:00.000Z');

  const existing = await prisma.conference.findUnique({ where: { slug } });
  if (existing) {
    const updated = await prisma.conference.update({
      where: { id: existing.id },
      data: {
        name,
        createdById: organizerId,
        startDate,
        endDate,
        location: envString('SEED_CONFERENCE_LOCATION', 'Hybrid'),
        submissionsVisibility: SubmissionsVisibility.public,
      },
      select: { id: true, slug: true },
    });
    return { id: updated.id, slug: updated.slug ?? slug };
  }

  const created = await prisma.conference.create({
    data: {
      name,
      slug,
      createdById: organizerId,
      startDate,
      endDate,
      location: envString('SEED_CONFERENCE_LOCATION', 'Hybrid'),
      status: ConferenceStatus.draft,
      isPublic: false,
      submissionsVisibility: SubmissionsVisibility.public,
    },
    select: { id: true, slug: true },
  });

  return { id: created.id, slug: created.slug ?? slug };
}

async function ensureConferenceRequirements(conferenceId: number): Promise<void> {
  await prisma.submissionRequirement.upsert({
    where: { conferenceId },
    update: {
      abstractUploadMode: AbstractUploadMode.TEXT,
      authorsEnabled: true,
      collectAuthorEmail: true,
      collectAuthorAffiliation: true,
      minKeywords: 5,
      maxKeywords: 8,
      abstractMinLength: 50,
      abstractMaxLength: 3000,
    },
    create: {
      conferenceId,
      abstractUploadMode: AbstractUploadMode.TEXT,
      authorsEnabled: true,
      collectAuthorEmail: true,
      collectAuthorAffiliation: true,
      minKeywords: 5,
      maxKeywords: 8,
      abstractMinLength: 50,
      abstractMaxLength: 3000,
    },
  });
}

async function ensureStarterSubmission(conferenceId: number, authorId: number): Promise<number> {
  const existing = await prisma.submission.findFirst({
    where: {
      conferenceId,
      authorId,
      title: 'Minimal Seed Submission (Draft)',
    },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.submission.create({
    data: {
      conferenceId,
      authorId,
      title: 'Minimal Seed Submission (Draft)',
      abstract:
        'This is a minimal seed submission for quick manual smoke testing. It is intentionally short but meets the default minimum length requirement by repeating a few descriptive phrases.\n\n' +
        'Keywords and author metadata are present so the submission list and detail pages render correctly.',
      keywords: ['seed', 'manual-test', 'smoke', 'submission', 'demo'],
      authorEmail: 'author.minimal@conference.test',
      authorAffiliation: 'Conference Master QA Lab',
      authors: {
        create: [
          {
            name: 'Minimal Author',
            firstName: 'Minimal',
            lastName: 'Author',
            email: 'author.minimal@conference.test',
            affiliations: ['Conference Master QA Lab'],
            order: 0,
            isPresenter: true,
            isExternal: true,
          },
        ],
      },
    },
    select: { id: true },
  });

  return created.id;
}

async function main(): Promise<void> {
  // Set these to match your currently logged-in Cognito user so the backend recognizes you.
  const organizer: SeedOrganizer = {
    cognitoId: envString('SEED_ORG_COGNITO_ID', '10fc39dc-1021-70df-2771-b3cb73370f46'),
    email: envString('SEED_ORG_EMAIL', '3ninety9@gmail.com'),
    name: envString('SEED_ORG_NAME', 'Manual Test Organizer'),
  };

  const author: SeedAuthor = {
    cognitoId: envString('SEED_AUTHOR_COGNITO_ID', 'seed-author-minimal-001'),
    email: envString('SEED_AUTHOR_EMAIL', 'author.minimal@conference.test'),
    name: envString('SEED_AUTHOR_NAME', 'Minimal Author'),
  };

  console.log('🌱 Seeding minimal manual-test data (non-destructive)...');

  const organizerId = await upsertUserByCognitoOrEmail({
    cognitoId: organizer.cognitoId,
    email: organizer.email,
    name: organizer.name,
    role: Role.organizer,
  });

  const authorId = await upsertUserByCognitoOrEmail({
    cognitoId: author.cognitoId,
    email: author.email,
    name: author.name,
    role: Role.user,
  });

  const conference = await upsertConference(organizerId);
  await ensureConferenceRequirements(conference.id);

  await prisma.conferenceParticipant.upsert({
    where: {
      userId_conferenceId_role: {
        userId: authorId,
        conferenceId: conference.id,
        role: ConferenceParticipationRole.author,
      },
    },
    update: { status: ConferenceParticipantStatus.registered },
    create: {
      userId: authorId,
      conferenceId: conference.id,
      role: ConferenceParticipationRole.author,
      status: ConferenceParticipantStatus.registered,
      customResponses: { source: 'seed-manual-testing-minimal' },
    },
  });

  const submissionId = await ensureStarterSubmission(conference.id, authorId);

  console.log('✅ Minimal manual-test seed complete.');
  console.log(`   Organizer DB user id: ${organizerId}`);
  console.log(`   Author DB user id: ${authorId}`);
  console.log(`   Conference slug: ${conference.slug}`);
  console.log(`   Draft submission id: ${submissionId}`);
  console.log('   Tip: override credentials with env vars:');
  console.log('   SEED_ORG_COGNITO_ID=... SEED_ORG_EMAIL=... npm run seed:manual-test');
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
