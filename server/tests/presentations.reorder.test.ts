import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { createUser, createConference, createSection, createPresentation, authAs, resetDatabase } from './helpers';

describe('Presentation Reorder API', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => { await prisma.$disconnect(); });

  test('Reorders presentations successfully with continuous order', async () => {
    const organizer = await createUser('organizer');
    const conf = await createConference(organizer.id);
    const section = await createSection(conf.id);

    const p1 = await createPresentation(section.id, 'A', 1);
    const p2 = await createPresentation(section.id, 'B', 2);
    const p3 = await createPresentation(section.id, 'C', 3);

    const res = await request(app)
      .post(`/api/sections/${section.id}/presentations/reorder`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ presentations: [ { id: p1.id, order: 3 }, { id: p2.id, order: 1 }, { id: p3.id, order: 2 } ] });

    expect(res.status).toBeLessThan(400);

    const refreshed = await prisma.presentation.findMany({ where: { sectionId: section.id }, orderBy: { order: 'asc' } });
    expect(refreshed.map(p => p.id)).toEqual([p2.id, p3.id, p1.id]);
  });

  test('Rejects non-continuous ordering', async () => {
    const organizer = await createUser('organizer');
    const conf = await createConference(organizer.id);
    const section = await createSection(conf.id);
    const p1 = await createPresentation(section.id, 'A', 1);
    const p2 = await createPresentation(section.id, 'B', 2);

    const res = await request(app)
      .post(`/api/sections/${section.id}/presentations/reorder`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ presentations: [ { id: p1.id, order: 1 }, { id: p2.id, order: 3 } ] });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('Cannot reorder when one is locked', async () => {
    const organizer = await createUser('organizer');
    const conf = await createConference(organizer.id);
    const section = await createSection(conf.id);
    const p1 = await createPresentation(section.id, 'A', 1);
    const p2 = await createPresentation(section.id, 'B', 2, 'locked');

    const res = await request(app)
      .post(`/api/sections/${section.id}/presentations/reorder`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ presentations: [ { id: p1.id, order: 2 }, { id: p2.id, order: 1 } ] });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body?.lockedIds).toContain(p2.id);
  });
});
