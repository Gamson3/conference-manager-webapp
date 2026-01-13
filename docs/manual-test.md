# Manual End-to-End Test Plan (Organizer → Configuration → Public → Account → Admin)

Last updated: 2026-01-12

This document is a **step-by-step manual QA script** to validate the Conference Master Web App end-to-end.

Scope:
- Full organizer flow: **create conference → configure → collect submissions → decide → build schedule → publish → registration**
- Public attendee/author flows: browse, register, submit, view program/people
- Account area: my conferences, my submissions, favorites
- Admin area: users/conferences/submissions/presentations/audit logs

The intent is to let you **identify exactly where functionality is broken** (UI, API, auth/permissions, data validation), even when seed scripts "pass".

---

## Authorization Model (ADR-008 Token-Wins)

This application uses **AWS Cognito** for identity with a **token-wins** authorization model:

- **Cognito Groups** are authoritative for global roles (`user`, `organizer`, `admin`)
- **Database `User.role`** is a non-authoritative mirror (synced opportunistically)
- **JWT tokens** contain `cognito:groups` claims that determine access
- **Role upgrades** (user → organizer) require Cognito group assignment AND token refresh
- **AuthContext** provides `forceTokenRefresh()` for immediate role propagation after upgrade

Key test considerations:
- After upgrade to organizer, verify token refresh occurs before organizer routes become accessible
- Role changes should propagate immediately via `performUpgradeToOrganizer()` flow
- DB role may lag behind Cognito state; server middleware uses token claims for authorization

---

## 0) Environment + prerequisites

### 0.1 Expected local URLs
- Client: `http://localhost:3000`
- Server API: `http://localhost:3001`

If your env differs, adjust accordingly.

### 0.2 Test mode vs real auth
This app supports Cognito auth, and the server supports test injection in automated tests.
For **manual testing**, prefer real sign-in/sign-up so you cover the real auth path.

**Important (ADR-008):** The system uses Cognito groups as the authority for roles. When testing role upgrades:
1. The `performUpgradeToOrganizer()` function adds the user to Cognito's "organizers" group
2. It then calls `forceTokenRefresh()` to get a new JWT with updated `cognito:groups` claims
3. Server middleware reads role from token claims, not from DB (DB syncs in background)

### 0.3 Required tester accounts
Create (or prepare) these distinct users:

1) **Organizer Candidate (starts as normal user)**
- Email: `organizer.candidate@example.com`
- Password: `TestPass!234` (or your local convention)

2) **Author / Attendee**
- Email: `author.one@example.com`
- Password: `TestPass!234`

3) **Second Author (for multi-author + presenter conflicts)**
- Email: `author.two@example.com`
- Password: `TestPass!234`

4) **Admin (if your deployment supports admin)**
- Email: `admin@example.com`
- Password: `TestPass!234`

If you cannot create an admin via UI, you can still run most tests as organizer.

### 0.5 Seed scripts (quick-start with pre-populated data)

To quickly populate a test database with realistic data, use the seed scripts:

**Minimal seed** (non-destructive, adds one conference + one draft submission):
```bash
cd server && npm run seed:manual-test
```

**Comprehensive seed** (deletes seed-specific conferences, creates rich dataset):
```bash
cd server && npm run seed:manual-test-main
```

See **Appendix C** for full details on what each seed creates.

**Environment overrides:**
```bash
# Override default organizer credentials to match your Cognito user:
SEED_ORG_COGNITO_ID=your-cognito-id SEED_ORG_EMAIL=you@example.com npm run seed:manual-test
```

### 0.4 Assets to prepare (local files)
Create a folder on your machine with these test files:
- `banner-1500x500.jpg` (any JPG/PNG ~ 200–800KB)
- `logo-square.png` (any square image)
- `paper.pdf` (1–2 pages)
- `supplementary.zip` (small zip)

These are used for banner/logo upload and submission upload tests.

---

## 1) Sample data set (use consistently)

### 1.1 Conference "primary" dataset (manual creation)
Use this data when creating a conference from scratch:

- Name: **Thesis Demo Conference 2026**
- Description:
  - "A demo conference used for manual QA. Includes CFP, registration, scheduling, and exports."
- Dates:
  - Start: **2026-05-14**
  - End: **2026-05-16**
- Time zone: **Europe/London** (or your local)
- Location: **London, United Kingdom**
- Venue (edit mode): **Thesis Hall A**
- Website URL (edit mode): `https://example.com/thesis-demo-conf`
- Capacity (edit mode): `250`
- Topics (edit mode): `AI, Machine Learning, Data Science, HCI`
- Banner image: `banner-1500x500.jpg`
- Public visibility: start **Private**, later switch to **Public**

### 1.1b Seeded conferences (if using seed scripts)
The comprehensive seed creates two conferences:

1. **International Conference on Applied AI (Manual Test) 2026**
   - Slug: `manual-test-conference-2026`
   - Status: **published**, schedule published
   - Dates: base date + 90–92 days
   - Location: Hybrid
   - Topics: AI, ML, NLP, Systems, Data Science
   - Pre-populated: categories, types, requirements, schedule (3 days), submissions across all statuses, reviews, participants, favorites, feedback

2. **Workshop Sandbox (Manual Test) 2026**
   - Slug: `manual-test-draft-2026`
   - Status: **draft**, private
   - Invite-only submissions (code: `INVITE-2026`)
   - Use for testing organizer setup flows

### 1.2 Abstracts configuration dataset
- Topics/Categories (manual creation):
  - "Artificial Intelligence"
  - "Machine Learning"
  - "Human-Computer Interaction"

- Presentation Types (manual creation):
  - "Talk (15 min)" default duration `15`
  - "Talk (30 min)" default duration `30`
  - "Poster" default duration `5`

**Seeded categories** (comprehensive seed):
- Research, Industry, Student, Demos

**Seeded presentation types** (comprehensive seed):
- Oral (20 min), Lightning (8 min), Poster (5 min), Workshop (60 min)

- Submission windows (set during config):
  - Submissions open: **today**
  - Submissions close: **today + 14 days**

- Review criteria (if present):
  - “Originality, technical quality, clarity, relevance to conference topics.”

### 1.3 Registration dataset
- Registration window:
  - Open: **today**
  - Close: **today + 30 days**

- Custom registration questions (examples):
  - “Dietary requirements” (short text)
  - “T-shirt size” (single select: S/M/L/XL)
  - “Need visa invitation letter?” (yes/no)

---

## 2) Route inventory (so nothing is missed)

These are the currently implemented Next.js pages discovered under `client/src/app`.
Use them as your coverage checklist.

### 2.1 Public routes
- /(public)/landing
- /(public)/conferences
- /(public)/conferences/[id]
- /(public)/conferences/[id]/people
- /(public)/conferences/[id]/program
- /(public)/conferences/[id]/schedule
- /(public)/conferences/[id]/tree
- /(public)/conferences/[id]/search
- /(public)/conferences/[id]/presentations/[presentationId]
- /(public)/conferences/[id]/register
- /(public)/conferences/[id]/submit (wizard)
  - /essentials
  - /questions
  - /content
  - /preview

### 2.2 Auth routes
- /(auth)/login
- /(auth)/register
- /(auth)/confirm
- /(auth)/forgot-password
- /(auth)/reset-password
- /(auth)/onboarding

### 2.3 Account routes
- /account/dashboard
- /account/discover
- /account/my-conferences
- /account/my-conferences/[id]
- /account/my-conferences/[id]/schedule
- /account/my-conferences/[id]/tree
- /account/my-submissions
- /account/my-submissions/[id]
- /account/favorites
- /account/settings
- /account/assistance

### 2.4 Organizer routes
- /conferences/new (public entry to create conference)
- /organizer/conferences
- /organizer/conferences/[id] (per-conference console)
- /organizer/conferences/[id]/edit

Per-conference modules:
- Home
  - /home
  - /home/abstracts-overview
  - /home/submissions (+ /[submissionId])
  - /home/program (+ sessions/presentations/scheduler)
  - /home/participants
  - /home/people
  - /home/reports/analytics
  - /home/reports/exports

- Settings
  - /settings/basics
  - /settings/organizer-info
  - /settings/deadlines
  - /settings/publish

- Abstracts
  - /abstracts/overview
  - /abstracts/topics-and-categories
  - /abstracts/presentation-types
  - /abstracts/submission-form-settings
  - /abstracts/submission-dates-limits
  - /abstracts/export

- Submissions
  - /submissions
  - /submissions/[submissionId]

- Program
  - /program/overview
  - /program/days
  - /program/sessions
  - /program/presentations
  - /program/scheduler
  - /program/speakers

- Registration
  - /registration/overview
  - /registration/settings
  - /registration/form
  - /registration/custom-questions
  - /registration/deadlines

- Website
  - /website
  - /website/public
  - /website/cfp
  - /website/materials
  - /website/visibility

- Reports
  - /reports/summary
  - /reports/analytics
  - /reports/exports
  - /reports/abstracts
  - /reports/program

### 2.5 Admin routes
- /admin/dashboard
- /admin/users (+ /[id])
- /admin/conferences
- /admin/submissions
- /admin/presentations
- /admin/reports
- /admin/settings
- /admin/audit-logs

---

## 3) Baseline smoke test (before deep flows)

1) Start server + client.
2) Open `http://localhost:3000`.
3) Confirm:
   - Landing renders without console errors.
   - Navigation works (Public conferences list loads).

Failure clues:
- Blank page or repeated redirects: auth middleware/client auth context.
- Public conferences list fails: server `/api/public/*` or client API base URL.

---

## 4) Auth flows (covers optional + error handling)

### 4.1 Register (Author)
Route: /(auth)/register
1) Register `author.one@example.com`.
2) Expected:
   - Clear success message or confirmation requirement.
   - Redirect to onboarding or logged-in experience.

### 4.2 Login (Author)
Route: /(auth)/login
1) Login with correct password.
2) Expected: logged in, session persists on refresh.

Negative test:
- Wrong password → friendly error message (no stack trace).

### 4.3 Forgot / Reset password
Routes:
- /(auth)/forgot-password
- /(auth)/reset-password
Steps:
1) Trigger forgot password.
2) Follow reset flow.

Expected:
- UX should guide you clearly.
- Errors should be readable.

### 4.4 Not Authorized behavior
Route: /not-authorized
1) As normal user, attempt to open any organizer route (e.g. `/organizer/conferences`).
2) Expected:
   - Redirect to not-authorized page.
   - "Upgrade to organizer" CTA appears for base users.
   - After upgrade:
     a) User is added to Cognito "organizers" group
     b) Token is refreshed automatically (`forceTokenRefresh()`)
     c) User is redirected to the originally requested organizer route
   - The upgrade should be immediate (no page refresh needed).

### 4.5 Auth check utility page
Route: /auth-check
1) Visit /auth-check while logged out.
2) Visit /auth-check while logged in.

Expected:
- Page should not crash.
- It should clearly indicate auth status, Cognito groups, and DB role.
- If user needs onboarding (no name set), it redirects to /onboarding.

### 4.6 Token-wins verification (ADR-008)
This test validates that the system correctly uses Cognito groups as the role authority.

Setup:
1) Have a user account that is NOT in the Cognito "organizers" group but HAS `User.role = 'organizer'` in DB.
   (This scenario can occur if DB was manually updated without Cognito sync.)

Test:
1) Login as this user.
2) Attempt to access `/organizer/conferences`.

Expected:
- Access is DENIED because token lacks `cognito:groups: ["organizers"]`.
- The DB role is ignored for authorization.
- User sees "not-authorized" page with upgrade CTA.

Verification points:
- Server middleware reads role from `req.user.groups` (token claims), not DB.
- Client AuthContext uses token claims for role state.
- DB role may show "organizer" but access is still denied.

---

## 5) Create conference (end-to-end, includes role upgrade)

### 5.1 Guest gate on create
Route: /conferences/new
1) Log out.
2) Open /conferences/new.
3) Expected:
   - Auth dialog appears.
   - Closing the dialog without auth redirects to landing.

### 5.2 Create conference as Organizer Candidate (auto-upgrade)
1) Authenticate as `organizer.candidate@example.com`.
2) On /conferences/new:
   - Upload banner: `banner-1500x500.jpg` (preview should render)
   - Fill:
     - Name: Thesis Demo Conference 2026
     - Description: sample above
     - Start/End dates: sample above
     - Time zone: Europe/London
     - Location: London, United Kingdom
3) Click “Create Conference”.

Expected (ADR-008 token-wins flow):
- If the user role is `user`:
  1) Backend creates the conference
  2) Backend calls Cognito to add user to "organizers" group
  3) Frontend detects the upgrade and calls `forceTokenRefresh()`
  4) New JWT contains `cognito:groups: ["organizers"]`
  5) Success toast indicates organizer upgrade
- You are redirected to `/organizer/conferences`.
- Newly created conference is listed.
- Subsequent requests use the new token with organizer role.

Negative tests:
- End date earlier than start date → inline validation.
- Required fields missing → highlighted + top error.

Common failure clues:
- 403 after upgrade: token refresh failed or middleware not reading token claims.
- Redirect loops: stale token cached in AuthContext.
- Image upload preview works but server rejects payload: banner image encoding/field mapping.

---

## 6) Organizer console: Conference setup (all optional UI)

Open the conference in organizer list.

### 6.0 Organizer conference list + console landing
Routes:
- /organizer/conferences
- /organizer/conferences/[id]
- /organizer/conferences/[id]/home

1) Confirm organizer conferences list loads and shows your created conference.
2) Open the per-conference console root.
3) Confirm the dual-sidebar navigation works and each module link loads without layout glitches.

### 6.1 Settings → Basics (edit)
Route: /organizer/conferences/[id]/settings/basics
1) Confirm existing values from creation are populated.
2) Upload “Logo” top-right (uses image picker).
3) Fill additional fields:
   - Venue, Website URL, Capacity, Topics
4) Save changes.

Expected:
- Unsaved changes bar appears when you edit.
- Save persists after refresh.
- Image preview remains after reload.

Negative tests:
- Set capacity to a non-number → should show validation error.

### 6.2 Settings → Organizer info
Route: /organizer/conferences/[id]/settings/organizer-info
1) Fill any organizer public contact fields (name/email/phone/website/logo if present).
2) Save.
3) Verify on public conference page later.

### 6.3 Settings → Deadlines
Route: /organizer/conferences/[id]/settings/deadlines
1) Configure:
   - Submissions open/close
   - Registration open/close
   - Review window (if present)
2) Save.

Expected:
- Date ordering validation.
- UI reflects “open/closed” statuses.

### 6.4 Website → Visibility (optional gating)
Route: /organizer/conferences/[id]/website/visibility
1) Toggle “Public Conference” ON.
2) Set “Abstracts Visibility” to each option and save after each:
   - Public
   - Registered Attendees Only (invite_only)
   - Private

Expected:
- Save persists.
- Badges update.
- Read-only schedule/registration status panels reflect configured windows/publish state.

### 6.5 Settings → Publish (conference + schedule toggles)
Route: /organizer/conferences/[id]/settings/publish
1) Toggle “Public Visibility” switch (if present here) and confirm it matches Website → Visibility.
2) Publish Conference (status becomes published).
3) Publish Schedule (may be allowed even before schedule exists; verify behavior).
4) Unpublish schedule and conference to verify reversibility.

Expected:
- Status badges update.
- Publish checklist reflects completeness.

Failure clues:
- Status updates but public pages don’t change: caching or public endpoint gating logic.

### 6.6 Website module overview (all pages)
Routes:
- /organizer/conferences/[id]/website
- /organizer/conferences/[id]/website/public
- /organizer/conferences/[id]/website/cfp
- /organizer/conferences/[id]/website/materials

Checklist:
1) Open /website (module landing). Confirm links/cards navigate correctly.
2) Public page editor (/website/public):
   - Edit headline/description/venue fields (whatever is present)
   - Use Preview tab if present
   - Save and refresh to confirm persistence
3) CFP page (/website/cfp):
   - Ensure CFP copy is editable
   - Confirm it reflects submission window dates (if UI shows them)
4) Materials (/website/materials):
   - Upload `paper.pdf`
   - Toggle public/private visibility if present
   - Download the uploaded file
   - Delete the uploaded file

Expected:
- All edits persist after refresh.
- File actions show progress/toasts and produce usable download links.

### 6.7 Organizer edit page (if this is a shortcut)
Route: /organizer/conferences/[id]/edit
1) Open the page.
2) Confirm it either:
   - shows a working edit UI, or
   - clearly redirects to Settings → Basics.

---

## 7) Organizer: Abstracts configuration

### 7.1 Topics and Categories
Route: /organizer/conferences/[id]/abstracts/topics-and-categories
1) Add the 3 categories from the dataset.
2) Edit one category description.
3) Disable/enable a category if UI offers it.
4) Delete a category.

Expected:
- CRUD works.
- Duplicate names are prevented.

### 7.2 Presentation types
Route: /organizer/conferences/[id]/abstracts/presentation-types
1) Add the 3 types from the dataset.
2) Verify default duration validation.

### 7.3 Submission form settings
Route: /organizer/conferences/[id]/abstracts/submission-form-settings
1) Configure any visible constraints (keywords min/max, abstract length, authors limits, ORCID requirement, file upload constraints).
2) Save.

Expected:
- Validation errors shown for min/max reversals.

### 7.4 Submission dates & limits
Route: /organizer/conferences/[id]/abstracts/submission-dates-limits
1) Ensure submissions window is open for today.
2) Set `maxSubmissionsPerUser` if present.
3) Save.

Optional (only if UI exposes it somewhere):
- If there is a “Submissions visibility” control (public / invite-only / private) and an invite code field:
   - Set to invite-only and set an invite code (e.g. `THESIS2026`)
   - Verify submitting without the code is blocked and submitting with the code succeeds

### 7.5 Additional questions (removed)
The Abstracts “Additional Questions” placeholder page was removed. Abstract submission configuration is handled via Submission Form Settings.

### 7.6 Abstracts overview + export
Routes:
- /organizer/conferences/[id]/abstracts/overview
- /organizer/conferences/[id]/abstracts/export

1) Before submissions exist, verify empty state.
2) After submissions exist (later), verify:
   - filtering
   - counts
   - export CSV
   - export JSON

---

## 8) Public conference pages (post-publish)

Use a non-organizer account (Author) for these tests.

### 8.1 Public listing
Route: /(public)/conferences
1) Verify the conference appears when set public.
2) Verify a private conference does not appear.

### 8.2 Public conference detail
Route: /(public)/conferences/[id]
1) Confirm banner, description, dates, location show.
2) Check CTA buttons:
   - Register
   - Submit abstract

### 8.2b Public submission list (abstracts visibility)
Route: /(public)/conferences/[id]/submissions (if submissions are public)

**Important:** Public pages intentionally do NOT show file download links.

1) Verify submission cards show:
   - Title
   - Authors (names, affiliations)
   - Abstract text
   - Keywords
   - Category/type badges
2) Verify submission cards do **NOT** show:
   - File download buttons
   - File metadata (filename, size)
3) Click into a submission detail:
   - Same rules apply: abstract text visible, no file downloads
   - Files are accessible only to the submission author (in their account) or organizers

### 8.3 People page
Route: /(public)/conferences/[id]/people
1) Expect speakers list to be empty until schedule is published.
2) After schedule publish, speakers should appear.

### 8.4 Program page
Route: /(public)/conferences/[id]/program
1) Before schedule publish:
   - If conference is published but schedule unpublished, expect limited/hidden program.
2) After schedule publish:
   - sessions and presentations visible
   - ordering is correct

---

## 9) Author: submission wizard (full lifecycle)

Routes:
- /(public)/conferences/[id]/submit
  - /essentials
  - /questions
  - /content
  - /preview

### 9.1 Submit inside CFP window
1) Login as `author.one@example.com`.
2) Open the conference and click “Submit”.
3) Walk the wizard:

Essentials:
- Title: “A Practical Demo of Conference Master QA”
- Category: “Machine Learning”
- Presentation Type: “Talk (15 min)”
- Keywords: “testing, qa, scheduling” (match any min/max)

Questions (if present):
- Fill every optional question.

Content:
- Abstract text: 1–2 paragraphs
- Upload `paper.pdf` (and `supplementary.zip` if UI supports multiple files)

Preview:
- Confirm all data is shown.
- Submit.

Expected:
- Status transitions from DRAFT → SUBMITTED.
- A success toast.
- Submission appears in /account/my-submissions.

### 9.2 Submission gating (edge cases)
1) As organizer, set CFP close date to yesterday.
2) As author, attempt to submit:
   - Expected: blocked with a friendly message.
3) Set abstracts visibility:
   - Private → confirm attendees cannot see abstracts.
   - Registered-only → confirm registration requirement is enforced.

### 9.3 Withdraw submission
If UI supports withdrawal:
1) Withdraw as author before a decision.
2) Expected: status becomes WITHDRAWN and organizer list updates.

---

## 10) Organizer: submissions operations (review + decision)

Routes:
- /organizer/conferences/[id]/submissions
- /organizer/conferences/[id]/submissions/[submissionId]
- /organizer/conferences/[id]/home/submissions (duplicate “home” module)

### 10.1 List, filter, pagination
1) Confirm the submission appears.
2) Test filters:
   - by status
   - keyword search
3) If pagination controls exist, validate page headers/behavior.

### 10.2 Detail view
1) Open the submission detail.
2) Verify:
   - title/authors
   - abstract text
   - file download links (organizer can download abstract file and full-text file if present)
   - review area (if present)
   - lock status indicator

### 10.2b Revision workflow
1) For a submission in status `submitted` or `under_review`, click "Request Revision".
2) Provide feedback text (e.g., "Please clarify the methodology section").
3) Verify:
   - Status becomes `revision_requested`
   - Submission is unlocked so author can edit
   - Author sees feedback message in their submission detail
   - Author can resubmit (status goes back to `submitted`)

Seeded example: "Revision Requested (Unlocked)" submission has pre-populated feedback.

### 10.3 Add review + decision
1) Add a review (score/comments if present).
2) Decide “Accept”.
3) Verify:
   - submission status becomes ACCEPTED
   - accepted presentations endpoint feeds scheduler

Negative tests:
- Try to edit a submitted submission as author (should be blocked).

---

## 11) Organizer: program data + scheduler

Routes:
- /program/overview
- /program/days
- /program/sessions
- /program/presentations
- /program/scheduler

### 11.1 Days
1) Add 3 days matching conference date range:
   - 2026-05-14 “Day 1”
   - 2026-05-15 “Day 2”
   - 2026-05-16 “Day 3”
2) Reorder days.
3) Attempt invalid day date outside range.

Expected:
- Validation prevents out-of-range days.

### 11.2 Sessions (Sections)
1) Create sessions:
   - Day 1: “Opening Keynote” 09:00–10:00 room “Main Hall”
   - Day 1: “ML Session A” 10:30–12:00 room “Room A”
   - Day 1: “Lunch” 12:00–13:00 room “Dining” (type break)
2) Create overlapping sessions in same room (if allowed) to see conflict detection.

### 11.3 Presentations
1) Verify accepted submission appears as a presentation candidate or is convertible.
2) Assign to a session.

### 11.4 Scheduler drag-and-drop
1) Open scheduler.
2) Drag accepted presentations into sessions.
3) Confirm:
   - unsaved changes indicator
   - save persists after refresh

Edge cases:
- Overflow a session (too many minutes) → conflict indicator.
- Presenter conflict (same presenter in overlapping slots) → conflict indicator.

### 11.5 Publish schedule
1) Publish schedule from:
   - Program scheduler UI (if present)
   - or Settings → Publish schedule toggle
2) Verify public program page now shows schedule.

---

## 12) Registration module (optional but present in UI)

Routes:
- /registration/settings
- /registration/custom-questions
- /registration/form
- /registration/deadlines
- public: /(public)/conferences/[id]/register

### 12.1 Configure registration
1) Set registration window open.
2) Configure capacity/waitlist settings if present.
3) Save.

### 12.2 Registration custom questions
1) Add the 3 questions from dataset.
2) Verify options editing (S/M/L/XL) works.

### 12.3 Public registration
1) Login as `author.two@example.com`.
2) Open public register page.
3) Fill the form (including custom questions).
4) Submit.

Expected:
- Participant record created.
- Organizer participants list increments.

### 12.4 Close registration
1) Set registration close date to yesterday.
2) Attempt registration as another user.

Expected:
- Friendly “registration closed” message.

---

## 13) Account area (user self-service)

### 13.1 Dashboard + discover
Routes:
- /account/dashboard
- /account/discover

1) Confirm no crashes.
2) Discover should show public conferences.

### 13.2 My conferences
Route: /account/my-conferences
1) As attendee, verify registered conferences appear.
2) Open a conference:
   - /account/my-conferences/[id]
   - /schedule
   - /tree

Expected:
- Schedule respects schedulePublished + conference published gating.

### 11.6 Reorder + lock safety (where exposed)
While testing /program/sessions, /program/presentations, and the scheduler:
- Try reordering presentations within a session.
- If a “lock” control exists for a presentation, lock it and verify:
   - it cannot be reordered or moved
   - UI disables the move/reorder controls
   - server rejects attempts if UI still tries

### 13.3 My submissions (author file access)
Route: /account/my-submissions
1) Verify the submission exists.
2) Open /[id] detail.

**File access (author-only):**
- Authors CAN see and download their own submission files
- Verify "Download Abstract File" / "Download Full-Text File" buttons appear (if files were uploaded)
- This is the ONLY place (besides organizer views) where submission files are downloadable
- Public pages intentionally show abstract text only, no file downloads

**Status-based editing:**
- `draft` or `revision_requested`: author can edit
- Other statuses: submission is read-only for author
- If revision was requested, author sees feedback message and can resubmit

### 13.4 Favorites
Route: /account/favorites
1) On a program page (after schedule publish), favorite a presentation.
2) Verify it appears in favorites list.
3) Remove favorite and verify it disappears.

### 13.5 Settings
Route: /account/settings
1) Verify profile fields (if present) save and persist.

### 13.6 Search (if exposed in UI)
Search endpoints exist on the server and search may be embedded in pages.

Check for any of the following in the UI:
- A global search input (often in the top nav)
- A “Search” section/tab in the public conference detail
- Search inside program/schedule views

If present:
1) Search for a keyword from your submission title: “Conference Master QA”.
2) Search for a speaker/author name.
3) Confirm results link to the expected presentation/session pages.

---

## 14) Admin area (if available)

Login as admin.

### 14.1 Admin dashboard
Route: /admin/dashboard
- Confirm it loads and shows aggregate cards.

### 14.2 Users + detail
Routes:
- /admin/users
- /admin/users/[id]

Checklist:
- list loads
- search/filter (if present)
- detail page renders
- role changes (if present) persist

### 14.3 Conferences
Route: /admin/conferences
- list
- open details (if present)

### 14.4 Submissions
Route: /admin/submissions
- list
- open
- change status (if present)

### 14.5 Presentations
Route: /admin/presentations
- list
- verify reorder/lock safeguards if exposed

### 14.6 Reports + settings + audit logs
Routes:
- /admin/reports
- /admin/settings
- /admin/audit-logs

Expected:
- No crashes; if placeholders, they should clearly be placeholders.

---

## 15) Cross-cutting checks (do these while testing)

### 15.1 Permissions
- Normal user cannot access organizer routes (should redirect).
- Organizer cannot access admin routes unless also admin.

### 15.2 Error handling
- Every failed network call should show a friendly message.
- No raw stack traces or unhandled promise rejections.

### 15.3 Data persistence
- After every save action: refresh the page and confirm data persisted.

### 15.4 Layout consistency
- Organizer per-conference pages should have consistent left/right bounds (no random max-width restrictions).

### 15.5 Reports & exports consistency
Organizers have multiple report surfaces. Validate both:
- /organizer/conferences/[id]/reports/*
- /organizer/conferences/[id]/home/reports/*

For each report page:
- Verify empty state (before data) and populated state (after you create submissions/schedule/participants)
- Export buttons download a file and reflect applied filters
- Placeholder pages are clearly labeled and don’t expose broken controls

---

## 16) Recording results (template)

For each failure, record:
- Page route
- Steps to reproduce
- Expected vs actual
- Console error (copy/paste)
- Network error (status code + endpoint if visible)
- Whether it reproduces after refresh

Example:
- Route: /organizer/conferences/123/abstracts/export
- Action: click Export CSV
- Expected: downloads CSV
- Actual: toast error “Failed to export”
- Console: `TypeError: ...`
- Network: `GET /api/conferences/123/submissions/export 500`

---

## Appendix A: Backend route modules (sanity reference)

Backend route files (server/src/routes):
- accountRoutes
- adminRoutes
- attendeeRoutes
- authRoutes
- conferenceRoutes
- conferenceSetupRoutes
- daysRoutes
- eventRoutes
- favoriteRoutes
- organizerRoutes
- participantsRoutes
- presentationRoutes
- publicRoutes
- registrationRoutes
- scheduleRoutes
- searchRoutes
- sectionRoutes
- submissionsRoutes
- userRoutes
- websiteRoutes

---

## Appendix B: Key ADRs and architectural references

| ADR | Title | Key Impact on Testing |
|-----|-------|----------------------|
| **ADR-008** | Token-wins Role Resolution | Cognito groups are authoritative; DB role is non-authoritative mirror |

Key files for authorization:
- `server/src/middleware/authMiddleware.ts` - JWT verification, role extraction from token claims
- `client/src/features/auth/context/AuthContext.tsx` - Client-side auth state, `forceTokenRefresh()`, `performUpgradeToOrganizer()`
- `docs/new/ADR/ADR-008-token-wins-role-resolution.md` - Full ADR documentation

When debugging auth issues:
1. Check browser DevTools → Application → Cookies for `idToken` presence
2. Decode JWT at jwt.io to see `cognito:groups` claims
3. Server logs show role extraction in authMiddleware
4. Compare token `cognito:groups` vs DB `User.role` - token wins
---

## Appendix C: Manual Testing Seed Scripts

Two seed scripts are available for quickly populating a test database with realistic data.

### C.1 Minimal Seed (`npm run seed:manual-test`)

**Purpose:** Quick smoke-test setup. Non-destructive—upserts existing records.

**Script:** `server/prisma/seed-manual-testing-minimal.ts`

**Creates:**
- **Organizer user** (role: `organizer`)
  - Default: cognitoId `10fc39dc-1021-70df-2771-b3cb73370f46`, email `3ninety9@gmail.com`
  - Override with: `SEED_ORG_COGNITO_ID`, `SEED_ORG_EMAIL`, `SEED_ORG_NAME`
- **Author user** (role: `user`)
  - Default: cognitoId `seed-author-minimal-001`, email `author.minimal@conference.test`
  - Override with: `SEED_AUTHOR_COGNITO_ID`, `SEED_AUTHOR_EMAIL`, `SEED_AUTHOR_NAME`
- **Draft conference** (status: `draft`, private)
  - Slug: `manual-test-conference` (override: `SEED_CONFERENCE_SLUG`)
  - Submission requirements configured
- **One draft submission** with author entry
- **ConferenceParticipant** record for the author

**When to use:** Starting fresh QA session; need minimal data to verify basic flows.

---

### C.2 Comprehensive Seed (`npm run seed:manual-test-main`)

**Purpose:** Rich, end-to-end dataset for thorough manual testing.

**Script:** `server/prisma/seed-manual-testing.ts`

**Behavior:**
- **Deletes** existing conferences with slugs `manual-test-conference-2026` and `manual-test-draft-2026` (and all related data)
- **Upserts** users by cognitoId/email (safe for existing accounts)
- Uses a deterministic **base date** (`2026-01-12` by default, override: `SEED_BASE_DATE`)

**Creates:**

#### Users
| Role | Email | Name |
|------|-------|------|
| organizer | `3ninety9@gmail.com` | Manual Test Organizer |
| admin | `admin@conference.test` | Seed Admin |
| organizer | `organizer2@conference.test` | Secondary Organizer |
| user | `author.one@conference.test` | Author One |
| user | `author.two@conference.test` | Author Two |
| user | `attendee.one@conference.test` | Attendee One |
| user | `reviewer.one@conference.test` | Reviewer One |
| user | `presenter.one@conference.test` | Presenter One |
| user | `attendee.two@conference.test` | Attendee Two |
| user | `attendee.three@conference.test` | Attendee Three |

#### Published Conference (`manual-test-conference-2026`)
- **Name:** International Conference on Applied AI (Manual Test) 2026
- **Status:** `published`, schedule published
- **Dates:** Base + 90 to 92 days (April 12–14 if base is Jan 12)
- **Location:** Hybrid
- **Topics:** AI, ML, NLP, Systems, Data Science
- **Visibility:** public, submissions public
- **CFP:** Open from base - 60 days to base + 30 days

**Setup data:**
- **Categories:** Research, Industry, Student, Demos
- **Presentation Types:** Oral (20m), Lightning (8m), Poster (5m), Workshop (60m)
- **Submission Requirements:** 5–8 keywords, 50–3000 char abstract, PDF uploads allowed, full-text after acceptance
- **CFP Content Blocks:** "Call for Papers", "Submission Guidelines"
- **Timeline Milestones:** CFP Opens/Closes, Reviews, Decisions, Conference Starts
- **Registration Questions:** Dietary restrictions, Accessibility needs, Attendance type
- **Conference Material:** Sample PDF (dummy file URL for testing downloads)

**Schedule:**
- **Day 1:** Opening Keynote (9–10), Session A — ML & NLP (10:30–12), Coffee Break (12–12:30)
- **Day 2:** Session B — Applied AI (9–10:30), Workshop — Practical RAG (11–12:30)
- **Day 3:** Panel — AI Governance (9–10)

**Submissions (8 total, covering all statuses):**

| Title | Status | Author | Locked | Notes |
|-------|--------|--------|--------|-------|
| Draft Submission (Editable) | `draft` | Author One | No | Test author edit flow |
| Submitted Submission (Awaiting Review) | `submitted` | Author Two | No | Multi-author (2 authors) |
| Under Review (Locked) | `under_review` | Author One | Yes | Has 2 reviews (scores 3, 4) |
| Revision Requested (Unlocked) | `revision_requested` | Author Two | No | Has feedback text |
| Accepted (Scheduled Talk) | `accepted` | Author One | Yes | Has file URLs, linked to presentation |
| Accepted (Unscheduled) | `accepted` | Author Two | Yes | For scheduler workflow testing |
| Rejected (Locked) | `rejected` | Author One | Yes | Test decision display |
| Withdrawn Submission | `withdrawn` | Author Two | Yes | Test filter/state display |

**Presentations:**
- **Keynote:** "Keynote: Building Trustworthy AI Systems" (external, Dr. Key Note)
- **Session A:** "Accepted (Scheduled Talk)" (internal, from submission)
- **Session B:** "Seeded Talk (No Submission Link)" (external, Demo Speaker)

**Other data:**
- Conference participants (attendee/reviewer/presenter/author roles)
- Conference favorites (2 users)
- Presentation favorites (3 entries)
- Conference feedback (1 entry)
- Presentation feedback (1 entry)
- Notifications (2 entries)
- Admin audit log entry

#### Draft Conference (`manual-test-draft-2026`)
- **Name:** Workshop Sandbox (Manual Test) 2026
- **Status:** `draft`, private
- **Submissions:** Invite-only (code: `INVITE-2026`)
- **Purpose:** Test organizer setup flows before publishing

---

### C.3 Testing with seeded data

**File access testing:**
- The accepted submission has file URLs pointing to a public W3C dummy PDF
- Organizers can download from submission detail
- Authors can download from their account → my submissions
- Public pages show abstract text only, NO file download buttons

**Submission status flow testing:**
- Use the seeded submissions to verify all status transitions
- "Revision Requested" submission has pre-populated feedback to test author revision flow

**Schedule testing:**
- The published conference has a 3-day schedule with sessions and presentations
- Use scheduler to test drag-drop, conflict detection, and ordering

**Multi-author testing:**
- "Submitted Submission" has 2 authors for testing author list rendering and presenter assignment