import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { createConference, createPresentation, createSection, createUser, suffix, authAs, resetDatabase } from './helpers';

describe('Presentation Assign API - full text enforcement', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Blocks scheduling accepted presentation when full text required (afterAcceptance) but missing', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    await prisma.submissionRequirement.create({
      data: {
        conferenceId: conf.id,
        collectFullText: true,
        fullTextTiming: 'afterAcceptance',
      },
    });

    const holdingSection = await createSection(conf.id, 'Holding'); // not scheduled into a Day

    const day = await prisma.day.create({
      data: {
        conferenceId: conf.id,
        date: new Date(Date.now() + 86_400_000),
        name: `Day-${suffix()}`,
        order: 1,
      },
    });

    const programSection = await prisma.section.create({
      data: {
        conferenceId: conf.id,
        dayId: day.id,
        name: 'Program',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3_600_000),
      },
    });

    const presentation = await createPresentation(holdingSection.id, 'Accepted talk', 1, 'scheduled');

    await prisma.submission.create({
      data: {
        title: 'Accepted submission',
        abstract: null,
        status: 'accepted',
        authorId: author.id,
        conferenceId: conf.id,
        presentationId: presentation.id,
      },
    });

    const res = await request(app)
      .post(`/api/presentations/${presentation.id}/assign-section`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ targetSectionId: programSection.id });

    expect(res.status).toBe(400);
    expect(res.body?.message).toBe('Full text file is required before scheduling this presentation');

    const stillUnlocked = await prisma.submission.findFirst({ where: { presentationId: presentation.id } });
    expect(stillUnlocked?.isLocked).toBe(false);
  });

  test('Allows scheduling accepted presentation when full text required and present', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    await prisma.submissionRequirement.create({
      data: {
        conferenceId: conf.id,
        collectFullText: true,
        fullTextTiming: 'afterAcceptance',
      },
    });

    const holdingSection = await createSection(conf.id, 'Holding');

    const day = await prisma.day.create({
      data: {
        conferenceId: conf.id,
        date: new Date(Date.now() + 172_800_000),
        name: `Day-${suffix()}`,
        order: 1,
      },
    });

    const programSection = await prisma.section.create({
      data: {
        conferenceId: conf.id,
        dayId: day.id,
        name: 'Program',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3_600_000),
      },
    });

    const presentation = await createPresentation(holdingSection.id, 'Accepted talk', 1, 'scheduled');

    await prisma.submission.create({
      data: {
        title: 'Accepted submission',
        abstract: null,
        status: 'accepted',
        authorId: author.id,
        conferenceId: conf.id,
        presentationId: presentation.id,
        fullTextFileUrl: '/uploads/submissions/fake.pdf',
        fullTextFileName: 'fake.pdf',
        fullTextFileMimeType: 'application/pdf',
        fullTextFileSizeBytes: 1234,
      },
    });

    const res = await request(app)
      .post(`/api/presentations/${presentation.id}/assign-section`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ targetSectionId: programSection.id });

    expect(res.status).toBeLessThan(400);

    const updated = await prisma.submission.findFirst({ where: { presentationId: presentation.id } });
    expect(updated?.isLocked).toBe(true);
    expect(updated?.lockedReason).toBe('Locked when scheduled to program');
  });
});
