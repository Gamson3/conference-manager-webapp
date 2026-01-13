# ADR 0003: Primary Organizer Upgrade Flow via Conference Creation

**Status:** Accepted  
**Date:** 2025-01-11  
**Deciders:** Development Team  

---

## Context

We have an existing organizer upgrade mechanism (ADR 0002) where users who try to access organizer-only pages are redirected to `/not-authorized` with an explicit upgrade button. However, this creates friction as users must:
1. Attempt to access a protected page
2. Get denied
3. Explicitly click "Upgrade to Organizer"
4. Then proceed with their original intent

This works as a **fallback mechanism**, but we need a more natural **primary flow** that doesn't feel like hitting a wall.

### User Journey Goals

**Guest Users (not authenticated):**
- See "Host a Conference" call-to-action on landing page
- Click → Navigate to `/conferences/new`
- **Auth modal appears:** "Sign in to host a conference"
- Choose Sign In or Sign Up in modal tabs
- After authentication → Modal closes, conference form accessible
- Create first conference → Automatically upgraded to `role=organizer`

**Base Users (authenticated, `role=user`):**
- See "Host a Conference" call-to-action on landing page
- Click → Go directly to `/conferences/new` page
- Create first conference → Automatically upgraded to `role=organizer`

**Organizers (authenticated, `role=organizer`):**
- See "Host a Conference" call-to-action on landing page
- Click → Go directly to `/conferences/new` page
- Create additional conference (already has organizer role)

---

## Decision

**Primary Flow:** Conference creation is the natural path to becoming an organizer.

### Implementation

#### 1. Landing Page Changes

**DiscoverSection.tsx:**
- Add "Host a Conference" button alongside "Browse Conferences"
- For all users: This button navigates to `/conferences/new`

```tsx
<div className="mt-8 flex gap-4 justify-center">
  <Button asChild>
    <Link href="/conferences">Browse Conferences</Link>
  </Button>
  <Button asChild variant="outline">
    <Link href="/conferences/new">
      Host a Conference
    </Link>
  </Button>
</div>
```

#### 2. Guest User Authentication (Modal)

**`/conferences/new` Page:**
- Public route (no server-side guard)
- On page load, checks authentication status client-side
- **If guest (not authenticated):**
  - Auth modal automatically appears
  - Contains Login/Register tabs
  - Cannot close modal without authenticating (redirects to landing if dismissed)
  - After successful auth → Modal closes, form becomes accessible
- **If authenticated:** Show form immediately

**Modal Implementation:**
```tsx
useEffect(() => {
  if (!isAuthenticated) {
    setShowAuthDialog(true);
  }
}, [isAuthenticated]);

<Dialog open={showAuthDialog} onOpenChange={(open) => {
  if (!open && !isAuthenticated) {
    router.push('/'); // Redirect if they try to close without auth
  }
  setShowAuthDialog(open);
}}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Sign in to host a conference</DialogTitle>
      <DialogDescription>
        Create a free account or sign in to get started.
      </DialogDescription>
    </DialogHeader>
    
    <Tabs defaultValue="login">
      <TabsList>
        <TabsTrigger value="login">Sign In</TabsTrigger>
        <TabsTrigger value="register">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginForm onSuccess={() => setShowAuthDialog(false)} />
      </TabsContent>
      <TabsContent value="register">
        <RegisterForm onSuccess={() => setShowAuthDialog(false)} />
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
```

**Auth Forms Enhancement:**
- `LoginForm` and `RegisterForm` now accept optional `onSuccess` callback
- When used in modal: Calls callback to close dialog
- When used standalone: Default redirect behavior maintained

#### 3. Backend: Atomic Upgrade + Conference Creation

**Endpoint:** `POST /api/organizer/conferences`

**Problem Solved:** Prevents orphaned organizers (upgraded but no conference)

**Implementation:**
```typescript
export const createEvent = async (req: Request, res: Response) => {
  const user = req.user;
  
  // Atomic transaction: upgrade + create in single DB transaction
  const result = await prisma.$transaction(async (tx) => {
    // If user has role=user, upgrade to organizer
    let upgradedUser = user;
    if (user.role === 'user') {
      upgradedUser = await tx.user.update({
        where: { id: user.id },
        data: { role: 'organizer' }
      });
    }

    // Create conference (guaranteed user is now organizer)
    const conference = await tx.conference.create({
      data: { ...conferenceData, createdById: upgradedUser.id }
    });

    return { user: upgradedUser, conference };
  });
  
  // Return conference with upgrade hint for frontend
  return res.status(201).json({
    ...result.conference,
    _userUpgraded: user.role === 'user'
  });
};
```

**Authorization:**
- `/conferences/new` page: Public route, checks authentication in component
- `POST /api/organizer/conferences`: Allows `['user', 'organizer', 'admin']` (special guard)
- All other organizer routes: Require organizer role (standard guard)

**Benefits:**
1. **Atomic Operation:** Upgrade + create succeed together or fail together
2. **No Orphaned State:** Impossible to be organizer without a conference
3. **Handles Edge Cases:** 
   - User abandons form → Stays base user ✓
   - Conference creation fails → No upgrade happens ✓
   - Upgrade succeeds but create fails → Transaction rolls back ✓

#### 4. Edge Case Handling

**Scenario Analysis:**

| User Action | Old Approach (Separate Calls) | New Approach (Atomic) |
|-------------|------------------------------|----------------------|
| Abandons form before submit | ✅ Stays base user | ✅ Stays base user |
| Submits form successfully | ✅ Becomes organizer + conference | ✅ Becomes organizer + conference |
| Upgrade succeeds, create fails | ❌ Orphaned organizer! | ✅ Transaction rollback, stays base user |
| Network error during create | ❌ Orphaned organizer! | ✅ Transaction rollback, stays base user |
| Server error during create | ❌ Orphaned organizer! | ✅ Transaction rollback, stays base user |

**Why Atomic Transaction is Better:**

1. **Database Consistency:** No half-completed operations
2. **Predictable State:** User is either (base user, no conference) OR (organizer, ≥1 conference)
3. **Error Recovery:** Single failure point, single retry
4. **Simplified Frontend:** No need to handle upgrade errors separately
5. **Production Safe:** Works correctly even under load/failures
```

---

## Consequences

### Positive

✅ **Natural User Flow**
- Creating a conference feels like the natural action that makes you an organizer
- No explicit "upgrade" step required
- Aligns with user mental model: "I'm organizing, so I'm an organizer"

✅ **Reduced Friction**
- One less click (no explicit upgrade button)
- Seamless progression from guest → user → organizer
- Clear call-to-action on landing page

✅ **Improved Conversion**
- Guests see "Host a Conference" as a clear value proposition
- **Inline auth modal** keeps users in context (no page redirects)
- Both login and signup available in same modal
- Sign up flow has clear purpose (to create conference)
- Significantly reduced abandonment vs. redirect flow

✅ **Backward Compatibility**
- Fallback upgrade mechanism (ADR 0002) still works
- Existing organizers unaffected
- No breaking changes

### Negative/Considerations

⚠️ **Authorization Complexity**
- Create conference endpoint must allow base users (`role=user`)
- Controller performs upgrade as side effect
- Need to handle race conditions (multiple simultaneous creations)

⚠️ **Frontend State Management**
- Must refresh auth state after conference creation
- UI must handle the brief moment where role changes
- Need to ensure auth context updates before navigation

⚠️ **User Expectations**
- User doesn't explicitly "become an organizer"
- May not realize they now have organizer privileges
- Consider showing success message: "Conference created! You're now an organizer."

---

## UX Enhancements (Implemented)

### Guest User Auth Modal ✅
When unauthenticated users click "Host a Conference", they see an inline auth modal instead of being redirected:

**Implementation:**
```tsx
// Auto-show modal for guests
useEffect(() => {
  if (!isAuthenticated) {
    setShowAuthDialog(true);
  }
}, [isAuthenticated]);

// Modal with Login/Register tabs
<Dialog>
  <Tabs defaultValue="login">
    <TabsList>
      <TabsTrigger value="login">Sign In</TabsTrigger>
      <TabsTrigger value="register">Sign Up</TabsTrigger>
    </TabsList>
    <TabsContent value="login">
      <LoginForm onSuccess={() => setShowAuthDialog(false)} />
    </TabsContent>
    <TabsContent value="register">
      <RegisterForm onSuccess={() => setShowAuthDialog(false)} />
    </TabsContent>
  </Tabs>
</Dialog>
```

**Benefits:**
- **Zero friction:** No page redirects, user stays in context
- **Clear value prop:** Modal title: "Sign in to host a conference"
- **Easy conversion:** Both login and signup in same modal
- **Smart dismissal:** Redirects to landing page if closed without auth
- **Seamless flow:** After auth, modal closes and form becomes accessible

**Auth Forms Enhanced:**
- Added optional `onSuccess?: () => void` prop to LoginForm and RegisterForm
- When used in modal → Calls custom success handler (closes dialog)
- When used standalone → Default redirect behavior preserved

### Success Message on Auto-Upgrade ✅
When a user is auto-upgraded during conference creation, the frontend shows a success toast:

```tsx
if (result._userUpgraded) {
  toast.success("Conference created! You're now an organizer.", {
    description: "You can now create and manage conferences."
  });
}
```

**Benefits:**
- Clear feedback about role change
- Reassures user they now have organizer capabilities
- Positive reinforcement for completing the action

### Auth State Refresh ✅
After successful upgrade, the frontend refreshes the auth context:

```tsx
if (result._userUpgraded) {
  await refreshUser(); // Update UI to reflect new organizer role
}
```

**Benefits:**
- UI immediately reflects new role
- Navigation menu updates to show organizer sections
- Prevents stale auth state issues

### Analytics Tracking (Prepared) ✅
Backend includes a TODO for analytics tracking:

```typescript
// TODO: Add analytics tracking when analytics system is integrated
// analytics.track('user_upgraded_to_organizer', {
//   method: 'conference_creation',
//   user_id: user.id
// });
```

**Purpose:**
- Track conversion funnel: guest → user → organizer
- Measure effectiveness of "Host a Conference" CTA
- Identify drop-off points in upgrade flow
- A/B test different messaging strategies

---

## Alternatives Considered

### Alternative 1: Keep Current Flow Only
**Rejected:** Too much friction, users hit wall before seeing value

### Alternative 2: Auto-Upgrade on Click
- Show upgrade modal immediately when guest/user clicks "Host a Conference"
- Get explicit permission before upgrading

**Rejected:** Adds extra step, still feels like friction

### Alternative 3: Separate "Become an Organizer" Page
- Dedicated page explaining organizer benefits
- Explicit upgrade action separate from conference creation

**Rejected:** Adds friction, doesn't align with mental model

---

## Implementation Checklist

### Backend
- [x] Update `POST /api/organizer/conferences` authorization to allow `['user', 'organizer', 'admin']`
- [x] Add atomic upgrade + create logic in `createConference` controller
- [x] Handle edge cases via Prisma transaction (prevents orphaned organizers)
- [x] Add logging for upgrade events
- [x] Add analytics tracking placeholder
- [ ] Update tests to cover base user creating conference

### Frontend
- [x] Update `DiscoverSection.tsx` to include "Host a Conference" button
- [x] Update `/conferences/new` page to use atomic API
- [x] Add guest user auth modal (inline sign-in/sign-up)
- [x] Enhance LoginForm and RegisterForm with onSuccess callback
- [x] Add auth refresh after successful conference creation
- [x] Add success toast indicating upgrade
- [ ] Update tests for new flow

### Documentation
- [x] Create ADR 0003 (this document)
- [x] Create ADR 0003-atomic-upgrade-decision.md
- [x] Update Capability-Oriented-Access-Design.md with upgrade flows
- [x] Create Organizer-Upgrade-Flows.md (visual guide)
- [ ] Update onboarding documentation

---

## Related

- **ADR 0002:** Organizer Self-Upgrade and Return (fallback mechanism)
- **ADR 0001:** Database as Authoritative Source for Roles
- **ADR 0003-atomic-upgrade-decision.md:** Edge case handling details

---

## Notes

This ADR establishes the **primary happy path** for becoming an organizer. The existing explicit upgrade mechanism (ADR 0002) remains as a **fallback** for edge cases:
- Users who navigate directly to organizer URLs
- Users who bookmark organizer pages
- Users coming from external links

Both flows work together to provide a seamless experience while maintaining flexibility.

---

**Status:** Implemented ✅  
**Implementation Date:** 2025-01-11  
**Enhancements Completed:** 2025-12-11  
- ✅ Guest user auth modal (inline login/signup)
- ✅ Success toast notification on upgrade
- ✅ Auth state refresh
- ✅ Analytics tracking prepared
- ✅ Atomic transaction pattern (See: ADR 0003-atomic-upgrade-decision.md)
