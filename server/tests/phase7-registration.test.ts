import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase } from './helpers';

/**
 * Phase 7: Registration Module Tests
 * Tests for registration settings, custom questions, and participant management
 */

describe('Phase 7: Registration Module', () => {
  let testConferenceId: number;
  let testUserId: number;
  let testOtherUserId: number;
  let testQuestionId: number;
  let testParticipantId: number;

  beforeAll(async () => {
    await resetDatabase();

    // Create test users
    const organizer = await prisma.user.create({
      data: {
        cognitoId: 'phase7-organizer',
        name: 'Phase 7 Organizer',
        email: 'phase7@test.com',
        role: 'organizer',
      }
    });
    testUserId = organizer.id;

    const otherUser = await prisma.user.create({
      data: {
        cognitoId: 'phase7-other',
        name: 'Phase 7 Other User',
        email: 'phase7-other@test.com',
        role: 'user',
      }
    });
    testOtherUserId = otherUser.id;

    // Create test conference
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 30);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 32);
    const registrationOpenFrom = new Date(now);
    registrationOpenFrom.setDate(registrationOpenFrom.getDate() - 1);
    const registrationOpenUntil = new Date(now);
    registrationOpenUntil.setDate(registrationOpenUntil.getDate() + 60);

    const conference = await prisma.conference.create({
      data: {
        name: 'Phase 7 Test Conference',
        startDate,
        endDate,
        createdById: testUserId,
        registrationEnabled: true,
        registrationOpenFrom,
        registrationOpenUntil,
      }
    });
    testConferenceId = conference.id;
  });

  afterAll(async () => {
    // Clean up test data in proper order
    await prisma.conferenceParticipant.deleteMany({
      where: { user: { email: { in: ['phase7@test.com', 'phase7-other@test.com', 'phase7-attendee@test.com'] } } }
    });
    await prisma.registrationQuestion.deleteMany({
      where: { conference: { createdBy: { email: 'phase7@test.com' } } }
    });
    await prisma.conference.deleteMany({
      where: { createdBy: { email: 'phase7@test.com' } }
    });
    await prisma.user.deleteMany({ where: { email: { in: ['phase7@test.com', 'phase7-other@test.com', 'phase7-attendee@test.com'] } } });
    await prisma.$disconnect();
  });

  // ===================== REGISTRATION SETTINGS TESTS =====================

  describe('Registration Settings', () => {
    it('should get registration settings', async () => {
      const res = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/settings`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(res.body.registrationEnabled).toBe(true);
      expect(res.body.registrationOpenFrom).toBeDefined();
    });

    it('should update registration settings', async () => {
      const res = await request(app)
        .put(`/api/conferences/${testConferenceId}/registration/settings`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          maxAttendees: 100,
          waitlistEnabled: true,
          requireApproval: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.maxAttendees).toBe(100);
      expect(res.body.waitlistEnabled).toBe(true);
    });

    it('should reject settings update from non-organizer', async () => {
      const res = await request(app)
        .put(`/api/conferences/${testConferenceId}/registration/settings`)
        .set('x-user-id', String(testOtherUserId))
        .set('x-user-role', 'user')
        .send({ maxAttendees: 200 });

      expect(res.status).toBe(403);
    });
  });

  // ===================== CUSTOM QUESTIONS TESTS =====================

  describe('Custom Questions', () => {
    it('should create a custom question', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          label: 'Dietary Requirements',
          description: 'Please specify any dietary restrictions',
          type: 'select',
          required: true,
          options: ['None', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free'],
          category: 'dietary',
        });

      expect(res.status).toBe(201);
      expect(res.body.label).toBe('Dietary Requirements');
      expect(res.body.type).toBe('select');
      expect(res.body.order).toBe(0);
      testQuestionId = res.body.id;
    });

    it('should create multiple questions with auto-incrementing order', async () => {
      const res1 = await request(app)
        .post(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          label: 'Accessibility Needs',
          type: 'textarea',
          category: 'accessibility',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.order).toBe(1);

      const res2 = await request(app)
        .post(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          label: 'T-Shirt Size',
          type: 'select',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          category: 'other',
        });

      expect(res2.status).toBe(201);
      expect(res2.body.order).toBe(2);
    });

    it('should list all questions ordered', async () => {
      const res = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0].order).toBe(0);
      expect(res.body[1].order).toBe(1);
      expect(res.body[2].order).toBe(2);
    });

    it('should list active questions for registration form', async () => {
      const res = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/questions/active`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((q: any) => q.enabled !== false)).toBe(true);
    });

    it('should update a question', async () => {
      const res = await request(app)
        .put(`/api/conferences/${testConferenceId}/registration/questions/${testQuestionId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          label: 'Dietary Restrictions',
          required: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.label).toBe('Dietary Restrictions');
      expect(res.body.required).toBe(false);
    });

    it('should reorder questions', async () => {
      // Get current questions
      const listRes = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      const ids = listRes.body.map((q: any) => q.id);
      const reversedIds = [...ids].reverse();

      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/registration/questions/reorder`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({ questionIds: reversedIds });

      expect(res.status).toBe(200);
      expect(res.body[0].id).toBe(reversedIds[0]);
      expect(res.body[0].order).toBe(0);
    });

    it('should delete a question', async () => {
      // Create a question to delete
      const createRes = await request(app)
        .post(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({ label: 'To Be Deleted', type: 'text' });

      const deleteRes = await request(app)
        .delete(`/api/conferences/${testConferenceId}/registration/questions/${createRes.body.id}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Question deleted');
    });

    it('should reject question creation with missing label', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({ type: 'text' });

      expect(res.status).toBe(400);
    });
  });

  // ===================== ENHANCED REGISTRATION TESTS =====================

  describe('Enhanced Registration', () => {
    let attendeeUserId: number;

    beforeAll(async () => {
      // Create attendee user
      const attendee = await prisma.user.create({
        data: {
          cognitoId: 'phase7-attendee',
          name: 'Phase 7 Attendee',
          email: 'phase7-attendee@test.com',
          role: 'user',
        }
      });
      attendeeUserId = attendee.id;
    });

    it('should register with custom responses', async () => {
      // Get questions for response
      const questionsRes = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/questions/active`);

      const customResponses: Record<number, any> = {};
      questionsRes.body.forEach((q: any) => {
        if (q.type === 'select' && q.options) {
          customResponses[q.id] = q.options[0];
        } else {
          customResponses[q.id] = 'Test response';
        }
      });

      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/register/enhanced`)
        .set('x-user-id', String(attendeeUserId))
        .set('x-user-role', 'user')
        .send({ customResponses });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('attendee');
      expect(res.body.status).toBe('registered');
      expect(res.body.customResponses).toBeDefined();
      testParticipantId = res.body.id;
    });

    it('should reject duplicate registration', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/register/enhanced`)
        .set('x-user-id', String(attendeeUserId))
        .set('x-user-role', 'user')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Already registered');
    });

    it('should reject registration when disabled', async () => {
      // Disable registration
      await prisma.conference.update({
        where: { id: testConferenceId },
        data: { registrationEnabled: false }
      });

      const newUserId = testOtherUserId;

      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/register/enhanced`)
        .set('x-user-id', String(newUserId))
        .set('x-user-role', 'user')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Registration is disabled for this conference');

      // Re-enable registration
      await prisma.conference.update({
        where: { id: testConferenceId },
        data: { registrationEnabled: true }
      });
    });
  });

  // ===================== PARTICIPANT MANAGEMENT TESTS =====================

  describe('Participant Management', () => {
    it('should update participant status', async () => {
      const res = await request(app)
        .put(`/api/conferences/${testConferenceId}/participants/${testParticipantId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({ role: 'presenter' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('presenter');
    });

    it('should approve waitlisted participant', async () => {
      // Set participant to waitlisted
      await prisma.conferenceParticipant.update({
        where: { id: testParticipantId },
        data: { status: 'waitlisted' }
      });

      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/participants/${testParticipantId}/approve`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('registered');
    });

    it('should reject approval of non-waitlisted participant', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/participants/${testParticipantId}/approve`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Participant is not on waitlist');
    });
  });

  // ===================== OVERVIEW & EXPORT TESTS =====================

  describe('Overview & Export', () => {
    it('should get registration overview', async () => {
      const res = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/overview`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(res.body.conference).toBeDefined();
      expect(res.body.counts).toBeDefined();
      expect(res.body.counts.byRole).toBeDefined();
      expect(res.body.recentRegistrations).toBeDefined();
      expect(Array.isArray(res.body.recentRegistrations)).toBe(true);
    });

    it('should export participants to CSV', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/participants/export`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Name');
      expect(res.text).toContain('Email');
    });
  });

  // ===================== CAPACITY & WAITLIST TESTS =====================

  describe('Capacity & Waitlist', () => {
    let capacityConferenceId: number;

    beforeAll(async () => {
      // Create conference with capacity limit
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 40);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 42);
      const registrationOpenFrom = new Date(now);
      registrationOpenFrom.setDate(registrationOpenFrom.getDate() - 1);
      const registrationOpenUntil = new Date(now);
      registrationOpenUntil.setDate(registrationOpenUntil.getDate() + 60);

      const conf = await prisma.conference.create({
        data: {
          name: 'Capacity Test Conference',
          startDate,
          endDate,
          createdById: testUserId,
          registrationEnabled: true,
          maxAttendees: 1,
          waitlistEnabled: true,
          registrationOpenFrom,
          registrationOpenUntil,
        }
      });
      capacityConferenceId = conf.id;
    });

    afterAll(async () => {
      await prisma.conferenceParticipant.deleteMany({ where: { conferenceId: capacityConferenceId } });
      await prisma.conference.delete({ where: { id: capacityConferenceId } });
    });

    it('should put registrant on waitlist when capacity reached', async () => {
      // First registration fills capacity
      const res1 = await request(app)
        .post(`/api/conferences/${capacityConferenceId}/register/enhanced`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({});

      expect(res1.status).toBe(201);
      expect(res1.body.status).toBe('registered');

      // Second registration goes to waitlist
      const res2 = await request(app)
        .post(`/api/conferences/${capacityConferenceId}/register/enhanced`)
        .set('x-user-id', String(testOtherUserId))
        .set('x-user-role', 'user')
        .send({});

      expect(res2.status).toBe(201);
      expect(res2.body.status).toBe('waitlisted');
      expect(res2.body.waitlisted).toBe(true);
    });
  });

  // ===================== AUTHORIZATION TESTS =====================

  describe('Authorization', () => {
    it('should reject settings access from non-owner', async () => {
      const res = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/settings`)
        .set('x-user-id', String(testOtherUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(403);
    });

    it('should reject question creation from non-owner', async () => {
      const res = await request(app)
        .post(`/api/conferences/${testConferenceId}/registration/questions`)
        .set('x-user-id', String(testOtherUserId))
        .set('x-user-role', 'organizer')
        .send({ label: 'Test', type: 'text' });

      expect(res.status).toBe(403);
    });

    it('should reject overview access from non-owner', async () => {
      const res = await request(app)
        .get(`/api/conferences/${testConferenceId}/registration/overview`)
        .set('x-user-id', String(testOtherUserId))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(403);
    });
  });
});
