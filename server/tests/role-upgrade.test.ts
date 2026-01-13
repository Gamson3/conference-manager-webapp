import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../src/utils/cognitoAdminClient', () => ({
  addUserToGroup: vi.fn(),
  removeUserFromGroup: vi.fn(),
}));

import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase, createUser, authAs } from './helpers';
import { addUserToGroup } from '../src/utils/cognitoAdminClient';

type CognitoAdminClientMock = {
  addUserToGroup: ReturnType<typeof vi.fn>;
};

const cognitoAdminClientMock = addUserToGroup as unknown as CognitoAdminClientMock['addUserToGroup'];

describe('Role upgrade via Cognito Groups (Phase 3)', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls addUserToGroup when base user creates first conference', async () => {
    const user = await createUser('user');

    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/organizer/conferences')
      .set(authAs(user.id, 'user'))
      .send({
        name: `Role Upgrade Conf ${Date.now()}`,
        description: 'Test conference',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: 'TestLoc',
        timezone: 'UTC',
        isPublic: true,
      });

    expect(res.status).toBe(201);
    expect(res.body._userUpgraded).toBe(true);
    expect(res.body._requiresTokenRefresh).toBe(true);
    expect(cognitoAdminClientMock).toHaveBeenCalledTimes(1);
    expect(cognitoAdminClientMock).toHaveBeenCalledWith(user.cognitoId, 'organizer');
  });

  it('does not call addUserToGroup if user is already organizer', async () => {
    const organizer = await createUser('organizer');

    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/organizer/conferences')
      .set(authAs(organizer.id, 'organizer'))
      .send({
        name: `Already Organizer Conf ${Date.now()}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: 'TestLoc',
        timezone: 'UTC',
      });

    expect(res.status).toBe(201);
    expect(res.body._userUpgraded).toBe(false);
    expect(res.body._requiresTokenRefresh).toBe(false);
    expect(cognitoAdminClientMock).not.toHaveBeenCalled();
  });

  it('does not call addUserToGroup on failed conference creation (validation failure)', async () => {
    const user = await createUser('user');

    const res = await request(app)
      .post('/api/organizer/conferences')
      .set(authAs(user.id, 'user'))
      .send({
        name: 'Bad Conf',
        startDate: 'not-a-date',
        endDate: 'also-not-a-date',
        location: 'TestLoc',
        timezone: 'UTC',
      });

    expect(res.status).toBe(400);
    expect(cognitoAdminClientMock).not.toHaveBeenCalled();
  });

  it('upgradeToOrganizer calls addUserToGroup and returns requiresTokenRefresh', async () => {
    const user = await createUser('user');

    const res = await request(app)
      .post('/users/upgrade-organizer')
      .set(authAs(user.id, 'user'))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.requiresTokenRefresh).toBe(true);
    expect(cognitoAdminClientMock).toHaveBeenCalledTimes(1);
    expect(cognitoAdminClientMock).toHaveBeenCalledWith(user.cognitoId, 'organizer');
  });
});
