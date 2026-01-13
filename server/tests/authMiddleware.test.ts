import express from 'express';
import request from 'supertest';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock jose and prisma used in the middleware
vi.mock('jose', () => {
  return {
    // Return a dummy function; middleware passes this into jwtVerify but we ignore it
    createRemoteJWKSet: vi.fn(() => ({} as unknown)),
    jwtVerify: vi.fn(),
  };
});

vi.mock('../src/lib/prisma', () => {
  const userStore: { role: 'admin' | 'organizer' | 'user'; id: number } = {
    id: 1,
    role: 'user',
  };
  return {
    default: {
      user: {
        findUnique: vi.fn(async () => ({ id: userStore.id, role: userStore.role })),
        // Phase 5: non-blocking DB sync calls update - needs mock
        update: vi.fn(async () => ({ id: userStore.id, role: userStore.role })),
      },
      __setRole: (role: 'admin' | 'organizer' | 'user') => (userStore.role = role),
    },
  };
});

import { jwtVerify } from 'jose';
import prisma from '../src/lib/prisma';
import { authMiddleware } from '../src/middleware/authMiddleware';

// Helpers to configure mocked jwtVerify result
type JwtVerifyMock = ReturnType<typeof vi.fn>;
const jwtVerifyMock = jwtVerify as unknown as JwtVerifyMock;

type PrismaMock = {
  __setRole?: (role: 'admin' | 'organizer' | 'user') => void;
};
const prismaMock = prisma as unknown as PrismaMock;

type JwtVerifyResult = { payload: Record<string, unknown> };

const mockJwtVerify = (payload: Record<string, unknown>): void => {
  const result: JwtVerifyResult = { payload };
  jwtVerifyMock.mockResolvedValue(result as unknown);
};
const mockJwtError = (err: unknown): void => {
  jwtVerifyMock.mockRejectedValue(err);
};

// Build a tiny test app mounting the middleware
const buildApp = (allowedRoles: string[]): express.Express => {
  const app = express();
  app.get('/protected', authMiddleware(allowedRoles), (req, res) => {
    res.json({ ok: true });
  });
  return app;
};

// Ensure envs are present
beforeEach(() => {
  process.env.AWS_REGION = 'eu-north-1';
  process.env.AWS_COGNITO_USER_POOL_ID = 'eu-north-1_TESTPOOL';
  process.env.AWS_COGNITO_USER_POOL_CLIENT_ID = 'test-client-id';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('authMiddleware JWT verification', () => {
  it('returns 401 for invalid signature', async () => {
    const app = buildApp(['admin', 'organizer', 'user']);
    mockJwtError(new Error('invalid'));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fake');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 401 for expired token', async () => {
    const app = buildApp(['admin', 'organizer', 'user']);
    mockJwtError({ code: 'ERR_JWT_EXPIRED' });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fake');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired|Invalid/i);
  });

  it('allows access when token is valid and token role matches allowed', async () => {
    const app = buildApp(['organizer']);
    // Token declares organizer via cognito:groups
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
      'cognito:groups': ['organizer'],
    });
    // Set DB role to organizer
    prismaMock.__setRole?.('organizer');

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fakevalid');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies access (403) when role is not allowed', async () => {
    const app = buildApp(['admin']);
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
      // No groups => USER
    });
    prismaMock.__setRole?.('user');

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fakedenied');

    expect(res.status).toBe(403);
  });

  it('returns 401 for ID token (access token required for authorization)', async () => {
    const app = buildApp(['admin', 'organizer', 'user']);
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'id',
      aud: 'wrong-client-id',
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fake-idtoken');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unsupported token type');
  });

  it('returns 401 for access token with mismatched client_id', async () => {
    const app = buildApp(['admin', 'organizer', 'user']);
    // Provide an access token whose client_id does NOT match configured client id
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'wrong-client-id',
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fake-accesstoken');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token client');
  });

  it('token role takes precedence over DB role (CRITICAL)', async () => {
    // Token has no groups => USER, but DB is admin
    const app = buildApp(['admin']);
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
    });
    prismaMock.__setRole?.('admin');

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fake');

    expect(res.status).toBe(403);
  });

  it('allows access when token declares admin group', async () => {
    const app = buildApp(['admin']);
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
      'cognito:groups': ['admin'],
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer fake');

    expect(res.status).toBe(200);
  });
});
