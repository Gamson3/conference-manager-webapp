# Frontend Restructuring Plan

> NOTE: See `docs/Proposed-Folder-Structure.md` for the authoritative, up-to-date folder tree, phased rollout, and conventions. This plan references that document and only repeats high-level intents.

## Project Overview
Conference Manager Web Application - A comprehensive system for managing academic/professional conferences with role-based access for Organizers, Attendees, and Admins.
\n+UPDATE: The system now uses a capability-based participation model. Global `User.role` (user | organizer | admin) governs platform-level surfaces; conference-scoped capabilities are granted through `ConferenceParticipant.role` (attendee | presenter | author | reviewer | sponsor | volunteer) enabling granular behaviors (registration, submission, presenting, reviewing) per conference.

## Core Requirements (Aligned to Active Schema & Refined Routing)
1. **Conference Creation & Setup** – Configure categories (`ConferenceCategory`), types (`PresentationType`), requirements (`SubmissionRequirement`), and timeline milestones (`TimelineMilestone`).
2. **Unified Submission Workflow** – Authors create `Submission` drafts, submit, get reviewed (`SubmissionReview`), and receive decisions (accepted/rejected). Keywords & author constraints enforced; withdrawal allowed pre-decision.
3. **Presentation & Scheduling** – Accepted submissions yield `Presentation` entities. Organizers assign/move presentations across sections; ordering guaranteed by unique `(sectionId, order)` with two-phase reorder & locking (`status=locked`).
4. **Capability-Based Participation** – `ConferenceParticipant` expresses per-conference capability (attendee/presenter/author/reviewer/etc.), decoupling global role from local permissions.
5. **Public & Authenticated Views** – Published conference schedules, tree view, search, and favorites are visible publicly or to authenticated users; draft schedule restricted to organizer/admin only.
6. **Favorites & Feedback Foundations** – Favorites (`ConferenceFavorite`, `PresentationFavorite`) live now; feedback & materials models available for later UI work.
7. **Admin / Governance (Future)** – Impersonation (`ImpersonationLog`) and analytics deferred but supported by schema for thesis extension.
8. **Scalability & Pagination** – Participants and submissions endpoints support optional pagination; more lists can adopt same header pattern.
9. **Unified Account Surfaces** – Replace legacy `(attendee)` grouping with a single `account/` segment for all authenticated users (dashboard, discover, favorites, my-conferences, my-submissions, settings).
10. **Organizer Isolation** – Organizer operations live under `organizer/` without duplicating global settings; conference-specific configuration under `/organizer/conferences/[id]/setup/*` and `/organizer/conferences/[id]/edit`.
11. **Admin Governance** – Administrative tasks remain under `admin/`, separate from user profile or organizer flows.

## Refined Folder Structure (Nov 2025 Update)

```
client/src/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Redirect to landing or dashboard
│   ├── globals.css
│   │
│   ├── (public)/                     # Public routes (no auth required)
│   │   ├── layout.tsx                # Public layout with navbar
│   │   ├── page.tsx                  # Landing page
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── conferences/              # Browse public conferences
│   │   │   ├── page.tsx              # List all published conferences
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Conference details
│   │   │       ├── schedule/
│   │   │       │   └── page.tsx      # View schedule
│   │   │       ├── tree/
│   │   │       │   └── page.tsx      # Tree/hierarchical view
│   │   │       ├── search/
│   │   │       │   └── page.tsx      # Search presentations
│   │   │       └── presentations/
│   │   │           └── [presentationId]/
│   │   │               └── page.tsx  # Presentation details
│   │   │
│   │   └── contact/
│   │       └── page.tsx
│   │
│   ├── (auth)/                       # Authentication routes
│   │   ├── layout.tsx                # Clean auth layout
│   │   ├── login/
│   │   │   └── page.tsx
```
client/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (public)/...
│   ├── (auth)/...
│   ├── account/                      # Unified authenticated user area
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── discover/page.tsx
│   │   ├── favorites/page.tsx
│   │   ├── my-conferences/[id]/...
│   │   ├── my-submissions/[id]/...
│   │   └── settings/(security)/page.tsx
│   ├── organizer/                    # Organizer-only tools
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── conferences/[id]/(edit|setup|submissions|schedule|participants|publish|analytics)/page.tsx
│   ├── admin/                        # System governance
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── users/[id]/(impersonate)/page.tsx
│   │   └── conferences/page.tsx
│   ├── auth-check/page.tsx
│   └── not-authorized/page.tsx
```

### Rationale for Changes
- Removed parallel `settings` under multiple role segments to prevent divergence; only one profile settings path lives at `/account/settings`.
- Organizer settings collapse into per-conference edit/setup routes; no duplicate global organizer profile settings.
- Attendee concept replaced by contextual participation; URLs do not encode capability (e.g., "author"), they reflect user actions (`/account/my-submissions`).

### Migration Checklist
1. Move existing `(attendee)` folder contents into `account/`.
2. Rename `(organizer)` group to `organizer/` (drop parentheses if they were route groups affecting path).
3. Remove any unused duplicate `settings` pages under organizer.
4. Update redirects: login → `/account/dashboard` (previously `/attendee/dashboard`).
5. Update internal links in nav components to new paths.
6. Audit feature imports that assumed old route segment names.
7. Adjust tests (if any client-side route tests) to new paths.
│   │   │   └── useSubmissionReview.ts
│   │   └── api/
│   │       └── submissionsApi.ts
│   │
│   ├── schedule/
│   │   ├── components/
│   │   │   ├── ScheduleBuilder.tsx  # Drag & drop
│   │   │   ├── ScheduleView.tsx
│   │   │   ├── DayManager.tsx
│   │   │   ├── SectionManager.tsx
│   │   │   └── TimelineView.tsx
│   │   ├── hooks/
│   │   │   ├── useSchedule.ts
│   │   │   └── useScheduleBuilder.ts
│   │   └── api/
│   │       └── scheduleApi.ts
│   │
│   ├── presentations/
│   │   ├── components/
│   │   │   ├── PresentationCard.tsx
│   │   │   ├── PresentationDetails.tsx
│   │   │   ├── PresentationForm.tsx
│   │   │   └── AuthorManagement.tsx
│   │   ├── hooks/
│   │   │   ├── usePresentations.ts
│   │   │   └── usePresentationLock.ts
│   │   └── api/
│   │       └── presentationsApi.ts
│   │
│   ├── search/
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchFilters.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── hooks/
│   │   │   └── useSearch.ts
│   │   └── api/
│   │       └── searchApi.ts
│   │
│   ├── favorites/
│   │   ├── components/
│   │   │   ├── FavoritesList.tsx
│   │   │   └── FavoriteButton.tsx
│   │   ├── hooks/
│   │   │   └── useFavorites.ts
│   │   └── api/
│   │       └── favoritesApi.ts
│   │
│   └── tree-view/
│       ├── components/
│       │   ├── ConferenceTree.tsx
│       │   ├── TreeNode.tsx
│       │   └── TreeNavigation.tsx
│       └── hooks/
│           └── useTreeView.ts
│
├── components/                       # Shared components
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── Sidebar.tsx
│   ├── ui/                           # shadcn/ui components (keep existing)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── shared/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── EmptyState.tsx
│   │   └── PageHeader.tsx
│   └── forms/
│       ├── FormField.tsx
│       ├── FormError.tsx
│       └── FormSuccess.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts              # Axios/fetch client config
│   │   ├── endpoints.ts           # API endpoint constants
│   │   └── errorHandling.ts       # Error handling utilities
│   ├── auth/
│   │   ├── cognito.ts             # AWS Cognito setup
│   │   └── session.ts             # Session management
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── constants.ts
│   ├── schemas.ts                 # Zod schemas
│   └── utils.ts                   # General utilities
│
├── hooks/
│   ├── useAuth.ts
│   ├── useDebounce.ts
│   ├── useMediaQuery.ts
│   └── useToast.ts
│
├── types/
│   ├── index.ts                   # Re-exports
│   ├── auth.ts
│   ├── conference.ts
│   ├── presentation.ts
│   ├── submission.ts
│   ├── schedule.ts
│   └── user.ts
│
└── store/                         # State management (optional, use React Query instead?)
    ├── index.ts
    └── slices/
```

## Implementation Phases

### Phase 1: Foundation & Authentication (Week 1)
**Goal**: Set up infrastructure and working auth

#### 1.1 Clean & Setup
- [ ] Backup current code
- [ ] Delete old pages (keep ui components)
- [ ] Create new folder structure
- [ ] Setup API client with error handling
- [ ] Configure environment variables

#### 1.2 Authentication
- [ ] `(auth)/login` - Login page with Cognito
- [ ] `(auth)/register` - Registration with role selection
- [ ] `(auth)/forgot-password` - Password recovery
- [ ] Auth context and hooks
- [ ] Auth middleware for protected routes
- [ ] Session management

#### 1.3 Shared Components
- [ ] Public layout with navbar
- [ ] Dashboard layout with sidebar
- [ ] Auth layout (clean, centered)
- [ ] Loading states
- [ ] Error boundaries
- [ ] Toast notifications

**Deliverable**: Working authentication system

---

### Phase 2: Conference Creation Flow (Week 2)
**Goal**: Organizers can create and configure conferences

#### 2.1 Organizer Dashboard
- [ ] `(organizer)/dashboard` - Overview with stats
- [ ] `(organizer)/conferences` - List conferences

#### 2.2 Conference Creation
- [ ] `(organizer)/conferences/new` - Create conference form
  - Basic details (name, description, dates, location)
  - Topics/tags
  - Capacity settings
- [ ] Conference card component
- [ ] Form validation with Zod

#### 2.3 Conference Setup Wizard
- [ ] `(organizer)/conferences/[id]/setup/categories` 
  - Define presentation categories (oral, poster, workshop, etc.)
  - Define presentation types
- [ ] `(organizer)/conferences/[id]/setup/requirements`
  - Set abstract requirements
  - Set keyword requirements (min 5)
  - Set author/affiliation requirements
- [ ] `(organizer)/conferences/[id]/setup/timeline`
  - Submission deadlines
  - Review periods
  - Conference dates

#### 2.4 Conference Management
- [ ] `(organizer)/conferences/[id]` - Conference dashboard
- [ ] `(organizer)/conferences/[id]/edit` - Edit details
- [ ] Save as draft functionality
- [ ] Conference status management

**Deliverable**: Complete conference creation and configuration

---

### Phase 3: Abstract Submission System (Week 3)
**Goal**: Authors can submit abstracts, organizers can review

#### 3.1 Public Conference Discovery
- [ ] `(public)/conferences` - Browse published conferences
- [ ] `(public)/conferences/[id]` - Conference details
- [ ] Conference filters and search
- [ ] Registration/attendance tracking

#### 3.2 Abstract Submission (Attendee)
- [ ] Submission form with:
  - Title
  - Abstract (rich text)
  - Keywords (min 5, validation)
  - Author management (min 1)
    - Name, email, affiliation (required)
    - Multiple authors support
    - Author order/presenter designation
  - Presentation category/type selection
- [ ] Draft saving
- [ ] State transitions: draft → submitted → under_review → accepted/rejected OR withdrawn (UI disables editing when not draft)
- [ ] My submissions page
- [ ] Submission status tracking

#### 3.3 Submission Review (Organizer)
- [ ] `(organizer)/conferences/[id]/submissions` - List all submissions
- [ ] `(organizer)/conferences/[id]/submissions/[id]` - Review interface
- [ ] Accept/Reject functionality
- [ ] Review comments
- [ ] Bulk actions
- [ ] `(organizer)/conferences/[id]/submissions/accepted` - Accepted list

**Deliverable**: Complete submission and review workflow

---

### Phase 4: Schedule Builder (Week 4)
**Goal**: Organizers build conference schedule with drag-and-drop

#### 4.1 Days & Sections Management
- [ ] `(organizer)/conferences/[id]/schedule/days` - Manage conference days
- [ ] `(organizer)/conferences/[id]/schedule/sections` - Manage sections
  - Section types (presentation, break, keynote, workshop)
  - Time slots
  - Rooms/venues
  - Capacity

#### 4.2 Schedule Builder
- [ ] `(organizer)/conferences/[id]/schedule` - Main builder interface
  - Drag & drop presentations into sections
  - Visual timeline view
  - Presentation pool (accepted presentations)
  - Auto-scheduling suggestions
  - Conflict detection
  - Break management
- [ ] Presentation ordering within sections (two-phase algorithm preventing unique collisions)
- [ ] Presenter conflict detection (no duplicate presenter in conflicting sections — future rule extension)
- [ ] Schedule validation
- [ ] Save/publish schedule

#### 4.3 Presentation Management
- [ ] `(organizer)/conferences/[id]/presentations` - All presentations
- [ ] `(organizer)/conferences/[id]/presentations/[id]` - Details
- [ ] `(organizer)/conferences/[id]/presentations/[id]/authors` - Author management
- [ ] Presentation locking mechanism
- [ ] Materials upload

**Deliverable**: Working schedule builder with drag-and-drop

---

### Phase 5: Public Conference Access (Week 5)
**Goal**: Attendees can view, search, and favorite presentations

#### 5.1 Schedule Views
- [ ] `(public)/conferences/[id]/schedule` - Public schedule view
  - Day tabs
  - Section grouping
  - Time-based view
  - Room-based view
- [ ] `(public)/conferences/[id]/tree` - Hierarchical tree view
  - Day → Section → Presentation
  - Expandable/collapsible
  - Jump to presentation from favorites

#### 5.2 Search & Filters
- [ ] `(public)/conferences/[id]/search` - Advanced search
  - By author name
  - By presentation title
  - By section name
  - By keyword
  - By affiliation
- [ ] Search suggestions/autocomplete
- [ ] Filter by day, time, section type

#### 5.3 Presentation Details
- [ ] `(public)/conferences/[id]/presentations/[id]` - Full details
  - Title, abstract
  - Authors with affiliations
  - Keywords
  - Time, location
  - Materials (if available)
  - Organizers list

#### 5.4 Favorites System
- [ ] Favorite button on presentations
- [ ] `(attendee)/favorites` - Favorites list
  - Grouped by conference
  - Grouped by day
  - Quick jump to tree view location
- [ ] Presentation favorites
- [ ] Conference favorites

#### 5.5 Attendee Dashboard
- [ ] `(attendee)/dashboard` - Overview
  - Registered conferences
  - Upcoming presentations
  - My favorites
- [ ] `(attendee)/discover` - Browse conferences
- [ ] `(attendee)/my-conferences` - My registered conferences
  - Schedule access
  - Tree view access
  - Search within conference

**Deliverable**: Complete public-facing conference experience

---

### Phase 6: Advanced Features (Week 6+)
**Goal**: Additional requirements and polish

#### 6.1 Materials Management
- [ ] `(organizer)/conferences/[id]/materials` - Upload/manage
- [ ] Public materials viewing
- [ ] Download tracking

#### 6.2 Capability Expansion & Analytics
- [ ] `(organizer)/conferences/[id]/participants` - Capability roster (filter + pagination)
- [ ] Self-registration attendee capability (POST register / DELETE unregister)
- [ ] Reviewer assignment UX (future) using `SubmissionReview`
- [ ] Session attendance & optional check-in (`SessionAttendance`)

#### 6.3 Publishing Workflow
- [ ] `(organizer)/conferences/[id]/publish` - Publish wizard
  - Validation checks
  - Preview mode
  - Publish/unpublish

#### 6.4 Admin & Impersonation (Future)
- [ ] `(admin)/dashboard`
- [ ] `(admin)/users` - User management
- [ ] `(admin)/users/[id]/impersonate` - Impersonate users
- [ ] Impersonation logs
- [ ] Help organizers with tasks

#### 6.5 Polish
- [ ] Responsive design (mobile-first)
- [ ] Loading states everywhere
- [ ] Error handling
- [ ] Empty states
- [ ] Accessibility (WCAG AA)
- [ ] Performance optimization
- [ ] SEO optimization

---

## Technical Stack

### Confirmed
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Auth**: AWS Cognito
- **Backend**: Express.js API (existing)
- **Database**: PostgreSQL with Prisma

### To Decide
- **State Management**: 
  - Option 1: React Query (recommended for server state)
  - Option 2: Redux Toolkit (current, but may be overkill)
  - Option 3: Zustand (lighter alternative)
  
- **Drag & Drop**: 
  - Option 1: dnd-kit (modern, accessible)
  - Option 2: react-beautiful-dnd (mature, but deprecated)
  - Option 3: react-dnd (flexible, complex)

- **Rich Text Editor**:
  - Option 1: Tiptap (modern, extensible)
  - Option 2: Slate (powerful, complex)
  - Option 3: Draft.js (mature)

---

## API Endpoints Mapping

### Authentication
- `POST /auth/refresh-token`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/logout`

### Conferences (Public)
- `GET /conferences` - List published conferences
- `GET /conferences/:id` - Conference details
- `GET /conferences/:id/materials` - Conference materials
- `GET /conferences/:id/participants` - Participants list
- `GET /conferences/:id/search` - Search presentations
- `GET /conferences/:id/search/suggestions` - Search suggestions

### Events (Organizer)
- `GET /events` - My conferences
- `GET /events/:id` - Conference details
- `POST /events` - Create conference
- `POST /events/drafts` - Save draft
- `PUT /events/:id` - Update conference
- `PUT /events/:id/draft` - Update draft
- `DELETE /events/:id` - Delete conference
- `PUT /events/:id/status` - Update status
- `GET /events/:id/materials` - Materials
- `GET /events/:id/attendees` - Attendees
- `GET /events/:id/feedback` - Feedback
- `GET /events/:id/abstracts` - Submissions
- `GET /events/:id/publish-validation` - Validate before publish
- `POST /events/:id/publish` - Publish conference
- `POST /events/:id/unpublish` - Unpublish conference

### More routes to explore:
- Sections, Schedule, Presentations, Favorites, Submissions, etc.

---

## Key Decisions

### 1. State Management
**Recommendation**: Use React Query (TanStack Query)
- Handles server state elegantly
- Built-in caching, refetching, optimistic updates
- Less boilerplate than Redux
- Perfect for API-heavy apps

### 2. Drag & Drop
**Recommendation**: dnd-kit
- Modern, maintained, accessible
- Better TypeScript support
- Smaller bundle size
- Good documentation

### 3. Form Handling
**Confirmed**: React Hook Form + Zod
- Already using shadcn/ui which integrates well
- Type-safe validation
- Great performance

### 4. Multi-step Forms
For conference setup wizard, use:
- Step component state
- Form context to share data
- Save draft at each step

---

## Testing Strategy

### Unit Tests
- Utility functions
- Form validation schemas
- Hooks

### Integration Tests
- Form submissions
- API calls
- Auth flows

### E2E Tests (Playwright)
- Complete workflows:
  - Conference creation → setup → submission → schedule building → publish
  - Author submission workflow
  - Attendee browsing and favoriting

---

## Performance Considerations

1. **Code Splitting**: Dynamic imports for heavy components (schedule builder, rich text editor)
2. **Image Optimization**: Next.js Image component
3. **API Caching**: React Query with tuned stale times
4. **Pagination**: Submissions & participants already; extend to presentations/sections if dataset grows
5. **Virtual Scrolling**: For large lists (e.g., 1000+ presentations)
6. **Debouncing**: Search inputs
7. **Optimistic Updates**: Favorites, likes

---

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader testing
- Color contrast (WCAG AA)
- Form validation announcements

---

## Mobile Responsiveness

- Mobile-first design
- Touch-friendly targets (min 44x44px)
- Responsive navigation
- Simplified mobile views
- Progressive enhancement

---

## Next Steps

1. ✅ Align plan with capability-based schema (this update)
2. Inventory component gaps (submissions lifecycle UI, schedule builder, participants roster)
3. Introduce React Query + pagination header parsing helpers
4. Implement Phase 1 (Auth + capability registration UI)
5. Proceed through phases ensuring backend test parity & performance profiling

## Schema Mapping Quick Reference

| Domain Concept             | Prisma Model / Enum                       | Notes |
|----------------------------|-------------------------------------------|-------|
| Global User Role           | `Role`                                     | Platform surfaces (user/organizer/admin) |
| Conference Capability      | `ConferenceParticipant.role`               | Per-conference granular permissions |
| Submission Lifecycle       | `Submission.status`                        | Draft→Submitted→Under Review→Accepted/Rejected/Withdrawn |
| Presentation Lifecycle     | `Presentation.status`                      | Draft/Submitted/Scheduled/Locked |
| Scheduling Hierarchy       | `Day`, `Section`, `Presentation`           | Unique `(sectionId, order)` maintains order |
| Favorites                  | `ConferenceFavorite`, `PresentationFavorite` | User personalization |
| Authors & Presenter Flag   | `PresentationAuthor`                       | Internal/external authors, presenter designation |
| Review Data                | `SubmissionReview`                         | Multiple reviews per submission |
| Requirements               | `SubmissionRequirement`                    | Keyword/author constraints |
| Timeline Milestones        | `TimelineMilestone`                        | Deadlines & phases |
| Materials & Feedback       | Material & Feedback models                 | Future UI phases |
| Attendance Tracking        | `SessionAttendance`                        | Session presence (optional) |
| Governance (Impersonation) | `ImpersonationLog`                         | Future admin tooling |

**Estimated Timeline**: 6-7 weeks for core features + 2-3 weeks for polish and testing

**Ready to proceed?** Let's start with Phase 1!
