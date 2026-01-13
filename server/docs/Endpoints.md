# Conference Master API Endpoints (Refactored Schema)

This document captures the current state of key backend endpoints after the promotion of the refined capability-based schema (ConferenceParticipant + unified Submission models) and the recent feature/test hardening.

> NOTE: Role strings used below correspond to authenticated `req.user.role` values: `user`, `organizer`, `admin`. In tests, these are injected via `x-user-id` / `x-user-role` headers when `NODE_ENV=test`.

## Auth Conventions
- Protected routes use `authMiddleware([...allowedRoles])`.
- In test mode (`NODE_ENV=test`), you may provide headers: `x-user-id`, `x-user-role`.
- Production uses Cognito JWTs (Authorization: `Bearer <token>`).

## CFP and Registration Windows
To decouple publication from submissions/registration phases, the `Conference` model includes:

- `submissionsOpenFrom: DateTime?`
- `submissionsOpenUntil: DateTime?`
- `submissionsVisibility: 'public' | 'invite_only' | 'private'` (default `public`)
- `submissionInviteCode: string?` (used only when `invite_only`)
- `registrationOpenFrom: DateTime?`
- `registrationOpenUntil: DateTime?`

Additional scheduling and review controls:

- `reviewStartsAt: DateTime?` / `reviewEndsAt: DateTime?` – optional review window for organizers/reviewers.
- `schedulePublishedAt: DateTime?` – timestamp when the schedule is publicly released.
- `maxSubmissionsPerUser: Int?` – optional cap enforced for authors (excludes withdrawn submissions).
- Organizer profile fields for public display and outreach:
  - `organizerName`, `organizerEmail`, `organizerPhone`, `organizerWebsite`, `organizerLogoUrl`.

Computed flags (not stored) are exposed on public listings and details:
- `isSubmissionOpen = now ∈ [submissionsOpenFrom, submissionsOpenUntil]` (open when bounds are null)
- `isRegistrationOpen = now ∈ [registrationOpenFrom, registrationOpenUntil]` (open when bounds are null)

Gating behavior:
- Registration endpoint (`POST /api/conferences/:id/register`) requires `isRegistrationOpen` unless organizer/admin/owner.
- Submission creation/submit endpoints require `isSubmissionOpen` and:
  - `submissionsVisibility = public` → allowed
  - `invite_only` → require `inviteCode` in request body matching conference `submissionInviteCode`
  - `private` → disallowed for regular authors (organizer/admin/owner bypass)

## Participants
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/api/conferences/:id/register` | user, organizer, admin | Self‑register as attendee (role=attendee, status=registered) |
| DELETE | `/api/conferences/:id/unregister` | user, organizer, admin | Remove own attendee registration |
| GET | `/api/conferences/:id/participants` | organizer, admin | List participants (supports filtering, optional pagination) |
| GET | `/api/conferences/:id/participants/stats` | organizer, admin | Aggregate stats with `total`, `byRole`, `byStatus` |

### List Participants Query Params
- `role` (string) – filter by participant role (e.g. `attendee`)
- `status` (string) – filter by participant status (`registered`, etc.)
- `page` (number, optional) – 1-based page index
- `pageSize` (number, optional) – page size (default 20 when `page` is provided, max 100)

### Stats Response Shape
```json
{
  "conferenceId": 123,
  "total": 42,
  "byRole": { "attendee": 40, "speaker": 2 },
  "byStatus": { "registered": 41, "cancelled": 1 }
}
```

## Submissions (Unified Model)
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/api/conferences/:id/submissions` | user, organizer, admin | Create draft submission (author = current user) |
| PUT | `/api/submissions/:submissionId` | user, organizer, admin | Update draft (author only; fails after submit) |
| POST | `/api/submissions/:submissionId/submit` | user, organizer, admin | Transition DRAFT -> SUBMITTED |
| POST | `/api/submissions/:submissionId/withdraw` | user, organizer, admin | Author withdraw (only before decision) |
| GET | `/api/conferences/:id/submissions` | user, organizer, admin | List submissions (visibility filtered for authors, optional pagination) |
| POST | `/api/submissions/:submissionId/review` | organizer, admin | Add/update review (reviewer = organizer/admin) |
| POST | `/api/submissions/:submissionId/decision` | organizer, admin | Accept / Reject (locks status) |

Read-only views:

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/conferences/:id/accepted-presentations` | public (published), organizer, admin | List accepted submissions with optional presentation context |
| GET | `/api/conferences/:id/speakers` | public (published), organizer, admin | Distinct presenter list derived from scheduled presentations |

### Visibility Rules (GET list)
- Organizer/Admin: sees all submissions for the conference.
- Regular user (author role): only submissions where `authorId = current user`.

### State Transitions
```
DRAFT --submit--> SUBMITTED --decision--> ACCEPTED | REJECTED
   | \--withdraw (only while DRAFT or SUBMITTED)--> WITHDRAWN
```
- Updates allowed only in DRAFT.
- Duplicate submit request returns an error (idempotence guard).
- Withdraw after decision = 400 (disallowed).

## Presentations
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/sections/:sessionId/presentations` | organizer, admin | List presentations in a section (ordered) |
| POST | `/api/sections/:sessionId/presentations/reorder` | organizer, admin | Reorder presentations (continuous sequence validation) |
| POST | `/api/presentations` | organizer, admin | Create presentation |
| PUT | `/api/presentations/:id` | organizer, admin | Update presentation |
| DELETE | `/api/presentations/:id` | organizer, admin | Delete presentation |
| POST | `/api/presentations/:id/authors` | organizer, admin | Assign authors (simplified) |
| POST | `/api/presentations/:id/assign-section` | organizer, admin | Move presentation (append or insert with order shifting) |

### Ordering Constraints
- Schema enforces unique `(sectionId, order)`.
- Reorder algorithm uses two-phase approach to avoid temporary unique conflicts:
  1. Shift all targeted items to a high temporary range.
  2. Reassign final contiguous orders starting at 1.
- Validation rejects non-continuous order sets (e.g. gaps or duplicates).
- Locked presentations (`status = locked`) cannot be reordered or moved.

### Assign/Migrate Between Sections
Request Body:
```json
{
  "targetSectionId": 456,
  "targetOrder": 2   // optional; if omitted -> append
}
```
Behavior:
- If `targetOrder` omitted: appended after current max order in target section.
- If provided: order >=1; subsequent presentations shift down (+1) atomically.
- Presenter conflict check: if any author (presenter) already present in target section, request fails (409/400 based on implementation) before modifications.
- Locked source presentation is immutable.

## Schedule Access
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/conferences/:id/schedule` | user, organizer, admin | Draft schedule visible only to organizer/admin; published visible to all authenticated users |

Rules:
- If conference `status != 'published'`: only creator/organizer/admin authorized (regular users receive 403).

## Favorites (Selected)
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/api/presentations/:id/favorite` | user, organizer, admin | Add presentation favorite |
| DELETE | `/api/presentations/:id/favorite` | user, organizer, admin | Remove favorite |
| GET | `/api/users/presentation-favorites` | user, organizer, admin | List user favorites |

## Search (Selected)
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/conferences/:id/search` | user, organizer, admin | Search presentations within a conference (access gating same as schedule) |
| GET | `/api/search/global` | user, organizer, admin | Global search across accessible conferences |
| GET | `/api/conferences/:id/search/tree` | user, organizer, admin | Search with hierarchical context |

## Error Handling Patterns
| Scenario | Typical Status | Notes |
|----------|----------------|-------|
| Unauthorized (no/invalid token) | 401 | Missing bearer or invalid JWT |
| Forbidden (role) | 403 | Authenticated but disallowed role or draft access restriction |
| Not Found | 404 | Resource ID invalid or not visible |
| Validation error | 400 | Non-continuous order, invalid state transition, duplicate submit, conflict |
| Conflict (uniqueness / presenter) | 409 | Presenter duplication in target section (may be 400 if normalized) |

## Pagination Behavior
- Pagination is optional and backwards compatible.
- If `page`/`pageSize` are NOT provided, endpoints return the full array (legacy behavior).
- If `page` and/or `pageSize` are provided, endpoints return only the requested page items and set headers:
  - `X-Total-Count`: total number of items matching the filter
  - `X-Page`: current page (1-based)
  - `X-Page-Size`: effective page size
  The response body remains an array of items for easy drop-in usage.

## Testing Conventions
- Supertest requests attach test auth headers.
- Cleanup order ensures FK constraints respected (delete reviews -> submissions -> authors -> presentations -> participants -> sections -> days -> conference -> users).
- Two-phase reorder logic covered in `tests/presentations.reorder.test.ts`.
- Assignment behaviors & conflicts covered in `tests/presentations.assign.test.ts`.
- Submission lifecycle & edge cases covered in `tests/submissions.test.ts`.
- Visibility / schedule access / participant stats in their dedicated test files.

## Pending Enhancements
- Pagination for: submissions list, participants list, potentially schedule queries.
- Expanded analytics endpoints.
- Public unauthenticated schedule (future toggle) when published & isPublic.
- Role-based fine-grained reviewer model (separate from organizer/admin).

## Changelog (Recent)
- Added `total` to participant stats response.
- Enabled author visibility filtering for submissions list while allowing `user` role access to route.
- Implemented two-phase reorder to prevent unique constraint collisions.
- Added presenter conflict detection on cross-section assignment.

---
Generated: (automated draft). Review and adjust as business logic evolves.

### Schedule Publish Toggle
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| PATCH | `/api/conferences/:conferenceId/schedule/publish` | organizer, admin | Set `schedulePublishedAt = now()` |
| PATCH | `/api/conferences/:conferenceId/schedule/unpublish` | organizer, admin | Clear `schedulePublishedAt` |

When `schedulePublishedAt` is set and the conference is `published` and `isPublic`, public pages can render the schedule and speaker lists without auth.
