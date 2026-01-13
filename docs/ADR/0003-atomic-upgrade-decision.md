# Edge Case Decision: Atomic Upgrade Transaction

**Date:** 2025-01-11  
**Context:** Handling abandoned conference creation after upgrade

---

## The Problem

**Question:** What happens if a user clicks "Host a Conference" but doesn't complete the form?

**Scenarios:**
1. ✅ **User abandons form before submitting** → Should stay base user
2. ❌ **User submits, upgrade succeeds, but conference creation fails** → Was becoming orphaned organizer

---

## Solution: Atomic Database Transaction

### Implementation

Wrap upgrade + conference creation in a single Prisma transaction:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Upgrade if needed
  if (user.role === 'user') {
    upgradedUser = await tx.user.update({
      where: { id: user.id },
      data: { role: 'organizer' }
    });
  }

  // Step 2: Create conference
  const conference = await tx.conference.create({ ... });

  return { user: upgradedUser, conference };
});
```

**Guarantees:**
- ✅ Both operations succeed together
- ✅ Or both operations fail together (rollback)
- ✅ No partial state possible

---

## Comparison Table

| Scenario | Sequential (Bad) | Atomic (Good) |
|----------|-----------------|---------------|
| Form abandoned | Base user ✓ | Base user ✓ |
| Both succeed | Organizer + conf ✓ | Organizer + conf ✓ |
| Upgrade OK, create fails | **Organizer + no conf ✗** | **Base user ✓** (rollback) |
| Network timeout | **Organizer + no conf ✗** | **Base user ✓** (rollback) |
| Server error | **Organizer + no conf ✗** | **Base user ✓** (rollback) |

---

## Benefits

### 1. Database Consistency
No "organizer without conference" state possible

### 2. Simplified Error Handling
Single operation = single error path

### 3. Production Safe
Works correctly under:
- High load
- Network issues
- Server errors
- Database failures

### 4. Clear State Machine
```
Base User + No Conference  →  Organizer + ≥1 Conference
         (start)                      (end)
         
         ↓ submit form ↓
         
    [Atomic Transaction]
    - upgrade role
    - create conference
    
    Success: Both complete
    Failure: Both rollback
```

---

## Implementation Details

### Backend Changes
- [x] Allow base users on create conference endpoint
- [x] Wrap operations in `prisma.$transaction()`
- [x] Return `_userUpgraded` hint to frontend

### Frontend Changes
- [x] Remove separate `upgradeToOrganizer()` call
- [x] Single `createConference()` call handles everything
- [x] Simpler error handling (one try-catch)

### Authorization
```typescript
// Special guard for conference creation only
const createConferenceGuard = authMiddleware(["user", "organizer", "admin"]);

// All other organizer routes
const organizerGuard = authMiddleware(["organizer", "admin"]);
```

---

## Testing Scenarios

**Unit Tests:**
- [ ] Base user creates conference → Upgraded + conference created
- [ ] Organizer creates conference → No upgrade, conference created
- [ ] Database constraint violation → Transaction rolled back
- [ ] Conference creation validation fails → No upgrade

**Integration Tests:**
- [ ] Submit with network timeout → User stays base user
- [ ] Submit with server error → User stays base user
- [ ] Submit twice rapidly → Only one conference, no race condition

---

## Alternative Approaches Considered

### 1. Sequential Operations (Frontend)
```typescript
await upgradeToOrganizer();
await createConference();
```
**Rejected:** Creates orphaned organizers on failure

### 2. Try-Catch with Rollback
```typescript
try {
  await upgrade();
  await create();
} catch {
  await downgrade(); // Try to undo
}
```
**Rejected:** 
- Complex error handling
- Downgrade can also fail
- Not truly atomic

### 3. Queue/Background Job
```typescript
await queueConferenceCreation();
// Poll for completion
```
**Rejected:** 
- Adds complexity
- Worse UX (async result)
- Still needs transaction

---

## Conclusion

**Chosen:** Atomic database transaction (Prisma `$transaction`)

**Rationale:**
- Simplest implementation
- Guaranteed consistency
- Production-proven pattern
- Native Prisma support

**Result:**
- No orphaned organizers possible
- Clean error handling
- Predictable state transitions
- Production-safe under all conditions

---

**Related:** ADR 0003 (Primary Organizer Upgrade Flow)
