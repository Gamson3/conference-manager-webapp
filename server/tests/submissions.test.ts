import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase } from './helpers';

function suffix() { return `${Date.now()}_${Math.floor(Math.random()*1000)}`; }

function longAbstract(minWords: number = 55): string {
  const words = Array.from({ length: minWords }, (_, i) => `word${i + 1}`);
  return words.join(' ');
}
async function seedUsersConference() {
  const s = suffix();
  const organizer = await prisma.user.create({ data: { cognitoId: `org-${s}`, name: 'Organizer', email: `organizer+${s}@example.com`, role: 'organizer' } });
  const author = await prisma.user.create({ data: { cognitoId: `author-${s}`, name: 'Author', email: `author+${s}@example.com`, role: 'user' } });
  const conf = await prisma.conference.create({ data: { name: `SubmitConf-${s}`, startDate: new Date(), endDate: new Date(Date.now()+7200_000), location: 'Hybrid', createdById: organizer.id } });
  return { organizer, author, conf };
}

describe('Submissions API', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => { await prisma.$disconnect(); });

  test('Author creates and submits a draft', async () => {
    const { conf, author } = await seedUsersConference();

    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set('x-user-id', String(author.id))
      .send({
        title: 'My Talk',
        abstract: longAbstract(),
        keywords: ['test', 'keyword2', 'keyword3', 'keyword4', 'keyword5'], // Thesis requirement: min 5
        authorEmail: `author+submit-${suffix()}@example.com`,
        authorAffiliation: 'Example University'
      });
    expect(createRes.status).toBe(201);
    const submissionId = createRes.body.id;

    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set('x-user-id', String(author.id))
      .send();
    expect(submitRes.status).toBeLessThan(400);
    expect(submitRes.body.status).toBe('submitted');
  });

  test('Organizer decides submission (accept)', async () => {
    const { conf, organizer, author } = await seedUsersConference();
    const draft = await prisma.submission.create({ data: { title: 'Decision Talk', abstract: 'Decide me', keywords: [], conferenceId: conf.id, authorId: author.id } });
    await prisma.submission.update({ where: { id: draft.id }, data: { status: 'submitted' } });
    const decisionRes = await request(app)
      .post(`/api/organizer/submissions/${draft.id}/decision`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({ decision: 'accepted' });
    expect(decisionRes.status).toBeLessThan(400);
    expect(decisionRes.body.status).toBe('accepted');
  });

  test('Duplicate submit returns error', async () => {
    const { conf, author } = await seedUsersConference();
    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set('x-user-id', String(author.id))
      .send({
        title: 'Dup Submit',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'], // Thesis requirement: min 5
        authorEmail: `author+dup-${suffix()}@example.com`,
        authorAffiliation: 'Example University'
      });
    const submissionId = createRes.body.id;
    const first = await request(app).post(`/api/submissions/${submissionId}/submit`).set('x-user-id', String(author.id)).send();
    expect(first.status).toBeLessThan(400);
    const second = await request(app).post(`/api/submissions/${submissionId}/submit`).set('x-user-id', String(author.id)).send();
    expect(second.status).toBeGreaterThanOrEqual(400);
  });

  test('Update after submit fails', async () => {
    const { conf, author } = await seedUsersConference();
    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set('x-user-id', String(author.id))
      .send({
        title: 'Immutable',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'], // Thesis requirement: min 5
        authorEmail: `author+immutable-${suffix()}@example.com`,
        authorAffiliation: 'Example University'
      });
    const submissionId = createRes.body.id;
    const submit = await request(app).post(`/api/submissions/${submissionId}/submit`).set('x-user-id', String(author.id)).send();
    expect(submit.status).toBeLessThan(400);
    const upd = await request(app)
      .put(`/api/submissions/${submissionId}`)
      .set('x-user-id', String(author.id))
      .send({ title: 'Changed', abstract: 'Changed', keywords: [] });
    // Submissions are locked upon submit.
    expect(upd.status).toBeGreaterThanOrEqual(400);
  });

  test('Withdraw after decision fails', async () => {
    const { conf, organizer, author } = await seedUsersConference();
    const draft = await prisma.submission.create({ data: { title: 'No Withdraw', abstract: 'abstract', keywords: [], conferenceId: conf.id, authorId: author.id } });
    await prisma.submission.update({ where: { id: draft.id }, data: { status: 'submitted' } });
    await request(app)
      .post(`/api/organizer/submissions/${draft.id}/decision`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({ decision: 'accepted' });
    const withdraw = await request(app).post(`/api/submissions/${draft.id}/withdraw`).set('x-user-id', String(author.id)).send();
    expect(withdraw.status).toBeGreaterThanOrEqual(400);
  });

  test('Review & reject decision flow', async () => {
    const { conf, organizer, author } = await seedUsersConference();
    const draft = await prisma.submission.create({ data: { title: 'Reviewable', abstract: 'abstract', keywords: [], conferenceId: conf.id, authorId: author.id } });
    await prisma.submission.update({ where: { id: draft.id }, data: { status: 'submitted' } });
    const reviewRes = await request(app)
      .post(`/api/organizer/submissions/${draft.id}/review`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({ score: 4, comments: 'Needs work' });
    expect(reviewRes.status).toBeLessThan(400);
    const decisionRes = await request(app)
      .post(`/api/organizer/submissions/${draft.id}/decision`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({ decision: 'rejected' });
    expect(decisionRes.status).toBeLessThan(400);
    expect(decisionRes.body.status).toBe('rejected');
  });
});
