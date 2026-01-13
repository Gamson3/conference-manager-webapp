/**
 * Integration tests for Submission Assistance (consent-based delegation)
 * 
 * Tests the complete flow:
 * 1. Organizer requests consent from author
 * 2. Author approves/denies consent
 * 3. Organizer creates submission on behalf of author
 * 4. Author revokes consent
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase, createUser, authAs } from './helpers';

describe('Submission Assistance (Consent-Based Delegation)', () => {
  let organizer: { id: number; cognitoId: string };
  let author: { id: number; cognitoId: string };
  let conference: { id: number };

  beforeAll(async () => {
    await resetDatabase();
    
    // Create organizer and author
    organizer = await createUser('organizer');
    author = await createUser('user');
    
    // Create conference with submission settings
    conference = await prisma.conference.create({
      data: {
        name: `Assistance Test Conf ${Date.now()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7200000),
        location: 'TestLoc',
        createdById: organizer.id,
        submissionsOpenFrom: new Date(Date.now() - 86400000), // yesterday
        submissionsOpenUntil: new Date(Date.now() + 86400000 * 7), // next week
      }
    });
    
    // Register author as participant with role 'author'
    await prisma.conferenceParticipant.create({
      data: {
        conferenceId: conference.id,
        userId: author.id,
        role: 'author',
        status: 'registered',
      }
    });
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  describe('Organizer Consent Request Flow', () => {
    beforeEach(async () => {
      // Clean up consent requests and consents between tests
      await prisma.submissionAssistanceRequest.deleteMany({
        where: { conferenceId: conference.id }
      });
      await prisma.submissionAssistanceConsent.deleteMany({
        where: { conferenceId: conference.id }
      });
    });

    it('should allow organizer to check consent status (no consent)', async () => {
      const res = await request(app)
        .get(`/api/organizer/conferences/${conference.id}/assistance/consent/${author.id}`)
        .set(authAs(organizer.id, 'organizer'));

      expect(res.status).toBe(200);
      expect(res.body.hasConsent).toBe(false);
      expect(res.body.pendingRequest).toBeNull();
    });

    it('should allow organizer to request consent from author', async () => {
      const res = await request(app)
        .post(`/api/organizer/conferences/${conference.id}/assistance/request/${author.id}`)
        .set(authAs(organizer.id, 'organizer'))
        .send({ message: 'I would like to help you with your submission' });

      expect(res.status).toBe(201);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.status).toBe('pending');
    });

    it('should show pending request in consent status check', async () => {
      // First create a request
      await request(app)
        .post(`/api/organizer/conferences/${conference.id}/assistance/request/${author.id}`)
        .set(authAs(organizer.id, 'organizer'))
        .send({});

      const res = await request(app)
        .get(`/api/organizer/conferences/${conference.id}/assistance/consent/${author.id}`)
        .set(authAs(organizer.id, 'organizer'));

      expect(res.status).toBe(200);
      expect(res.body.hasConsent).toBe(false);
      expect(res.body.pendingRequest).toBeDefined();
      expect(res.body.pendingRequest.id).toBeDefined();
    });

    it('should not allow duplicate pending requests', async () => {
      // First request
      await request(app)
        .post(`/api/organizer/conferences/${conference.id}/assistance/request/${author.id}`)
        .set(authAs(organizer.id, 'organizer'))
        .send({});

      // Second request should return existing pending request (idempotent)
      const res = await request(app)
        .post(`/api/organizer/conferences/${conference.id}/assistance/request/${author.id}`)
        .set(authAs(organizer.id, 'organizer'))
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
      expect(res.body.request).toBeDefined();
    });
  });

  describe('Author Consent Response Flow', () => {
    let requestId: number;

    beforeEach(async () => {
      // Clean up and create a fresh consent request
      await prisma.submissionAssistanceRequest.deleteMany({
        where: { conferenceId: conference.id }
      });
      await prisma.submissionAssistanceConsent.deleteMany({
        where: { conferenceId: conference.id }
      });

      const reqRes = await request(app)
        .post(`/api/organizer/conferences/${conference.id}/assistance/request/${author.id}`)
        .set(authAs(organizer.id, 'organizer'))
        .send({ message: 'Please approve' });

      requestId = reqRes.body.request.id;
    });

    it('should allow author to see pending requests', async () => {
      const res = await request(app)
        .get('/api/account/assistance/requests')
        .set(authAs(author.id, 'user'));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('pending');
    });

    it('should allow author to approve consent request', async () => {
      const res = await request(app)
        .post(`/api/account/assistance/requests/${requestId}/respond`)
        .set(authAs(author.id, 'user'))
        .send({ action: 'approve' });

      expect(res.status).toBe(200);
      expect(res.body.consent).toBeDefined();
      expect(res.body.consent.id).toBeDefined();
    });

    it('should show consent status as granted after approval', async () => {
      // Approve the request
      await request(app)
        .post(`/api/account/assistance/requests/${requestId}/respond`)
        .set(authAs(author.id, 'user'))
        .send({ action: 'approve' });

      // Check from organizer side
      const res = await request(app)
        .get(`/api/organizer/conferences/${conference.id}/assistance/consent/${author.id}`)
        .set(authAs(organizer.id, 'organizer'));

      expect(res.status).toBe(200);
      expect(res.body.hasConsent).toBe(true);
    });

    it('should allow author to deny consent request', async () => {
      const res = await request(app)
        .post(`/api/account/assistance/requests/${requestId}/respond`)
        .set(authAs(author.id, 'user'))
        .send({ action: 'deny', responseNote: 'No thank you' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('denied');
    });

    it('should allow author to grant consent directly (without request)', async () => {
      // Clean any pending requests first
      await prisma.submissionAssistanceRequest.deleteMany({
        where: { conferenceId: conference.id }
      });

      const res = await request(app)
        .post('/api/account/assistance/consents')
        .set(authAs(author.id, 'user'))
        .send({ conferenceId: conference.id, organizerId: organizer.id });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.conferenceId).toBe(conference.id);
    });
  });

  describe('Delegated Submission Creation', () => {
    beforeEach(async () => {
      // Clean up
      await prisma.submission.deleteMany({
        where: { conferenceId: conference.id }
      });
      await prisma.submissionAssistanceRequest.deleteMany({
        where: { conferenceId: conference.id }
      });
      await prisma.submissionAssistanceConsent.deleteMany({
        where: { conferenceId: conference.id }
      });

      // Grant consent directly
      await prisma.submissionAssistanceConsent.create({
        data: {
          conferenceId: conference.id,
          authorId: author.id,
          organizerId: organizer.id,
        }
      });
    });

    it('should allow organizer to create submission on behalf of author with consent', async () => {
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/submissions`)
        .set(authAs(organizer.id, 'organizer'))
        .send({
          title: 'Test Submission on Behalf of Author',
          abstract: 'This is a test abstract created by an organizer on behalf of an author.',
          onBehalfOfUserId: author.id
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      
      // Verify the submission is attributed to the author
      const submission = await prisma.submission.findUnique({
        where: { id: res.body.id }
      });
      expect(submission?.authorId).toBe(author.id);
    });

    it('should reject delegated submission without consent', async () => {
      // Remove consent
      await prisma.submissionAssistanceConsent.deleteMany({
        where: { conferenceId: conference.id }
      });

      const res = await request(app)
        .post(`/api/conferences/${conference.id}/submissions`)
        .set(authAs(organizer.id, 'organizer'))
        .send({
          title: 'Test Submission Without Consent',
          abstract: 'This should fail',
          onBehalfOfUserId: author.id
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Consent Revocation', () => {
    let consentId: number;

    beforeEach(async () => {
      // Clean up and create fresh consent
      await prisma.submissionAssistanceConsent.deleteMany({
        where: { conferenceId: conference.id }
      });

      const consent = await prisma.submissionAssistanceConsent.create({
        data: {
          conferenceId: conference.id,
          authorId: author.id,
          organizerId: organizer.id,
        }
      });
      consentId = consent.id;
    });

    it('should allow author to see granted consents', async () => {
      const res = await request(app)
        .get('/api/account/assistance/consents')
        .set(authAs(author.id, 'user'));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should allow author to revoke consent', async () => {
      const res = await request(app)
        .delete(`/api/account/assistance/consents/${consentId}`)
        .set(authAs(author.id, 'user'));

      expect(res.status).toBe(200);
      expect(res.body.revokedAt).toBeDefined();
    });

    it('should reject delegated submissions after consent is revoked', async () => {
      // Revoke consent
      await request(app)
        .delete(`/api/account/assistance/consents/${consentId}`)
        .set(authAs(author.id, 'user'));

      // Try to create submission
      const res = await request(app)
        .post(`/api/conferences/${conference.id}/submissions`)
        .set(authAs(organizer.id, 'organizer'))
        .send({
          title: 'Test After Revocation',
          abstract: 'This should fail',
          onBehalfOfUserId: author.id
        });

      expect(res.status).toBe(403);
    });
  });
});
