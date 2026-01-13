# Capability Model Migration: Attendee → User and Route Strategy

Date: 2025-11-06
Owner: Platform Team

## Summary
We have migrated from a role model using `attendee | organizer | admin` to a capability-based model using `user | organizer | admin`.

- "Attendee" is no longer a global role. Participation is expressed contextually via data models like `Attendance`, `AbstractSubmission`, and `PresentationAuthor`.
- Server has been updated: Prisma `Role` enum, route guards, key controllers, and seed data. Some generated URLs and UI route segments still use `/attendee/` as a namespace — this is now a UX term rather than a role name.

## What changed (implemented)
- Prisma `enum Role { user, organizer, admin }` (replaces `attendee`).
- Backend route guards updated to allow `user` where applicable.
- Controllers updated in first pass:
  - `userControllers.upsertUser` default role → `user`.
  - `presentationControllers.searchUsers` filters now include `user, organizer`.
  - `attendeeControllers` userContext uses `user` (no longer returns `attendee`).
  - Seeds (`seed-full-conference.ts`) create base accounts with `Role.user`.
- Tests updated: `authMiddleware.test.ts` uses `user` instead of `attendee`.

## Open considerations
- Client role unions and helpers still reference `attendee` (e.g., `AuthContext.isAttendee`, `types/auth.ts`). These should be migrated to `user` after we finalize the route strategy below.
- Several server-generated navigation URLs still embed `/attendee/` in strings.

---

## Route Strategy Options

### Option A: Keep `/attendee/` segment (as a UX namespace)
Treat `/attendee/` as a product area label for end-user features (discover, favorites, my conferences, submissions), not as a role.

Pros:
- Minimal churn. No mass renames in server-generated URLs or client route group names.
- Keeps the mental model of two dashboards: Organizer vs Attendee (end-user) areas.
- Faster delivery; reduces risk across deep-linked pages and bookmarks.

Cons:
- Semantic mismatch: the segment implies a role we no longer have.
- Potential confusion for new contributors and in API docs.

Required steps (short-term):
- Documentation: Clarify in README and this note that `/attendee/` is a UX namespace. Not a role.
- Ensure all server guards use `user | organizer | admin` — done.
- Leave server URL builders pointing to `/attendee/` for now.

Optional (to reduce confusion):
- Add a short note in server controllers where URLs are constructed.
- Add code comments in client `(attendee)` layout explaining the namespace rationale.

### Option B: Rename to `/user/` (or neutral alternative)
Refactor `/attendee/` segment to `/user/` (or `/me/` for personal area; `/public/` already exists for browsing).

Pros:
- Aligns naming with the new capability model.
- Reduces cognitive overhead when scanning routes and code.

Cons:
- Medium churn: update many client routes, links, and server-generated URLs; add redirects.
- Potential impact on cached links and user bookmarks (mitigated by redirects).

Suggested mapping:
- `/attendee/dashboard` → `/user/dashboard`
- `/attendee/discover` → `/public/discover` (or keep under `/user` if tightly coupled to account context)
- `/attendee/favorites` → `/user/favorites`
- `/attendee/my-conferences/*` → `/user/my-conferences/*`
- `/attendee/my-submissions/*` → `/user/my-submissions/*`
- Keep organizer routes under `/organizer/*`.

Backend updates needed:
- Replace hard-coded `/attendee/...` URLs in controllers with `/user/...` (e.g., `scheduleControllers.ts`, `searchControllers.ts`).
- Add temporary compatibility redirects for old `/attendee/*` paths.

Frontend updates needed:
- Rename `(attendee)/` route group to `(user)/` (or `(account)/`).
- Update links, navigation, and any route-based guards.
- Add Next.js redirects from `/attendee/*` → `/user/*`.

---

## Affected areas checklist

Backend:
- [x] Prisma Role enum (schema + migrations)
- [x] Controllers: user upsert default role, searchUsers filter
- [x] Seeds: base users created as `Role.user`
- [x] Tests: `authMiddleware.test.ts` role values
- [ ] Controllers: URL strings with `/attendee/` (Option A: document; Option B: refactor)

Frontend:
- [ ] Types: `User.role` union (`'user' | 'organizer' | 'admin'`)
- [ ] Context: remove `isAttendee`, add `isUser` or rely on `!!user`
- [ ] Feature imports and guards referencing `'attendee'`
- [ ] Route group rename if Option B is chosen

DX & Docs:
- [x] This migration note
- [ ] README update summarizing capability model

---

## Decision guidance
Choose Option A if we want to ship quickly and avoid broad renames during active feature work. Choose Option B if we prioritize long-term clarity and can dedicate a short refactor window.

We can also stage Option B in two phases:
1) Add redirects and update server URL builders first; keep client routes temporarily.
2) Rename client route group and remove redirects after QA.

---

## Validation
- Server build: `npm run build` (done) — PASS
- Tests: `npm test` — should pass after replacing test role literals.
- Seed: `npm run seed:full` on dev DB — creates `user`-role accounts.

## Appendix: Key files touched
- Server
  - `prisma/schema.prisma` (Role enum)
  - `src/routes/*` guards use `user`
  - `src/controllers/userControllers.ts` upsert default `user`
  - `src/controllers/presentationControllers.ts` searchUsers filter
  - `src/controllers/attendeeControllers.ts` userContext role string → `user`
  - `prisma/seed-full-conference.ts` Role.user
  - `tests/authMiddleware.test.ts` updated role literals
- Client (pending)
  - `src/types/auth.ts` role union
  - `src/features/auth/context/AuthContext.tsx` `isAttendee`
  - `(attendee)/` route group and internal links
