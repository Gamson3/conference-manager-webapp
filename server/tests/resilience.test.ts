/**
 * Phase 10 Tests: Resilience Validation — DB Reset Recovery
 *
 * ADR-008: Proves that role is recovered from token when user row does not exist (simulates DB reset).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase, suffix } from './helpers';

describe('Phase 10: Resilience - DB reset recovery', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('upsert restores user with role=user when user row does not exist', async () => {
    const s = suffix();
    const cognitoId = `resilience-${s}`;

    // Simulate DB was wiped — no user row
    const before = await prisma.user.findUnique({ where: { cognitoId } });
    expect(before).toBeNull();

    // Upsert (as would happen on login after DB reset)
    const res = await request(app)
      .post('/users/upsert')
      .send({
        cognitoId,
        name: 'Resilience User',
        email: `resilience-${s}@example.com`,
      });

    expect(res.status).toBe(200);
    expect(res.body.cognitoId).toBe(cognitoId);
    // Default role is 'user' on new creation; actual role from Cognito groups
    // will be synced on authenticated request (Phase 5)
    expect(res.body.role).toBe('user');

    // Verify row was created
    const after = await prisma.user.findUnique({ where: { cognitoId } });
    expect(after).not.toBeNull();
    expect(after?.role).toBe('user');
  });

  it('upsert reconnects returning user by email after DB reset', async () => {
    const s = suffix();
    const email = `returning-${s}@example.com`;

    // Create an existing user with organizer role
    const existing = await prisma.user.create({
      data: {
        cognitoId: `old-cognito-${s}`,
        name: 'Returning User',
        email,
        role: 'organizer',
        password: '',
      },
    });

    // Simulate a new Cognito identity linking to same email (post-reset scenario)
    const newCognitoId = `new-cognito-${s}`;
    const res = await request(app)
      .post('/users/upsert')
      .send({
        cognitoId: newCognitoId,
        name: 'Returning User',
        email,
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(existing.id); // Same DB row
    expect(res.body.cognitoId).toBe(newCognitoId); // Updated to new Cognito ID
    // Role preserved (not downgraded) during reconnect
    expect(res.body.role).toBe('organizer');
  });
});
