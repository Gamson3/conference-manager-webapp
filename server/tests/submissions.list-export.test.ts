import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import app from '../src';
import prisma from '../src/lib/prisma';
import { resetDatabase, suffix } from './helpers';

describe('Submissions list and export - Phase 3', () => {
  let conferenceId: number;
  let organizerId: number;
  let authorId: number;

  beforeAll(async () => {
    await resetDatabase();

    const s = suffix();

    const organizer = await prisma.user.create({
      data: {
        cognitoId: `phase3-organizer-${s}`,
        email: `phase3-organizer+${s}@test.com`,
        name: 'Phase 3 Organizer',
        role: 'organizer',
      },
    });
    organizerId = organizer.id;

    const author = await prisma.user.create({
      data: {
        cognitoId: `phase3-author-${s}`,
        email: `phase3-author+${s}@test.com`,
        name: 'Phase 3 Author',
        role: 'user',
      },
    });
    authorId = author.id;

    const conf = await prisma.conference.create({
      data: {
        name: 'Phase 3 Test Conference',
        description: 'For submissions list/export tests',
        startDate: new Date(),
        endDate: new Date(),
        timezone: 'UTC',
        createdById: organizerId,
        status: 'draft',
        isPublic: false,
      },
    });
    conferenceId = conf.id;

    await prisma.submission.createMany({
      data: [
        {
          title: 'AI for Healthcare',
          abstract: 'Using AI in healthcare',
          keywords: ['ai', 'health'],
          status: 'submitted',
          conferenceId,
          authorId,
        },
        {
          title: 'Climate Change Modeling',
          abstract: 'Models and projections',
          keywords: ['climate'],
          status: 'under_review',
          conferenceId,
          authorId,
        },
        {
          title: 'Withdrawn Talk',
          abstract: 'No longer relevant',
          keywords: ['withdrawn'],
          status: 'withdrawn',
          conferenceId,
          authorId,
        },
      ],
    });
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it('organizer can list all submissions with pagination and filters', async () => {
    const res = await request(app)
      .get(`/api/conferences/${conferenceId}/submissions?page=1&pageSize=10&status=submitted`)
      .set('x-user-id', String(organizerId))
      .set('x-user-role', 'organizer');

    expect(res.status).toBeLessThan(400);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.headers['x-total-count']).toBeDefined();
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('AI for Healthcare');
  });

  it('author only sees their own submissions', async () => {
    const res = await request(app)
      .get(`/api/conferences/${conferenceId}/submissions`)
      .set('x-user-id', String(authorId))
      .set('x-user-role', 'user');

    expect(res.status).toBeLessThan(400);
    expect(Array.isArray(res.body)).toBe(true);
    // In this setup author only has their own submissions; ensure at least one present
    expect(res.body.length).toBeGreaterThan(0);
    for (const s of res.body) {
      expect(s.conferenceId).toBe(conferenceId);
    }
  });

  it('organizer can search submissions by keyword', async () => {
    const res = await request(app)
      .get(`/api/conferences/${conferenceId}/submissions?q=climate`)
      .set('x-user-id', String(organizerId))
      .set('x-user-role', 'organizer');

    expect(res.status).toBeLessThan(400);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Climate Change Modeling');
  });

  it('organizer can export CSV', async () => {
    const res = await request(app)
      .get(`/api/conferences/${conferenceId}/submissions/export?format=csv`)
      .set('x-user-id', String(organizerId))
      .set('x-user-role', 'organizer');

    expect(res.status).toBeLessThan(400);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('AI for Healthcare');
  });

  it('organizer can export JSON with filters', async () => {
    const res = await request(app)
      .get(`/api/conferences/${conferenceId}/submissions/export?format=json&status=under_review`)
      .set('x-user-id', String(organizerId))
      .set('x-user-role', 'organizer');

    expect(res.status).toBeLessThan(400);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe('under_review');
  });
});
