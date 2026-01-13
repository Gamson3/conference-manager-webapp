# Proposed Client Folder Structure

This document captures the full proposed Next.js (App Router) folder & feature structure for the Conference Manager client. It acts as a durable reference to prevent drift as we implement features beyond authentication. Only the auth pages exist today; everything else is planned and will be brought online in phased milestones. Refinements are allowed when required by emergent needs, but any deviations should be noted in a short "STRUCTURE_CHANGES" section appended here.

---
## Guiding Principles
1. Capability-Oriented: Global `User.role` (user | organizer | admin) + per-conference capabilities via `ConferenceParticipant.role` (attendee | presenter | author | reviewer | sponsor | volunteer). Route groups reflect access surfaces; feature folders encapsulate UI + API + hooks.
2. Feature Modularity: Each domain feature (auth, conferences, submissions, schedule, presentations, participants, favorites, search, tree-view) owns its components, hooks, and API client wrappers. Shared cross-feature primitives live under `components/` and `lib/`.
3. Clear Separation of Concerns:
   - `app/` = routing + top-level composition only.
   - `features/` = domain logic (UI pieces, hooks, API wrappers).
   - `components/` = shared, reusable presentational or layout components.
   - `lib/` = framework-agnostic utilities, API clients, schemas.
   - `hooks/` = global, generic React hooks not tied to a single domain.
   - `types/` = TypeScript types & Prisma type re-exports.
4. Progressive Enhancement: Start small (auth + public browsing) and layer on organizer tools, schedule builder, submission review, participants management.
5. Testability: Feature folders will later hold optional `__tests__/` or `__stories__/` subfolders when UI complexity warrants.
6. Consistent Naming: PascalCase for components, camelCase for hooks & utility files, kebab-case for route segments.
7. Avoid Barrel Overload Early: Provide deliberate exports only where needed (`features/*/api/index.ts` etc.) to prevent unclear import surfaces.

---


---
## STRUCTURE_CHANGES (Refinement – Nov 2025)

Why: Align routing with the simplified global roles (user, organizer, admin) and contextual capabilities (attendee/author as per-conference states). Avoid duplicate URLs (e.g., two different `settings` under separate route groups) and make URL intent explicit.

Key decisions:
- Replace the old `(attendee)` group with an explicit `account/` segment for all authenticated users. This owns dashboard, discover, my-conferences, my-submissions, favorites, and account settings/security.
- Keep organizer surfaces under an explicit `organizer/` segment. Organizer settings are either unnecessary or should be per-conference; generic `/organizer/settings` is omitted to avoid overlap with profile settings.
- Route groups in parentheses do not affect URLs; use explicit segments (`account`, `organizer`, `admin`) for clear, non-colliding paths and distinct layouts.

Resulting URL contract:
- Public: `/`, `/about`, `/contact`, `/conferences`, `/conferences/[id]`, etc.
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Account (all users): `/account/dashboard`, `/account/discover`, `/account/my-conferences`, `/account/my-submissions`, `/account/favorites`, `/account/settings`, `/account/settings/security`.
- Organizer: `/organizer/dashboard`, `/organizer/conferences`, `/organizer/conferences/new`, `/organizer/conferences/[id]/...` (setup, submissions, schedule, participants, publish).
- Admin: `/admin/...` as already outlined.

Migration notes (after adopting this structure):
- Move the current `(attendee)` routes under `account/` and remove the `(attendee)` group.
- Ensure only one `settings` exists under `account/settings`. Remove `(organizer)/settings` unless you have organizer-only preferences; if needed later, name them explicitly (e.g., `/organizer/billing`).
- Update internal links and redirects (e.g., Login redirect to `/account/dashboard`).
- Use route groups inside `organizer/` or `account/` purely for colocation—not for path naming.


## High-Level Tree (Target End State)
```
client/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # Landing or dashboard redirect
│   ├── globals.css
│   │
│   ├── (public)/                     # Unauthenticated surfaces
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Marketing / landing
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   └── conferences/
│   │       ├── page.tsx              # Published conferences list
│   │       └── [id]/
│   │           ├── page.tsx          # Conference details overview
│   │           ├── schedule/page.tsx # Public schedule (published only)
│   │           ├── tree/page.tsx     # Hierarchical view
│   │           ├── search/page.tsx   # Presentation search within conf
│   │           └── presentations/
│   │               └── [presentationId]/page.tsx
│   │
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── account/                      # Authenticated user surfaces (role-agnostic)
│   │   ├── layout.tsx                # Account layout (applies to all users)
│   │   ├── dashboard/page.tsx        # Overview of registrations & actions
│   │   ├── discover/page.tsx         # Browse conferences (internal view)
│   │   ├── favorites/page.tsx
│   │   ├── my-conferences/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── schedule/page.tsx
│   │   │       └── tree/page.tsx
│   │   ├── my-submissions/
│   │   │   ├── page.tsx              # List my submissions (as contextual "author")
│   │   │   └── [id]/page.tsx         # Submission details
│   │   └── settings/
│   │       ├── page.tsx              # Profile & preferences
│   │       └── security/page.tsx     # Password, MFA, sessions
│   │
│   ├── organizer/                    # Organizer portal (role-gated)
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx        # KPIs, counts, quick actions
│   │   ├── conferences/
│   │   │   ├── page.tsx              # My conferences
│   │   │   ├── new/page.tsx          # Create new conference wizard entry
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Conference summary/admin overview
│   │   │       ├── edit/page.tsx
│   │   │       ├── setup/
│   │   │       │   ├── categories/page.tsx
│   │   │       │   ├── requirements/page.tsx
│   │   │       │   └── timeline/page.tsx
│   │   │       ├── submissions/
│   │   │       │   ├── page.tsx      # All submissions (paginated)
│   │   │       │   ├── accepted/page.tsx
│   │   │       │   └── [submissionId]/
│   │   │       │       ├── page.tsx
│   │   │       │       └── review/page.tsx
│   │   │       ├── schedule/
│   │   │       │   ├── page.tsx      # Builder shell (drag & drop)
│   │   │       │   ├── days/page.tsx
│   │   │       │   └── sections/page.tsx
│   │   │       ├── presentations/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [presentationId]/
│   │   │       │       ├── page.tsx
│   │   │       │       └── authors/page.tsx
│   │   │       ├── materials/page.tsx
│   │   │       ├── participants/page.tsx  # Manage participants + capabilities
│   │   │       ├── publish/page.tsx
│   │   │       └── analytics/page.tsx     # (Future) metrics & charts
│   │   # NOTE: No generic /organizer/settings; organizer-specific settings should be
│   │   # per-conference (under [id]/edit or setup). Use /account/settings for profile.
│   │
│   ├── (admin)/                      # Elevated platform governance
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── impersonate/page.tsx
│   │   └── conferences/page.tsx
│   │
│   ├── auth-check/page.tsx
│   └── not-authorized/page.tsx
│
├── features/
│   ├── auth/
│   │   ├── api/authApi.ts
│   │   ├── components/ (Auth forms & UI)
│   │   ├── hooks/
│   │   └── context/AuthContext.tsx
│   ├── conferences/
│   │   ├── api/conferencesApi.ts
│   │   ├── components/ (cards, list, filters, form)
│   │   └── hooks/ (useConferences, useConferenceDetails)
│   ├── submissions/
│   │   ├── api/submissionsApi.ts
│   │   ├── components/ (SubmissionForm, ReviewPanel)
│   │   └── hooks/ (useSubmissions, useSubmissionReview)
│   ├── presentations/
│   │   ├── api/presentationsApi.ts
│   │   ├── components/ (PresentationCard, Details, AuthorManagement)
│   │   └── hooks/ (usePresentations, usePresentationLock)
│   ├── schedule/
│   │   ├── api/scheduleApi.ts
│   │   ├── components/ (ScheduleBuilder, DayManager, SectionManager)
│   │   └── hooks/ (useSchedule, useScheduleBuilder)
│   ├── participants/                 # NEW (Capability management UI)
│   │   ├── api/participantsApi.ts
│   │   ├── components/ (ParticipantTable, RoleBadges, CapabilityEditor)
│   │   └── hooks/ (useParticipants, useParticipantStats)
│   ├── favorites/
│   │   ├── api/favoritesApi.ts
│   │   ├── components/ (FavoriteButton, FavoritesList)
│   │   └── hooks/ (useFavorites)
│   ├── search/
│   │   ├── api/searchApi.ts
│   │   ├── components/ (SearchBar, SearchFilters, SearchResults)
│   │   └── hooks/ (useSearch)
│   ├── tree-view/
│   │   ├── components/ (ConferenceTree, TreeNode, TreeNavigation)
│   │   └── hooks/ (useTreeView)
│   └── analytics/ (future)
│       ├── api/analyticsApi.ts
│       ├── components/ (Charts, StatsPanels)
│       └── hooks/ (useAnalytics)
│
├── components/
│   ├── layouts/ (PublicLayout, DashboardLayout, AuthLayout, Sidebar)
│   ├── shared/ (Navbar, Footer, LoadingSpinner, ErrorBoundary, EmptyState, PageHeader)
│   ├── forms/  (FormField, FormError, FormSuccess)
│   └── ui/     (shadcn-generated primitives)
│
├── lib/
│   ├── api/ (client.ts, endpoints.ts, errorHandling.ts, pagination.ts)
│   ├── auth/ (cognito.ts, session.ts)
│   ├── utils/ (dateHelpers.ts, formatters.ts, validators.ts)
│   ├── constants.ts
│   ├── schemas.ts
│   └── utils.ts
│
├── hooks/ (useAuth.ts, useDebounce.ts, useMediaQuery.ts, useToast.ts)
│
├── types/ (auth.ts, conference.ts, presentation.ts, submission.ts, schedule.ts, user.ts, index.ts)
│
└── store/ (optional - lean toward React Query first)
```

---
## Current Implementation Status (Today)
- Implemented: `features/auth`, `(auth)` route group, shared UI primitives.
- Missing / Planned: All conference, submissions, schedule, participants, favorites, search, tree-view, analytics, and admin surfaces.
- The `(attendee) deprecated now under Account` and `(organizer)` route groups presently exist but are skeletal or empty aside from placeholder pages.

---
## Phased Rollout Plan
| Phase | Focus | Key Folders Introduced | Rationale |
|-------|-------|------------------------|-----------|
| 1 | Auth + Public Browse | `(public)` basic pages, `features/conferences` (read-only) | Allow unauthenticated exploration, support user onboarding. |
| 2 | User Participation | `(attendee) deprecated now under Account` dashboard, favorites, my-conferences, `features/favorites`, `features/submissions` (author draft & submit) | Enable users to create and track submissions & favorites. |
| 3 | Organizer Core | `(organizer)/conferences/[id]/submissions`, `features/submissions` (review hooks), `features/presentations` (accepted to presentation), setup wizard | Establish end-to-end submission review & acceptance flow. |
| 4 | Schedule Builder | `(organizer)/conferences/[id]/schedule`, `features/schedule`, `features/presentations` reorder lock tools | Provide structural program building & drag/drop interactions. |
| 5 | Participants Management | `(organizer)/conferences/[id]/participants`, `features/participants` | Capability assignment & visibility stats with pagination. |
| 6 | Public Enrichment | `(public)/conferences/[id]/search`, tree view, `features/search`, `features/tree-view` | Enhanced discoverability & navigation of program content. |
| 7 | Analytics & Admin | `(organizer)/conferences/[id]/analytics`, `(admin)` group, `features/analytics` | Metrics for program performance & governance utilities. |

---
## Conventions & Contracts
### API Layer
- Every domain feature gets `api/<feature>Api.ts` exporting typed functions returning domain DTOs.
- Pagination: Functions returning lists optionally accept `{ page?: number; pageSize?: number }` & expose headers through a wrapper that returns `{ data, page, pageSize, total }`.
- Errors normalized via `lib/api/errorHandling.ts`.

### Hooks
- Naming: `use<Domain>` for list / detail, `use<Domain>Action` for mutations if needed; keep React Query usage internal.
- Hooks inside `features/*/hooks` can rely on internal types; cross-feature usage exports minimal public types from `types/`.

### Components
- Presentational components inside feature folders should not import other feature internals—compose via props.
- Shared atoms (buttons, form fields, layout scaffolds) stay in `components/ui` or `components/forms`.

### Types & Schema Alignment
- All Prisma-derived types are re-exported from `types/index.ts` for stable importing.
- Domain-specific view models (e.g., FlattenedScheduleSlot) live adjacent in feature folders or `types/` if broadly useful.

### Capability Awareness
- A `useCapabilities(conferenceId)` hook (future) inside `features/participants/hooks` exposing resolved capability flags like `{ isAuthor, isPresenter, canReview }` for conditional UI.
- Organizer-only actions check both global user role AND ownership/organizer status for the conference.

### File Naming & Structure
- Route segment files always named `page.tsx`; complex composed views can proxy to a feature component (e.g., `<ConferenceSubmissionsPage />`).
- Avoid deep nesting inside `features/*/components`; prefer suffix patterns: `ConferenceCard`, `ConferenceList`, `ConferenceForm`.

### State Management
- Prefer React Query within each feature; global query config set in root providers.
- `store/` remains optional for future cross-cutting non-server state (e.g., drag selection ephemeral state) if React Query cache isn't appropriate.

### Testing (Future)
- Co-locate tests: `features/<domain>/__tests__/ComponentName.test.tsx`.
- Use lightweight DOM testing (Testing Library) and MSW for API mocks.

---
## Deviation Handling
If a feature introduces a structural change (e.g., splitting `participants` into `roles` & `people` subfeatures), append a bullet under `STRUCTURE_CHANGES` with: date, reason, summary.

```
STRUCTURE_CHANGES
- (none yet)
```

---
## Quick Checklist Before Implementing a Feature
- [ ] Folder exists under `features/` with `api/`, `components/`, `hooks/` as needed.
- [ ] Route pages delegate to feature-level components (thin page wrappers).
- [ ] Types added or updated in `types/` if shared externally.
- [ ] Pagination integrated (where lists > threshold) using common helper.
- [ ] Capability checks implemented where conference-scoped rights apply.
- [ ] Error states covered with `EmptyState` / `ErrorBoundary` / skeleton loaders.

---
## Immediate Next Steps (Given Current State)
1. Implement Phase 1: Public conferences browsing (read-only) — scaffold `features/conferences` with list + card + filters + API.
2. Introduce pagination helper (`lib/api/pagination.ts`) for participants/submissions (already server-ready) to reuse later.
3. Add `participants` feature skeleton now (API + hooks) to decouple organizer dashboards early, even if UI is minimal.
4. Start `submissions` author flow (draft form, create, list my submissions) before organizer review to parallel backend readiness.

---
By adhering to this structure we maintain coherence between the capability-based backend model and the evolving client surfaces while minimizing refactors.
