import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { createUser, createConference, createSection, createPresentation, authAs, resetDatabase } from './helpers';

describe('Presentation Assign API', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => { await prisma.$disconnect(); });

  test('Assign/move presentation to another section end append order', async () => {
    const organizer = await createUser('organizer');
    const conf = await createConference(organizer.id);
    const s1 = await createSection(conf.id, 'S1');
    const s2 = await createSection(conf.id, 'S2');

    const p1 = await createPresentation(s1.id, 'To Move', 1);
    const p2 = await createPresentation(s2.id, 'Existing', 1);

    const res = await request(app)
      .post(`/api/presentations/${p1.id}/assign-section`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ targetSectionId: s2.id }); // no order -> append

    expect(res.status).toBeLessThan(400);
    const moved = await prisma.presentation.findUnique({ where: { id: p1.id } });
    expect(moved?.sectionId).toBe(s2.id);
    expect(moved?.order).toBe(2); // appended after existing
  });

  test('Assign into middle shifts subsequent orders', async () => {
    const organizer = await createUser('organizer');
    const conf = await createConference(organizer.id);
    const s1 = await createSection(conf.id, 'S1');
    const s2 = await createSection(conf.id, 'S2');

    const a = await createPresentation(s2.id, 'A', 1);
    const b = await createPresentation(s2.id, 'B', 2);
    const moving = await createPresentation(s1.id, 'Mover', 1);

    const res = await request(app)
      .post(`/api/presentations/${moving.id}/assign-section`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ targetSectionId: s2.id, targetOrder: 2 });

    expect(res.status).toBeLessThan(400);
    const ordered = await prisma.presentation.findMany({ where: { sectionId: s2.id }, orderBy: { order: 'asc' } });
    expect(ordered.map(p => p.title)).toEqual(['A','Mover','B']);
  });

  test('Locked presentation cannot be moved', async () => {
    const organizer = await createUser('organizer');
    const conf = await createConference(organizer.id);
    const s1 = await createSection(conf.id, 'S1');
    const s2 = await createSection(conf.id, 'S2');

    const locked = await createPresentation(s1.id, 'Locked', 1, 'locked');
    const res = await request(app)
      .post(`/api/presentations/${locked.id}/assign-section`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ targetSectionId: s2.id });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('Presenter conflict detected (same presenter already in target section)', async () => {
    const organizer = await createUser('organizer');
    const conf = await createConference(organizer.id);
    const s1 = await createSection(conf.id, 'S1');
    const s2 = await createSection(conf.id, 'S2');

    // Create user who will be presenter
    const presenterUser = await createUser('user');

    // Presentation already in target section with presenter
    const existing = await createPresentation(s2.id, 'Existing With Presenter', 1);
    await prisma.presentationAuthor.create({
      data: { presentationId: existing.id, authorName: 'Pres User', isPresenter: true, userId: presenterUser.id },
    });

    // Presentation to move with same presenter
    const moving = await createPresentation(s1.id, 'Mover', 1);
    await prisma.presentationAuthor.create({
      data: { presentationId: moving.id, authorName: 'Pres User', isPresenter: true, userId: presenterUser.id },
    });

    const res = await request(app)
      .post(`/api/presentations/${moving.id}/assign-section`)
      .set(authAs(organizer.id, 'organizer'))
      .send({ targetSectionId: s2.id });

    expect(res.status).toBe(409);
    expect(res.body?.conflicts?.length).toBeGreaterThan(0);
  });
});
