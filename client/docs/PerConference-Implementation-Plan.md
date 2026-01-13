# Per-Conference Management Console Implementation Plan

Author: System Design
Last Updated: 2025-11-14
Status: Planning (Phase sequencing defined)
Scope: Organizer per-conference management (all modules in FINAL SECONDARY SIDEBAR & Folder Structure)
Goal: Each phase delivers a production-complete slice (no half-finished features) before moving forward.

---
## Guiding Principles
1. Phase Completeness: A phase is DONE only when UI, API integration, validation, error states, authorization, and tests are implemented.
2. Vertical Slices: Implement end-to-end (DB → API → Client → Tests) per feature set, not by layer.
3. Deferrable Modules: Registration & Speakers are optional. Their absence must not break other modules.
4. Idempotent Operations: All mutate endpoints return stable, typed responses; UI uses optimistic updates only after validation.
5. Performance Baseline: Queries use selective fields; lists support pagination or lazy loading where scale risk exists.
6. Access Control: Organizer/Admin only for management endpoints; public/attendee endpoints remain unaffected.
7. Documentation Sync: Update this plan and related spec docs (Schedule-Builder, Endpoints.md) when scope evolves.

---
## Architecture Overview
Backend: Express + Prisma (PostgreSQL). Models: Conference, Day, Section (Session), Presentation, Submission, SubmissionReview, ConferenceCategory, PresentationType, SubmissionRequirement, TimelineMilestone, ConferenceParticipant, ConferenceMaterial.
Frontend: Next.js App Router; per-conference console at `organizer/conferences/[id]/...`; dual sidebars; `ContentShell` spacing; feature-specific components under `features/` and `components/`.
State: React Query (or custom fetch hooks) for data retrieval; local component state for forms; global contexts only where cross-page sharing needed (e.g., conference base info).
Testing: Vitest + Supertest for server; Component tests (if necessary) + integration flows exercising key endpoints.

---
## Phase Sequencing
| Phase | Name | Modules / Pages | Rationale |
|-------|------|-----------------|-----------|
| 1 | Settings Core | Basics, Organizer Info, Deadlines, Publish | Foundation config required before abstracts/program logic |
| 2 | Abstracts Configuration | Topics & Categories, Presentation Types, Submission Form Settings, Submission Dates & Limits, Review Criteria | Enables structured submission process |
| 3 | Abstracts Operations | Overview (Submissions list), Submission detail, Status transitions, Export Submissions | Operational workflow for CFP |
| 4 | Program Data | Overview, Days, Sessions, Presentations (+ optional Speakers) | Data groundwork for scheduling |
| 5 | Scheduler Tool | Drag & Drop Scheduler, schedule publish/unpublish integration | High-value organizer capability |
| 6 | Website Module | Public Page, Materials, Visibility | Public presentation & gating |
| 7 | Registration (Optional) | Overview, Settings, Form Builder, Custom Questions, Deadlines | Participant intake enhancement |
| 8 | Reports & Analytics | Exports (participants, abstracts, schedule), Analytics dashboard | Cross-module insights |
| 9 | Cross-Cutting | Auth hardening, caching, logging, audit trails | Reliability & maintainability |
| 10 | QA & Metrics | Automated tests coverage, performance passes, documentation finalization | Production readiness |

---
## Phase Detail & Acceptance Criteria
### Phase 1: Settings Core
Pages: Basics, Organizer Info, Deadlines, Publish.
Backend:
- Endpoints: GET/PUT `/conferences/:id` (extended fields), GET/PUT deadlines windows (already partially present, confirm timeline models), schedule publish/unpublish.
- Validation: Date ordering (start <= end), non-overlapping windows, required title.
Frontend:
- Forms with field-level validation & feedback.
- Loading, error, empty states.
- Real-time publish state toggle; reflect in UI badges.
Tests:
- Update conference basics success & failure (invalid dates).
- Publish/unpublish schedule side effects (timestamp set/cleared).
Done When:
- All forms persist correctly; schedule publish state visible & reliable; no console errors.

### Phase 2: Abstracts Configuration ✅ COMPLETE
**Status:** ✅ Complete (All 7 pages implemented, 15 integration tests passing)

Pages: Topics & Categories, Presentation Types, Submission Form Settings, Submission Dates & Limits, Review Criteria.

Backend:
- ✅ CRUD endpoints for categories, types, submission requirements implemented in `conferenceSetupControllers.ts`
- ✅ Guidelines stored in `SubmissionRequirement.submissionGuidelines` and `reviewCriteria` fields
- ✅ Dates & Limits managed through `Conference.submissionsOpenFrom/Until` and `SubmissionRequirement.maxSubmissionsPerUser`

Frontend:
- ✅ Topics & Categories (`/abstracts/topics-and-categories/page.tsx`) - CrudList with name + description, usage tracking
- ✅ Presentation Types (`/abstracts/presentation-types/page.tsx`) - CrudList with name, description, defaultDuration
- ✅ General Settings (`/abstracts/submission-form-settings/general/page.tsx`) - Keywords, length, ORCID, file upload constraints
- ⛔ Additional Questions (removed placeholder)
- ✅ Dates & Limits (`/abstracts/submission-form-settings/submission-dates-limits/page.tsx`) - Submission window + limits
- ✅ Guidelines (`/abstracts/submission-form-settings/submission-guidelines/page.tsx`) - Textarea editor for guidelines
- ✅ Review Criteria (`/abstracts/review-criteria/page.tsx`) - Textarea editor for criteria

Validation:
- ✅ Duplicate category/type names prevented (app-level validation)
- ✅ Min <= max validation for keywords and abstract length
- ✅ Open date < close date validation for submission window

Tests:
- ✅ 15 integration tests in `phase2-abstracts-config.test.ts` - all passing
- ✅ Categories CRUD: list, create, update, delete with usage prevention
- ✅ Presentation Types CRUD with presentationsCount tracking
- ✅ Submission Requirements: create, retrieve, upsert behavior
- ✅ Authorization: admin override, non-owner rejection tested
- ✅ Error handling: 404 for missing resources

Done When:
- ✅ All config surfaces edit & reflect data
- ✅ Disallowed duplicates handled gracefully
- ✅ UnsavedChangesBar pattern consistent across form pages
- ✅ Error handling follows established pattern

**Implementation Notes:**
- Backend API already existed - frontend successfully integrated
- CrudList component proved highly reusable for entity management
- Additional Questions removed (feature not implemented; revisit only if submission-level custom fields are added)

### Phase 3: Abstracts Operations ✅ COMPLETE
**Status:** ✅ Complete (All core functionality implemented, 12 tests passing)

Pages: Overview (List), Submission Detail, Export Submissions.

Backend:
- ✅ `listConferenceSubmissions` - Pagination, filtering by status, keyword search
- ✅ `exportConferenceSubmissions` - CSV/JSON export with filters
- ✅ Unified submissions endpoints: create, update, submit, withdraw, review, decide

Frontend:
- ✅ Overview (`/abstracts/overview/page.tsx`) - Table with filters, pagination, search
- ✅ Export (`/abstracts/export/page.tsx`) - CSV/JSON download with filters
- ✅ Detail page scaffold (links from overview)

API Integration:
- ✅ Uses centralized `endpoints.SUBMISSIONS.LIST()` and `endpoints.SUBMISSIONS.EXPORT()`
- ✅ Proper error handling (generic user message, console logging for debug)
- ✅ Credentials included for auth cookie support

Permissions:
- ✅ Organizer/Admin can list all submissions and export
- ✅ Regular users only see their own submissions
- ✅ Export restricted to organizer/admin role

Tests:
- ✅ `submissions.list-export.test.ts` - 5 tests
  - Organizer list with pagination and filters
  - Author only sees own submissions  
  - Keyword search
  - CSV export
  - JSON export with filters
- ✅ `submissions.test.ts` - 6 tests (status transitions)
- ✅ `submissions.visibility.test.ts` - 1 test (visibility control)

Done When:
- ✅ List filters functional
- ✅ Exports downloadable in CSV/JSON
- ✅ Tests all passing

**Implementation Notes:**
- Fixed FK constraint issue in test cleanup (Section → Conference)
- Fixed export page to use centralized endpoint helper
- All 12 submission-related tests pass

### Phase 4: Program Data ✅ COMPLETE
**Status:** ✅ Complete (All 4 pages implemented, 31 integration tests passing)

Pages: Overview, Days, Sessions, Presentations, Speakers (optional).

Backend:
- ✅ Day CRUD: `/api/conferences/:id/days` - Full CRUD with reorder
- ✅ Session (Section) CRUD: `/sections/...` routes already existed
- ✅ Presentation listing: `/api/conferences/:id/presentations` - Lists all presentations
- ✅ Program stats endpoint: `/api/conferences/:id/program/stats`

Frontend:
- ✅ Overview (`/program/overview/page.tsx`) - Stats cards, schedule summary, action buttons
- ✅ Days (`/program/days/page.tsx`) - Full CRUD with session counts, reorder support
- ✅ Sessions (`/program/sessions/page.tsx`) - Full CRUD with day filtering, type selection
- ✅ Presentations (`/program/presentations/page.tsx`) - List with assignment status, scheduler links

Controllers & Routes:
- ✅ `daysController.ts` - listDays, getDay, createDay, updateDay, deleteDay, reorderDays, getProgramStats
- ✅ `daysRoutes.ts` - All Day routes registered under `/api`
- ✅ Existing `sectionControllers.ts` and `sectionRoutes.ts` for sessions

Validation:
- ✅ Day date must be within conference date range
- ✅ Duplicate dates prevented per conference
- ✅ Cascade warnings when deleting day with sessions
- ✅ Session requires name, conference ID

Tests:
- ✅ 31 integration tests in `phase4-program-data.test.ts` - all passing
- **Days CRUD (16 tests):** List, create (success, validation, date range, duplicate), get, update, delete (empty, with sessions), reorder
- **Sessions CRUD (8 tests):** List, create (keynote, presentation, break, validation), update, delete
- **Presentations Listing (2 tests):** List all, include details
- **Authorization (2 tests):** Admin override, unauthenticated rejection
- **Error Handling (3 tests):** 404s, invalid date format

Done When:
- ✅ CRUD screens operate for Days, Sessions
- ✅ Presentations listing functional
- ✅ Relational integrity enforced
- ✅ Overview aggregates counts

**Implementation Notes:**
- Days controller created from scratch (was missing entirely)
- Sessions use existing `/sections/...` routes
- Frontend uses centralized `endpoints.ts` with DAYS and SESSIONS
- Test suite exercises full authorization and error handling

### Phase 5: Scheduler Tool
Pages: Scheduler.
Backend:
- Endpoint to batch assign presentations to sessions: POST `/conferences/:id/scheduler/assign`.
- Conflict checking (duplicate time slot within same session, or overlapping times if defined). Return conflict list.
Frontend:
- Drag & drop grid (Days columns, Sessions lanes, slots listing presentations).
- Visual conflict indicators.
- Optimistic assignment rollback on failure.
Tests:
- Assignment with conflicts returns error; valid batch applies.
Done When:
- Dragging updates backend; conflicts clearly shown; publish toggle reflects schedule state.

### Phase 6: Website Module
Pages: Public Page, Materials, Visibility.
Backend:
- Materials upload (POST multipart) and list; deletion.
- Visibility flags (schedule public, abstracts public, registration public) separate from publish gating.
Frontend:
- Public page form (markdown editor maybe `SafeMarkdown` preview).
- File list with size/type; upload progress.
- Visibility switches with dependency hints (cannot show schedule until published).
Tests:
- Material upload/download cycle; visibility toggles propagate.
Done When:
- Public page editable; materials manageable; visibility toggles affect public endpoints responses.

### Phase 7: Registration (Optional)
Pages: Overview, Settings, Form, Custom Questions, Deadlines.
Backend:
- Registration window fields; custom questions (could reuse SubmissionRequirement pattern or new table); form schema retrieval.
- Participant creation (manual add) & listing integrated from existing participant model.
Frontend:
- Form builder interface (drag reorder basic components — minimal version: list + ordering indices).
- Overview metrics (counts, breakdown by role).
Tests:
- Custom question CRUD; participant creation respects registration open window.
Done When:
- Registration can be enabled; data enters system; overview displays correct metrics.

### Phase 8: Reports & Analytics
Pages: Exports, Analytics.
Backend:
- Unified export aggregator: participants, submissions, presentations, schedule.
- Analytics pre-aggregations (or compute on the fly initially) for charts.
Frontend:
- Chart components (submissions over time, category distribution, presentation types counts).
- Export UI multi-select & generate file.
Tests:
- Exports produce consistent column sets; analytics endpoints return stable schema.
Done When:
- Exports reliable; analytics render meaningful visuals.

### Phase 9: Cross-Cutting
Items:
- Role/capability enforcement audit (ensure reviewer restrictions etc.).
- Caching: ETag or server-side conditional requests for heavy lists.
- Logging: Add structured logs for critical mutations.
- Error normalization: consistent shape `{ message, code }`.
- Security: Input sanitation (markdown), file size/type validation.
Tests:
- Authz denies unauthorized actions; large list endpoints respond within threshold.
Done When:
- Security & reliability enhancements integrated; minimal performance baseline documented.

### Phase 10: QA & Metrics
Items:
- Coverage targets: Controllers ≥70%, critical utils ≥80%.
- Load test basic endpoints (schedule listing, submissions export) with moderate concurrency.
- Monitoring: Add simple instrumentation (timers around schedule build) for future APM integration.
Done When:
- Test suite green; coverage reports stored; docs updated; release notes prepared.

---
## Endpoint Matrix (Key Additions)
| Domain | Endpoint | Method | Notes |
|--------|----------|-------|-------|
| Settings | /conferences/:id (extended) | GET/PUT | Basics & organizer info |
| Deadlines | /conferences/:id/windows | GET/PUT | Abstract & registration windows |
| Publish | /conferences/:id/schedule/publish | POST | Sets published timestamp |
| Publish | /conferences/:id/schedule/unpublish | POST | Clears published timestamp |
| Categories | /conferences/:id/categories | CRUD | Names unique per conference |
| Types | /conferences/:id/types | CRUD | Presentation formats |
| Requirements | /conferences/:id/submission-requirements | CRUD | Form settings & questions |
| Guidelines | /conferences/:id/submission-guidelines | GET/PUT | Text or HTML/Markdown |
| Submissions | /conferences/:id/submissions | CRUD + transitions | Unified model operations |
| Submissions Export | /conferences/:id/submissions/export | GET | CSV/JSON |
| Days | /conferences/:id/days | CRUD | Date uniqueness per day |
| Sessions | /conferences/:id/sessions | CRUD | Reference Day ID |
| Scheduler Assign | /conferences/:id/scheduler/assign | POST | Batch updates |
| Materials | /conferences/:id/materials | POST/GET/DELETE | File handling |
| Visibility | /conferences/:id/visibility | GET/PUT | Flags |
| Registration Questions | /conferences/:id/registration/questions | CRUD | Optional |
| Reports Export | /conferences/:id/reports/export | GET | Multi-domain |
| Analytics | /conferences/:id/analytics | GET | Aggregated metrics |

---
## Data Validation & Integrity Rules
- Conference dates: startDate <= endDate.
- Windows: submission window & registration window cannot overlap invalidly (start < end).
- Categories/Types: unique `name` within `conferenceId` (case-insensitive).
- Submission limits: per-user count enforced at submit time.
- Presentation assignment: presentation must be accepted; cannot belong to multiple sessions simultaneously.
- Session times: (future) room/time overlaps flagged during assignment.
- Deletion protection: cannot delete category/type if referenced by active submissions (soft guard).

---
## UI/UX Standards
- Consistent spacing via `ContentShell` (flush vs default).
- CRUD Lists reuse `CrudList` component with loading skeletons.
- All destructive actions confirm via modal.
- Toasts: success, error, info — standardized messages.
- Empty states: purposeful text + primary action.
- Accessibility: semantic headings (h1 per page), focus outline preserved.

---
## State Management Strategy
- Fetch wrappers per domain (`features/.../api`).
- Dependent queries invalidate on mutation.
- Local optimistic updates only when conflict risk <= low (e.g., toggles); scheduler uses pessimistic then animate.

---
## Testing Strategy (Representative)
- Unit: validation utils (date ordering, uniqueness checks).
- Integration (server): submissions flow, schedule publish cycle, category/type CRUD.
- Integration (client): render pages with mocked API responses (key flows only).
- Regression: ensure previous published schedule remains visible after unrelated updates.

---
## Performance Considerations
- Pagination on submissions & presentations lists after threshold (e.g., >50 items).
- Use `SELECT` narrowing via Prisma (omit large JSON fields when listing).
- Debounced filters; avoid refetch storm.

---
## Security & Compliance
- Sanitize Markdown (Guidelines & Public Page) using allowlist rendering.
- Restrict file uploads (size, mime types: pdf, png, jpg, docx optional).
- Enforce role checks server-side; never trust client role flags.

---
## Defer / Future Enhancements
- Payment integration for Registration.
- Speaker bios enrichment & image processing.
- Advanced schedule conflict auto-resolution.
- Real-time websocket updates (schedule changes broadcast).
- Reviewer assignment workflow automation.

---
## Risk & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Expanding scope mid-phase | Delays subsequent modules | Freeze scope until phase accepted |
| Inconsistent validation across layers | Data integrity issues | Centralize validation helpers shared server/client |
| Performance degradation with large submissions | Sluggish UI | Implement pagination & indexing early |
| Scheduler complexity creep | Missed deadlines | MVP (basic drag & drop) first; enhancements later |

---
## Acceptance Checklist (Global)
- [ ] All listed endpoints implemented & documented.
- [ ] Each page loads real data (no placeholders).
- [ ] CRUD flows validated and error states present.
- [ ] Access control enforced (403 on unauthorized actions).
- [ ] Exports generate correct file content.
- [ ] Schedule publish/unpublish toggles actual visibility.
- [ ] Tests pass; coverage reported.
- [ ] Docs updated (this file, Schedule-Builder, Endpoints).

---
## Phase Kickoff Requirements
Before starting any phase:
1. Confirm model sufficiency (Prisma schema covers needed fields).
2. Update Endpoints.md with proposed additions.
3. Create tracking todos (manage_todo_list) for sub-tasks.
4. Establish test stubs before implementing controllers.

---
## Immediate Next Action
Initiate Phase 1: Audit existing conference update & publish endpoints; add missing organizer info fields & deadlines CRUD; scaffold forms with validation; write integration tests.

---
## Change Log (to append)
- 2025-11-14: Initial plan created.

---
End of document.
