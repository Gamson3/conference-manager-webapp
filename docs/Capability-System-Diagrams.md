# Capability System Architecture Diagrams

---

## 1. Two-Layer Authorization Model

```
┌───────────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION ARCHITECTURE                          │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 1: GLOBAL ROLES (User.role)                               │ │
│  │ Purpose: Control access to major application areas               │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │   👤 user       →  /account/*     (dashboard, settings)          │ │
│  │                                                                   │ │
│  │   👔 organizer  →  /organizer/*   (conference management)        │ │
│  │                    /account/*      (+ all user capabilities)     │ │
│  │                                                                   │ │
│  │   🛡️  admin      →  /admin/*       (system governance)            │ │
│  │                    /organizer/*    (+ all organizer capabilities)│ │
│  │                    /account/*      (+ all user capabilities)     │ │
│  │                                                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                ↓                                       │
│                    One user = One global role                         │
│                                ↓                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 2: CONTEXTUAL CAPABILITIES (ConferenceParticipant.role)   │ │
│  │ Purpose: Fine-grained, per-conference permissions                │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │   🎟️  attendee   → View schedule, access networking              │ │
│  │   🎤 presenter  → Present at conference                          │ │
│  │   ✍️  author     → Submit abstracts                               │ │
│  │   👁️  reviewer   → Review submissions                             │ │
│  │   💖 sponsor    → Sponsor benefits                               │ │
│  │   ✨ volunteer  → Volunteer access                               │ │
│  │                                                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                ↓                                       │
│         One user = Multiple contextual roles per conference           │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REQUEST AUTHORIZATION FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

Client Request
     │
     │ 1. Include JWT in Authorization header
     ├────────────────────────────────────────────────────────────────┐
     │                                                                  │
     ▼                                                                  │
┌─────────────────────────────────────────────────────────────────┐   │
│  authMiddleware (server/src/middleware/authMiddleware.ts)       │   │
│                                                                  │   │
│  Step 1: Verify Cognito JWT signature                           │   │
│  Step 2: Extract cognitoId from token                           │   │
│  Step 3: Load User from database by cognitoId                   │   │
│  Step 4: Check if User.role in allowedRoles[]                   │   │
│  Step 5: Attach req.user for downstream                         │   │
└─────────────────────────────────────────────────────────────────┘   │
     │                                                                  │
     │ ✅ Authorized: req.user attached                                │
     │ ❌ Unauthorized: 401/403 response                               │
     │                                                                  │
     ▼                                                                  │
┌─────────────────────────────────────────────────────────────────┐   │
│  Controller (e.g., scheduleControllers.ts)                      │   │
│                                                                  │   │
│  Additional Authorization Checks:                               │   │
│                                                                  │   │
│  ┌─────────────────────────────────────────────────────────┐   │   │
│  │ Conference-Level Check:                                  │   │   │
│  │ • Is user the conference creator?                        │   │   │
│  │ • OR is user admin?                                      │   │   │
│  └─────────────────────────────────────────────────────────┘   │   │
│                                                                  │   │
│  ┌─────────────────────────────────────────────────────────┐   │   │
│  │ Capability-Level Check:                                  │   │   │
│  │ • Query ConferenceParticipant                            │   │   │
│  │ • Does user have required role for this conference?      │   │   │
│  │ • Is status = 'registered'?                              │   │   │
│  └─────────────────────────────────────────────────────────┘   │   │
└─────────────────────────────────────────────────────────────────┘   │
     │                                                                  │
     │ ✅ All checks passed                                             │
     │ ❌ Any check failed: 403 response                               │
     │                                                                  │
     ▼                                                                  │
  Response                                                              │
     │                                                                  │
     └──────────────────────────────────────────────────────────────────┘
```

---

## 3. User Journey: Base User to Organizer

```
┌─────────────────────────────────────────────────────────────────────┐
│               USER UPGRADE JOURNEY (ADR 0002)                        │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Base User wants to create conference
┌─────────────────────────────────────────┐
│ User (role: user)                       │
│ Navigates to: /organizer/conferences/new│
└─────────────────────────────────────────┘
               │
               ▼
Step 2: OrganizerGuard detects insufficient privileges
┌─────────────────────────────────────────────────────────────┐
│ OrganizerGuard                                              │
│ • Checks: isOrganizer || isAdmin                            │
│ • Result: FALSE (user has role = 'user')                    │
│ • Action: Redirect to /not-authorized?from=<original-path>  │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
Step 3: Not Authorized page shows upgrade option
┌─────────────────────────────────────────────────────────────┐
│ /not-authorized page                                        │
│                                                             │
│ 🚫 Access Denied                                            │
│                                                             │
│ You need organizer privileges to access this page.          │
│                                                             │
│ [Upgrade to Organizer] ← User clicks this                  │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
Step 4: Frontend calls upgrade endpoint
┌─────────────────────────────────────────────────────────────┐
│ POST /api/users/upgrade-organizer                           │
│ Authorization: Bearer <jwt>                                 │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
Step 5: Backend updates User.role in database
┌─────────────────────────────────────────────────────────────┐
│ upgradeToOrganizer (userControllers.ts)                     │
│                                                             │
│ • Verify user has role = 'user'                             │
│ • Update: User.role = 'organizer'                           │
│ • Return updated user object                                │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
Step 6: Frontend refreshes auth state and redirects
┌─────────────────────────────────────────────────────────────┐
│ Frontend                                                    │
│                                                             │
│ • Refetch /api/users/me                                     │
│ • Update auth context (isOrganizer = true)                  │
│ • Redirect to original path from ?from parameter            │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
Step 7: Success! User can now create conferences
┌─────────────────────────────────────────┐
│ User (role: organizer)                  │
│ Now at: /organizer/conferences/new      │
│ OrganizerGuard: ✅ PASS                  │
└─────────────────────────────────────────┘
```

---

## 4. Database Schema Relationships

```
┌───────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                                │
└───────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│ User                         │
├──────────────────────────────┤
│ id: Int                      │
│ cognitoId: String (unique)   │
│ role: Role                   │ ◄── GLOBAL ROLE
│   • user                     │     (ONE per user)
│   • organizer                │
│   • admin                    │
│ name: String                 │
│ email: String                │
│ ...                          │
└──────────────────────────────┘
        │ 1
        │
        │ owns/creates
        │
        ▼ N
┌──────────────────────────────┐
│ Conference                   │
├──────────────────────────────┤
│ id: Int                      │
│ createdById: Int             │ ◄── FK to User.id
│ name: String                 │
│ status: ConferenceStatus     │
│ ...                          │
└──────────────────────────────┘
        │ 1
        │
        │ has participants
        │
        ▼ N
┌──────────────────────────────────────────┐
│ ConferenceParticipant                    │
├──────────────────────────────────────────┤
│ id: Int                                  │
│ userId: Int                              │ ◄── FK to User.id
│ conferenceId: Int                        │ ◄── FK to Conference.id
│ role: ConferenceParticipationRole        │ ◄── CONTEXTUAL CAPABILITY
│   • attendee                             │     (MULTIPLE per user+conf)
│   • presenter                            │
│   • author                               │
│   • reviewer                             │
│   • sponsor                              │
│   • volunteer                            │
│ status: ConferenceParticipantStatus      │
│   • registered                           │
│   • canceled                             │
│   • waitlisted                           │
│   • withdrawn                            │
│ registeredAt: DateTime                   │
│ customResponses: Json                    │
│ @@unique([userId, conferenceId, role])   │ ◄── Allows multiple roles
└──────────────────────────────────────────┘

RELATIONSHIP EXAMPLES:

User A (role: user)
  ├─ ConferenceParticipant { conf: 1, role: author, status: registered }
  ├─ ConferenceParticipant { conf: 1, role: reviewer, status: registered }
  └─ ConferenceParticipant { conf: 2, role: attendee, status: registered }
  
User B (role: organizer)
  ├─ Conference 3 (createdById: B)
  ├─ ConferenceParticipant { conf: 1, role: attendee, status: registered }
  └─ ConferenceParticipant { conf: 2, role: reviewer, status: registered }

User C (role: admin)
  └─ (no specific participants needed - admin has override access)
```

---

## 5. Frontend Guard Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                    FRONTEND ROUTE GUARDS                          │
└───────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ App Router Structure                                            │
│                                                                 │
│  /app                                                           │
│   ├── (public)                     ← No guard                  │
│   │   ├── page.tsx                                             │
│   │   └── conferences/                                         │
│   │       ├── page.tsx                                         │
│   │       └── [id]/page.tsx                                    │
│   │                                                            │
│   ├── (auth)                       ← AuthGuard (any role)      │
│   │   └── auth-check/page.tsx                                 │
│   │                                                            │
│   ├── account/                     ← AuthGuard (any role)      │
│   │   ├── dashboard/page.tsx                                  │
│   │   └── settings/page.tsx                                   │
│   │                                                            │
│   ├── organizer/                   ← OrganizerGuard            │
│   │   ├── layout.tsx               ← Wraps with guard         │
│   │   ├── dashboard/page.tsx                                  │
│   │   └── conferences/                                        │
│   │       ├── page.tsx                                        │
│   │       └── [id]/...                                        │
│   │                                                            │
│   └── admin/                       ← AdminGuard                │
│       ├── layout.tsx               ← Wraps with guard         │
│       ├── dashboard/page.tsx                                  │
│       └── users/page.tsx                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Guard Component Logic                                           │
│                                                                 │
│  OrganizerGuard:                                               │
│  ┌───────────────────────────────────────────────────────────┐│
│  │ if (!isAuthenticated) return → Global auth handles       ││
│  │ if (!isOrganizer && !isAdmin) → Redirect /not-authorized ││
│  │ else → Render children                                   ││
│  └───────────────────────────────────────────────────────────┘│
│                                                                 │
│  AdminGuard:                                                   │
│  ┌───────────────────────────────────────────────────────────┐│
│  │ if (!isAuthenticated) return → Global auth handles       ││
│  │ if (!isAdmin) → Redirect /not-authorized                 ││
│  │ else → Render children                                   ││
│  └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

Benefits of Guards:
✅ Prevents UI flash before redirect
✅ Centralizes authorization logic
✅ Improves user experience
✅ Complements server-side authorization (defense in depth)
```

---

## 6. Decision Matrix

```
┌───────────────────────────────────────────────────────────────────────┐
│              AUTHORIZATION DECISION MATRIX                            │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ACTION: Create Conference                                            │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Check Global Role:                                               │ │
│  │   IF role = 'organizer' OR role = 'admin' → ✅ ALLOW             │ │
│  │   ELSE → ❌ DENY (403) + Show upgrade option                     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ACTION: Edit Conference Metadata                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Check Global Role:                                               │ │
│  │   IF role = 'user' → ❌ DENY (403)                               │ │
│  │   IF role = 'admin' → ✅ ALLOW                                   │ │
│  │   IF role = 'organizer':                                         │ │
│  │     Check Conference Ownership:                                  │ │
│  │       IF conference.createdById = user.id → ✅ ALLOW             │ │
│  │       ELSE → ❌ DENY (403)                                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ACTION: Review Submission                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Check Global Role:                                               │ │
│  │   IF role = 'admin' → ✅ ALLOW                                   │ │
│  │   IF role = 'organizer':                                         │ │
│  │     IF conference.createdById = user.id → ✅ ALLOW               │ │
│  │     ELSE: Check Capability                                       │ │
│  │       Query ConferenceParticipant:                               │ │
│  │         IF role = 'reviewer' AND status = 'registered' → ✅ ALLOW│ │
│  │         ELSE → ❌ DENY (403)                                     │ │
│  │   IF role = 'user':                                              │ │
│  │     Check Capability:                                            │ │
│  │       Query ConferenceParticipant:                               │ │
│  │         IF role = 'reviewer' AND status = 'registered' → ✅ ALLOW│ │
│  │         ELSE → ❌ DENY (403)                                     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ACTION: Submit Abstract                                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Check Authentication:                                            │ │
│  │   IF not authenticated → ❌ DENY (401)                           │ │
│  │ Check CFP Window:                                                │ │
│  │   IF CFP closed AND NOT (owner OR admin) → ❌ DENY (403)        │ │
│  │ Check Capability:                                                │ │
│  │   Query ConferenceParticipant:                                   │ │
│  │     IF role = 'author' AND status = 'registered' → ✅ ALLOW     │ │
│  │     ELSE IF allowSelfRegistration:                               │ │
│  │       Create ConferenceParticipant with role='author' → ✅ ALLOW│ │
│  │     ELSE → ❌ DENY (403)                                        │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ACTION: Register for Conference                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Check Authentication:                                            │ │
│  │   IF not authenticated → ❌ DENY (401)                           │ │
│  │ Check Registration Window:                                       │ │
│  │   IF closed AND NOT (owner OR admin) → ❌ DENY (403)            │ │
│  │ Check Capacity:                                                  │ │
│  │   IF full AND waitlistEnabled → ✅ ALLOW (status: waitlisted)   │ │
│  │   IF full AND NOT waitlistEnabled → ❌ DENY (409)               │ │
│  │ Create ConferenceParticipant:                                    │ │
│  │   role = 'attendee'                                              │ │
│  │   status = 'registered' OR 'waitlisted'                          │ │
│  │   → ✅ ALLOW                                                     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 7. Common Authorization Patterns (Code Examples)

### Pattern 1: Global Role Check (Backend)
```typescript
// In route definition
router.get("/conferences/:id/submissions", 
  authMiddleware(["organizer", "admin"]),  // ← Global role check
  listSubmissions
);
```

### Pattern 2: Conference Ownership Check (Backend)
```typescript
// In controller
export const updateConference = async (req: Request, res: Response) => {
  const conf = await prisma.conference.findUnique({ where: { id } });
  
  // Check ownership or admin
  if (conf.createdById !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // Proceed with update
};
```

### Pattern 3: Contextual Capability Check (Backend)
```typescript
// In controller
export const reviewSubmission = async (req: Request, res: Response) => {
  const isOwner = conference.createdById === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isOwner && !isAdmin) {
    // Check for reviewer capability
    const reviewer = await prisma.conferenceParticipant.findFirst({
      where: {
        userId: req.user.id,
        conferenceId: conferenceId,
        role: 'reviewer',
        status: 'registered'
      }
    });
    
    if (!reviewer) {
      return res.status(403).json({ message: "Not authorized to review" });
    }
  }
  
  // Proceed with review
};
```

### Pattern 4: Global Role Check (Frontend)
```typescript
// In component
import { useAuth } from '@/features/auth/hooks/useAuth';

function Navigation() {
  const { isOrganizer, isAdmin } = useAuth();
  
  return (
    <nav>
      {/* Show organizer link only to organizers */}
      {isOrganizer && (
        <Link href="/organizer/dashboard">Organizer Panel</Link>
      )}
      
      {/* Show admin link only to admins */}
      {isAdmin && (
        <Link href="/admin/dashboard">Admin Panel</Link>
      )}
    </nav>
  );
}
```

### Pattern 5: Conference Ownership Check (Frontend)
```typescript
// In component
function ConferenceActions({ conference }) {
  const { user, isAdmin } = useAuth();
  
  const canEdit = 
    conference.createdById === user?.id || 
    isAdmin;
  
  return (
    <>
      {canEdit && (
        <Button onClick={handleEdit}>Edit Conference</Button>
      )}
    </>
  );
}
```

### Pattern 6: Contextual Capability Check (Frontend)
```typescript
// In component
function SubmissionActions({ conferenceId }) {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState([]);
  
  // Fetch user's capabilities for this conference
  useEffect(() => {
    fetch(`/api/conferences/${conferenceId}/my-capabilities`)
      .then(res => res.json())
      .then(data => setCapabilities(data));
  }, [conferenceId]);
  
  const canReview = capabilities.some(c => 
    c.role === 'reviewer' && c.status === 'registered'
  );
  
  const canSubmit = capabilities.some(c => 
    c.role === 'author' && c.status === 'registered'
  );
  
  return (
    <>
      {canSubmit && <Button>Submit Abstract</Button>}
      {canReview && <Button>Review Submissions</Button>}
    </>
  );
}
```

---

**Last Updated:** January 2025
