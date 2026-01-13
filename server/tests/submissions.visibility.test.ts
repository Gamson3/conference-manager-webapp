import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { createUser, createConference, authAs, resetDatabase } from './helpers';

describe('Submissions visibility', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => { await prisma.$disconnect(); });

  test('Organizer sees all, author sees only own', async () => {
    const organizer = await createUser('organizer');
    const authorA = await createUser('user');
    const authorB = await createUser('user');
    const conf = await createConference(organizer.id);

    const sA1 = await prisma.submission.create({
      data: {
        title: 'A1',
        abstract: 'a',
        keywords: [],
        status: 'submitted',
        conferenceId: conf.id,
        authorId: authorA.id,
      },
    });
    const sB1 = await prisma.submission.create({
      data: {
        title: 'B1',
        abstract: 'b',
        keywords: [],
        status: 'submitted',
        conferenceId: conf.id,
        authorId: authorB.id,
      },
    });

    const orgList = await request(app)
      .get(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(organizer.id, 'organizer'))
      .send();
    expect(orgList.status).toBeLessThan(400);
    expect(orgList.body.length).toBeGreaterThanOrEqual(2);

    const aList = await request(app)
      .get(`/api/conferences/${conf.id}/submissions`)
      .set(authAs(authorA.id, 'user'))
      .send();
    expect(aList.status).toBeLessThan(400);
    const aIds = Array.isArray(aList.body)
      ? aList.body
          .map((x: unknown) => {
            if (typeof x === 'object' && x !== null && 'id' in x) {
              const idValue = (x as { id?: unknown }).id;
              return typeof idValue === 'number' ? idValue : null;
            }
            return null;
          })
          .filter((id): id is number => typeof id === 'number')
      : [];
    expect(aIds).toContain(sA1.id);
    expect(aIds).not.toContain(sB1.id);
  });
});
