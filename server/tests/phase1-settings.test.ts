/**
 * Integration tests for Phase 1 Settings Core backend endpoints
 * Tests conference update (PUT /conferences/:id) with various field combinations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase } from './helpers';

describe('Phase 1 Settings Core - Backend Integration', () => {
  let testConferenceId: number;
  let testUserId: number;
  let otherUserId: number;
  let adminUserId: number;
  const runId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  beforeAll(async () => {
    await resetDatabase();

    // Create test users
    const testUser = await prisma.user.create({
      data: {
        cognitoId: `test-cognito-organizer-${runId}`,
        email: `organizer+${runId}@test.com`,
        name: 'Test Organizer',
        role: 'organizer',
      },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.create({
      data: {
        cognitoId: `test-cognito-other-${runId}`,
        email: `other+${runId}@test.com`,
        name: 'Other User',
        role: 'organizer',
      },
    });
    otherUserId = otherUser.id;

    const adminUser = await prisma.user.create({
      data: {
        cognitoId: `test-cognito-admin-${runId}`,
        email: `admin+${runId}@test.com`,
        name: 'Admin User',
        role: 'admin',
      },
    });
    adminUserId = adminUser.id;

    // Create test conference
    const conference = await prisma.conference.create({
      data: {
        name: 'Test Conference for Settings',
        description: 'A test conference',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        timezone: 'UTC',
        createdById: testUserId,
        status: 'draft',
      },
    });
    testConferenceId = conference.id;
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  describe('PUT /conferences/:id - Conference Basics', () => {
    it('should update conference name and description', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          name: 'Updated Conference Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Conference Name');
      expect(response.body.description).toBe('Updated description');
    });

    it('should update dates and timezone', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          startDate: '2026-07-01',
          endDate: '2026-07-05',
          timezone: 'America/New_York',
        });

      expect(response.status).toBe(200);
      expect(new Date(response.body.startDate).toISOString()).toContain('2026-07-01');
      expect(response.body.timezone).toBe('America/New_York');
    });

    it('should handle capacity and venue updates', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          venue: 'Convention Center',
          capacity: 500,
          location: 'New York, USA',
        });

      expect(response.status).toBe(200);
      expect(response.body.venue).toBe('Convention Center');
      expect(response.body.capacity).toBe(500);
      expect(response.body.location).toBe('New York, USA');
    });
  });

  describe('PUT /conferences/:id - Organizer Info', () => {
    it('should update organizer contact information', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          organizerName: 'Tech Conference Inc',
          organizerEmail: 'info@techconf.com',
          organizerPhone: '+1234567890',
          organizerWebsite: 'https://techconf.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.organizerName).toBe('Tech Conference Inc');
      expect(response.body.organizerEmail).toBe('info@techconf.com');
      expect(response.body.organizerWebsite).toBe('https://techconf.com');
    });

    it('should handle empty strings as null for optional fields', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          organizerPhone: '',
          organizerWebsite: '',
        });

      expect(response.status).toBe(200);
      expect(response.body.organizerPhone).toBeNull();
      expect(response.body.organizerWebsite).toBeNull();
    });
  });

  describe('PUT /conferences/:id - Deadlines (Windows)', () => {
    it('should update CFP window dates', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          submissionsOpenFrom: '2026-02-01T00:00:00Z',
          submissionsOpenUntil: '2026-03-01T00:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.submissionsOpenFrom).toBeTruthy();
      expect(response.body.submissionsOpenUntil).toBeTruthy();
    });

    it('should update registration window dates', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          registrationOpenFrom: '2026-02-01T00:00:00Z',
          registrationOpenUntil: '2026-05-31T00:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.registrationOpenFrom).toBeTruthy();
      expect(response.body.registrationOpenUntil).toBeTruthy();
    });

    it('should update review window dates', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          reviewStartsAt: '2026-03-02T00:00:00Z',
          reviewEndsAt: '2026-04-01T00:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.reviewStartsAt).toBeTruthy();
      expect(response.body.reviewEndsAt).toBeTruthy();
    });

    it('should clear window dates when set to null', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          submissionsOpenFrom: null,
          submissionsOpenUntil: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.submissionsOpenFrom).toBeNull();
      expect(response.body.submissionsOpenUntil).toBeNull();
    });
  });

  describe('PATCH /api/conferences/:id/windows/* - Quick Actions', () => {
    it('should open CFP window', async () => {
      const response = await request(app)
        .patch(`/api/conferences/${testConferenceId}/windows/cfp/open`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(response.status).toBe(200);
      expect(response.body.submissionsOpenFrom).toBeTruthy();
      expect(response.body.submissionsOpenUntil).toBeTruthy();
    });

    it('should close CFP window', async () => {
      const response = await request(app)
        .patch(`/api/conferences/${testConferenceId}/windows/cfp/close`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(response.status).toBe(200);
      expect(response.body.submissionsOpenFrom).toBeNull();
      expect(response.body.submissionsOpenUntil).toBeNull();
    });

    it('should open registration window', async () => {
      const response = await request(app)
        .patch(`/api/conferences/${testConferenceId}/windows/registration/open`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(response.status).toBe(200);
      expect(response.body.registrationOpenFrom).toBeTruthy();
      expect(response.body.registrationOpenUntil).toBeTruthy();
    });

    it('should close registration window', async () => {
      const response = await request(app)
        .patch(`/api/conferences/${testConferenceId}/windows/registration/close`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(response.status).toBe(200);
      expect(response.body.registrationOpenFrom).toBeNull();
      expect(response.body.registrationOpenUntil).toBeNull();
    });
  });

  describe('PATCH /api/conferences/:id/schedule/* - Publish Actions', () => {
    it('should publish schedule', async () => {
      const response = await request(app)
        .patch(`/api/conferences/${testConferenceId}/schedule/publish`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(response.status).toBe(200);
      expect(response.body.schedulePublishedAt).toBeTruthy();
    });

    it('should unpublish schedule', async () => {
      const response = await request(app)
        .patch(`/api/conferences/${testConferenceId}/schedule/unpublish`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer');

      expect(response.status).toBe(200);
      expect(response.body.schedulePublishedAt).toBeNull();
    });
  });

  describe('Authorization - PUT /conferences/:id', () => {
    it('should reject update from non-owner (403)', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(otherUserId))
        .set('x-user-role', 'organizer')
        .send({
          name: 'Unauthorized Update',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should allow admin to update any conference', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(adminUserId))
        .set('x-user-role', 'admin')
        .send({
          name: 'Admin Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Admin Updated Name');
    });

    it('should reject unauthenticated requests (401)', async () => {
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .send({
          name: 'Unauthorized',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent conference', async () => {
      const response = await request(app)
        .put('/conferences/999999')
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          name: 'Does not exist',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('should handle partial updates without breaking existing fields', async () => {
      // First, set all fields
      await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          name: 'Full Conference',
          description: 'Full description',
          venue: 'Test Venue',
          capacity: 100,
        });

      // Then update only name
      const response = await request(app)
        .put(`/conferences/${testConferenceId}`)
        .set('x-user-id', String(testUserId))
        .set('x-user-role', 'organizer')
        .send({
          name: 'Partial Update',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Partial Update');
      expect(response.body.description).toBe('Full description'); // Should remain
      expect(response.body.venue).toBe('Test Venue'); // Should remain
      expect(response.body.capacity).toBe(100); // Should remain
    });
  });
});
