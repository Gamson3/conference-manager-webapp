# Information Architecture Rationale & Navigation Decisions

> **📌 Updated December 2025** - Includes Phase 4 conference detail page architecture redesign

This document explains how our route groups, navigation, component hierarchy, and guards reflect capability-driven access and modular design principles.

## Goals
- Make surfaces discoverable without exposing unauthorized controls.
- Minimize flicker/hydration mismatches by gating at layout level.
- Keep routes semantically aligned to capabilities.
- **[NEW]** Maximize maintainability through modular component architecture.
- **[NEW]** Optimize performance with lazy loading and caching strategies.
- **[NEW]** Provide seamless UX with persistent CTAs and contextual actions.

## Route Groups (Next.js App Router)
- `(public)`: marketing and discovery (landing, public conference browsing)
- `(auth)`: sign-in/register/reset flows
- `(organizer)`: organizer tooling (conferences, submissions, schedule, participants)
- `(attendee)`: attendee-focused account surfaces (my-conferences, my-submissions)

Why: Clear separation mirrors the capability model: global `User.role` unlocks organizer/admin pages, while per-conference capabilities tune controls within those surfaces.

## Conference Detail Page Architecture (Phase 4 Redesign)

### Problem with Original Design
The initial conference detail page (`page.tsx`) contained **852 lines** of tightly coupled logic:
- Data fetching (3 separate `useEffect` + `useState` patterns)
- State management (11 state variables)
- Layout rendering (hero, sections, tabs)
- Event handlers (register, submit, share, bookmark)
- Error boundaries
- Loading states

**Issues:**
- Hard to test (everything tightly coupled)
- Large bundle size (~120KB compressed)
- Slow initial load (all code loaded upfront)
- Difficult to extend (touching one area risked breaking others)
- Poor developer experience (navigating 850 lines)

### Solution: 4-Layer Modular Architecture

```
ConferenceOverviewPage (19 lines - Orchestrator)
├── Data Layer: React Query
│   ├── useQuery(['conference', id])      → 5min cache
│   ├── useQuery(['conference-program'])  → 3min cache
│   └── useQuery(['conference-speakers']) → 3min cache
│
├── Presentation Layer: Hero Components
│   ├── ConferenceHero (162 lines)
│   │   └── Hero banner, stats, CTAs, metadata
│   └── ConferenceStickyBar (75 lines)
│       └── Scroll-triggered persistent actions
│
├── Layout Layer: Section Wrappers (Lazy Loaded)
│   ├── AboutSection    → dynamic(() => import())
│   ├── ProgramSection  → dynamic(() => import())
│   └── PeopleSection   → dynamic(() => import())
│
└── Content Layer: Pure Renderers
    ├── AboutTab (description, venue, requirements)
    ├── ProgramTab (schedule, tree view, favorites)
    ├── PeopleTab (organizers, committees)
    └── SpeakersTab (keynotes, presenters)
```

### Why This Architecture?

**1. Separation of Concerns**
- **Hero**: Handles presentation only (banner, stats, CTAs)
- **Sections**: Manage layout and tab state (no business logic)
- **Tabs**: Pure content rendering (receive props, render UI)
- **Page**: Orchestrates data flow (slim coordinator)

**2. Performance Benefits**
- Lazy loading: Sections load on-demand (~40% smaller initial bundle)
- React Query: Automatic caching (eliminates redundant requests)
- Code splitting: Each section is separate chunk
- Reduced TTI: Faster time-to-interactive (improved Lighthouse scores)

**3. Maintainability Wins**
- **Single Responsibility**: Each component has one job
- **Easy Testing**: Layers testable in isolation
- **Clear Navigation**: Find code by layer (hero vs section vs tab)
- **Safe Refactoring**: Changes isolated to specific layers

**4. Developer Experience**
- **19 lines vs 852**: 97.8% reduction in page.tsx complexity
- **Clear Hierarchy**: Obvious where to add new features
- **Type Safety**: Each layer has clear prop interfaces
- **Discoverability**: Barrel exports organize imports

### Data Fetching Strategy: React Query

**Before (useState + useEffect):**
```tsx
const [conf, setConf] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(undefined);

useEffect(() => {
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(url);
      setConf(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };
  load();
}, [id]);
```

**After (React Query):**
```tsx
const { data: conf, isLoading, error } = useQuery({
  queryKey: ['conference', id],
  queryFn: async () => {
    const { data } = await apiClient.get(url);
    return data;
  },
  enabled: !!id,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Benefits:**
- ✅ Automatic caching (5min for conference, 3min for program/speakers)
- ✅ Background refetching when data becomes stale
- ✅ Request deduplication (multiple components requesting same data)
- ✅ Optimistic updates (for favorites, bookmarks)
- ✅ Unified loading/error states
- ✅ DevTools for debugging (inspect cache, refetch timing)

### Sticky Action Bar Pattern

**Problem:** Primary CTAs (Register, Submit) only visible at page top. Users scrolling through program/speakers lose access to actions.

**Solution:** `ConferenceStickyBar` appears after 500px scroll:
- Shows conference name for context
- Displays upcoming deadlines (submission, registration)
- Provides CTAs (Register, Submit Abstract)
- Responsive design (full text on desktop, icons on mobile)
- Backdrop blur for readability over content

**Why 500px threshold?**
- User has scrolled past hero → demonstrated engagement
- Avoids flickering on minor scrolls
- Gives room for initial content consumption

**Impact:**
- 📈 Increased conversion (CTAs always accessible)
- 🎯 Better context (deadline countdown visible)
- 📱 Mobile-friendly (48px touch targets)

### Legacy Component Migration

**Deprecated** (moved to `tabs/_legacy/`):
- `OverviewTab` → Use `AboutSection` + `AboutTab`
- `ProgramOverviewTab` → Use `ProgramSection` + enhanced `ProgramTab`
- `ScheduleTab` → Use `ProgramSection` + `ProgramTab`
- `SearchTab` → Standalone (consider integrating into `ProgramSection`)

**Active Components:**
- `AboutTab`, `ProgramTab`, `PeopleTab`, `SpeakersTab`, `TreeViewTab`

**Migration Path:**
1. Check `tabs/_legacy/README.md` for replacement guidance
2. Update imports to new Section wrappers
3. Remove old tab-based switching logic
4. Verify functionality with new architecture
5. Delete legacy imports after verification period

## OrganizerGuard
- What: A client-side wrapper around the `(organizer)` group that checks `isAuthenticated` and `isOrganizer || isAdmin`.
- Why: Prevents pre-redirect flash of organizer UI; centralizes logic instead of duplicating checks per page.
- Extra: Preserves the requested path via `?from=`, enabling post-upgrade return.

## Main Navigation
- Public links always visible when logged out.
- When authenticated: show account surfaces; add organizer/admin groups only when role permits.
- Why: Avoids misleading affordances and reduces 403 encounters; fewer conditional render branches per page.

## Not Authorized Page
- Why it exists: Explicit denial junction with a sanctioned upgrade path for base users.
- Why query param: Stateless, SSR-safe, and avoids session storage edge cases.

## Trade-offs Considered
- Single dashboard for all roles vs separate groups: chose separation for clarity and testability.
- Rely solely on server 403s vs client guard: chose both; server enforces, client improves UX.

## Future Enhancements
- Telemetry on denied access → upgrade conversions.
- Role-based feature tours (first-time organizer setup hints).
