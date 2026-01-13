# Conference Master Web App — Project Overview

> Audience: new contributors, thesis reviewers, and maintainers
> 
> This document is a consolidated, repo-grounded overview of what the project is, what it aims to achieve, how it works today, and how the major roles (Organizer vs Attendee/User) experience the platform.

---

## 0) Quick Summary

Conference Master is a full‑stack web application for running academic/industry conferences end‑to‑end:
- Organizers create and configure conferences (CFP/submissions, registration, schedule, website)
- Attendees discover conferences, register, view schedules, and engage with content
- Authors submit abstracts (unified “Submission” model), which organizers review and decide
- Accepted submissions become scheduled presentations (Day → Section/Session → Presentation)

The system uses a capability-based data model: global access is governed by the user’s role (user/organizer/admin), while conference‑scoped capabilities are represented by participant roles.

---

## 1) Product Goals & Project Needs

### 1.1 What we are building
- A **conference operations platform** that covers the full lifecycle: setup → CFP/submissions → review/decisions → scheduling → attendance → feedback/materials.

### 1.2 Why it exists (needs)
- Reduce organizer overhead by consolidating configuration and operational workflows.
- Provide a clear UX for attendees/authors: discover → register → submit → track decisions → attend.
- Ensure **security and correctness** around role/capability boundaries (organizer vs attendee).
- Support rapid iteration for a thesis implementation: strong developer ergonomics, seeded datasets, and testability.

### 1.3 What “done” looks like (high-level)
- Organizers can run a realistic conference without manual database edits.
- Submissions and decisions flow into a publishable schedule.
- Public/attendee views reflect publication and window gating (CFP open/closed, registration open/closed, schedule publish).

---

## 2) Architecture at a Glance

### 2.1 Monorepo layout
- `client/`: Next.js frontend (App Router)
- `server/`: Node/Express backend + Prisma ORM
- `docs/`: project-wide documentation and architecture notes

### 2.2 Core runtime flow
1. User signs in via AWS Cognito (client)
2. Client calls backend APIs with Cognito ID token (Bearer auth)
3. Server verifies token via JWKS (prod) or accepts injected headers (tests)
4. Server extracts role from JWT `cognito:groups` claim (ADR-008 token-wins)
5. Server authorizes request using token-derived role for global access; DB for conference-scoped participation
6. Server reads/writes Postgres via Prisma

Key principle: **Authorization is token-authoritative (ADR-008)**. Cognito groups in JWT claims determine global roles (user/organizer/admin). DB `User.role` is a non-authoritative mirror that syncs opportunistically. Conference-scoped capabilities use ConferenceParticipant records.

---

## 3) Tech Stack

### 3.1 Frontend
- Next.js (App Router)
- TypeScript
- Tailwind + shadcn/ui style primitives
- React Query (`@tanstack/react-query`) for server state (caching, mutations)
- AWS Amplify (Cognito) for authentication

### 3.2 Backend
- Node.js + Express (TypeScript)
- Prisma ORM
- PostgreSQL (with PostGIS extension enabled)
- Auth: JWT verification (`jose`) against Cognito JWKS

---

## 4) State Management (How “state” is handled)

### 4.1 Server state (API data)
- React Query is the default mechanism:
  - Query caching reduces duplicate requests
  - Mutations invalidate/refetch relevant keys
  - Global defaults are set in the app providers

The frontend’s API layer uses a single Axios client that:
- attaches the latest Cognito access token per request (client-side only)
- has standardized error messaging
- redirects on 401 (login) and generally redirects on 403 unless a request opts out (used for the “upgrade to organizer” UX)

### 4.2 Auth state
- A dedicated AuthContext provides:
  - current user identity and role
  - organizer upgrade flow
  - guarded navigation to organizer surfaces

### 4.3 Local/UI state
- Complex UI flows (ex: schedule builder) use feature-local component state and reducers, designed to be persisted via explicit “Save” actions.

---

## 5) Core Data Model Concepts (Prisma)

> This section describes concepts (not every field). See `server/prisma/schema.prisma` for authoritative definitions.

### 5.1 Users and roles
- `User.role`: global role gate
  - `user` (attendee/author)
  - `organizer`
  - `admin`

### 5.2 Conference
- `Conference`: container for everything conference-scoped
- Created/owned by an organizer via `createdById`
- Supports windows and publication flags:
  - CFP: `submissionsOpenFrom`, `submissionsOpenUntil`, `submissionsVisibility`, `submissionInviteCode`
  - Registration: `registrationOpenFrom`, `registrationOpenUntil` plus registration settings (fee, capacity, waitlist, approvals)
  - Schedule: `schedulePublishedAt`

### 5.3 Capability-based participation
- `ConferenceParticipant`: ties users to conferences with a `role` and `status`
  - schema supports roles like attendee/presenter/author/sponsor/volunteer (and includes `reviewer` in the enum)
  - current app flow: **organizers/admins perform review actions and decisions**; external reviewer workflows are not treated as a first-class supported product surface

### 5.4 Submissions → Presentations
- `Submission`: unified model for drafts, submitted, under review, accepted/rejected/withdrawn
- `Presentation`: scheduled talk/poster/etc in a session/section
- Hierarchy: `Day` → `Section` (session) → `Presentation`

---

## 6) Organizer Functionality (Supply-side)

This section summarizes organizer workflows; detailed IA/coverage exists in `client/docs/Organizer-Functional-Spec.md`.

### 6.1 Conference lifecycle
- Create conference (draft)
- Configure setup: categories, presentation types, submission requirements, registration questions, website content
- Publish conference and control visibility

Common organizer tasks:
- Define CFP and registration windows (open/close dates)
- Configure capacity and registration behavior (waitlist, approvals, fees)
- Maintain public-facing organizer profile fields (name/email/phone/logo) for the conference website

### 6.2 Submissions & decisions
- View submissions across all statuses
- Review submissions and record decisions
- Accepted items can be scheduled as presentations

Implementation notes (backend contract level):
- Submissions are a unified state machine: Draft → Submitted → Accepted/Rejected, with Withdraw as an allowed branch pre-decision
- Review and decision endpoints are restricted to organizer/admin

### 6.3 Schedule builder
- Create days and sessions (sections)
- Drag-and-drop scheduling of presentations with validation
- Publish schedule for public viewing

Schedule invariants emphasized by the codebase:
- A presentation is assigned to a session via `presentation.sectionId`
- Ordering within a session uses `presentation.order` with a schema-level uniqueness constraint on `(sectionId, order)`
- Reorder/move operations are transactional and validate continuous sequences

### 6.4 Participants
- View participants and statistics
- Manage conference participation roles and statuses

Participant records also store custom registration question responses as JSON to support flexible registration forms.

### 6.5 Website, materials, reports
- Public page editing and materials management
- Analytics/exports (mixed completion depending on page)

---

## 7) Attendee/User Functionality (Demand-side)

### 7.1 Discover and view
- Browse conferences (public view)
- View conference details, program/schedule, speakers (when published)

Visibility is influenced by:
- conference publication status and `isPublic`
- whether the schedule has been published (`schedulePublishedAt`)

### 7.2 Register
- Register/unregister within registration windows
- Answer custom registration questions

Registration behavior can be configured by organizers (fees, waitlist, approval-required flows), and endpoints enforce window gating for normal users.

### 7.3 Submit abstracts (author flow)
- Create draft submissions
- Submit within CFP window rules
- Withdraw before final decision

Invite-only CFPs are supported via `submissionsVisibility = invite_only` + `submissionInviteCode`.

### 7.4 Engagement
- Favorites (conference/presentations)
- Feedback (conference/presentation)

---

## 8) API & Authorization Principles

### 8.1 Auth conventions
- Organizer/admin routes are protected via middleware role checks
- In test mode, roles can be injected via headers for fast API tests

Test-mode headers:
- `x-user-id`
- `x-user-role`

### 8.2 Window gating
- CFP and registration endpoints enforce conference windows for normal users
- Organizer/admin can bypass for operational needs

---

## 9) Development & Testing Notes

### 9.1 Seed data
- The repo includes seed scripts to generate realistic data for manual testing.
- Manual testing seed supports repeatable reseeding by removing existing test conferences by known slugs.

Manual testing seed focus:
- creates two conferences (one published, one draft)
- creates submissions across all statuses
- creates schedule structure (days/sessions/presentations)
- creates participants, favorites, feedback, and organizer-authored reviews for under-review submissions

### 9.2 Running locally (high level)
- Run `client` and `server` dev processes
- Ensure `DATABASE_URL` is configured

Typical dev ports:
- client: 3000
- server: 3001

---

## 10) References (Source-of-truth docs)
- `client/docs/Organizer-Functional-Spec.md`
- `docs/Schedule-Builder.md`
- `server/docs/Endpoints.md`
- `docs/Organizer-Routes-and-Endpoints.md`
- `docs/Project-Decisions-and-Progress.md`
- `client/docs/Recent-Implementation-Decisions.md`

---

## Appendix A) Terminology

- **Session**: what the UI typically calls a scheduled block (talk session, workshop, break). In Prisma, this is the `Section` model.
- **Schedule Builder**: organizer tool for arranging accepted items into sessions across multiple days.
- **Submission**: unified record representing an abstract through its lifecycle (draft → submitted → decided).
- **Presentation**: a scheduled item in the program, assigned to a session (`Section`) and ordered.

---

## Appendix B) Feature Map (High Level)

This is a “what lives where” map for quick onboarding.

Frontend (client):
- Auth + role gating: App Router route groups + auth context
- Data fetching: React Query + shared Axios client
- Organizer surfaces: `/organizer/...` conference management UIs
- Public/attendee surfaces: conference discovery + detail pages

Backend (server):
- REST endpoints with role gating via middleware
- Prisma-backed models for conferences, submissions, schedule, participants
- Transactional schedule mutations (reorder/move) to preserve ordering constraints

---

## Appendix C) “No Assumptions” Checklist (Verified vs Gaps)

This appendix exists to prevent thesis/proposal documents from claiming features that are not yet implemented.

### C.1 Confirmed true today (schema + controllers)
- **Conference authority is ownership-based**: organizer/admin checks are primarily `conference.createdById === userId` (plus admin bypass).
- **Submission lifecycle gating exists**:
  - CFP window and `submissionsVisibility` (public/private/invite_only) enforced for normal users.
  - Organizers/admin can bypass window gating for operational needs.
- **Locking exists and is enforced**:
  - `Submission.isLocked/lockedAt/lockedReason` prevents draft edits once locked.
  - Submissions lock when submitted and when withdrawn.
  - Submissions can also be locked when scheduled into the program.
- **Favorites exist end-to-end** (API + client integration): conference and presentation favorites, plus bulk status checks.
- **Search exists server-side**: the server exposes presentation search and search suggestions that consider author/title/section/keyword.

### C.2 Common incorrect assumptions (not true today)
- **There is no `ConferenceParticipationRole.organizer`** in Prisma. Organizers are a global `User.role` and conference ownership is `Conference.createdById`.
- **External reviewer workflow is not a first-class supported product surface**:
  - The enum includes `reviewer`, but review/decision endpoints are organizer/admin oriented.
  - Do not claim “external reviewers review submissions” unless/until a reviewer-scoped workflow is added.

### C.3 Implemented but incomplete / mismatched
- **Multi-author submissions are not persisted in the current DB model**:
  - The `Submission` model stores a single `authorId` plus optional contact fields (email/affiliation/phone/orcid).
  - Presentation authors do support multiple authors (`PresentationAuthor[]`), but that applies to scheduled presentations.
  - The client submission flow collects multiple authors, which currently does not map 1:1 onto persisted `Submission` data.
- **SubmissionRequirements exist but are not fully enforced**:
  - Schema supports keyword/abstract length limits and author-contact collection toggles.
  - Current `createSubmission`/`submitSubmission` logic enforces only “title + abstract required”, not the full requirements matrix.

### C.4 Not yet implemented (gaps to avoid claiming)
- **Abstract/PDF upload persistence for submissions is not represented in Prisma**:
  - Submission requirements include `abstractUploadMode`, file label/required flags, and allowed file types/size.
  - There is no `SubmissionFile` (or equivalent) model storing an uploaded file URL for a submission.
  - Do not claim “authors upload a PDF stored with the submission” unless/until storage + schema + endpoints exist.
- **Organizer impersonation (for conference owners) is not established**:
  - Admin impersonation + audit logging exists; organizer-level impersonation is not confirmed as a supported feature.

### C.5 Cleanups worth tracking (schema clarity)
- **Relation naming reuse risk**: both `ImpersonationLog` and `AdminAuditLog` relate to `User` using the same relation name `"ImpersonatedUser"`.
  - Prisma may accept this, but it is confusing and is a good candidate for a safe rename migration to reduce ambiguity.
