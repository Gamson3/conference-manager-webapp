import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { createUser, createConference, createSection, createPresentation, authAs, resetDatabase } from './helpers';

describe('Schedule access control', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => { await prisma.$disconnect(); });

  test('Organizer can see draft schedule, user sees only published', async () => {
    const org = await createUser('organizer');
    const user = await createUser('user');

    const draftConf = await createConference(org.id);
    const pubConf = await createConference(org.id);
    // Public schedule visibility requires: status=published, isPublic=true, and schedulePublishedAt set.
    await prisma.conference.update({
      where: { id: pubConf.id },
      data: { status: 'published', isPublic: true, schedulePublishedAt: new Date() }
    });

    // Add minimal data so schedule has content
    const s1 = await createSection(draftConf.id, 'S1');
    await createPresentation(s1.id, 'P1', 1);

    const s2 = await createSection(pubConf.id, 'S2');
    await createPresentation(s2.id, 'Q1', 1);

    // Organizer can access draft
    const orgDraft = await request(app).get(`/api/conferences/${draftConf.id}/schedule`).set(authAs(org.id, 'organizer'));
    expect(orgDraft.status).toBeLessThan(400);

    // Regular user cannot access draft
    const userDraft = await request(app).get(`/api/conferences/${draftConf.id}/schedule`).set(authAs(user.id, 'user'));
    expect(userDraft.status).toBe(403);

    // Regular user can access published
    const userPub = await request(app).get(`/api/conferences/${pubConf.id}/schedule`).set(authAs(user.id, 'user'));
    expect(userPub.status).toBeLessThan(400);
  });
});
