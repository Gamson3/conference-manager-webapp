import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src';
import prisma from '../src/lib/prisma';
import type { Conference, Day, Presentation, Section, User } from '@prisma/client';
import { createUser, createConference, authAs, resetDatabase } from './helpers';

describe('Phase 5 - Schedule Management', () => {
  let organizer: User;
  let otherUser: User;
  let conference: Conference;
  let day1: Day;
  let day2: Day;
  let session1: Section;
  let session2: Section;
  let presentation1: Presentation;
  let presentation2: Presentation;
  let presentation3: Presentation;

  beforeAll(async () => {
    await resetDatabase();

    // Create users
    organizer = await createUser('organizer');
    otherUser = await createUser('user');

    // Create conference
    conference = await createConference(organizer.id);

    // Create days
    day1 = await prisma.day.create({
      data: {
        conferenceId: conference.id,
        date: new Date('2025-06-15'),
        name: 'Day 1',
        order: 0,
      },
    });
    day2 = await prisma.day.create({
      data: {
        conferenceId: conference.id,
        date: new Date('2025-06-16'),
        name: 'Day 2',
        order: 1,
      },
    });

    // Create sessions
    session1 = await prisma.section.create({
      data: {
        conferenceId: conference.id,
        dayId: day1.id,
        name: 'Morning Session',
        room: 'Room A',
        startTime: new Date('2025-06-15T09:00:00Z'),
        endTime: new Date('2025-06-15T12:00:00Z'),
        order: 0,
      },
    });
    session2 = await prisma.section.create({
      data: {
        conferenceId: conference.id,
        dayId: day1.id,
        name: 'Afternoon Session',
        room: 'Room B',
        startTime: new Date('2025-06-15T14:00:00Z'),
        endTime: new Date('2025-06-15T17:00:00Z'),
        order: 1,
      },
    });

    // Create presentations
    presentation1 = await prisma.presentation.create({
      data: {
        sectionId: session1.id,
        title: 'Presentation 1',
        order: 0,
        status: 'submitted',
        submissionType: 'internal',
        duration: 30,
        keywords: [],
        affiliations: [],
        authors: {
          create: [
            { authorName: 'Dr. Smith', authorEmail: 'smith@example.com', isPresenter: true, order: 0 },
          ],
        },
      },
    });
    presentation2 = await prisma.presentation.create({
      data: {
        sectionId: session1.id,
        title: 'Presentation 2',
        order: 1,
        status: 'submitted',
        submissionType: 'internal',
        duration: 30,
        keywords: [],
        affiliations: [],
        authors: {
          create: [
            { authorName: 'Dr. Jones', authorEmail: 'jones@example.com', isPresenter: true, order: 0 },
          ],
        },
      },
    });
    presentation3 = await prisma.presentation.create({
      data: {
        sectionId: session2.id,
        title: 'Presentation 3',
        order: 0,
        status: 'submitted',
        submissionType: 'internal',
        duration: 45,
        keywords: [],
        affiliations: [],
        authors: {
          create: [
            { authorName: 'Dr. Smith', authorEmail: 'smith@example.com', isPresenter: true, order: 0 },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  describe('POST /api/conferences/:id/schedule/validate', () => {
    it('returns 403 for non-organizers', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/validate`)
        .set(authAs(otherUser.id, 'user'))
        .send({ conferenceId: conference.id, days: [] });

      expect(res.status).toBe(403);
    });

    it('validates schedule with no conflicts', async () => {
      const payload = {
        conferenceId: conference.id,
        days: [
          {
            id: day1.id,
            date: '2025-06-15',
            sessions: [
              {
                id: session1.id,
                name: 'Morning Session',
                room: 'Room A',
                startTime: '09:00',
                endTime: '12:00',
                presentations: [
                  { id: presentation1.id, order: 0, durationMins: 30, presenters: ['smith@example.com'] },
                  { id: presentation2.id, order: 1, durationMins: 30, presenters: ['jones@example.com'] },
                ],
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/validate`)
        .set(authAs(organizer.id, 'organizer'))
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.conflicts).toHaveLength(0);
    });

    it('detects session overflow conflict', async () => {
      const payload = {
        conferenceId: conference.id,
        days: [
          {
            id: day1.id,
            date: '2025-06-15',
            sessions: [
              {
                id: session1.id,
                name: 'Short Session',
                room: 'Room A',
                startTime: '09:00',
                endTime: '09:30', // Only 30 mins capacity
                presentations: [
                  { id: presentation1.id, order: 0, durationMins: 30, presenters: ['smith@example.com'] },
                  { id: presentation2.id, order: 1, durationMins: 30, presenters: ['jones@example.com'] }, // Total = 60 mins
                ],
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/validate`)
        .set(authAs(organizer.id, 'organizer'))
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.conflicts.some((c: any) => c.type === 'SESSION_OVERFLOW')).toBe(true);
    });

    it('detects presenter double-booking conflict', async () => {
      // Schedule Dr. Smith in two overlapping sessions
      const payload = {
        conferenceId: conference.id,
        days: [
          {
            id: day1.id,
            date: '2025-06-15',
            sessions: [
              {
                id: session1.id,
                name: 'Morning Session',
                room: 'Room A',
                startTime: '09:00',
                endTime: '12:00',
                presentations: [
                  { id: presentation1.id, order: 0, durationMins: 60, presenters: ['smith@example.com'] },
                ],
              },
              {
                id: session2.id,
                name: 'Parallel Session',
                room: 'Room B',
                startTime: '09:00', // Overlaps with session1
                endTime: '12:00',
                presentations: [
                  { id: presentation3.id, order: 0, durationMins: 60, presenters: ['smith@example.com'] }, // Same presenter
                ],
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/validate`)
        .set(authAs(organizer.id, 'organizer'))
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.conflicts.some((c: any) => c.type === 'PRESENTER_CONFLICT')).toBe(true);
    });
  });

  describe('PUT /api/conferences/:id/schedule', () => {
    it('returns 403 for non-organizers', async () => {
      const res = await request(app)
        .put(`/api/conferences/${conference.id}/schedule`)
        .set(authAs(otherUser.id, 'user'))
        .send({ conferenceId: conference.id, days: [] });

      expect(res.status).toBe(403);
    });

    it('saves schedule and updates presentation status', async () => {
      const payload = {
        conferenceId: conference.id,
        days: [
          {
            id: day1.id,
            date: '2025-06-15',
            sessions: [
              {
                id: session1.id,
                name: 'Morning Session',
                room: 'Room A',
                startTime: '09:00',
                endTime: '12:00',
                presentations: [
                  { id: presentation1.id, order: 0, durationMins: 30, presenters: ['smith@example.com'] },
                  { id: presentation2.id, order: 1, durationMins: 30, presenters: ['jones@example.com'] },
                ],
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .put(`/api/conferences/${conference.id}/schedule`)
        .set(authAs(organizer.id, 'organizer'))
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(true);
      expect(res.body.lastSavedAt).toBeDefined();

      // Verify presentations are now scheduled
      const p1 = await prisma.presentation.findUnique({ where: { id: presentation1.id } });
      const p2 = await prisma.presentation.findUnique({ where: { id: presentation2.id } });
      expect(p1?.status).toBe('scheduled');
      expect(p2?.status).toBe('scheduled');
      expect(p1?.order).toBe(0);
      expect(p2?.order).toBe(1);
    });

    it('saves schedule even with warnings (SESSION_OVERFLOW)', async () => {
      const payload = {
        conferenceId: conference.id,
        days: [
          {
            id: day1.id,
            date: '2025-06-15',
            sessions: [
              {
                id: session1.id,
                name: 'Short Session',
                room: 'Room A',
                startTime: '09:00',
                endTime: '09:30', // Only 30 mins
                presentations: [
                  { id: presentation1.id, order: 0, durationMins: 30, presenters: [] },
                  { id: presentation2.id, order: 1, durationMins: 30, presenters: [] }, // Total = 60 mins
                ],
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .put(`/api/conferences/${conference.id}/schedule`)
        .set(authAs(organizer.id, 'organizer'))
        .send(payload);

      // Should still save (soft validation)
      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(true);
      expect(res.body.conflicts).toBeDefined();
      expect(res.body.conflicts.some((c: any) => c.type === 'SESSION_OVERFLOW')).toBe(true);
    });
  });

  describe('POST /api/conferences/:id/schedule/publish', () => {
    it('returns 403 for non-organizers', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/publish`)
        .set(authAs(otherUser.id, 'user'));

      expect(res.status).toBe(403);
    });

    it('publishes schedule when valid', async () => {
      // First, make sure presentations are scheduled properly
      await prisma.presentation.update({
        where: { id: presentation1.id },
        data: { status: 'scheduled', order: 0, duration: 30 },
      });
      await prisma.presentation.update({
        where: { id: presentation2.id },
        data: { status: 'scheduled', order: 1, duration: 30 },
      });

      // Reset session times to avoid conflicts
      await prisma.section.update({
        where: { id: session1.id },
        data: {
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T12:00:00Z'),
        },
      });

      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/publish`)
        .set(authAs(organizer.id, 'organizer'));

      expect(res.status).toBe(200);
      expect(res.body.published).toBe(true);
      expect(res.body.publishedAt).toBeDefined();

      // Verify conference has schedulePublishedAt set
      const conf = await prisma.conference.findUnique({ where: { id: conference.id } });
      expect(conf?.schedulePublishedAt).not.toBeNull();
    });
  });

  describe('POST /api/conferences/:id/schedule/unpublish', () => {
    it('returns 403 for non-organizers', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/unpublish`)
        .set(authAs(otherUser.id, 'user'));

      expect(res.status).toBe(403);
    });

    it('unpublishes a published schedule', async () => {
      // Ensure schedule is published first
      await prisma.conference.update({
        where: { id: conference.id },
        data: { schedulePublishedAt: new Date() },
      });

      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/unpublish`)
        .set(authAs(organizer.id, 'organizer'));

      expect(res.status).toBe(200);
      expect(res.body.unpublished).toBe(true);

      // Verify schedulePublishedAt is cleared
      const conf = await prisma.conference.findUnique({ where: { id: conference.id } });
      expect(conf?.schedulePublishedAt).toBeNull();
    });

    it('returns 400 if schedule is not published', async () => {
      // Ensure schedule is not published
      await prisma.conference.update({
        where: { id: conference.id },
        data: { schedulePublishedAt: null },
      });

      const res = await request(app)
        .post(`/api/conferences/${conference.id}/schedule/unpublish`)
        .set(authAs(organizer.id, 'organizer'));

      expect(res.status).toBe(400);
    });
  });
});
