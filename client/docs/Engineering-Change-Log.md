# Engineering Change Log

A chronological record of notable changes, including what happened, why, and the files impacted. Dates are approximate to sprint cadence.

---
## December 2025

### 7) Information Architecture (IA) Restructure - "Home as Operations Hub"
- **What happened**: Complete restructure of per-conference navigation to consolidate operational pages under Home and reduce cognitive load.
- **Why**: Original IA had 7+ top-level navigation items causing confusion between setup vs. operational tasks.
- **Key Changes**:
  - Primary sidebar reduced from 7 icons to 5 (removed Program, Reports)
  - Program and Reports now nested under Home as collapsible groups
  - New unified "People" page replaces separate Participants/Speakers pages
  - New "Submissions" section under Home for managing abstracts
  - Conference root page redirects to /home
- **Files Created**:
  - `[id]/home/people/page.tsx` - Unified participants + speakers with role tabs
  - `[id]/home/submissions/page.tsx` - Submissions management with stats
  - `[id]/home/submissions/[submissionId]/page.tsx` - Submission detail + review
  - `[id]/home/program/page.tsx` - Operational program overview
  - `[id]/home/program/sessions/page.tsx` - Sessions CRUD
  - `[id]/home/program/scheduler/page.tsx` - Drag-drop scheduler
  - `[id]/home/program/presentations/page.tsx` - Presentations list
  - `[id]/home/reports/exports/page.tsx` - Data exports (CSV/JSON)
  - `[id]/home/reports/analytics/page.tsx` - Visual analytics dashboard
- **Files Modified**:
  - `[id]/page.tsx` - Converted to redirect to /home
  - `PerConferencePrimarySidebar.tsx` - Removed Program/Reports icons
  - `PerConferenceSecondarySidebar.tsx` - Restructured Home group with nested items
- **Total**: ~4,500 lines added across 9 new files
- **Documentation**: See `docs/IA-Restructure-Implementation-Log.md` for full details

### 8) Sidebar Navigation Fix - People Link
- **What happened**: "People" collapsible submenu in secondary sidebar led to 404 errors.
- **Why**: Folder structure has `home/people/page.tsx` as a unified page, not separate `participants/` and `speakers/` subpages.
- **Change**: Converted "People" from collapsible group with children to direct link pointing to `/home/people`.
- **Files**:
  - `PerConferenceSecondarySidebar.tsx` - Changed People from collapsible to direct link

### 9) Enhanced Role Filter Pills - People Page
- **What happened**: Role tabs in People page were basic text-only tabs, hard to distinguish.
- **Why**: Improve visual hierarchy and make role filtering more intuitive with color-coded pills.
- **Change**: Replaced basic Tabs component with custom pill-style buttons featuring:
  - Color-coded backgrounds per role (blue for attendees, purple for presenters, etc.)
  - Count badges showing number of people per role
  - Active state with scale effect and shadow
  - Smooth hover transitions
- **Files**:
  - `[id]/home/people/page.tsx` - Replaced TabsList with custom filter pills

### 10) Home Dashboard API Fix
- **What happened**: Home dashboard displayed "Resource not found" error with 404.
- **Why**: Dashboard was calling `/api/conferences/${id}` but conference routes are mounted at `/conferences` (no `/api` prefix).
- **Change**: Updated to use `API_ENDPOINTS.CONFERENCES.BY_ID(conferenceId)` which generates correct path.
- **Files**:
  - `[id]/home/page.tsx` - Fixed conference fetch endpoint

### 11) Organizer Conferences Page Redesign
- **What happened**: Complete redesign of the organizer conferences landing page (`/organizer/conferences`).
- **Why**: Original page was basic with limited functionality. Needed a modern, feature-rich interface for conference management.
- **Key Features**:
  - Grid/List view toggle for different display preferences
  - Stats cards showing counts (Total, Published, Drafts, Completed)
  - Search functionality by conference name
  - Status filter dropdown (All, Draft, Published, Completed, Canceled)
  - Sort options (Newest, Oldest, A-Z, Z-A)
  - Conference cards with rich metadata (dates, location, participant counts)
  - Status badges with color coding
  - Dropdown actions (Manage, Edit Details, Delete)
  - Empty state with call-to-action for new conference
  - Responsive design with hover effects
- **Files**:
  - `organizer/conferences/page.tsx` - Complete rewrite (~550 lines)
- **Total**: ~550 lines of new code

### 12) Removed Organizer Dashboard Page
- **What happened**: Deleted the `organizer/dashboard/` folder entirely.
- **Why**: With the new IA structure, the organizer dashboard is redundant:
  - The `/organizer/conferences` page now serves as the main landing page with stats
  - Per-conference Home dashboard (`[id]/home`) provides operational overview
  - No need for an intermediate dashboard between organizer entry and conference selection
- **Files Deleted**:
  - `organizer/dashboard/page.tsx`

### 13) Phase B: Public Schedule & Tree View Implementation
- **What happened**: Complete implementation of public-facing conference browsing features for base users/attendees.
- **Why**: Thesis requirement - base users need to browse conferences, view schedules, search presentations, and manage favorites.
- **Key Features Implemented**:

#### A. Feature Folders Created
1. **Tree-View Feature** (`features/tree-view/`)
   - `types.ts` - TreePresentation, TreeSession, TreeDay interfaces
   - `hooks/useTreeNavigation.ts` - State management for expand/collapse/highlight with auto-scroll
   - `components/PresentationNode.tsx` - Leaf node with favorite toggle, keywords, authors
   - `components/SessionNode.tsx` - Session container with type-based icons (presentation, break, keynote, workshop, panel, networking)
   - `components/DayNode.tsx` - Collapsible day with session/presentation count badges
   - `components/ConferenceTree.tsx` - Main container with filter input, expand/collapse all, detail panel
   - `index.ts` - Barrel exports

2. **Favorites Feature** (`features/favorites/`)
   - `types.ts` - FavoritePresentation, FavoritesState, FavoritesContextValue interfaces
   - `api/favoritesApi.ts` - fetchFavorites, toggleFavorite, checkFavoriteStatus functions
   - `hooks/useFavorites.ts` - State management with optimistic updates, grouping by conference/day
   - `components/FavoriteButton.tsx` - Reusable toggle button with animation
   - `components/FavoritesList.tsx` - Display favorited presentations grouped by conference
   - `context/FavoritesContext.tsx` - Provider for app-wide favorites state
   - `index.ts` - Barrel exports

3. **Search Feature** (`features/search/`)
   - `types.ts` - SearchField, SearchResult, SearchState, SearchSuggestion interfaces
   - `api/searchApi.ts` - searchConference, getSearchSuggestions, localSearch, highlightMatches
   - `hooks/useSearch.ts` - Debounced search with filter management
   - `components/SearchBar.tsx` - Input with field selector dropdown and suggestions
   - `components/SearchFilters.tsx` - Day and session type filter controls
   - `components/SearchResults.tsx` - Results display with highlighting and jump-to-tree
   - `index.ts` - Barrel exports

#### B. Conference Tab Components (`features/conferences/components/tabs/`)
- `OverviewTab.tsx` - Conference info, dates, location, topics, submission guidelines
- `ScheduleTab.tsx` - Day-based timeline view with collapsible sessions
- `TreeViewTab.tsx` - Wrapper for ConferenceTree with URL highlight support
- `SearchTab.tsx` - Wrapper integrating search components
- `SpeakersTab.tsx` - Speaker cards with presentations and affiliation
- `index.ts` - Barrel exports

#### C. Public Pages Created/Updated
1. **Conference List Page** (`(public)/conferences/page.tsx`)
   - Grid/List view toggle
   - Search by name, topic, location
   - Filter by status (upcoming, past, open registration, open CFP)
   - Sort by date or name
   - Conference cards with status badges

2. **Conference Detail Page** (`(public)/conferences/[id]/page.tsx`)
   - Complete rewrite with tabbed navigation
   - 5 tabs: Overview, Schedule, Program (Tree), Search, Speakers
   - URL parameter support (`?tab=`, `?highlight=`)
   - Lazy loading of schedule/speakers data

3. **Public Conference Card** (`features/conferences/components/PublicConferenceCard.tsx`)
   - Card component for public listings
   - Status badges (upcoming, completed, registration open, CFP open)
   - Date formatting, location, topics

4. **Account Favorites Page** (`account/favorites/page.tsx`)
   - Updated with FavoritesList component
   - Jump-to-tree functionality
   - Grouped by conference

- **Files Created**: 25+ new files
- **Files Modified**: 2 existing files
- **Total**: ~3,500+ lines of new code

### 14) MainNav Simplification & 403 Redirect Fix
- **What happened**: Two critical UX issues fixed:
  1. MainNav had too many unnecessary navigation links causing clutter
  2. Clicking tabs on public conference page redirected to `/not-authorized`
- **Why**:
  1. MainNav complexity - Users didn't need separate Organizer/Admin links in main nav; these are accessible via dropdown
  2. 403 Redirect - API client interceptor automatically redirected on ANY 403 response. When schedule API returned 403 for unpublished conferences, users got redirected instead of seeing graceful empty state.
- **Root Cause Analysis**:
  - The `apiClient` interceptor in `lib/api/client.ts` had: `if (error.response?.status === 403) { window.location.href = '/not-authorized'; }`
  - Schedule controller returns 403 if `schedulePublishedAt` is null, even for valid conferences
- **Fix Applied**:
  1. **MainNav Cleanup**:
     - Guest users: `Conferences` | `About`
     - Authenticated users: `Conferences` | `My Favorites`
     - Organizer/Admin access: Via user dropdown menu only
  2. **Suppress 403 Redirect**:
     - Added `X-Suppress-403-Redirect` header to schedule/speakers API calls
     - Page now handles 403 gracefully, showing "Schedule not available" instead of redirecting
- **Files Modified**:
  - `components/layouts/MainNav.tsx` - Simplified link arrays, removed organizerLinks/adminLinks from top nav
  - `(public)/conferences/[id]/page.tsx` - Added header to suppress 403 redirect on schedule/speakers API calls
- **Files Fixed (Lint Cleanup)**:
  - `features/conferences/components/tabs/TreeViewTab.tsx` - Fixed prop mismatch with ConferenceTree
  - `features/favorites/components/FavoriteButton.tsx` - Fixed ButtonProps import
  - `features/search/components/SearchFilters.tsx` - Removed unused clearFilters
  - Multiple tab components - Removed unused imports

### 15) Public Conferences Page Redesign - Booking.com Style
- **What happened**: Complete redesign of the public conferences listing page (`(public)/conferences/page.tsx`) with a modern, feature-rich layout inspired by Booking.com's hotel listing interface.
- **Why**: The original page was basic with limited filtering capabilities. User requested a more intuitive, professional layout similar to Booking.com's property listing pages with sidebar filters and horizontal list cards.
- **Design Inspiration**: Booking.com hotel search results - left sidebar with checkbox filters, horizontal list cards with images, sorting, view toggles.

#### Key Features Implemented:

**A. Filter Sidebar (Desktop)**
- **Status Filters**: Upcoming / Past conferences (mutually exclusive checkboxes)
- **Open For Filters**: Registration Open / Call for Papers Open
- **Topics Filter**: Scrollable checkbox list dynamically populated from conference data
- **Filter Counts**: Number shown next to each filter option (e.g., "Upcoming (12)")
- **Clear All Button**: One-click reset of all filters

**B. Conference List Cards (List View)**
- **Horizontal layout** like Booking.com hotel cards:
  - Left: Banner image (224px) or placeholder with Calendar icon
  - Right: Rich content section with:
    - Title (links to conference detail)
    - Location with MapPin icon
    - Description (2-line clamp)
    - Date range with Calendar icon
    - Participant count with Users icon
    - Topic badges (max 3 visible, "+N" for overflow)
    - Status badges (Happening Now, Soon, Completed)
    - Open badges (Registration Open in green, CFP Open in purple)
    - "View Details" CTA button

**C. Conference Grid Cards (Grid View)**
- **Vertical compact cards** for dense viewing:
  - Image header with status badge overlay
  - Title, date, location
  - Open badges at bottom

**D. Results Header**
- **Results count**: "X conferences found"
- **Sort dropdown**: Date (Soonest), Date (Latest), Name (A-Z), Name (Z-A), Most Popular
- **View toggle**: List/Grid switch buttons

**E. Active Filter Pills**
- Displayed below results header when filters active
- Each pill shows filter name with X button to remove
- Quick visual feedback of applied filters

**F. Mobile Responsiveness**
- Filter sidebar hidden on mobile
- **Filter Sheet** slides in from left on mobile via "Filters" button
- Badge showing active filter count

**G. Empty/Loading/Error States**
- **Skeleton loaders** for both list and grid view modes
- **Empty state** with icon, message, and "Clear all filters" button
- **Error state** with retry button

**H. Technical Implementation**
- **New components**: `FilterSidebar`, `ConferenceListCard`, `ConferenceGridCard`
- **State management**: `Filters` interface with search, upcoming, past, registrationOpen, cfpOpen, topics[]
- **Computed values**: `availableTopics`, `counts` for filter options
- **Sort options**: SortOption type union with 5 options
- **Utility functions**: `formatDateRange`, `getConferenceStatus`, `getDaysUntil`

- **File Modified**:
  - `(public)/conferences/page.tsx` - Complete rewrite (~885 lines, previously ~323 lines)
- **Lines Added**: ~560 new lines of code
- **UI Components Used**: Card, Badge, Checkbox, Label, Separator, ScrollArea, Select, Sheet, Button, Input

### 16) Base User Experience Overhaul - Account Portal
- **What happened**: Complete redesign of the base user experience after login, transforming an empty placeholder dashboard into a full-featured account portal.
- **Why**: Previously, users logging in were taken to `/account/dashboard` which was just a placeholder page with no content. Key features like My Conferences, My Submissions, and Favorites were hidden and unreachable from normal navigation.
- **Design Approach**: LinkedIn/Academia.edu-inspired portal style with persistent sidebar navigation and "My Activity" dropdown in MainNav.

#### Key Features Implemented:

**A. MainNav "My Activity" Dropdown**
- Added dropdown menu for authenticated users containing:
  - Dashboard - User's home overview
  - My Conferences - Registered conferences list
  - My Submissions - Abstract submissions tracker
  - My Favorites - Favorited presentations
- Guest users still see: `Conferences` | `About`
- User dropdown retains: Profile, Settings, Organizer Panel (if organizer), Admin Panel (if admin), Log Out

**B. AccountSidebar Component (NEW)**
- Created fixed left sidebar (`components/layouts/AccountSidebar.tsx`) for all `/account/*` pages
- 5 navigation items with icons:
  - Dashboard (LayoutDashboard icon)
  - My Conferences (CalendarDays icon)
  - My Submissions (FileText icon)
  - Favorites (Heart icon)
  - Settings (Settings icon)
- Active state highlighting based on current route
- Sticky positioning with responsive padding
- Integrated into `account/layout.tsx`

**C. Account Dashboard with Widgets**
- Complete rewrite of `account/dashboard/page.tsx` (~350 lines):
  - **Welcome Banner**: Personalized greeting with user's name
  - **4 Stat Cards**: Upcoming Conferences, Registered Conferences, Completed Conferences, Favorite Presentations
  - **Upcoming Conferences Widget**: Shows next 5 conferences with dates and "View All" link
  - **Quick Actions Section**: Links to browse conferences, submit abstract, view schedule
  - Uses `useAuthenticatedFetch` hook for API calls
  - Loading skeletons and error states

**D. My Conferences Page**
- Complete rewrite of `account/my-conferences/page.tsx` (~304 lines):
  - **Status Tabs**: All, Upcoming, Active, Past
  - **Search Functionality**: Filter by conference name
  - **Conference Cards**: Registration date, status badges, location, date range
  - **Quick Actions**: View Schedule, View Program (Tree View)
  - Loading skeletons and empty states
  - Uses `apiClient` with proper endpoint

**E. My Submissions Page (NEW)**
- Complete implementation of `account/my-submissions/page.tsx` (~350 lines):
  - **Status Tabs**: All, Drafts, Submitted, In Review, Accepted, Rejected
  - **Search Functionality**: Filter by title, abstract, keywords, conference name
  - **Submission Cards**:
    - Title, conference link, status badge (color-coded)
    - Abstract preview (3-line clamp)
    - Keywords as badges
    - Created/submitted dates
    - Deadline status (with warning if passed)
  - **Actions per status**:
    - Draft: Edit, Submit buttons (if deadline not passed)
    - Submitted/Accepted/etc.: View Details button
  - Loading skeletons and empty states

**F. Backend: User Submissions Endpoint (NEW)**
- Added `getUserSubmissions` controller function (`server/src/controllers/attendeeControllers.ts`):
  - Fetches all submissions by current user across all conferences
  - Supports filtering by status (draft, submitted, under_review, accepted, rejected, revision_requested, withdrawn)
  - Supports search by title/abstract/keywords
  - Includes conference details (title, slug, dates, submission deadline)
- Added route `GET /api/attendee/my-submissions` (`server/src/routes/attendeeRoutes.ts`)
- Added endpoint constant `ATTENDEE.MY_SUBMISSIONS` (`client/src/lib/api/endpoints.ts`)

**Files Created**:
- `client/src/components/layouts/AccountSidebar.tsx` (~115 lines)

**Files Modified**:
- `client/src/components/layouts/MainNav.tsx` - Complete rewrite with "My Activity" dropdown
- `client/src/app/account/layout.tsx` - Added AccountSidebar integration
- `client/src/app/account/dashboard/page.tsx` - Complete rewrite with widgets
- `client/src/app/account/my-conferences/page.tsx` - Complete rewrite with tabs/search/cards
- `client/src/app/account/my-submissions/page.tsx` - Complete rewrite with full functionality
- `client/src/lib/api/endpoints.ts` - Added MY_SUBMISSIONS endpoint
- `server/src/controllers/attendeeControllers.ts` - Added getUserSubmissions function
- `server/src/routes/attendeeRoutes.ts` - Added /my-submissions route

**Total New Code**: ~1,200+ lines across frontend and backend

### 17) Route Naming Convention Analysis & Migration Plan
- **What happened**: Comprehensive analysis of backend route naming inconsistencies and creation of 4-phase migration plan.
- **Why**: Routes evolved organically leading to mismatches:
  - `/events` in backend vs "Conferences" in UI
  - `/api/attendee/*` in backend vs `/account/*` in frontend pages
  - Inconsistent `/api` prefix usage
  - Duplicate favorite routes
  - Mixed concerns in single routes
  - No clear role-based route prefixes
  - "Sections" in code vs "Sessions" in UI

**Issues Identified** (7 total):
1. "Events" vs "Conferences" terminology mismatch
2. "Attendee" vs "Account" naming mismatch
3. Inconsistent `/api` prefix (some routes have it, some don't)
4. Duplicate routes for favorites functionality
5. Mixed public/protected concerns in `/conferences` route
6. No `/api/organizer/*` or `/api/admin/*` prefixes
7. "Sections" vs "Sessions" terminology

**Recommended New Structure**:
```
/api/public/*      → Public conference browsing
/api/account/*     → User dashboard features
/api/organizer/*   → Organizer management
/api/admin/*       → Admin management
```

**Migration Plan**:
- Phase 1: Add new routes alongside existing (non-breaking)
- Phase 2: Update frontend to use new endpoints
- Phase 3: Remove deprecated routes, consolidate
- Phase 4: Terminology cleanup (sections→sessions)

**Files Created**:
- `docs/Route-Naming-Convention-Analysis.md` (~450 lines)

**Pending Implementation**: 18 tasks organized across 4 phases

---
## Nov 2025

### 1) Conference creation 404 fixed by adding POST route and organizer-owned listing
- What happened: Creating a conference returned 404 due to missing server POST route and a mismatch with client endpoints.
- Why: Client assumed `/conferences` supported POST and organizer listing; server only exposed public GETs.
- Change: Introduced `POST /conferences` (role-gated) and `GET /conferences?mine=1` for organizer-owned list.
- Files:
  - server/src/routes/conferenceRoutes.ts (new POST, multiplex GET)
  - server/src/controllers/conferenceControllers.ts (createConference, getMyConferences)
  - client/src/features/conferences/api/conferencesApi.ts (createConference, listMyConferences)

### 2) Authorization refactor to use DB `User.role` exclusively
- What happened: Role checks previously risked relying on Cognito `custom:role`.
- Why: Cognito claims can get stale; single source of truth must be our DB for determinism and revocation.
- Change: Middleware now ignores `custom:role` and always loads role from Prisma.
- Files:
  - server/src/middleware/authMiddleware.ts

### 3) Organizer guard + Not Authorized UX with upgrade path
- What happened: Base users got blocked without guidance and saw organizer UI flicker.
- Why: Improve onboarding and eliminate pre-redirect flash.
- Change: Added `OrganizerGuard` to protect organizer pages; Not Authorized page shows “Upgrade to Organizer” when applicable.
- Files:
  - client/src/components/layouts/OrganizerGuard.tsx
  - client/src/app/not-authorized/page.tsx
  - client/src/features/auth/context/AuthContext.tsx (upgrade method)
  - client/src/features/auth/api/authApi.ts (upgrade endpoint)

### 4) Post-upgrade redirect back to the original organizer page
- What happened: After upgrade, users landed on a generic page, losing context.
- Why: Preserve intent and shorten time-to-task.
- Change: OrganizerGuard appends `?from=<path>`; Not Authorized reads it and redirects back after a successful upgrade or if already organizer.
- Files:
  - client/src/components/layouts/OrganizerGuard.tsx
  - client/src/app/not-authorized/page.tsx

### 5) Draft conference detail fallback for organizers
- What happened: Public detail `/conferences/:id` returned 404 for drafts.
- Why: Drafts should be visible to organizers, not public.
- Change: Client fallback to `/events/:id` when public detail 404s.
- Files:
  - client/src/features/conferences/api/conferencesApi.ts
  - client/src/features/conferences/context/ConferenceContext.tsx

### 6) Inline 403 handling to enable in-form upgrade
- What happened: Axios interceptor auto-redirected on 403, breaking inline upgrade UX.
- Why: Creation form should offer upgrade without losing inputs.
- Change: Added per-request suppression flag/header; form handles 403 and shows upgrade prompt.
- Files:
  - client/src/lib/api/client.ts (interceptor respects suppression)
  - client/src/features/conferences/api/conferencesApi.ts (sets suppression)

---
## Links
- See also: `docs/IA-Restructure-Implementation-Log.md` for IA restructure details
- See also: `docs/Recent-Implementation-Decisions.md` for structured rationale and alternatives
- See also: `docs/Thesis-Completion-Roadmap.md` for remaining thesis requirements
- See also: `docs/Route-Naming-Convention-Analysis.md` for route migration plan
