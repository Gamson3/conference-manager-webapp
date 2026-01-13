# Route Naming Convention Analysis & Migration Plan

**Created:** December 5, 2025  
**Status:** Planning Complete, Implementation Pending  
**Purpose:** Document current route structure issues and define migration path to consistent naming

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Backend Route Structure](#current-backend-route-structure)
3. [Frontend Page Structure vs Backend Routes](#frontend-page-structure-vs-backend-routes)
4. [Identified Issues](#identified-issues)
5. [Recommended New Route Structure](#recommended-new-route-structure)
6. [Progressive Change Plan](#progressive-change-plan)
7. [Summary of All Changes](#summary-of-all-changes)
8. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

The Conference Master Web App has evolved organically, leading to inconsistent route naming between frontend pages and backend API endpoints. Key issues include:

- **"Events" vs "Conferences"** terminology mismatch
- **"Attendee" vs "Account"** naming for user dashboard routes
- **Inconsistent `/api` prefix** usage
- **Duplicate route handlers** for favorites
- **Mixed concerns** in single route files

This document outlines a progressive migration plan across 4 phases to achieve naming consistency without breaking existing functionality.

---

## Current Backend Route Structure

### Server Route Mounts (server/src/index.ts)

| Mount Point | Route File | Purpose | Status |
|-------------|-----------|---------|--------|
| `/auth` | authRoutes.ts | Authentication | ✅ Consistent |
| `/users` | userRoutes.ts | User management | ⚠️ Mixed concerns |
| `/events` | eventRoutes.ts | Organizer conference management | ❌ Should be `/api/organizer/conferences` |
| `/conferences` | conferenceRoutes.ts | Public + some organizer | ⚠️ Mixed public/protected |
| `/api` | scheduleRoutes.ts | Schedule, presentations, favorites | ❌ Generic prefix |
| `/sections` | sectionRoutes.ts | Sessions/sections | ❌ No `/api` prefix, wrong terminology |
| `/search` | searchRoutes.ts | Global search | ✅ OK |
| `/favorites` | favoriteRoutes.ts | Favorites | ❌ Duplicates scheduleRoutes |
| `/api` | presentationRoutes.ts | Presentations | ❌ Mixed with schedule routes |
| `/api/attendee` | attendeeRoutes.ts | User dashboard features | ❌ Should be `/api/account` |
| `/api` | conferenceSetupRoutes.ts | Organizer setup | ⚠️ Nested under generic `/api` |
| `/api` | participantsRoutes.ts | Participant management | ⚠️ Mixed concerns |
| `/api` | submissionsRoutes.ts | Abstract submissions | ✅ OK (conference-scoped) |
| `/api` | daysRoutes.ts | Schedule days | ✅ OK (conference-scoped) |
| `/api` | websiteRoutes.ts | Website module | ✅ OK (conference-scoped) |
| `/api` | registrationRoutes.ts | Registration module | ✅ OK (conference-scoped) |

### Unused/Orphaned Route Files

The following route files exist but are not mounted in index.ts:
- `abstractRoutes.ts`
- `analyticsRoutes.ts`
- `attendanceRoutes.ts`
- `authorRoutes.ts`
- `feedbackRoutes.ts`
- `materialRoutes.ts`
- `notificationRoutes.ts`
- `organizerConferenceRoutes.ts`
- `publicRoutes.ts`

---

## Frontend Page Structure vs Backend Routes

### Current Mapping

| Frontend Path | Purpose | Current Backend | Issues |
|--------------|---------|-----------------|--------|
| `/` (landing) | Public landing | N/A | N/A |
| `/conferences` | Public browse | `/conferences` | Missing `/api` prefix |
| `/conferences/[id]` | Public view | `/conferences/:id` | Missing `/api` prefix |
| `/account/dashboard` | User dashboard | `/api/attendee/dashboard-stats` | "attendee" ≠ "account" |
| `/account/my-conferences` | User's registrations | `/api/attendee/registered-conferences` | "attendee" ≠ "account" |
| `/account/my-submissions` | User's submissions | `/api/attendee/my-submissions` | "attendee" ≠ "account" |
| `/account/favorites` | User's favorites | `/api/attendee/favorites` | "attendee" ≠ "account" |
| `/account/settings` | User settings | `/users/me` | Different path structure |
| `/organizer/conferences` | Organizer list | `/events` + `/conferences?mine=1` | "events" ≠ "conferences" |
| `/organizer/conferences/[id]/*` | Per-conference mgmt | Various `/api/*` routes | Scattered |
| `/admin/dashboard` | Admin overview | N/A | Not implemented |
| `/admin/users` | User management | `/users` | Missing `/api/admin` prefix |
| `/admin/conferences` | All conferences | `/conferences` | Missing `/api/admin` prefix |

---

## Identified Issues

### Issue 1: Naming Mismatch - "Events" vs "Conferences"

**Current State:**
- Backend uses `/events` for organizer routes (eventRoutes.ts, eventControllers.ts)
- Frontend shows "Conferences" everywhere in UI
- Database model is named `Conference`

**Impact:**
- Developer confusion when tracing code
- API documentation inconsistency
- New team members struggle to understand the codebase

**Solution:** Rename all event-related routes and controllers to use "conference" terminology.

---

### Issue 2: Naming Mismatch - "Attendee" vs "Account"

**Current State:**
- Backend: `/api/attendee/*` (attendeeRoutes.ts, attendeeControllers.ts)
- Frontend pages: `/account/*`

**Impact:**
- User mental model mismatch - users think "My Account" not "I'm an Attendee"
- Endpoint naming doesn't match page URLs

**Solution:** Rename `/api/attendee/*` to `/api/account/*`.

---

### Issue 3: Inconsistent `/api` Prefix

**Current State:**
Some routes have `/api` prefix, some don't:
- ✅ `/api/conferences/:id/schedule`
- ❌ `/conferences/:id` (no prefix)
- ❌ `/sections` (no prefix)
- ❌ `/events` (no prefix)
- ❌ `/users` (no prefix)

**Impact:**
- No clear pattern for API vs page routes
- CORS and proxy configuration complexity
- Inconsistent endpoint documentation

**Solution:** All API routes should use `/api/*` prefix with role-based grouping.

---

### Issue 4: Duplicate Routes

**Current State:**
- `/favorites` (favoriteRoutes.ts) handles conference/presentation favorites
- `/api/favorites/presentations` (scheduleRoutes.ts) also handles presentation favorites
- `/api/attendee/favorites` (attendeeRoutes.ts) also handles user favorites

**Impact:**
- Multiple endpoints for same functionality
- Confusion about which endpoint to use
- Maintenance overhead

**Solution:** Consolidate into single `/api/account/favorites` endpoint.

---

### Issue 5: Mixed Concerns in Single Routes

**Current State:**
`/conferences` route handles:
- Public listing (GET /)
- Organizer listing (GET /?mine=1)
- Public details (GET /:id)
- Organizer details (GET /private/:id)
- Search (GET /:id/search)
- Creation (POST /)
- Update (PUT /:id)

**Impact:**
- Complex conditional logic in route handlers
- Difficult to apply role-specific middleware
- Hard to maintain and test

**Solution:** Split into `/api/public/conferences` and `/api/organizer/conferences`.

---

### Issue 6: No Clear Role Separation

**Current State:**
- No `/api/organizer/*` prefix for organizer-only routes
- No `/api/admin/*` prefix for admin-only routes
- Role checks scattered across individual routes

**Impact:**
- Hard to audit which routes require which roles
- Security review complexity
- Documentation challenges

**Solution:** Group routes by required role with clear prefixes.

---

### Issue 7: "Sections" vs "Sessions" Terminology

**Current State:**
- Prisma model: `Section`
- Backend code: `sections`, `sectionRoutes.ts`, `sectionControllers.ts`
- Frontend UI labels: "Sessions"

**Impact:**
- Confusion when searching codebase
- UI/code terminology mismatch

**Solution:** Keep Prisma model name (migration cost too high), but use "sessions" in route paths and controller names.

---

## Recommended New Route Structure

### Tier 1: Public Routes (No Auth Required)

```
/api/public/conferences                    # List published conferences
/api/public/conferences/:id                # View conference details
/api/public/conferences/:id/schedule       # View published schedule
/api/public/conferences/:id/speakers       # View speakers
/api/public/conferences/:id/materials      # Public materials
```

**Controller:** publicControllers.ts  
**Middleware:** optionalAuthMiddleware (for personalization)

---

### Tier 2: Authenticated User Routes (Any Role: user, organizer, admin)

```
/api/account/profile                       # GET/PUT - User profile
/api/account/dashboard                     # GET - Dashboard stats
/api/account/my-conferences                # GET - Registered conferences
/api/account/my-submissions                # GET - User's submissions
/api/account/favorites                     # GET/POST/DELETE - Favorites
/api/account/settings                      # GET/PUT - User preferences
```

**Controller:** accountControllers.ts  
**Middleware:** authMiddleware(['user', 'organizer', 'admin'])

---

### Tier 3: Organizer Routes (organizer, admin roles)

```
# Conference Management
/api/organizer/conferences                 # GET - List my conferences
/api/organizer/conferences                 # POST - Create conference
/api/organizer/conferences/:id             # GET - Conference details (owner view)
/api/organizer/conferences/:id             # PUT - Update conference
/api/organizer/conferences/:id             # DELETE - Delete conference

# Settings
/api/organizer/conferences/:id/settings    # GET/PUT - Basic settings
/api/organizer/conferences/:id/publish     # POST - Publish conference
/api/organizer/conferences/:id/unpublish   # POST - Unpublish conference

# Setup (Categories, Types, Requirements, Milestones)
/api/organizer/conferences/:id/setup/categories
/api/organizer/conferences/:id/setup/types
/api/organizer/conferences/:id/setup/requirements
/api/organizer/conferences/:id/setup/milestones

# Abstracts/Submissions
/api/organizer/conferences/:id/submissions
/api/organizer/conferences/:id/submissions/:submissionId
/api/organizer/conferences/:id/submissions/:submissionId/review
/api/organizer/conferences/:id/submissions/:submissionId/decision
/api/organizer/conferences/:id/submissions/export

# Registration
/api/organizer/conferences/:id/registration/settings
/api/organizer/conferences/:id/registration/questions
/api/organizer/conferences/:id/registration/overview

# Program
/api/organizer/conferences/:id/program/days
/api/organizer/conferences/:id/program/sessions
/api/organizer/conferences/:id/program/schedule
/api/organizer/conferences/:id/program/presentations

# Website
/api/organizer/conferences/:id/website/materials
/api/organizer/conferences/:id/website/visibility
/api/organizer/conferences/:id/website/public-page

# Reports
/api/organizer/conferences/:id/reports/analytics
/api/organizer/conferences/:id/reports/exports

# People
/api/organizer/conferences/:id/people/participants
/api/organizer/conferences/:id/people/speakers
```

**Controller:** organizerControllers.ts (may delegate to existing controllers)  
**Middleware:** authMiddleware(['organizer', 'admin'])

---

### Tier 4: Admin Routes (admin role only)

```
/api/admin/dashboard                       # GET - System stats
/api/admin/users                          # GET - All users
/api/admin/users/:id                      # GET/PUT/DELETE - User management
/api/admin/users/:id/role                 # PUT - Change role
/api/admin/conferences                    # GET - All conferences
/api/admin/conferences/:id                # GET/PUT/DELETE - Any conference
```

**Controller:** adminControllers.ts  
**Middleware:** authMiddleware(['admin'])

---

### Tier 5: Shared Authenticated Routes (Any authenticated user)

```
/api/conferences/:id/register             # POST - Self-register
/api/conferences/:id/unregister           # DELETE - Self-unregister
/api/conferences/:id/submit               # POST - Submit abstract
/api/conferences/:id/search               # GET - Search conference content
/api/presentations/:id/favorite           # POST/DELETE - Toggle favorite
```

**Middleware:** authMiddleware(['user', 'organizer', 'admin'])

---

## Progressive Change Plan

### Phase 1: Non-Breaking Additions

**Goal:** Add new route structure alongside existing routes  
**Timeline:** 1 session  
**Risk:** Low (no breaking changes)

**Tasks:**
1. Create `server/src/routes/publicRoutes.ts`
2. Create `server/src/routes/accountRoutes.ts`
3. Create `server/src/routes/organizerRoutes.ts`
4. Create `server/src/routes/adminRoutes.ts`
5. Mount new routes in `server/src/index.ts`
6. Add deprecation comments to old route files

**New Mounts:**
```typescript
// New route structure (preferred)
app.use("/api/public", publicRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/admin", adminRoutes);

// Legacy routes (deprecated - will be removed)
app.use("/events", eventRoutes);           // DEPRECATED: Use /api/organizer
app.use("/api/attendee", attendeeRoutes);  // DEPRECATED: Use /api/account
```

---

### Phase 2: Frontend Migration

**Goal:** Update frontend to use new endpoints  
**Timeline:** 1 session  
**Risk:** Medium (must test all pages)

**Tasks:**
1. Update `client/src/lib/api/endpoints.ts`:
   - Rename `ATTENDEE` → `ACCOUNT`
   - Rename `EVENTS` → `ORGANIZER` (if used)
   - Add `PUBLIC` group
   - Add `ADMIN` group
2. Update account pages to use `ACCOUNT` endpoints
3. Update organizer pages to use `ORGANIZER` endpoints
4. Update public pages to use `PUBLIC` endpoints
5. Update admin pages to use `ADMIN` endpoints
6. Test all page functionality

**Endpoint Changes:**
```typescript
// Before
ATTENDEE: {
  DASHBOARD_STATS: `${API_BASE_URL}/api/attendee/dashboard-stats`,
  ...
}

// After
ACCOUNT: {
  DASHBOARD_STATS: `${API_BASE_URL}/api/account/dashboard`,
  MY_CONFERENCES: `${API_BASE_URL}/api/account/my-conferences`,
  MY_SUBMISSIONS: `${API_BASE_URL}/api/account/my-submissions`,
  FAVORITES: `${API_BASE_URL}/api/account/favorites`,
  ...
}
```

---

### Phase 3: Backend Cleanup

**Goal:** Remove deprecated routes and consolidate  
**Timeline:** 1 session  
**Risk:** Medium (ensure nothing still uses old routes)

**Tasks:**
1. Verify no frontend code uses old endpoints
2. Delete `server/src/routes/eventRoutes.ts`
3. Delete `server/src/routes/attendeeRoutes.ts`
4. Consolidate `server/src/routes/favoriteRoutes.ts` into accountRoutes
5. Update `server/src/index.ts` to remove old mounts
6. Clean up unused controller functions
7. Remove orphaned route files

**Files to Delete:**
- `eventRoutes.ts`
- `attendeeRoutes.ts`
- `favoriteRoutes.ts` (after consolidation)

---

### Phase 4: Terminology Cleanup

**Goal:** Align code terminology with UI  
**Timeline:** 1 session  
**Risk:** Low (mostly renaming)

**Tasks:**
1. Rename `sectionRoutes.ts` → `sessionRoutes.ts`
2. Update route paths from `/sections` → `/sessions`
3. Update controller function names
4. Add comments documenting `Conference.name` convention
5. Audit UI for terminology consistency
6. Update any remaining "event" references in code comments

**Note:** Prisma `Section` model name is kept to avoid database migration complexity. Code uses "sessions" but model remains "Section".

---

## Summary of All Changes

| Category | Current | Proposed | Priority |
|----------|---------|----------|----------|
| **Route Prefix** | `/api/attendee/*` | `/api/account/*` | 🔴 High |
| **Route Prefix** | `/events/*` | `/api/organizer/conferences/*` | 🔴 High |
| **Route Prefix** | `/conferences` (mixed) | `/api/public/conferences` | 🟡 Medium |
| **Endpoint Group** | `EVENTS` | `ORGANIZER` | 🔴 High |
| **Endpoint Group** | `ATTENDEE` | `ACCOUNT` | 🔴 High |
| **Route File** | `eventRoutes.ts` | `organizerRoutes.ts` | 🟡 Medium |
| **Route File** | `attendeeRoutes.ts` | `accountRoutes.ts` | 🔴 High |
| **Terminology** | `sections` | `sessions` (in routes) | 🟢 Low |
| **Model Field** | `Conference.name` | Keep as-is (document) | 🟢 Low |
| **Duplicate Routes** | Multiple favorite routes | Consolidate to account | 🟡 Medium |

---

## Implementation Checklist

### Phase 1: Non-Breaking Additions
- [ ] Create publicRoutes.ts with public conference endpoints
- [ ] Create accountRoutes.ts with user dashboard endpoints
- [ ] Create organizerRoutes.ts with organizer management endpoints
- [ ] Create adminRoutes.ts with admin management endpoints
- [ ] Mount new routes in index.ts
- [ ] Add deprecation comments to old routes

### Phase 2: Frontend Migration
- [ ] Update endpoints.ts (ATTENDEE→ACCOUNT, add PUBLIC, ADMIN)
- [ ] Update account/dashboard/page.tsx
- [ ] Update account/my-conferences/page.tsx
- [ ] Update account/my-submissions/page.tsx
- [ ] Update account/favorites/page.tsx
- [ ] Update all organizer pages
- [ ] Update all public pages
- [ ] Update all admin pages
- [ ] Test all functionality

### Phase 3: Backend Cleanup
- [ ] Verify no frontend uses old endpoints
- [ ] Delete eventRoutes.ts
- [ ] Delete attendeeRoutes.ts
- [ ] Consolidate favoriteRoutes.ts
- [ ] Update index.ts
- [ ] Remove orphaned files

### Phase 4: Terminology Cleanup
- [ ] Rename sectionRoutes.ts → sessionRoutes.ts
- [ ] Update route paths /sections → /sessions
- [ ] Document Conference.name convention
- [ ] Audit UI terminology
- [ ] Update code comments

---

## References

- **Engineering Change Log:** `client/docs/Engineering-Change-Log.md`
- **IA Restructure Log:** `client/docs/IA-Restructure-Implementation-Log.md`
- **CHANGELOG Development:** `docs/CHANGELOG-Development.md`
- **Prisma Schema:** `server/prisma/schema.prisma`

---

*Document Author: GitHub Copilot (Claude Opus 4.5)*  
*Created: December 5, 2025*
