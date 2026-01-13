import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { authAs, createConference, createUser, resetDatabase, suffix } from './helpers';

function longAbstract(minWords: number = 55): string {
  const words = Array.from({ length: minWords }, (_, i) => `word${i + 1}`);
  return words.join(' ');
}

describe('Submissions revision workflow', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Organizer can request revision; author can resubmit', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(author.id))
      .send({
        title: 'Needs revision',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: 'Example University',
      });

    expect(createRes.status).toBe(201);
    const submissionId: number = createRes.body.id;

    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set(authAs(author.id))
      .send();
    expect(submitRes.status).toBeLessThan(400);

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'under_review',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'Under review',
      },
    });

    const requestRevisionRes = await request(app)
      .post(`/api/organizer/submissions/${submissionId}/request-revision`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ feedback: 'Please address reviewer comments and clarify methods.' });

    expect(requestRevisionRes.status).toBeLessThan(400);
    expect(requestRevisionRes.body.status).toBe('revision_requested');
    expect(requestRevisionRes.body.isLocked).toBe(false);
    expect(requestRevisionRes.body.revisionFeedback).toContain('Please address');

    const updateRes = await request(app)
      .put(`/api/submissions/${submissionId}`)
      .set(authAs(author.id))
      .send({
        title: 'Needs revision (updated)',
        abstract: longAbstract(60),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
      });
    expect(updateRes.status).toBeLessThan(400);

    const resubmitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set(authAs(author.id))
      .send();

    expect(resubmitRes.status).toBeLessThan(400);
    expect(resubmitRes.body.status).toBe('submitted');
    expect(resubmitRes.body.isLocked).toBe(true);
    expect(resubmitRes.body.resubmittedAt).toBeTruthy();

    const logs = await prisma.adminAuditLog.findMany({
      where: { entityType: 'Submission', entityId: submissionId },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs.some((l) => l.action === 'SUBMISSION_REVISION_REQUESTED')).toBe(true);
    expect(logs.some((l) => l.action === 'SUBMISSION_RESUBMIT')).toBe(true);
  });

  test('Request revision requires organizer and feedback', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(author.id))
      .send({
        title: 'No feedback',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: 'Example University',
      });

    const submissionId: number = createRes.body.id;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'under_review',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'Under review',
      },
    });

    const nonOrganizerRes = await request(app)
      .post(`/api/organizer/submissions/${submissionId}/request-revision`)
      .set(authAs(author.id))
      .send({ feedback: 'Please revise.' });

    expect(nonOrganizerRes.status).toBeGreaterThanOrEqual(400);

    const missingFeedbackRes = await request(app)
      .post(`/api/organizer/submissions/${submissionId}/request-revision`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ feedback: '' });

    expect(missingFeedbackRes.status).toBe(400);
  });
});

describe('Submissions submit validation (authors, affiliations, keywords)', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  test('Reject submit with 0 authors', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(author.id))
      .send({
        title: 'No authors',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: 'Example University',
      });
    expect(createRes.status).toBe(201);
    const submissionId: number = createRes.body.id;

    await prisma.submissionAuthorEntry.deleteMany({ where: { submissionId } });

    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set(authAs(author.id))
      .send();

    expect(submitRes.status).toBe(400);
    expect(String(submitRes.body?.message || '')).toContain('At least 1 author');
  });

  test('Reject submit when an author has no affiliations', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(author.id))
      .send({
        title: 'Missing affiliations',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: 'Example University',
      });
    expect(createRes.status).toBe(201);
    const submissionId: number = createRes.body.id;

    const primary = await prisma.submissionAuthorEntry.findFirst({
      where: { submissionId },
      orderBy: { order: 'asc' },
    });
    expect(primary).toBeTruthy();
    if (!primary) return;

    await prisma.submissionAuthorEntry.update({
      where: { id: primary.id },
      data: { affiliations: [] },
    });

    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set(authAs(author.id))
      .send();

    expect(submitRes.status).toBe(400);
    expect(String(submitRes.body?.message || '')).toContain('at least one affiliation');
  });

  test('Reject submit with <5 keywords', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(author.id))
      .send({
        title: 'Too few keywords',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4'],
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: 'Example University',
      });

    expect(createRes.status).toBe(201);
    const submissionId: number = createRes.body.id;

    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set(authAs(author.id))
      .send();

    expect(submitRes.status).toBe(400);
    expect(String(submitRes.body?.message || '')).toContain('At least 5 keyword');
  });

  test('Enforces collectAuthorPhone when enabled', async () => {
    const organizer = await createUser('organizer');
    const author = await createUser('user');
    const conf = await createConference(organizer.id);

    const reqRes = await request(app)
      .put(`/api/conferences/${conf.id}/requirements`)
      .set(authAs(organizer.id, 'organizer'))
      .send({
        authorsEnabled: true,
        collectAuthorEmail: false,
        collectAuthorAffiliation: false,
        collectAuthorPhone: true,
        collectAuthorOrcid: false,
        requiresOrcid: false,
        minKeywords: 5,
        maxKeywords: 8,
        abstractUploadMode: 'TEXT',
        abstractMinLength: 50,
        abstractMaxLength: 3000,
      });

    expect(reqRes.status).toBe(200);

    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(author.id))
      .send({
        title: 'Missing phone',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authors: [
          {
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: '',
            affiliation: '',
            phone: '',
            orcid: '',
            isPresentingAuthor: true,
          },
        ],
      });

    expect(createRes.status).toBe(201);
    const submissionId: number = createRes.body.id;

    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set(authAs(author.id))
      .send();

    expect(submitRes.status).toBe(400);
    expect(String(submitRes.body?.message || '')).toContain('Author phone is required');
  });
});
