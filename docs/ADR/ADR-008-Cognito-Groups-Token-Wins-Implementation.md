# ADR-008: Cognito Groups "Token-Wins" Role System — Detailed Phased Implementation

**Status:** Approved  
**Date:** 2026-01-11  
**Authors:** Development Team  
**Supersedes:** DB-authoritative role system

---

## Executive Summary

This document defines a phased migration from **DB-authoritative** to **IdP-authoritative (Cognito Groups)** role management. After implementation:

- **Cognito decides** who you are and what role you have
- **Backend verifies** the access token and derives role from `cognito:groups`
- **Database mirrors** the role for queries/reports (non-authoritative cache)
- **DB resets never downgrade users** — roles are restored on next login

```
Cognito (Authority) ──► Access JWT ──► Backend (Verification)
                                       └──► DB (Cached mirror)
```

---

## Context & Problem Statement

### The Incident

After a database reset, all users were downgraded to `user` role because:
- Role authority lived in the database
- Cognito had no record of elevated roles
- No mechanism existed to restore roles from an external source

### Root Cause

The system was **DB-wins** for authorization:
```ts
// ❌ Old: role came from database
const user = await prisma.user.findUnique({ where: { cognitoId } });
req.user.role = user.role;
```

### The Fix

Move to **token-wins** authorization:
```ts
// ✅ New: role comes from verified Cognito access token (JWT) claims
const groups = payload["cognito:groups"];
req.user.role = roleFromGroups(groups);
```

---

## Architectural Decisions

### AD-1: Cognito Groups as Role Authority

**Decision:** Use Cognito Groups (`admin`, `organizer`) as the single source of truth for roles.

**Rationale:**
- Groups are server-controlled (users cannot self-assign)
- Groups are automatically injected into JWT tokens
- Groups survive application database resets
- Industry-standard pattern (AWS IAM, GitHub, Slack)

**Groups to create:**

| Group | Maps to Role |
|-------|--------------|
| `admin` | `ADMIN` |
| `organizer` | `ORGANIZER` |
| *(no group)* | `USER` |

**Why no `user` group:** Every authenticated user is a user by default. Creating a group adds overhead with no security benefit.

#### Admin Bootstrap Rule (Out-of-Band)

The first `admin` user is assigned manually via the AWS Cognito Console or CLI. This is an intentional out-of-band bootstrap step and is not exposed via application APIs.

---

### AD-2: Token-Derived Role (Token-Wins)

**Decision:** All authorization decisions use `req.user.role` derived from the verified Cognito access token (JWT) `cognito:groups` claim, never from `dbUser.role`.

#### Token Source Clarification

All backend authorization decisions MUST be based on the **Cognito Access Token**, not the ID Token.

| Token Type | Purpose | Use for Authorization |
|------------|---------|----------------------|
| **Access Token** | OAuth2 API authorization | ✅ **Required** |
| **ID Token** | Client-side identity/profile | ❌ Never |
| **Refresh Token** | Obtain new tokens | ❌ Never |

- The **access token** is the OAuth2 artifact intended for API authorization
- The **ID token** is intended for client-side identity and profile information
- AWS Cognito includes the `cognito:groups` claim in both tokens, but **only the access token is semantically correct for API authorization**

**Rule:**
> The backend MUST verify and derive roles from the **access token** presented in the `Authorization: Bearer <token>` header.

This prevents role derivation from client-only identity artifacts and aligns with OAuth2 and AWS Cognito best practices.

**Critical Rule (must be documented in code):**
```ts
// ✅ CORRECT: Use token-derived role for authorization
if (req.user.role === 'admin') { ... }

// ❌ WRONG: Never use DB role for authorization decisions
if (dbUser.role === 'admin') { ... }
```

**Rationale:**
- Prevents stale privilege issues
- Makes DB resets non-destructive for authorization
- Provides cryptographic proof of role claims

---

### AD-3: DB as Non-Authoritative Mirror

**Decision:** The database stores roles as a cached mirror for queries, reports, and filtering — but is **never** treated as the source of truth for authorization.

**Sync behavior:**
- On every authenticated request, if `dbUser.role !== tokenRole`, update DB to match token
- This handles both upgrades AND downgrades automatically

#### Non-Blocking Sync Rule

Database role synchronization is **best-effort and non-blocking**.

- Authorization MUST proceed using the token-derived role even if:
  - The database update fails
  - The database is temporarily unavailable
  - A write conflict occurs

**Rule:**
> A failure to sync the database role MUST NEVER deny or downgrade access if the token authorizes it.

This preserves availability and ensures Cognito remains the single source of truth.

#### Database Role Usage Boundaries

| Use Case | Allowed | Notes |
|----------|---------|-------|
| Authorization checks | ❌ **Never** | Token only |
| Permission enforcement | ❌ **Never** | Token authoritative |
| UI display | ✅ Yes | Informational only |
| Filtering queries | ✅ Yes | Non-security context |
| Reporting / analytics | ✅ Yes | Historical data |
| Admin dashboards | ✅ Yes | Informational only |

---

### AD-4: Proof-Based Role Upgrades Only

**Decision:** Roles are granted only by server-side, post-conditioned actions — never by user intent.

**The ONLY path to `organizer`:**
```
User creates conference successfully
  → Backend calls AdminAddUserToGroup(cognitoId, "organizer")
  → DB role mirrored (optional)
  → Next token contains cognito:groups: ["organizer"]
```

#### Upgrade Timing Invariant

Role upgrades to `organizer` occur **only after successful conference creation**.

- All validation MUST pass
- Database transaction MUST commit successfully
- Partial or failed creation MUST NOT upgrade the user
- Onboarding intent or navigation MUST NOT grant roles

**Failure behavior:**
- If conference creation fails → no Cognito group change
- If Cognito API fails → conference creation should be rolled back (or retry queued)
- User remains `user` until successful end-to-end completion

**Explicit non-behaviors:**
- ❌ Onboarding intent does NOT grant roles
- ❌ Client-submitted `role` field is IGNORED
- ❌ Users cannot self-assign elevated roles

---

### AD-5: Onboarding as UX Guidance Only

**Decision:** Remove role assignment from onboarding entirely. Onboarding captures intent to personalize UX, not to grant authorization.

**Before (removed):**
```
Onboarding: "I want to organize" → set role = organizer  ❌
```

**After (implemented):**
```
Onboarding: "I want to organize" → redirect to /conferences/new  ✅
Onboarding: "I want to attend"   → redirect to /discover         ✅
```

#### Onboarding Security Contract

Onboarding flows are **explicitly prohibited** from:

| Action | Allowed |
|--------|---------|
| Calling Cognito Admin APIs | ❌ **Forbidden** |
| Mutating database `role` field | ❌ **Forbidden** |
| Assigning or implying authorization state | ❌ **Forbidden** |
| Storing intent for later role assignment | ❌ **Forbidden** |
| Influencing navigation/UX | ✅ Allowed |
| Storing user preferences | ✅ Allowed |

**Rationale:**
- Prevents premature privilege escalation
- Eliminates "onboarding completed but DB wiped" edge case
- Aligns with zero-trust principles

---

## Global Authorization Invariant

> **Authorization is derived exclusively from verified Cognito access token claims.**

Any code path that:
- Reads `dbUser.role` for authorization decisions
- Accepts `role` from client request body
- Decodes tokens without cryptographic verification
- Grants roles based on user intent (onboarding)

is a **security violation** of this ADR and must be treated as a bug.

**Canonical check (the ONLY valid pattern):**
```ts
// After Cognito access token (JWT) verification with JWKS
const groups = verifiedPayload["cognito:groups"];
const role = roleFromGroups(groups);
// role is now authoritative for this request
```

---

## Phased Implementation Plan

### Phase 0: Cognito Group Setup (AWS Console)

**Objective:** Create the groups that will represent elevated roles.

**Steps:**
1. Go to **AWS Console → Cognito → User Pools → `eu-north-1_N7TpdUQG7` → Groups**
2. Create group **`admin`** (no IAM role needed)
3. Create group **`organizer`** (no IAM role needed)
4. Do **not** create a `user` group
5. Manually assign a test user to `organizer` for verification

**Verification:**
- Sign out and sign in again
- Decode the **access token** (jwt.io or similar)
- Confirm `cognito:groups` claim contains `["organizer"]`

**Admin bootstrap note:** The first `admin` is assigned out-of-band (AWS Console/CLI). This is intentional and not implemented as an in-app self-service flow.

**Acceptance Criteria:**
- [ ] `admin` group exists in Cognito
- [ ] `organizer` group exists in Cognito
- [ ] Test user shows `cognito:groups` in decoded **access token**

---

### Phase 1: Role Mapping Utility + Cognito Admin SDK

**Objective:** Create the canonical `roleFromGroups()` function and AWS SDK wrappers for group mutations.

**Files to create:**

#### 1. `server/src/utils/roleMapper.ts` (new)
```ts
import { Role } from '@prisma/client';

/**
 * Derives the application role from Cognito group membership.
 * 
 * PRECEDENCE: admin > organizer > user
 * 
 * This is the SINGLE SOURCE OF TRUTH for role derivation.
 * All authorization decisions must use the output of this function.
 * 
 * @param groups - The cognito:groups claim from a VERIFIED access token
 * @returns The derived Role enum value
 */
export function roleFromGroups(groups?: string[]): Role {
  if (!groups || groups.length === 0) return 'user';
  if (groups.includes('admin')) return 'admin';
  if (groups.includes('organizer')) return 'organizer';
  return 'user';
}
```

#### 2. `server/src/utils/cognitoAdminClient.ts` (new)
```ts
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID!;

/**
 * Adds a user to a Cognito group.
 * The user's next access token will include this group in cognito:groups.
 *
 * Clarification: In this system, the Cognito `Username` is equal to the `sub` claim (stored as `cognitoId`), and the terms are used interchangeably. If your User Pool uses a different `Username`, pass that `Username` instead.
 * 
 * @param username - Cognito username (the 'sub' claim / cognitoId)
 * @param groupName - Target group ('admin' or 'organizer')
 */
export async function addUserToGroup(
  username: string,
  groupName: 'admin' | 'organizer'
): Promise<void> {
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    })
  );
}

/**
 * Removes a user from a Cognito group.
 * The user's next access token will no longer include this group.
 *
 * Clarification: In this system, the Cognito `Username` is equal to the `sub` claim (stored as `cognitoId`), and the terms are used interchangeably. If your User Pool uses a different `Username`, pass that `Username` instead.
 * 
 * @param username - Cognito username (the 'sub' claim / cognitoId)
 * @param groupName - Target group ('admin' or 'organizer')
 */
export async function removeUserFromGroup(
  username: string,
  groupName: 'admin' | 'organizer'
): Promise<void> {
  await client.send(
    new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    })
  );
}
```

**Tests:** `server/tests/roleMapper.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { roleFromGroups } from '../src/utils/roleMapper';

describe('roleFromGroups', () => {
  it('returns user when groups is undefined', () => {
    expect(roleFromGroups(undefined)).toBe('user');
  });

  it('returns user when groups is empty array', () => {
    expect(roleFromGroups([])).toBe('user');
  });

  it('returns organizer when groups contains organizer', () => {
    expect(roleFromGroups(['organizer'])).toBe('organizer');
  });

  it('returns admin when groups contains admin', () => {
    expect(roleFromGroups(['admin'])).toBe('admin');
  });

  it('returns admin when groups contains both (precedence)', () => {
    expect(roleFromGroups(['organizer', 'admin'])).toBe('admin');
    expect(roleFromGroups(['admin', 'organizer'])).toBe('admin');
  });

  it('ignores unknown groups and returns user', () => {
    expect(roleFromGroups(['unknown', 'random'])).toBe('user');
  });

  it('returns organizer when mixed with unknown groups', () => {
    expect(roleFromGroups(['unknown', 'organizer'])).toBe('organizer');
  });
});
```

**Acceptance Criteria:**
- [ ] `roleFromGroups()` passes all unit tests
- [ ] `cognitoAdminClient.ts` exports `addUserToGroup` and `removeUserFromGroup`
- [ ] AWS SDK can be invoked (credentials available via `~/.aws/credentials` or IAM role)

---

### Phase 2: Token-Wins Auth Middleware

**Objective:** Make `req.user.role` derive from verified Cognito access token (JWT) `cognito:groups` claim instead of DB.

#### Verification Requirement

The middleware MUST perform **cryptographic verification** of the access token using Cognito's JWKS endpoint.

| Requirement | Mandatory |
|-------------|-----------|
| Signature verification via JWKS | ✅ Yes |
| Issuer validation | ✅ Yes |
| Token type = `access` | ✅ Yes |
| `client_id` validation | ✅ Yes |
| Decode-only without verification | ❌ **Forbidden** |

- Role derivation MUST occur **only after successful signature verification**
- Unverified tokens MUST be rejected with 401
- This guarantees that `cognito:groups` claims cannot be forged

**Files to modify:**

#### 1. authMiddleware.ts

**Key changes:**
1. Add `cognito:groups` to `CognitoJwtPayload` interface
2. After `jwtVerify()`, extract groups and call `roleFromGroups()`
3. Use token-derived role for `req.user.role`
4. DB lookup continues for `req.user.id` only

```ts
// Add to CognitoJwtPayload interface:
"cognito:groups"?: string[];

// After jwtVerify(), before DB lookup:
const groups = claims["cognito:groups"] as string[] | undefined;
const tokenRole = roleFromGroups(groups);

// Change req.user assignment:
req.user = { 
  id: user.id, 
  cognitoId, 
  role: tokenRole  // ✅ From token, NOT from DB
};

// Authorization check uses tokenRole:
const hasAccess = allowedRoles.includes(tokenRole);
```

**Critical documentation comment to add:**
```ts
/**
 * AUTHORIZATION RULE (Token-Wins):
 * 
 * req.user.role is ALWAYS derived from the verified Cognito access token (JWT) cognito:groups claim.
 * The database role is a non-authoritative mirror for queries/reports only.
 * 
 * For authorization decisions, ALWAYS use req.user.role, NEVER dbUser.role.
 * 
 * See: ADR-008 Global Authorization Invariant
 */
```

**Tests:** Update authMiddleware.test.ts

Add new test cases:
```ts
describe('authMiddleware token-wins role derivation', () => {
  it('derives USER when no cognito:groups in token', async () => {
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
      // No cognito:groups
    });
    // Even if DB says organizer, token wins
    (prisma as any).__setRole?.('organizer');

    const app = buildApp(['user']);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200); // USER allowed
  });

  it('derives ORGANIZER from cognito:groups', async () => {
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
      'cognito:groups': ['organizer'],
    });

    const app = buildApp(['organizer']);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200);
  });

  it('derives ADMIN with precedence over organizer', async () => {
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
      'cognito:groups': ['organizer', 'admin'],
    });

    const app = buildApp(['admin']);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200);
  });

  it('token role takes precedence over DB role (CRITICAL)', async () => {
    // Token says user (no groups), DB says admin
    mockJwtVerify({
      sub: 'cognito-user-1',
      token_use: 'access',
      client_id: 'test-client-id',
    });
    (prisma as any).__setRole?.('admin');

    const app = buildApp(['admin']);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid');

    // Should be 403 because token role is USER
    expect(res.status).toBe(403);
  });
});
```

**Acceptance Criteria:**
- [ ] `req.user.role` comes from token `cognito:groups`, not DB
- [ ] All existing auth tests pass (may need updates)
- [ ] New token-wins tests pass
- [ ] Authorization decisions use token-derived role
- [ ] Token precedence test explicitly passes

---

### Phase 3: Convert Role Upgrades to Cognito Mutations

**Objective:** "Create conference" now adds user to Cognito `organizer` group, not just DB.

**Files to modify:**

#### 1. eventControllers.ts

**Key changes to `createEvent`:**
```ts
import { addUserToGroup } from '../utils/cognitoAdminClient';

// Inside the transaction, after user upgrade check:
if (user.role === 'user') {
  // Add to Cognito group (this is the authoritative change)
  await addUserToGroup(user.cognitoId, 'organizer');
  
  // Mirror in DB (non-authoritative, for queries)
  upgradedUser = await tx.user.update({
    where: { id: user.id },
    data: { role: 'organizer' }
  });
  
  console.log(`Upgraded user ${user.id} to organizer via Cognito group`);
}

// Response hint for client:
res.status(201).json({
  ...result.conference,
  _userUpgraded: user.role === 'user',
  _requiresTokenRefresh: user.role === 'user', // Client should refresh token
});
```

#### 2. userControllers.ts

**Key changes to `upgradeToOrganizer`:**
```ts
import { addUserToGroup } from '../utils/cognitoAdminClient';

// Replace direct DB update with:
await addUserToGroup(dbUser.cognitoId, 'organizer');

// Mirror in DB:
const updated = await prisma.user.update({
  where: { id: dbUser.id },
  data: { role: 'organizer' }
});

return res.json({ 
  message: 'Successfully upgraded to organizer', 
  user: updated,
  requiresTokenRefresh: true
});
```

**Tests:** `server/tests/role-upgrade.test.ts` (new)
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Cognito admin client
vi.mock('../src/utils/cognitoAdminClient', () => ({
  addUserToGroup: vi.fn(),
  removeUserFromGroup: vi.fn(),
}));

import { addUserToGroup } from '../src/utils/cognitoAdminClient';

describe('Role upgrade via Cognito', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls addUserToGroup when user creates first conference', async () => {
    // Setup: user with role 'user'
    // Action: POST /api/events
    // Assert: addUserToGroup called with (cognitoId, 'organizer')
  });

  it('does not call addUserToGroup if user is already organizer', async () => {
    // Setup: user with role 'organizer'
    // Action: POST /api/events
    // Assert: addUserToGroup NOT called
  });

  it('returns requiresTokenRefresh hint when upgraded', async () => {
    // Assert response includes _requiresTokenRefresh: true
  });
  
  it('does not upgrade on failed conference creation', async () => {
    // Setup: validation will fail
    // Action: POST /api/events with invalid data
    // Assert: addUserToGroup NOT called
  });
});
```

**Acceptance Criteria:**
- [ ] `createEvent` calls `addUserToGroup` for USER → ORGANIZER upgrade
- [ ] `upgradeToOrganizer` calls `addUserToGroup`
- [ ] DB role is mirrored (not authoritative)
- [ ] Response includes token refresh hint
- [ ] Tests verify Cognito SDK called
- [ ] Failed creation does not trigger upgrade

---

### Phase 4: Lock Down Client-Supplied Role

**Objective:** Remove all surfaces that accept `role` from request body.

**Files to modify:**

#### 1. userControllers.ts

**`createUser` — remove role from body:**
```ts
export const createUser = async (req: Request, res: Response) => {
  const { cognitoId, name, email, password } = req.body; // ❌ role removed
  
  // Always default to 'user' — Cognito groups determine actual role
  const user = await prisma.user.create({
    data: {
      cognitoId,
      name,
      email,
      password: password || "",
      role: 'user', // ✅ Always user, Cognito is authority
    },
  });
  
  res.status(201).json(user);
};
```

**`changeUserRole` — must go through Cognito (admin-only):**
```ts
import { addUserToGroup, removeUserFromGroup } from '../utils/cognitoAdminClient';

export const changeUserRole = async (req: Request, res: Response) => {
  const { userId, role } = req.body;
  
  const targetUser = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  const oldRole = targetUser.role;
  const newRole = role as Role;
  
  // Update Cognito groups
  if (newRole === 'organizer' && oldRole === 'user') {
    await addUserToGroup(targetUser.cognitoId, 'organizer');
  } else if (newRole === 'admin') {
    await addUserToGroup(targetUser.cognitoId, 'admin');
  } else if (newRole === 'user' && oldRole !== 'user') {
    // Downgrade: remove from elevated groups
    if (oldRole === 'organizer') await removeUserFromGroup(targetUser.cognitoId, 'organizer');
    if (oldRole === 'admin') await removeUserFromGroup(targetUser.cognitoId, 'admin');
  }
  
  // Mirror in DB
  const updated = await prisma.user.update({
    where: { id: Number(userId) },
    data: { role: newRole },
  });
  
  res.json({ user: updated, requiresTokenRefresh: true });
};
```

**Tests:**
```ts
describe('Role mutation lockdown', () => {
  it('POST /users ignores role in body and creates as user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ cognitoId: 'test', name: 'Test', email: 'test@test.com', role: 'admin' });
    
    expect(res.body.role).toBe('user'); // Ignored admin in body
  });

  it('POST /users/role requires admin role', async () => {
    const res = await request(app)
      .post('/api/users/role')
      .set('x-user-id', '1')
      .set('x-user-role', 'user') // Not admin
      .send({ userId: 2, role: 'organizer' });
    
    expect(res.status).toBe(403);
  });
});
```

**Acceptance Criteria:**
- [ ] `createUser` ignores `role` in body, always creates as `user`
- [ ] `changeUserRole` is admin-only and calls Cognito SDK
- [ ] Tests verify role payload is ignored for non-admin endpoints

---

### Phase 5: DB Role Sync on Login (Mirror)

**Objective:** On every authenticated request, sync DB role to match token role (handles both upgrades AND downgrades).

**Files to modify:**

#### 1. authMiddleware.ts

**Add sync logic after role derivation:**
```ts
// After deriving tokenRole and loading dbUser:
const tokenRole = roleFromGroups(groups);

// Sync DB if different (mirror, not authority) — non-blocking
if (user.role !== tokenRole) {
  // Fire-and-forget: do not await, do not block authorization
  prisma.user.update({
    where: { id: user.id },
    data: { role: tokenRole }
  }).then(() => {
    console.log(`Synced DB role for user ${user.id}: ${user.role} → ${tokenRole}`);
  }).catch((err) => {
    // Log but do not fail — token is authoritative
    console.error(`DB role sync failed for user ${user.id}:`, err.message);
  });
}

// req.user.role is ALWAYS from token (authoritative)
// This line executes regardless of DB sync success
req.user = { id: user.id, cognitoId, role: tokenRole };
```

**Critical documentation comment:**
```ts
/**
 * DB ROLE SYNC (Mirror Policy):
 * 
 * The database role is updated to match the token-derived role on every request.
 * This ensures the DB stays consistent for queries/reports/filtering.
 * 
 * IMPORTANT: This sync is NON-BLOCKING.
 * - Authorization proceeds using tokenRole regardless of sync outcome
 * - DB failures are logged but do not deny access
 * - See: ADR-008 Non-Blocking Sync Rule
 * 
 * The DB role is NEVER used for authorization — only for:
 * - Query convenience (filtering users by role)
 * - Reporting and analytics
 * - Display purposes
 */
```

**Tests:**
```ts
describe('DB role sync on login', () => {
  it('updates DB when token role > DB role (upgrade)', async () => {
    // DB says 'user', token says 'organizer'
    mockJwtVerify({ sub: 'user-1', 'cognito:groups': ['organizer'], ... });
    (prisma as any).__setRole?.('user');
    
    await request(app).get('/protected').set('Authorization', 'Bearer valid');
    
    // Verify prisma.user.update was called with role: 'organizer'
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'organizer' } })
    );
  });

  it('updates DB when token role < DB role (downgrade)', async () => {
    // DB says 'organizer', token says 'user' (no groups)
    mockJwtVerify({ sub: 'user-1', ... }); // No cognito:groups
    (prisma as any).__setRole?.('organizer');
    
    await request(app).get('/protected').set('Authorization', 'Bearer valid');
    
    // Verify DB downgraded to 'user'
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'user' } })
    );
  });

  it('does not update DB when roles match', async () => {
    mockJwtVerify({ sub: 'user-1', 'cognito:groups': ['organizer'], ... });
    (prisma as any).__setRole?.('organizer');
    
    await request(app).get('/protected').set('Authorization', 'Bearer valid');
    
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  
  it('proceeds with authorization even if DB sync fails', async () => {
    mockJwtVerify({ sub: 'user-1', 'cognito:groups': ['organizer'], ... });
    (prisma as any).__setRole?.('user');
    // Make update fail
    (prisma.user.update as any).mockRejectedValue(new Error('DB unavailable'));
    
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid');
    
    // Should still succeed — token is authoritative
    expect(res.status).toBe(200);
  });
});
```

**Acceptance Criteria:**
- [ ] DB role syncs to token role on every authenticated request
- [ ] Upgrades sync correctly
- [ ] Downgrades sync correctly
- [ ] No unnecessary updates when roles match
- [ ] Authorization proceeds even if DB sync fails
- [ ] Authorization always uses token role, not DB

---

### Phase 6: Optional Auth Hardening

**Objective:** `optionalAuthMiddleware` must verify tokens, not just decode them.

**Current risk:** Decoding without verification allows forged `cognito:groups` claims.

#### Threat Model Note

Optional-auth endpoints are a **high-risk attack surface**.

An attacker could:
1. Craft a JWT with `cognito:groups: ["admin"]`
2. Send it to an optional-auth endpoint
3. If the endpoint decodes without verifying, it would trust the forged claims

**Rule:**
> Optional authentication MUST follow the same verification rules as mandatory authentication. Only fallback behavior differs.

**Files to modify:**

#### 1. optionalAuthMiddleware.ts

**Replace `jwt.decode()` with `jwtVerify()`:**
```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { roleFromGroups } from '../utils/roleMapper';

// Same JWKS setup as authMiddleware
const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const JWKS = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

try {
  const { payload } = await jwtVerify(token, JWKS, { issuer });
  const claims = payload as CognitoJwtPayload;
  
  // Derive role from verified token
  const groups = claims["cognito:groups"] as string[] | undefined;
  const tokenRole = roleFromGroups(groups);
  
  req.user = {
    id: user.id,
    cognitoId: claims.sub,
    role: tokenRole
  };
} catch (err) {
  // Verification failed — continue as guest (no req.user)
  console.log('[OPTIONAL AUTH] Token verification failed, continuing as guest');
}
```

**Tests:**
```ts
describe('optionalAuthMiddleware security', () => {
  it('rejects forged token with fake cognito:groups', async () => {
    // Forged token that would decode to admin but fails signature
    mockJwtError(new Error('invalid signature'));
    
    const res = await request(app)
      .get('/public-with-optional-auth')
      .set('Authorization', 'Bearer forged-token');
    
    // Should continue as guest (no user), not as admin
    expect(res.body.user).toBeUndefined();
  });

  it('attaches user with correct role when token is valid', async () => {
    mockJwtVerify({ sub: 'user-1', 'cognito:groups': ['organizer'], ... });
    
    const res = await request(app)
      .get('/public-with-optional-auth')
      .set('Authorization', 'Bearer valid');
    
    expect(res.body.user.role).toBe('organizer');
  });
});
```

**Acceptance Criteria:**
- [ ] `optionalAuthMiddleware` uses `jwtVerify()`, not `jwt.decode()`
- [ ] Forged tokens result in guest access, not elevated access
- [ ] Valid tokens attach correct user with token-derived role

---

### Phase 7: Client Token Refresh After Upgrade

**Objective:** After role upgrade, client obtains new tokens to see updated `cognito:groups`.

**Files to modify:**

#### 1. `client/src/contexts/AuthContext.tsx`

**After upgrade actions, force token refresh:**
```tsx
import { fetchAuthSession } from 'aws-amplify/auth';

const upgradeToOrganizer = async () => {
  const response = await apiClient.post('/api/users/upgrade-organizer');
  
  if (response.data.requiresTokenRefresh) {
    // Force Cognito to issue new tokens with updated groups
    await fetchAuthSession({ forceRefresh: true });
    
    // Re-fetch canonical user from backend (will have synced role)
    await fetchAndSetUser();
  }
  
  return response.data;
};

const createConference = async (data: ConferenceData) => {
  const response = await apiClient.post('/api/events', data);
  
  if (response.data._requiresTokenRefresh) {
    await fetchAuthSession({ forceRefresh: true });
    await fetchAndSetUser();
  }
  
  return response.data;
};
```

**UX considerations:**
- Option A: Silent refresh (recommended) — user doesn't notice
- Option B: Force re-login — more disruptive but simpler
- Option C: Inform user — "Role updated, some features may require refresh"

**Acceptance Criteria:**
- [ ] Client calls `fetchAuthSession({ forceRefresh: true })` after upgrade
- [ ] User state reflects new role after refresh
- [ ] No stale role displayed in UI

---

### Phase 8: Onboarding Role Removal

**Objective:** Remove role assignment from onboarding; onboarding becomes UX guidance only.

**Status:** ✅ Decision finalized (see AD-5)

**Files to modify:**

#### 1. Client onboarding components

**Remove any `role` state/selection from onboarding forms.**

**Replace with UX guidance:**
```tsx
// Instead of: "What role do you want?" → assign role
// Do: "What would you like to do?" → redirect

const OnboardingComplete = ({ intent }: { intent: 'organize' | 'attend' }) => {
  if (intent === 'organize') {
    return (
      <div>
        <h2>Ready to organize your first conference?</h2>
        <Button href="/conferences/new">Create Conference</Button>
      </div>
    );
  }
  
  return (
    <div>
      <h2>Discover conferences</h2>
      <Button href="/discover">Browse Conferences</Button>
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Onboarding does not call any role-setting endpoint
- [ ] Onboarding intent is used for UX routing only
- [ ] No `AdminAddUserToGroup` calls during onboarding

---

### Phase 9: Legacy `custom:role` Handling

**Decision:** Ignore forever (recommended)

**Rationale:**
- Attribute is already ignored in code
- Old users will re-upgrade when they create a conference
- Avoids migration complexity

**Alternative (if needed):** One-time migration script
```ts
// scripts/migrate-legacy-roles.ts (run once, then delete)
async function migrateLegacyRoles() {
  // List all users with custom:role = 'organizer' in Cognito
  // For each, call AdminAddUserToGroup(sub, 'organizer')
  // Log results
}
```

**Acceptance Criteria:**
- [ ] Decision documented
- [ ] No code reads `custom:role` for authorization

---

### Phase 10: Resilience Validation

**Objective:** Prove the system survives DB reset.

**Manual test procedure:**
1. Create user, add to `organizer` group in Cognito
2. Sign in → verify organizer access works
3. **Drop/reset the database** (`prisma migrate reset`)
4. Sign in again
5. **Expected:** 
   - User row recreated (via upsert)
   - Role derived from token = `organizer`
   - DB role synced to `organizer`
   - Organizer routes accessible

**Automated integration test:**
```ts
describe('Resilience: DB reset recovery', () => {
  it('restores role from token when user row does not exist', async () => {
    // Token has cognito:groups: ['organizer']
    // DB has no user row
    mockJwtVerify({ sub: 'new-user', 'cognito:groups': ['organizer'], ... });
    mockPrismaFindUnique(null); // User not found
    
    // Upsert should create user with organizer role
    const res = await request(app)
      .post('/api/users/upsert')
      .set('Authorization', 'Bearer valid');
    
    expect(res.body.role).toBe('organizer');
  });
});
```

**Acceptance Criteria:**
- [ ] Manual DB reset test passes
- [ ] Automated test verifies role recovery
- [ ] No data loss for authorization after DB reset

---

## Violation Examples (Anti-Patterns)

The following patterns violate ADR-008 and must be treated as bugs:

```ts
// ❌ VIOLATION: Reading DB role for authorization
if (dbUser.role === 'admin') {
  // grant access
}

// ❌ VIOLATION: Accepting role from client
const { role } = req.body;
await prisma.user.update({ data: { role } });

// ❌ VIOLATION: Decoding without verification
const decoded = jwt.decode(token);
const role = decoded['cognito:groups'];

// ❌ VIOLATION: Granting role during onboarding
if (onboardingIntent === 'organize') {
  await addUserToGroup(user, 'organizer'); // WRONG
}

// ❌ VIOLATION: Blocking on DB sync failure
const tokenRole = roleFromGroups(groups);
await prisma.user.update({ data: { role: tokenRole } }); // blocks
if (updateFailed) return res.status(500); // denies access
```

---

## Summary Checklist

| Phase | Deliverable | Test Coverage | Status |
|-------|-------------|---------------|--------|
| 0 | Cognito Groups created | Manual (decode token) | ⬜ |
| 1 | `roleFromGroups()` + Cognito Admin SDK | Unit tests | ⬜ |
| 2 | Token-wins middleware | Middleware tests | ⬜ |
| 3 | Upgrade → Cognito group mutation | Integration tests | ⬜ |
| 4 | Lock down client role payloads | Integration tests | ⬜ |
| 5 | DB role sync on login | Integration tests | ⬜ |
| 6 | Optional auth verification | Middleware tests | ⬜ |
| 7 | Client token refresh | E2E/manual | ⬜ |
| 8 | Onboarding role removal | Manual verification | ✅ (Decision) |
| 9 | Legacy attribute decision | Documentation | ✅ (Decision) |
| 10 | Resilience validation | Manual + integration | ⬜ |

---

## Environment Requirements

| Item | Value | Source |
|------|-------|--------|
| AWS Region | `eu-north-1` | `.env` |
| User Pool ID | `eu-north-1_N7TpdUQG7` | `.env` |
| Client ID | (configured) | `.env` |
| AWS credentials | `~/.aws/credentials` (local) or IAM role (prod) | AWS CLI |

---

## Thesis-Quality Summary

> *The system uses AWS Cognito Groups as the authoritative source of user roles. The backend derives the effective role from verified access token claims (`cognito:groups`) with precedence `admin > organizer > user`. Role upgrades are performed server-side only via Cognito Admin APIs and occur strictly after successful domain actions (conference creation). The database stores roles as a cached mirror for querying purposes but is never treated as the source of truth for authorization decisions. Database sync is non-blocking; authorization proceeds based solely on verified token claims. This architecture ensures role persistence across database resets, prevents privilege escalation, and maintains availability even during partial infrastructure failures.*

---

## References

- ADR-007: Schema Drift Recovery
- [AWS Cognito User Pool Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)
- [AWS SDK CognitoIdentityProvider](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/)
- [OAuth 2.0 Access Token Best Practices](https://datatracker.ietf.org/doc/html/rfc6749)
```

---
