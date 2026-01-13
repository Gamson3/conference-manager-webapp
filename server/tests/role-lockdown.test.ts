/**
 * Phase 4 Tests: Role mutation lockdown
 *
 * ADR-008: Ensures createUser ignores client-supplied role,
 * and changeUserRole routes through Cognito (admin-only).
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase, createUser, authAs, suffix } from './helpers';

// Mock Cognito admin client
vi.mock('../src/utils/cognitoAdminClient', () => ({
  addUserToGroup: vi.fn(),
  removeUserFromGroup: vi.fn(),
}));

import { addUserToGroup, removeUserFromGroup } from '../src/utils/cognitoAdminClient';

describe('Phase 4: Role mutation lockdown', () => {
  let admin: { id: number; cognitoId: string };

  beforeAll(async () => {
    await resetDatabase();
    admin = await createUser('admin');
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /users - createUser', () => {
    it('ignores role in body and creates user with role=user', async () => {
      const s = suffix();
      const res = await request(app)
        .post('/users')
        .send({
          cognitoId: `attacker-${s}`,
          name: 'Attacker',
          email: `attacker-${s}@example.com`,
          role: 'admin', // Attempted injection
        });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('user'); // Ignored admin in body
    });

    it('rejects missing required fields', async () => {
      const res = await request(app)
        .post('/users')
        .send({ cognitoId: 'missing-fields' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Missing required fields/i);
    });
  });

  describe('POST /users/role - changeUserRole', () => {
    it('requires admin role', async () => {
      const baseUser = await createUser('user');

      const res = await request(app)
        .post('/users/role')
        .set(authAs(baseUser.id, 'user')) // Not admin
        .send({ userId: baseUser.id, role: 'organizer' });

      expect(res.status).toBe(403);
    });

    it('admin can upgrade user to organizer via Cognito', async () => {
      const target = await createUser('user');

      const res = await request(app)
        .post('/users/role')
        .set(authAs(admin.id, 'admin'))
        .send({ userId: target.id, role: 'organizer' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('organizer');
      expect(res.body.requiresTokenRefresh).toBe(true);
      expect(addUserToGroup).toHaveBeenCalledWith(target.cognitoId, 'organizer');
    });

    it('admin can downgrade organizer to user via Cognito', async () => {
      const target = await createUser('organizer');

      const res = await request(app)
        .post('/users/role')
        .set(authAs(admin.id, 'admin'))
        .send({ userId: target.id, role: 'user' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('user');
      expect(removeUserFromGroup).toHaveBeenCalledWith(target.cognitoId, 'organizer');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .post('/users/role')
        .set(authAs(admin.id, 'admin'))
        .send({ userId: 999999, role: 'organizer' });

      expect(res.status).toBe(404);
    });

    it('rejects invalid role value', async () => {
      const target = await createUser('user');

      const res = await request(app)
        .post('/users/role')
        .set(authAs(admin.id, 'admin'))
        .send({ userId: target.id, role: 'superadmin' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/role must be/i);
    });
  });
});
