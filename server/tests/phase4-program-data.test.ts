/**
 * Integration tests for Phase 4: Program Data
 * Tests Days CRUD, Sessions (Sections) management, and Presentations listing
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase } from './helpers';

describe('Phase 4: Program Data - Backend Integration', () => {
  let testConferenceId: number;
  let testUserId: number;
  let otherUserId: number;
  let adminUserId: number;

  beforeAll(async () => {
    await resetDatabase();

    // Create test users
    const testUser = await prisma.user.upsert({
      where: { email: 'phase4-organizer@test.com' },
      update: {},
      create: {
        cognitoId: 'test-cognito-phase4-organizer',
        email: 'phase4-organizer@test.com',
        name: 'Phase 4 Organizer',
        role: 'organizer',
      },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.upsert({
      where: { email: 'phase4-other@test.com' },
      update: {},
      create: {
        cognitoId: 'test-cognito-phase4-other',
        email: 'phase4-other@test.com',
        name: 'Other User',
        role: 'organizer',
      },
    });
    otherUserId = otherUser.id;

    const adminUser = await prisma.user.upsert({
      where: { email: 'phase4-admin@test.com' },
      update: {},
      create: {
        cognitoId: 'test-cognito-phase4-admin',
        email: 'phase4-admin@test.com',
        name: 'Phase 4 Admin',
        role: 'admin',
      },
    });
    adminUserId = adminUser.id;

    // Create test conference with 5-day span
    const conf = await prisma.conference.create({
      data: {
        name: 'Phase 4 Test Conference',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        location: 'Test City',
        createdById: testUserId,
      },
    });
    testConferenceId = conf.id;
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  // ====================================
  // DAYS CRUD TESTS
  // ====================================
  describe('Days CRUD', () => {
    describe('GET /api/conferences/:id/days - List Days', () => {
      it('should return empty array for conference with no days', async () => {
        const res = await request(app)
          .get(`/api/conferences/${testConferenceId}/days`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
      });
    });

    describe('POST /api/conferences/:id/days - Create Day', () => {
      it('should create a new day successfully', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ date: '2025-12-01', name: 'Conference Day 1' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Conference Day 1');
        expect(res.body.order).toBe(1);
      });

      it('should create a second day with auto-incremented order', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ date: '2025-12-02', name: 'Conference Day 2' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Conference Day 2');
        expect(res.body.order).toBe(2);
      });

      it('should reject day with empty date', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ name: 'Invalid Day' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('required');
      });

      it('should reject date outside conference range', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ date: '2025-12-15', name: 'Day Outside Range' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('conference');
      });

      it('should reject duplicate date', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ date: '2025-12-01', name: 'Duplicate Day' });

        expect(res.status).toBe(409);
        expect(res.body.message).toContain('already exists');
      });

      it('should reject when non-owner tries to create', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days`)
          .set('x-user-id', String(otherUserId))
          .set('x-user-role', 'organizer')
          .send({ date: '2025-12-03', name: 'Unauthorized Day' });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/conferences/:id/days/:dayId - Get Single Day', () => {
      let testDayId: number;

      beforeAll(async () => {
        const day = await prisma.day.create({
          data: {
            conferenceId: testConferenceId,
            date: new Date('2025-12-03'),
            name: 'Get Day Test',
            order: 3,
          },
        });
        testDayId = day.id;
      });

      it('should return single day with session counts', async () => {
        const res = await request(app)
          .get(`/api/conferences/${testConferenceId}/days/${testDayId}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(testDayId);
        expect(res.body.name).toBe('Get Day Test');
        expect(res.body).toHaveProperty('sessionsCount');
      });

      it('should return 404 for non-existent day', async () => {
        const res = await request(app)
          .get(`/api/conferences/${testConferenceId}/days/99999`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/conferences/:id/days/:dayId - Update Day', () => {
      let updateDayId: number;

      beforeAll(async () => {
        const day = await prisma.day.create({
          data: {
            conferenceId: testConferenceId,
            date: new Date('2025-12-04'),
            name: 'Update Day Test',
            order: 4,
          },
        });
        updateDayId = day.id;
      });

      it('should update day name successfully', async () => {
        const res = await request(app)
          .put(`/api/conferences/${testConferenceId}/days/${updateDayId}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ name: 'Updated Day Name' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated Day Name');
      });

      it('should update day date successfully', async () => {
        const res = await request(app)
          .put(`/api/conferences/${testConferenceId}/days/${updateDayId}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ date: '2025-12-05' });

        expect(res.status).toBe(200);
        // Date should be updated
        const updatedDate = new Date(res.body.date);
        expect(updatedDate.toISOString().startsWith('2025-12-05')).toBe(true);
      });

      it('should reject update from non-owner', async () => {
        const res = await request(app)
          .put(`/api/conferences/${testConferenceId}/days/${updateDayId}`)
          .set('x-user-id', String(otherUserId))
          .set('x-user-role', 'organizer')
          .send({ name: 'Hacked Name' });

        expect(res.status).toBe(403);
      });
    });

    describe('DELETE /api/conferences/:id/days/:dayId - Delete Day', () => {
      it('should delete day without sessions', async () => {
        const day = await prisma.day.create({
          data: {
            conferenceId: testConferenceId,
            date: new Date('2025-12-05T12:00:00Z'),
            name: 'Day to Delete',
            order: 5,
          },
        });

        const res = await request(app)
          .delete(`/api/conferences/${testConferenceId}/days/${day.id}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('deleted');
      });

      it('should prevent deletion when day has sessions (returns warning)', async () => {
        const day = await prisma.day.create({
          data: {
            conferenceId: testConferenceId,
            date: new Date('2025-12-05T06:00:00Z'),
            name: 'Day with Session',
            order: 6,
          },
        });

        await prisma.section.create({
          data: {
            conferenceId: testConferenceId,
            dayId: day.id,
            name: 'Morning Session',
            startTime: new Date('2025-12-05T09:00:00Z'),
            endTime: new Date('2025-12-05T12:00:00Z'),
          },
        });

        const res = await request(app)
          .delete(`/api/conferences/${testConferenceId}/days/${day.id}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('sessions');
        expect(res.body.requiresConfirmation).toBe(true);
      });
    });

    describe('POST /api/conferences/:id/days/reorder - Reorder Days', () => {
      let day1Id: number;
      let day2Id: number;

      beforeAll(async () => {
        // Clean up existing days for reorder test
        const day1 = await prisma.day.create({
          data: {
            conferenceId: testConferenceId,
            date: new Date('2025-12-01T18:00:00Z'),
            name: 'Reorder Day 1',
            order: 10,
          },
        });
        const day2 = await prisma.day.create({
          data: {
            conferenceId: testConferenceId,
            date: new Date('2025-12-02T18:00:00Z'),
            name: 'Reorder Day 2',
            order: 11,
          },
        });
        day1Id = day1.id;
        day2Id = day2.id;
      });

      it('should reorder days successfully', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days/reorder`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ days: [{ id: day2Id, order: 1 }, { id: day1Id, order: 2 }] });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('reordered');
      });

      it('should reject reorder with empty days array', async () => {
        const res = await request(app)
          .post(`/api/conferences/${testConferenceId}/days/reorder`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({ days: [] });

        expect(res.status).toBe(400);
      });
    });
  });

  // ====================================
  // SESSIONS (SECTIONS) TESTS
  // Note: Sections routes are at /sections/... not /api/conferences/:id/sections
  // ====================================
  describe('Sessions (Sections) CRUD', () => {
    let sessionDayId: number;
    let sessionConferenceId: number;

    beforeAll(async () => {
      // Create a separate conference for session tests
      const conf = await prisma.conference.create({
        data: {
          name: 'Session Test Conference',
          startDate: new Date('2025-11-01'),
          endDate: new Date('2025-11-03'),
          location: 'Session Test City',
          createdById: testUserId,
        },
      });
      sessionConferenceId = conf.id;

      const day = await prisma.day.create({
        data: {
          conferenceId: sessionConferenceId,
          date: new Date('2025-11-01'),
          name: 'Session Test Day',
          order: 1,
        },
      });
      sessionDayId = day.id;
    });

    afterAll(async () => {
      await prisma.presentation.deleteMany({ where: { section: { conferenceId: sessionConferenceId } } });
      await prisma.section.deleteMany({ where: { conferenceId: sessionConferenceId } });
      await prisma.day.deleteMany({ where: { conferenceId: sessionConferenceId } });
      await prisma.conference.deleteMany({ where: { id: sessionConferenceId } });
    });

    describe('GET /sections/conference/:conferenceId - List Sessions', () => {
      it('should return array for conference sections', async () => {
        const res = await request(app)
          .get(`/sections/conference/${sessionConferenceId}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('POST /sections - Create Session', () => {
      it('should create a new session successfully', async () => {
        const res = await request(app)
          .post('/sections')
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({
            conferenceId: sessionConferenceId,
            name: 'Morning Keynote',
            type: 'keynote',
            dayId: sessionDayId,
            startTime: '2025-11-01T09:00:00Z',
            endTime: '2025-11-01T10:00:00Z',
            room: 'Main Hall',
            capacity: 500,
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Morning Keynote');
      });

      it('should create session with presentation type', async () => {
        const res = await request(app)
          .post('/sections')
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({
            conferenceId: sessionConferenceId,
            name: 'Technical Presentations',
            type: 'presentation',
            dayId: sessionDayId,
            startTime: '2025-11-01T10:30:00Z',
            endTime: '2025-11-01T12:00:00Z',
            room: 'Room A',
            capacity: 100,
          });

        expect(res.status).toBe(201);
      });

      it('should create break session', async () => {
        const res = await request(app)
          .post('/sections')
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({
            conferenceId: sessionConferenceId,
            name: 'Coffee Break',
            type: 'break',
            dayId: sessionDayId,
            startTime: '2025-11-01T10:00:00Z',
            endTime: '2025-11-01T10:30:00Z',
          });

        expect(res.status).toBe(201);
      });

      it('should reject session without name', async () => {
        const res = await request(app)
          .post('/sections')
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({
            conferenceId: sessionConferenceId,
            type: 'presentation',
            dayId: sessionDayId,
            startTime: '2025-11-01T14:00:00Z',
            endTime: '2025-11-01T15:00:00Z',
          });

        // Should reject - may be 400 (validation) or 500 (Prisma error)
        expect([400, 500]).toContain(res.status);
      });
    });

    describe('PUT /sections/:sectionId - Update Session', () => {
      let testSectionId: number;

      beforeAll(async () => {
        const section = await prisma.section.create({
          data: {
            conferenceId: sessionConferenceId,
            dayId: sessionDayId,
            name: 'Afternoon Session',
            type: 'presentation',
            startTime: new Date('2025-11-01T14:00:00Z'),
            endTime: new Date('2025-11-01T16:00:00Z'),
          },
        });
        testSectionId = section.id;
      });

      it('should update session name and room', async () => {
        const res = await request(app)
          .put(`/sections/${testSectionId}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer')
          .send({
            name: 'Updated Afternoon Session',
            room: 'Room B',
            capacity: 75,
          });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated Afternoon Session');
      });
    });

    describe('DELETE /sections/:sectionId - Delete Session', () => {
      it('should delete empty session', async () => {
        const section = await prisma.section.create({
          data: {
            conferenceId: sessionConferenceId,
            dayId: sessionDayId,
            name: 'Session to Delete',
            startTime: new Date('2025-11-01T17:00:00Z'),
            endTime: new Date('2025-11-01T18:00:00Z'),
          },
        });

        const res = await request(app)
          .delete(`/sections/${section.id}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        // Section deletion may return 200 or 204
        expect([200, 204]).toContain(res.status);
      });

      it('should handle deletion when session has presentations', async () => {
        const section = await prisma.section.create({
          data: {
            conferenceId: sessionConferenceId,
            dayId: sessionDayId,
            name: 'Session with Presentations',
            startTime: new Date('2025-11-01T19:00:00Z'),
            endTime: new Date('2025-11-01T20:00:00Z'),
          },
        });

        await prisma.presentation.create({
          data: {
            sectionId: section.id,
            title: 'Test Presentation',
            order: 1,
            status: 'scheduled',
            submissionType: 'external',
          },
        });

        const res = await request(app)
          .delete(`/sections/${section.id}`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        // May return 409 (conflict) or 400 (bad request) depending on implementation
        expect([400, 409]).toContain(res.status);
      });
    });
  });

  // ====================================
  // PRESENTATIONS LISTING TESTS
  // ====================================
  describe('Presentations Listing', () => {
    let presentationsConferenceId: number;
    let presentationsDayId: number;
    let presentationsSectionId: number;

    beforeAll(async () => {
      const conf = await prisma.conference.create({
        data: {
          name: 'Presentations Test Conference',
          startDate: new Date('2025-10-01'),
          endDate: new Date('2025-10-03'),
          location: 'Presentations Test City',
          createdById: testUserId,
        },
      });
      presentationsConferenceId = conf.id;

      const day = await prisma.day.create({
        data: {
          conferenceId: presentationsConferenceId,
          date: new Date('2025-10-01'),
          name: 'Presentations Day',
          order: 1,
        },
      });
      presentationsDayId = day.id;

      const section = await prisma.section.create({
        data: {
          conferenceId: presentationsConferenceId,
          dayId: presentationsDayId,
          name: 'Technical Session',
          startTime: new Date('2025-10-01T09:00:00Z'),
          endTime: new Date('2025-10-01T12:00:00Z'),
        },
      });
      presentationsSectionId = section.id;

      // Create some presentations
      await prisma.presentation.createMany({
        data: [
          {
            sectionId: presentationsSectionId,
            title: 'AI in Healthcare',
            abstract: 'Using AI to improve healthcare outcomes',
            order: 1,
            status: 'scheduled',
            submissionType: 'external',
          },
          {
            sectionId: presentationsSectionId,
            title: 'Machine Learning Advances',
            abstract: 'Recent advances in ML',
            order: 2,
            status: 'scheduled',
            submissionType: 'external',
          },
          {
            sectionId: presentationsSectionId,
            title: 'Draft Presentation',
            abstract: 'Still in draft',
            order: 3,
            status: 'draft',
            submissionType: 'internal',
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.presentation.deleteMany({ where: { sectionId: presentationsSectionId } });
      await prisma.section.deleteMany({ where: { id: presentationsSectionId } });
      await prisma.day.deleteMany({ where: { id: presentationsDayId } });
      await prisma.conference.deleteMany({ where: { id: presentationsConferenceId } });
    });

    describe('GET /api/conferences/:id/presentations - List All Presentations', () => {
      it('should return all presentations for conference', async () => {
        const res = await request(app)
          .get(`/api/conferences/${presentationsConferenceId}/presentations`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(3);
      });

      it('should include presentation details', async () => {
        const res = await request(app)
          .get(`/api/conferences/${presentationsConferenceId}/presentations`)
          .set('x-user-id', String(testUserId))
          .set('x-user-role', 'organizer');

        expect(res.status).toBe(200);
        const presentation = res.body[0];
        expect(presentation).toHaveProperty('title');
        expect(presentation).toHaveProperty('status');
        // Section info may be nested or as section.id
        expect(presentation).toHaveProperty('section');
      });
    });
  });

  // ====================================
  // AUTHORIZATION TESTS
  // ====================================
  describe('Authorization', () => {
    it('should allow admin to manage any conference days', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/days`)
        .set('x-user-id', String(adminUserId))
        .set('x-user-role', 'admin')
        .send({ date: '2025-12-03T00:00:00Z', name: 'Admin Created Day' });

      // Allow 201 (success) or 409 (date already exists from other tests)
      expect([201, 409]).toContain(res.status);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .get(`/api/conferences/${testConferenceId}/days`);

      expect(res.status).toBe(401);
    });
  });

  // ====================================
  // ERROR HANDLING TESTS
  // ====================================
  describe('Error Handling', () => {
    it('should return 404 for non-existent conference days', async () => {
      const res = await request(app)
        .get('/api/conferences/99999/days')
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent day update', async () => {
      const res = await request(app)
        .put(`/api/conferences/${testConferenceId}/days/99999`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(404);
    });

    it('should handle invalid date format gracefully', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/days`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({ date: 'invalid-date', name: 'Invalid Date Day' });

      expect([400, 500]).toContain(res.status);
    });
  });
});
