import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { createUser, createConference, authAs, resetDatabase } from './helpers';

describe('Participants stats & filters', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => { await prisma.$disconnect(); });

  test('Stats reflect registered attendees and filters work', async () => {
    const organizer = await createUser('organizer');
    const userA = await createUser('user');
    const userB = await createUser('user');
    const conf = await createConference(organizer.id);

    // Register attendees
    await prisma.conferenceParticipant.create({ data: { conferenceId: conf.id, userId: userA.id, role: 'attendee', status: 'registered' } });
    await prisma.conferenceParticipant.create({ data: { conferenceId: conf.id, userId: userB.id, role: 'attendee', status: 'registered' } });

    const statsRes = await request(app)
      .get(`/api/conferences/${conf.id}/participants/stats`)
      .set(authAs(organizer.id, 'organizer'));
    expect(statsRes.status).toBeLessThan(400);
    expect(statsRes.body.total).toBe(2);

    const listRes = await request(app)
      .get(`/api/conferences/${conf.id}/participants?role=attendee`)
      .set(authAs(organizer.id, 'organizer'));
    expect(listRes.status).toBeLessThan(400);
    expect(listRes.body.length).toBe(2);

    const statusFilterRes = await request(app)
      .get(`/api/conferences/${conf.id}/participants?status=registered`)
      .set(authAs(organizer.id, 'organizer'));
    expect(statusFilterRes.status).toBeLessThan(400);
    expect(statusFilterRes.body.length).toBe(2);
  });
});
