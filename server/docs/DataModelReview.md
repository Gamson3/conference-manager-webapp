# Data Model Review and Proposals

This document reviews the current Prisma schema against the thesis requirements and proposes minimal, pragmatic additions to ensure a complete, user-friendly Conference Manager.

## Requirements recap

- Organizers can define a conference with metadata, topics, categories/types, submission requirements, and a timeline; publish and lock after scheduling.
- Authors submit abstracts; reviewers review; organizers accept/reject; accepted papers become presentations with authors, affiliations, keywords (≥5), materials.
- Scheduling: days, sections/sessions, rooms, capacities; assign presentations; support session chairs.
- Public browsing: conferences, schedules, presentations; search; favorites; feedback.
- Accounts: AWS Cognito auth; roles (attendee, organizer, admin); admin impersonation.

## Existing coverage (good)

- Core entities: User, Conference, Day, Section, Presentation, PresentationAuthor.
- Submission & review: AbstractSubmission, AbstractReview.
- Favorites & feedback: ConferenceFavorite, PresentationFavorite, ConferenceFeedback, PresentationFeedback.
- Scheduling primitives: Day, Section with room/capacity fields; Presentation with status (draft|submitted|scheduled|locked), lockedBy.
- Materials: ConferenceMaterial, PresentationMaterial.
- Attendance: Attendance (conference), SessionAttendance.
- Notifications: Notification.
- Admin: ImpersonationLog.
- Quality: Useful indexes on several fields; timestamps on most models.

## Identified gaps to meet full scope

1) Conference setup wizard support
- Missing structured models for Categories/Tracks and Presentation Types.
- Missing Submission Requirements (e.g., word limits, min keyword count, allowed file types) and Timeline milestones (open/close dates).

2) SEO-friendly and stable URLs
- No slugs for conferences and presentations.

3) Organizer teams and session chairs
- Only a single createdBy per conference; need multiple organizers/roles per conference.
- No explicit session chair per Section (nice-to-have for larger events).

4) Reviewer assignment (optional but helpful)
- Reviews exist, but no explicit assignment relation to manage load/conflicts.

5) Cognito alignment
- User.password is required in the schema but we use Cognito; should be optional or removed to avoid confusion and seed friction.

6) Searchability and performance
- Add a few more indexes (e.g., Conference.slug, Presentation.slug, Section.dayId/startTime) and consider full-text later if needed.

## Proposed additive models and fields (minimal set)

- ConferenceCategory (aka Track)
- PresentationType (per conference)
- SubmissionRequirement (per conference)
- TimelineMilestone (per conference)
- ConferenceOrganizer (teams/roles per conference)
- Optional: SectionChair (assign a chair to a session)
- Slugs: Conference.slug, Presentation.slug (unique)
- Make User.password optional (nullable) to reflect Cognito usage

### Prisma sketch

```prisma
model ConferenceCategory {
  id           Int        @id @default(autoincrement())
  conferenceId Int
  name         String
  description  String?
  order        Int        @default(0)

  conference Conference @relation(fields: [conferenceId], references: [id])

  @@unique([conferenceId, name])
}

model PresentationType {
  id           Int        @id @default(autoincrement())
  conferenceId Int
  name         String     // e.g., Talk, Poster, Workshop
  description  String?
  durationMin  Int?       // default duration in minutes

  conference Conference @relation(fields: [conferenceId], references: [id])

  @@unique([conferenceId, name])
}

model SubmissionRequirement {
  id           Int        @id @default(autoincrement())
  conferenceId Int
  // Simple, practical toggles/limits; can extend as JSON later
  minKeywords  Int?       // e.g., 5
  maxAbstractWords Int?
  allowFileUpload Boolean @default(true)
  allowedFileTypes String[] @default([])

  conference Conference @relation(fields: [conferenceId], references: [id])
}

model TimelineMilestone {
  id           Int        @id @default(autoincrement())
  conferenceId Int
  key          String     // e.g., "submission_open", "submission_close", "review_deadline", "camera_ready"
  date         DateTime
  description  String?

  conference Conference @relation(fields: [conferenceId], references: [id])

  @@unique([conferenceId, key])
}

model ConferenceOrganizer {
  id           Int    @id @default(autoincrement())
  conferenceId Int
  userId       Int
  role         String // e.g., chair, co-chair, track-chair

  conference Conference @relation(fields: [conferenceId], references: [id])
  user       User      @relation(fields: [userId], references: [id])

  @@unique([conferenceId, userId])
}

model SectionChair {
  id         Int  @id @default(autoincrement())
  sectionId  Int
  userId     Int

  section Section @relation(fields: [sectionId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([sectionId, userId])
}

// Add to existing models:
// Conference
// slug String @unique  // SEO-friendly identifier (e.g., icml-2026)
// types PresentationType[]
// categories ConferenceCategory[]
// requirements SubmissionRequirement?
// milestones TimelineMilestone[]
// organizers ConferenceOrganizer[]

// Presentation
// slug String @unique
// typeId Int? // optional link to PresentationType
// categoryId Int? // optional link to ConferenceCategory (track)
// type PresentationType? @relation(fields: [typeId], references: [id])
// category ConferenceCategory? @relation(fields: [categoryId], references: [id])

// User
// password String? // make nullable due to Cognito
```

## Indexes and constraints

- Conference: add unique index on slug; keep existing indexes on name, status, startDate.
- Presentation: add unique index on slug; keep indexes on title, keywords.
- Section: consider index on (conferenceId, dayId, startTime) for schedule queries.
- Author search: indexes already present on authorName/authorEmail.

## Migration plan (once approved)

1) Add new models and relations; add slug fields to Conference/Presentation; make User.password nullable.
2) Backfill slugs for existing rows (slugify name + id).
3) Optionally seed default PresentationType (Talk, Poster) per conference.
4) Generate and run Prisma migrations.
5) Update API and client:
   - Organizer setup pages to read/write categories, types, requirements, timeline, organizers.
   - Public routes to use slugs for URLs (with fallback by id).
   - Schedule UI: optional session chair display.

## Notes

- We intentionally keep SubmissionRequirement simple; if requirements vary per category/type later, we can add an association table (RequirementRule) without breaking changes.
- If you plan to support many organizers but not global organizer role, ConferenceOrganizer becomes authoritative for per-conference permissions.
- For full-text search, we can add Postgres tsvector or pg_trgm later; out of scope for initial migration.

## Next steps

- Confirm this proposal. If agreed, I’ll implement schema changes and necessary server/client updates in small PR-sized chunks.
