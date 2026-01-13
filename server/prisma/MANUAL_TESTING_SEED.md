# Manual Testing Seed Data

Comprehensive seed data script for focused manual testing of Conference Master Web App.

## Test User Details

- **User ID**: 590
- **Cognito ID**: `10fc39dc-1021-70df-2771-b3cb73370f46`
- **Email**: `test.organizer@conference.test`
- **Role**: Organizer

## What's Included (~150 records)

### Conference #1: Published Multi-Day Conference
- **Name**: International Conference on Artificial Intelligence & Machine Learning 2026
- **Status**: Published (ready for public viewing)
- **Dates**: 3-day conference (90 days from seed date)
- **Features**: Full setup with all organizer and attendee features enabled

**Setup Data:**
- 4 Conference Categories (Research, Industry, Student, Demos)
- 4 Presentation Types (Oral, Lightning, Poster, Workshop)
- 8 Custom Registration Questions (various types)
- Submission Requirements fully configured
- 2 CFP Content Blocks
- 5 Timeline Milestones
- 3 Conference Materials

**Program Structure:**
- 3 Days with themed sessions
- 20 Sessions (keynotes, presentations, breaks, workshops, panels)
- 8 Scheduled Presentations (from accepted submissions)
- 3 External Presentations (invited speakers)
- 3 Unscheduled Accepted Submissions (for scheduler testing)

**Submissions (33 total):**
- 5 Draft
- 10 Submitted (awaiting review)
- 5 Under Review (with 2 reviews each)
- 8 Accepted (5 scheduled, 3 unscheduled)
- 3 Rejected
- 2 Withdrawn

**Participants (23 total):**
- 15 Registered Attendees
- 3 Registered Presenters
- 2 Waitlisted
- 1 Canceled
- 2 Sponsors
- 2 Volunteers
- **NOTE:** No external reviewers - app only supports organizer-based reviews

**Supporting Data:**
- 10 Reviews (created by organizers for under_review submissions)
- 5 Conference Favorites
- 8 Presentation Favorites
- 20 Notifications
- 3 Conference Feedback entries

**Abstract Submission Testing:**
- Submission requirements configured with `abstractUploadMode: BOTH`
- Allows testing both text-based and file upload workflows
- Some submissions can be tested with file attachments (when file storage is implemented)

### Conference #2: Draft Conference
- **Name**: Workshop on Data Science Applications 2026
- **Status**: Draft (minimal setup for testing setup workflows)
- 1 Category
- 1 Presentation Type

### Users (11 total)
- 1 Test Organizer (ID 590) - Main test user
- 1 Admin
- 1 Additional Organizer
- 8 Regular Users (researchers, professors, industry professionals)

## How to Use

### Prerequisites

1. Ensure PostgreSQL database is running
2. Environment variable `DATABASE_URL` is configured in `.env`
3. Prisma schema is up-to-date (`npx prisma generate`)

### Running the Seed Script

```bash
cd server
npm run seed:manual-test
```

Or directly:

```bash
cd server
ts-node prisma/seed-manual-testing.ts
```

### Recommended Workflow

**For Clean Start:**
```bash
# 1. Reset database
npx prisma migrate reset --force

# 2. Run manual test seed
npm run seed:manual-test
```

**For Focused Testing (keep existing data):**
```bash
# Just run the seed (creates new data for user 590)
npm run seed:manual-test
```

> Note: The script will verify/create user 590 and ensure Cognito ID matches exactly. If user 590 already exists with a different Cognito ID, it will be updated.

## What You Can Test

### Organizer Workflows
✅ View dashboard with real stats (submissions, participants, program)
✅ Review submissions in all statuses
✅ Accept/reject submissions
✅ Build and modify the 3-day program schedule
✅ Assign unscheduled presentations to sessions
✅ Manage participants (view by role, handle waitlist)
✅ Export participant/submission data
✅ Configure custom registration questions
✅ Edit conference settings and CFP content
✅ Upload materials

### Public/Attendee Workflows
✅ Browse published conference
✅ View full schedule (3 days, 20 sessions)
✅ Search and filter presentations
✅ View speaker profiles
✅ Favorite conferences and presentations
✅ Submit new abstracts (if window open)
✅ Register for conference
✅ Answer custom registration questions

### Edge Cases & Scenarios
✅ Waitlist handling (2 waitlisted participants)
✅ Locked submissions (accepted/rejected)
✅ Unscheduled accepted submissions (3 ready for scheduling)
✅ Sessions with different types (keynote, workshop, panel, etc.)
✅ Multi-author presentations
✅ External vs internal presenters
✅ Custom question responses
✅ Registration with approval workflow
✅ Early bird vs regular pricing
✅ Virtual and in-person attendance types

## Data Volume Summary

- **Total Records**: ~150
- **Users**: 11
- **Conferences**: 2
- **Days**: 3
- **Sessions**: 20
- **Submissions**: 33
- **Presentations**: 11
- **Participants**: 23
- **Reviews**: 10
- **Favorites**: 13
- **Notifications**: 20

## Main Conference Timeline

- Submissions Window: Opened 60 days ago, closes in 30 days
- Registration Window: Opened 45 days ago, closes in 80 days
- Review Period: Starts in 35 days, ends in 55 days
- Early Bird Deadline: 45 days from now
- Conference Dates: 90-92 days from now (3-day event)

## Login/Authentication

For manual testing in the UI, you'll need to authenticate as user 590:

- **Email**: `test.organizer@conference.test`
- **Cognito ID**: `10fc39dc-1021-70df-2771-b3cb73370f46`

> Ensure your Cognito user pool has this user configured, or adjust authentication to work with your test environment.

## Troubleshooting

**Script fails with connection error:**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

**User 590 already exists with different email:**
- Script will update Cognito ID to match
- Email will remain as-is if user exists

**Foreign key constraint errors:**
- Run `npx prisma migrate reset --force` first
- Then run seed script

**TypeScript compilation errors:**
- Script uses Prisma Client types which require `npx prisma generate` to be run first
- Use `ts-node` (not `tsx`) to execute the script

## Next Steps After Seeding

1. **Verify in UI**: Login as test organizer and navigate to organizer dashboard
2. **Check Dashboard Stats**: Should see 33 submissions, 23 participants, 11 presentations
3. **Test Scheduler**: 3 accepted submissions are unscheduled and ready to add to sessions
4. **Test Filters**: Submissions page should filter by all 6 statuses
5. **Test Registration**: People page should show breakdown by role (attendees, presenters, reviewers)
6. **Test Program**: 3-day schedule should be fully populated with 20 sessions

## Maintenance

This seed script is designed for **manual testing only**. For automated testing, use the existing `seed.ts` or create smaller, focused fixtures.

To update this seed data:
1. Edit `server/prisma/seed-manual-testing.ts`
2. Run `npm run seed:manual-test`
3. Verify changes in the UI

---

**Created**: January 2026  
**For**: Conference Master Web App Manual Testing  
**Version**: 1.0
