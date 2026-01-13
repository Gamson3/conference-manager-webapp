# Auth Flow Resilience and Security Decisions

Date: 2025-11-07

> **⚠️ UPDATE - January 2026**
> This document has been **superseded by ADR-008** for role resolution.
> The key change: **Cognito groups are now authoritative** for roles, not the DB.
> See: [`docs/new/ADR/ADR-008-token-wins-role-resolution.md`](new/ADR/ADR-008-token-wins-role-resolution.md)
>
> The resilience patterns documented here (auto-upsert, error mapping, region inference) remain valid.
> The role handling section is outdated; token claims now determine authorization.

This note documents recent changes to the authentication path across client and server, the motivations behind them, and validation steps, for inclusion in the thesis project documentation.

## Summary of Changes

- Cognito region inference enabled in client (`cognito.ts`).
  - If `NEXT_PUBLIC_AWS_COGNITO_REGION` is not set, region is inferred from `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID` prefix (e.g., `eu-north-1_XXXX` → `eu-north-1`).
- API base URL alignment (`client/src/lib/api/{client,endpoints}.ts`).
  - Both resolve API base from `NEXT_PUBLIC_API_BASE_URL` with sensible fallback to `http://localhost:3001`.
- Friendly auth error messaging (`client/src/lib/auth/errors.ts`).
  - Cognito exception codes mapped to clean, user-facing messages (e.g., `NotAuthorizedException` → “Incorrect email or password.”).
- Automatic backend user bootstrap after Cognito sign-in (`AuthContext.tsx` → `upsertProfile`).
  - On successful login, the client ensures the user exists in the DB via POST `/users/upsert` using `cognitoId`, name, and email.
  - If the DB was wiped, first login recreates the user seamlessly.
- Hardened role handling for user upsert (client + server).
  - Client: removed `role` from `upsertProfile` payload to prevent privilege hints from the browser.
  - Server: `POST /users/upsert` now ignores role input entirely; it only syncs `name`/`email`. New users default to role `user`. Role changes require dedicated endpoints (e.g., admin role change or self-upgrade to organizer).

## Rationale

- Reliability during development: Databases may be reset frequently. Auto-upsert guarantees a successful login recreates the profile without manual steps.
- UX clarity: Cognito errors are technical; mapping them reduces confusion and support burden.
- Security: Removing role from client upsert prevents any possibility of privilege escalation through crafted requests or stale local state.
- Configuration correctness: Region inference avoids misconfigured Cognito endpoints that lead to opaque 400 errors.

## Alternatives Considered

- Manual backfill scripts only: Slower developer feedback loops; retained docs for bulk backfill as an optional path.
- Accepting `role` in upsert and validating server-side: Simpler but unnecessary; safer to centralize role mutations in explicit endpoints with proper authorization.

## Impacted Files (Key)

- Client:
  - `src/lib/auth/cognito.ts`
  - `src/features/auth/context/AuthContext.tsx`
  - `src/features/auth/api/authApi.ts`
  - `src/lib/api/client.ts`, `src/lib/api/endpoints.ts`
  - `src/lib/auth/errors.ts`
- Server:
  - `src/controllers/userControllers.ts` (upsertUser)

## Validation

- Build: Server TypeScript build succeeds (tsc) after the changes.
- Tests: Suite can be executed via `npm test` in `server/` (Vitest). Some tests may require a configured `.env` and database; when configured, they verify middleware and flows.
- Manual smoke (expected):
  1. Ensure Cognito envs are set in client `.env.local`.
  2. Start client and server.
  3. Sign in with an existing Cognito user after clearing DB.
  4. Observe that the user row is recreated; `/users/me` returns profile.
  5. Intentional bad password shows a friendly error message.

## Risks & Mitigations

- Risk: Silent failure to create DB user if backend unavailable.
  - Mitigation: Client falls back to local minimal user and re-syncs on next successful `/users/me`.
- Risk: Role drift after resets.
  - Mitigation: Role is now entirely controlled server-side via dedicated endpoints.

## Next Steps

- Add UI for organizer self-upgrade (calls `/users/upgrade-organizer`).
- Redirect legacy `(attendee)` routes to new `account/` structure.
- Wire data into `account/` pages (conferences, favorites, submissions) and organizer views.