import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src';
import prisma from '../src/lib/prisma';
import type { Conference, User } from '@prisma/client';
import { createUser, createConference, resetDatabase } from './helpers';

describe('Phase 6 - Website Module', () => {
  let organizer: User;
  let otherUser: User;
  let conference: Conference;
  let material1Id: number;
  let material2Id: number;

  function expectNumberId(value: unknown): number {
    expect(typeof value).toBe('number');
    if (typeof value !== 'number') {
      throw new Error('Expected id to be a number');
    }
    return value;
  }

  beforeAll(async () => {
    await resetDatabase();

    // Create users
    organizer = await createUser('organizer');
    otherUser = await createUser('user');

    // Create conference
    conference = await createConference(organizer.id);
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  // ============================================================================
  // MATERIALS TESTS
  // ============================================================================
  describe('Materials CRUD', () => {
    it('should create a material', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/materials`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          title: 'Conference Brochure',
          description: 'Official conference brochure PDF',
          fileUrl: 'https://example.com/brochure.pdf',
          fileType: 'pdf',
          isPublic: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Conference Brochure');
      expect(res.body.fileType).toBe('pdf');
      expect(res.body.isPublic).toBe(true);
      material1Id = expectNumberId((res.body as unknown as { id?: unknown }).id);
    });

    it('should create another material with private visibility', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/materials`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          title: 'Speaker Guidelines',
          description: 'Guidelines for speakers only',
          fileUrl: 'https://example.com/guidelines.docx',
          fileType: 'docx',
          isPublic: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.isPublic).toBe(false);
      material2Id = expectNumberId((res.body as unknown as { id?: unknown }).id);
    });

    it('should reject invalid file type', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/materials`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          title: 'Bad File',
          fileUrl: 'https://example.com/file.exe',
          fileType: 'exe',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not allowed');
    });

    it('should require title', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/materials`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          fileUrl: 'https://example.com/file.pdf',
          fileType: 'pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('title is required');
    });

    it('should list all materials for organizer', async () => {
      const res = await request(app)
        .get(`/api/conferences/${conference.id}/materials`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should list only public materials for unauthenticated users', async () => {
      const res = await request(app)
        .get(`/api/conferences/${conference.id}/materials`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].isPublic).toBe(true);
    });

    it('should update material', async () => {
      const res = await request(app)
        .put(`/api/conferences/${conference.id}/materials/${material1Id}`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          title: 'Updated Brochure Title',
          isPublic: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Brochure Title');
      expect(res.body.isPublic).toBe(false);
    });

    it('should not allow other users to create materials', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/materials`)
        .set('x-user-id', String(otherUser.id))
        .set('x-user-role', 'user')
        .send({
          title: 'Unauthorized Material',
          fileUrl: 'https://example.com/unauthorized.pdf',
          fileType: 'pdf',
        });

      expect(res.status).toBe(403);
    });

    it('should delete material', async () => {
      const res = await request(app)
        .delete(`/api/conferences/${conference.id}/materials/${material2Id}`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });
  });

  // ============================================================================
  // VISIBILITY TESTS
  // ============================================================================
  describe('Visibility Settings', () => {
    it('should get visibility settings', async () => {
      const res = await request(app)
        .get(`/api/conferences/${conference.id}/visibility`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer');

      expect(res.status).toBe(200);
      expect(res.body.conferenceId).toBe(conference.id);
      expect(typeof res.body.isPublic).toBe('boolean');
      expect(typeof res.body.schedulePublished).toBe('boolean');
    });

    it('should update visibility settings', async () => {
      const res = await request(app)
        .put(`/api/conferences/${conference.id}/visibility`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          isPublic: true,
          abstractsVisibility: 'public',
        });

      expect(res.status).toBe(200);
      expect(res.body.isPublic).toBe(true);
      expect(res.body.abstractsVisibility).toBe('public');
    });

    it('should reject invalid abstracts visibility value', async () => {
      const res = await request(app)
        .put(`/api/conferences/${conference.id}/visibility`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          abstractsVisibility: 'invalid_value',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid abstracts visibility');
    });

    it('should not allow other users to get visibility settings', async () => {
      const res = await request(app)
        .get(`/api/conferences/${conference.id}/visibility`)
        .set('x-user-id', String(otherUser.id))
        .set('x-user-role', 'user');

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // PUBLIC PAGE TESTS
  // ============================================================================
  describe('Public Page Content', () => {
    it('should get public page content', async () => {
      const res = await request(app)
        .get(`/api/conferences/${conference.id}/public-page`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(conference.id);
      expect(res.body.name).toBeDefined();
    });

    it('should update public page content', async () => {
      const res = await request(app)
        .put(`/api/conferences/${conference.id}/public-page`)
        .set('x-user-id', String(organizer.id))
        .set('x-user-role', 'organizer')
        .send({
          description: 'This is the updated conference description with **markdown** support.',
          location: 'San Francisco, CA',
          venue: 'Moscone Center',
          venueAddress: '747 Howard St, San Francisco, CA 94103',
          bannerImageUrl: 'https://example.com/banner.jpg',
          websiteUrl: 'https://conference.example.com',
          organizerName: 'Conference Organizers Inc.',
          organizerEmail: 'info@conference.example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toContain('markdown');
      expect(res.body.location).toBe('San Francisco, CA');
      expect(res.body.venue).toBe('Moscone Center');
      expect(res.body.organizerName).toBe('Conference Organizers Inc.');
    });

    it('should not allow other users to update public page', async () => {
      const res = await request(app)
        .put(`/api/conferences/${conference.id}/public-page`)
        .set('x-user-id', String(otherUser.id))
        .set('x-user-role', 'user')
        .send({
          description: 'Unauthorized update attempt',
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent conference', async () => {
      const res = await request(app)
        .get(`/api/conferences/999999/public-page`);

      expect(res.status).toBe(404);
    });
  });
});
