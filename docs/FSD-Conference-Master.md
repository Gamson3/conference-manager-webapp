# Functional Specification Document

## 1. Introduction

- **Project Title:** Conference Master Web Application
- **Date:** 2024.10.16
- **Author:** Gideon Gamson
- **Approvers:** Professor Tamás Storcz

---

## 2. Version History

| Ver. | Date | Author | Description |
|:-----|:-----|:-------|:------------|
| 0.0 | 2024.09.30 | T. Storcz | Initial template generation |
| 0.1 | 2024.10.16 | Gideon Gamson | Initial draft for functional spec |
| 0.2 | 2024.11.03 | Gideon Gamson | Updated use case diagrams and UI |
| 0.3 | 2025.01.10 | Gideon Gamson | Include user flow diagram to aid visual representation of User Interactions |
| 0.4 | 2025.01.18 | Gideon Gamson | Integrated author presentation uploads, Presentation locking mechanism, Impersonation Features, and invite-based author submission. Updated corresponding use cases, user stories and data models |

---

## 3. Purpose

- **Purpose Statement:** This document outlines the functional specifications for the development of the Conference Master Web Application. It aims to define the core functionalities and interactions between users and the system, focusing on conference management, abstract submission, schedule organization, and attendee registration.

- **Scope:** The system encompasses conference lifecycle management, abstract submission workflows, schedule organization, attendee registration, and administrative oversight.

- **Intended Audience:**
  - Academic conference organizers
  - Conference attendees and presenters
  - System administrators
  - Development team members

---

## 4. Overview

- **System Overview:** Conference Master will be a full-stack web application enabling end-to-end conference management. The platform will support multi-role access with progressive capability acquisition based on user actions.

- **Assumptions:**
  - Users have modern web browsers with JavaScript enabled.
  - Users have valid email addresses for registration via AWS Cognito.
  - Organizers are familiar with basic conference management workflows.
  - Participants use the platform's search and schedule navigation features without extensive training.

- **Dependencies:**
  - **AWS Cognito:** User authentication with JWT token verification (JWKS endpoint).
  - **PostgreSQL + PostGIS:** Primary database with spatial extensions.
  - **Prisma ORM:** Type-safe database access layer.
  - **R2/S3:** File storage for banners, logos, and submission documents.
  - **Node.js + Express:** Backend API server.
  - **Next.js:** Frontend application with React Server Components.

- **Technical Constraints:**
  - Stateless backend architecture with JWT-based authentication.
  - Single database instance (thesis scope limitation).
  - Role-based access control via Cognito groups (user, organizer, admin).
  - File uploads limited to specific document types and size constraints.

- **Business Constraints:**
  - System designed for small to medium academic conferences (up to 500 attendees).
  - No payment processing integration.
  - No real-time collaboration features (no WebSockets).
  - No automated email notifications (Cognito will handle auth emails only).

---

## 5. Functional Requirements

### Use Case Diagram

The system will support three primary user roles: **Conference Organizer**, **Attendee**, and **Administrator**.

- **Conference Organizer** – Will manage conference setup, CFP configuration, submission review, schedule building, and publication. Users will be automatically upgraded to organizer role when creating their first conference. Will have the ability to request consent to assist authors with submissions.

- **Attendee** – Will register for conferences, browse schedules, search presentations, and manage favourites. Any authenticated user will be able to become an author by submitting to a conference.

- **Administrator** – Will have full system oversight: managing all users and conferences, reviewing audit logs, ability to impersonate any non-admin user, and override capabilities for locked content.

**Authors will not be a separate role.** Any authenticated user will become an author by creating a submission.

---

### Use Cases

#### Use Case ID: UC-01

- **Title:** Conference Creation and Management
- **Description:** Organizers will create conferences, define settings, configure submission requirements, and manage the conference lifecycle through to publication.
- **Actors:** Organizer, Administrator
- **Preconditions:**
  1. Organizer must be logged in with appropriate privileges.
  2. For new organizers: first conference creation will trigger auto-upgrade from user role.
- **Postconditions:**
  1. A new conference will be created in draft status.
  2. Conference settings will be persisted (dates, venue, capacity, topics).
  3. For first-time organizers: Cognito group assignment will be completed, token refreshed.
- **Main Flow:**
  1. Organizer logs in.
  2. Organizer selects "Create Conference."
  3. Organizer inputs conference details (name, description, dates, location, timezone).
  4. Organizer may upload banner image (optional).
  5. Organizer submits form.
  6. System will create conference with status: draft.
  7. If user is a base user, system will add user to Cognito "organizers" group.
  8. Organizer will be redirected to conference management console.
- **Alternate Flow:**
  1. If validation fails, system will display error messages.
  2. Organizer corrects inputs and resubmits.

---

#### Use Case ID: UC-02

- **Title:** Hierarchical Program View (Tree View)
- **Description:** The system will provide a collapsible tree-like view of the conference program organized hierarchically by Day → Session → Presentation. Users will be able to expand/collapse days and sessions to focus on specific content.
- **Actors:** Attendee, Organizer, Guest
- **Preconditions:**
  1. The conference schedule must be built with days, sessions, and presentations.
  2. Schedule must be published (schedulePublishedAt field set).
- **Postconditions:**
  1. Users will be able to view and navigate the conference program in a hierarchical tree structure.
  2. Users will be able to view presentation details (title, abstract, authors, keywords).
- **Main Flow:**
  1. User navigates to the conference program page.
  2. System will display "Tree View" tab showing the hierarchical structure.
  3. System will organize content as: Conference → Days (expandable) → Sessions (expandable) → Presentations.
  4. User clicks on day/session headers to expand or collapse sections.
  5. User clicks on presentation titles to view modal with full details.
  6. Authenticated users will be able to favorite presentations directly from the tree view.
- **Alternate Flow:**
  1. If schedule is not yet published, system will display "Program coming soon" message.
  2. If no days/sessions exist, system will display "No program available" message.
- **Exceptions:**
  1. If there is an issue loading data, the system will display an error message with retry option.

---

#### Use Case ID: UC-03

- **Title:** Search Conference Schedule
- **Description:** The system will allow users to search the conference schedule by author, title, section, or keyword to quickly locate relevant presentations.
- **Actors:** Attendee, Guest
- **Preconditions:**
  1. Conference schedule data must be available and published.
- **Postconditions:**
  1. The user will be able to view a list of presentations that match their search criteria.
- **Main Flow:**
  1. The user navigates to the conference program page.
  2. The user enters search criteria (author, title, section, or keyword) into the search field.
  3. The system will process the search and return matching presentations.
  4. The user selects a presentation from the results to view detailed information.
- **Alternate Flow:**
  1. If no results are found, the system will display a message indicating no matches.
- **Exceptions:**
  1. If the search criteria are invalid, an error message will prompt the user to modify their search.

---

#### Use Case ID: UC-04

- **Title:** Mark Presentation as Favourite
- **Description:** The system will allow users to mark specific presentations as favourites, making them easily accessible from a dedicated list with jump-to-program navigation.
- **Actors:** Attendee (authenticated)
- **Preconditions:**
  1. The user must be logged in.
  2. The conference schedule must be published.
- **Postconditions:**
  1. The selected presentations will appear in the user's favourites list.
  2. User will be able to navigate directly to the presentation in the program view.
- **Main Flow:**
  1. The user navigates to the conference schedule and views a list of presentations.
  2. The user clicks the "favourite" icon for a presentation.
  3. The system will add the presentation to the user's favourites list and provide confirmation.
  4. The user navigates to Favourites page from their account.
  5. The user clicks "View in Program" to jump to the presentation in the tree view.
- **Alternate Flow:**
  1. If the presentation is already marked as a favourite, clicking the icon will remove it from favourites.
- **Exceptions:**
  1. If the user is not logged in, the system will prompt them to log in to save favourites.

---

#### Use Case ID: UC-05

- **Title:** Register for Conference
- **Description:** Users will register to attend a conference, completing registration requirements and custom questions.
- **Actors:** Attendee (authenticated)
- **Preconditions:**
  1. User must be authenticated.
  2. Conference must be published.
  3. Conference registration must be open.
- **Postconditions:**
  1. User will be registered as attendee.
  2. Conference will appear in user's "My Conferences" list.
  3. Custom question responses will be stored.
- **Main Flow:**
  1. User navigates to conference registration page.
  2. System will display registration form with standard fields and custom questions.
  3. User completes required fields.
  4. User submits registration.
  5. System will create ConferenceParticipant record.
  6. User will see confirmation message.
- **Alternate Flow:**
  1. If already registered, system will show existing registration status.
  2. If registration is closed, system will display appropriate message.

---

#### Use Case ID: UC-06

- **Title:** User and System Management
- **Description:** Administrators will manage user accounts, oversee system activities, and monitor all conferences. Organizers will manage participants within their own conferences. Both roles will have the ability to request consent to assist authors with submissions.
- **Actors:**
  1. **Administrator** (Full system control: all users, all conferences, audit logs)
  2. **Organizer** (Limited to own conferences: participants, submissions, program)
- **Preconditions:**
  1. Administrator or Organizer must be authenticated with appropriate role.
  2. System must be operational with audit logging enabled.
- **Postconditions:**
  1. User accounts, roles, and permissions will be updated.
  2. All administrative actions will be logged to AdminAuditLog with actor, action, entity details.
  3. Participant data will be accurate and available for reports.
- **Main Flow:**

  **Administrator Actions:**
  1. Admin will log in and navigate to admin dashboard.
  2. Admin selects "User Management" to view all users.
     - List view will include filters (role, status, search by name/email)
     - Will view user details
     - Will edit user profile
     - Will change user role (upgrade user → organizer, organizer → admin, etc.)
     - Will delete user (with cascade consequence preview)
  3. Admin selects "Conference Management" to view all conferences.
     - Will list all conferences (any status, any owner)
     - Will view/edit any conference
     - Will force publish/unpublish
     - Will delete conference (with cascade preview)
  4. Admin selects "Audit Logs" to review system activity.
     - Will view all AdminAuditLog entries
     - Will filter by action type, entity type, actor, date range
     - Will export audit logs to CSV
  5. Admin will be able to impersonate any non-admin user:
     - Select "Impersonate User" from user details
     - System will create ImpersonationLog entry
     - Admin navigates app as that user
     - Admin ends impersonation, log entry will be closed

  **Organizer Actions:**
  1. Organizer will navigate to conference participant management.
  2. Will view participant list with roles (attendee, presenter, author, reviewer).
  3. Will be able to update participant status or remove participants.
  4. Will be able to export participant list to CSV.
  5. **Submission Assistance (Consent-based):**
     - Organizer selects "Assist with Submission" for an author.
     - If no consent exists, organizer will send SubmissionAssistanceRequest.
     - Author will approve via assistance management page.
     - System will create SubmissionAssistanceConsent.
     - Organizer will then be able to create/edit submissions on behalf of author.

- **Alternate Flow:**
  1. If Administrator tries to delete their own account, system will display warning.
  2. If Organizer tries to access another organizer's conference, system will return 403 Forbidden.
  3. If audit log data is unavailable, system will show error message.

- **Exceptions:**
  1. Admins will not be able to impersonate other admins (security measure).
  2. Organizers will not be able to grant themselves organizer role (must create a conference).

---

#### Use Case ID: UC-07

- **Title:** Submit Presentation (Abstract Submission)
- **Description:** Authors will submit abstracts with required details for conference consideration. A multi-step wizard will guide them through the submission process. Organizers will be able to assist authors via consent-based delegation.
- **Actors:** Author (any authenticated user), Organizer (with author consent)
- **Preconditions:**
  1. Author must be authenticated.
  2. Conference must have active CFP window (submissionsOpenFrom ≤ now ≤ submissionsOpenUntil).
  3. Conference submissions must be accessible (public) or user must have invite code (invite_only mode).
  4. For organizer assistance: Valid SubmissionAssistanceConsent must exist.
- **Postconditions:**
  1. Submission will be created and associated with the conference.
  2. Submission will progress through status lifecycle: draft → submitted → under_review → accepted/rejected.
  3. Once accepted and scheduled to program, submission will become locked.
  4. Only organizers will be able to unlock submissions, with actions logged to AdminAuditLog.
- **Main Flow:**
  1. Author navigates to conference submission page.
  2. If submissions are invite-only and author doesn't have code, system will prompt for invite code.
  3. System will display multi-step submission wizard:
     - **Step 1 - Essentials:** Title (required), abstract text (required), category, presentation type
     - **Step 2 - Authors:** Add authors (first name, last name, email, ORCID), mark presenter, reorder
     - **Step 3 - Affiliations:** Assign affiliations to each author (minimum 1 per author)
     - **Step 4 - Keywords:** Add keywords (minimum 5), validate against requirements
     - **Step 5 - Files:** Upload abstract file (PDF/DOCX) and/or full-text paper (optional)
  4. System will validate each step against SubmissionRequirement settings.
  5. Author will be able to save as draft at any step and return later.
  6. Author clicks "Submit" on final review page.
  7. System will change status to "submitted" and notify organizers.
  8. Organizer will review and change status to under_review → accepted/rejected/revision_requested.
  9. If accepted and scheduled to program, submission will become locked.
- **Alternate Flow:**
  1. If CFP window is closed, system will display "Submissions are closed" message.
  2. If requirements not met, system will display inline validation errors.
  3. If submission is in revision_requested status, author will be able to edit and resubmit.
  4. **Organizer Assistance Flow (Consent-based):**
     - Organizer will request consent from author (creates SubmissionAssistanceRequest).
     - Author will approve request via assistance management page.
     - System will create SubmissionAssistanceConsent.
     - Organizer will access submission wizard with delegation parameter.
     - Submission will be attributed to author, assistance action will be logged.
- **Exceptions:**
  1. If user not authenticated, system will redirect to login.
  2. If conference not found or not published, system will display 404.
  3. If organizer attempts submission without consent, system will return 403 Forbidden.

---

### User Stories

#### Core User Stories (Conference Discovery & Schedule)

1. **Title: Browse Public Conferences**
   - As a visitor, I want to browse all published conferences so that I can discover events of interest.

2. **Title: Conference Search**
   - As a conference attendee, I want to search presentations by author, title, or keyword so that I can quickly find relevant content.

3. **Title: Mark Favourite Presentations**
   - As a conference attendee, I want to mark presentations as favourites so that I can easily access them later.

4. **Title: Jump to Program from Favourites**
   - As a conference attendee, I want to click "View in Program" from my favourites list so that I can see the presentation in context with its session time and location.

5. **Title: View Hierarchical Program (Tree View)**
   - As a conference attendee, I want to view the conference program in a collapsible tree format (Day → Session → Presentation) so that I can easily navigate the schedule.

6. **Title: Expand/Collapse Program Sections**
   - As a conference attendee, I want to expand or collapse days and sessions in the tree view so that I can focus on specific parts of the program.

7. **Title: View Presentation Details**
   - As a conference attendee, I want to click on a presentation to view its abstract, keywords, and author information so that I can determine if it's relevant to my interests.

8. **Title: View Conference Speakers**
   - As a conference attendee, I want to view a list of all speakers/presenters for a conference so that I know who will be presenting.

#### Submission User Stories (Call for Papers)

9. **Title: Submit Abstract to Conference**
   - As a researcher, I want to submit my abstract through a multi-step wizard so that I can present my work at the conference.

10. **Title: Multi-Author Submission with Affiliations**
    - As an author, I want to add multiple co-authors with their affiliations and mark who will present so that all contributors are properly credited.

11. **Title: Save Submission as Draft**
    - As an author, I want to save my submission as a draft and return later to complete it so that I don't lose my progress.

12. **Title: Upload Abstract and Full-Text Files**
    - As an author, I want to upload my abstract as a PDF or Word document, and optionally upload a full-text paper, so that reviewers have access to complete materials.

13. **Title: Track Submission Status**
    - As an author, I want to view my submission status (draft, submitted, under_review, accepted, rejected, revision_requested) so that I know where it stands in the review process.

14. **Title: Revision Workflow**
    - As an author, I want to be notified if revisions are requested and be able to edit and resubmit my abstract so that I can improve my submission.

15. **Title: Submission Locked After Acceptance**
    - As an organizer, I want accepted submissions to be locked after they are scheduled to the program so that authors cannot modify finalized content.

#### Organizer User Stories (Conference Management)

16. **Title: Create and Configure Conference**
    - As an organizer, I want to create a conference and configure its settings (dates, location, venue, topics) so that I can manage my event.

17. **Title: Auto-Upgrade to Organizer Role**
    - As a base user, I want to be automatically upgraded to organizer when I create my first conference so that I don't need to request role changes.

18. **Title: Define Submission Requirements**
    - As an organizer, I want to configure submission requirements (abstract length, keyword count, ORCID, file types) so that submissions meet my conference standards.

19. **Title: Create Categories and Presentation Types**
    - As an organizer, I want to define categories and presentation types with default durations so that authors can classify their submissions properly.

20. **Title: Review Submitted Abstracts**
    - As an organizer, I want to review submitted abstracts and make decisions (accept, reject, request revision) so that I can curate high-quality conference content.

21. **Title: Build Conference Program**
    - As an organizer, I want to create days, sessions, and assign presentations to build the conference schedule so that attendees have a structured program.

22. **Title: Publish Conference and Schedule**
    - As an organizer, I want to publish my conference and its schedule when ready so that attendees can view it publicly.

23. **Title: Configure Custom Registration Questions**
    - As an organizer, I want to define custom registration questions (text, select, checkbox, etc.) so that I can collect information specific to my conference.

24. **Title: Export Participants and Submissions**
    - As an organizer, I want to export participant lists and submission data to CSV so that I can analyze data offline or share with stakeholders.

#### Submission Assistance User Stories (Consent-based Delegation)

25. **Title: Request Consent to Assist Author**
    - As an organizer, I want to request consent from an author to help with their submission so that I can provide support while respecting their ownership.

26. **Title: Grant/Revoke Submission Assistance Consent**
    - As an author, I want to review and approve/deny consent requests from organizers, and revoke consent at any time, so that I control who can access my submissions.

27. **Title: Create Submission on Behalf of Author**
    - As an organizer with consent, I want to create or edit submissions on behalf of an author so that I can help them complete their submission.

#### Administrative User Stories (System Oversight)

28. **Title: Manage All User Roles**
    - As an administrator, I want to view, edit, and change user roles so that I can maintain system security and control.

29. **Title: View All Conferences System-wide**
    - As an administrator, I want to view and manage all conferences regardless of owner so that I can provide system oversight.

30. **Title: View Audit Logs**
    - As an administrator, I want to view audit logs of all administrative actions (with filters and export) so that I can track system changes and ensure accountability.

31. **Title: Impersonate Users for Support**
    - As an administrator, I want to impersonate non-admin users to troubleshoot issues or provide technical support so that I can resolve problems efficiently.

---

## 6. Non-Functional Requirements

- **Performance:**
  - API responses should complete within 1 second for typical CRUD operations.
  - Schedule and search queries will be optimized with database indexing.
  - Conference program will load with single optimized query (includes days, sessions, presentations).

- **Security:**
  - Users will authenticate via AWS Cognito with JWT tokens (RS256 signing).
  - Backend will validate tokens using Cognito's JWKS endpoint.
  - Role-based authorization: Cognito groups (admin, organizer) will determine permissions.
  - All administrative actions will be logged to AdminAuditLog with actor, timestamp, and metadata.
  - File uploads will be restricted by MIME type and size (10MB for abstracts, 20MB for full-text).
  - Submission assistance will require explicit author consent (SubmissionAssistanceConsent).

- **Usability:**
  - Multi-step submission wizard will provide inline validation and progress indication.
  - Responsive design will support desktop, tablet, and mobile viewports.
  - Intuitive navigation will maintain consistent sidebar and breadcrumb patterns.
  - Loading states and error messages will provide clear feedback.

- **Reliability:**
  - Draft submissions will auto-save to prevent data loss.
  - Optimistic UI updates will rollback on server errors.
  - Database transactions will ensure data consistency for multi-step operations.
  - Graceful degradation will occur when optional features are unavailable.

- **Scalability:**
  - System will be designed for small to medium conferences (up to 500 attendees).
  - Single PostgreSQL instance (thesis scope limitation).
  - Stateless backend architecture will support horizontal scaling.
  - Prisma connection pooling will manage database connections efficiently.
  - TanStack Query caching will reduce redundant API calls.

---

## 7. User Interface

### 7.1 Wireframes/Mockups

The application will follow a modern, responsive design with role-specific dashboards:

- **Authentication Pages:**
  - Login/signup with AWS Cognito hosted UI
  - Password reset flow

- **Public Pages:**
  - Home: Conference discovery and search
  - Conference details: Overview, program, speakers, registration
  - Program viewer: Tree view with collapsible days and sessions
  - Submission wizard: Multi-step form for abstract submission

- **Account Dashboard:**
  - Dashboard: Stats, upcoming conferences, recent activity
  - My Conferences: Registered conferences with status
  - My Submissions: All submissions with status tracking
  - Favorites: Favorited conferences and presentations
  - Submission Assistance: Manage consent requests
  - Settings: Profile editing

- **Organizer Console:**
  - Home: Dashboard with conference stats
  - Settings: Conference configuration, dates, venue
  - Submissions: List, review, accept/reject abstracts
  - Program: Schedule builder with days, sessions, presentations
  - Registration: Custom questions, participant management
  - Website: CFP content, materials, visibility settings
  - Reports: Analytics, exports

- **Administrator Dashboard:**
  - Dashboard: System-wide statistics
  - Users: User management, role changes, impersonation
  - Conferences: All conferences with override capabilities
  - Audit Logs: Complete administrative action history

### 7.2 User Interaction

- **Authentication:**
  - Users will sign up/sign in via AWS Cognito
  - Role-based routing will direct users to appropriate dashboard
  - Token refresh will be handled transparently

- **Attendee Features:**
  - Will be able to browse published conferences with filters and search
  - Will view conference program in tree view format
  - Will click presentations to view modal with full details (abstract, authors, keywords)
  - Will register for conferences with custom question responses
  - Will mark presentations as favorites with one-click toggle
  - Will submit abstracts through guided multi-step wizard

- **Organizer Features:**
  - Creating conference will trigger automatic role upgrade from base user
  - Will configure conference in Setup module (categories, types, requirements)
  - Will review submissions with inline decision-making (accept/reject/revision)
  - Will build program with drag-and-drop day/session/presentation reordering
  - Will define custom registration questions with various input types
  - Will request consent to assist authors with submissions
  - Will publish conference and schedule when ready

- **Administrator Features:**
  - Will view all system entities with advanced filtering
  - Will change user roles with confirmation dialogs
  - Will delete entities with cascade consequence previews
  - Will impersonate non-admin users for troubleshooting
  - Will export data to CSV for offline analysis
  - Will review audit logs with time-range and action filters

### 7.3 Navigation

- **Navigation Flow:**

  1. **Public Access:**
     - Unauthenticated users will be able to browse conferences and view published schedules
     - Authentication will be required for: registration, favorites, submission

  2. **Role-Based Navigation:**
     - **Base Users:** Will have access to account routes (dashboard, my-conferences, favorites, submissions, settings)
     - **Organizers:** Will have additional access to organizer routes (conference management console)
     - **Administrators:** Will have additional access to admin routes (system oversight)

  3. **Consistent UI Patterns:**
     - Top navigation bar with logo, search, notifications, user menu
     - Left sidebar for primary navigation (role-specific)
     - Breadcrumbs for deep navigation paths
     - Modal dialogs for focused actions (presentation details, confirmations)
     - Toast notifications for action feedback

  4. **Mobile Responsiveness:**
     - Hamburger menu for sidebar on small screens
     - Touch-friendly tap targets
     - Collapsible sections for content hierarchy

---

## 8. Data Requirements

### Data Model

**Core Entities:**

- **User:** Will store user accounts with Cognito authentication linkage and system role.
- **Conference:** Will store conference details, settings, lifecycle status, and CFP/registration windows.
- **Day:** Will represent conference days within a published schedule.
- **Section:** Will store sessions within days (presentation blocks, breaks, keynotes, etc.).
- **Presentation:** Will store scheduled presentations in sessions with content and metadata.
- **Submission:** Will track abstract submissions through the CFP review lifecycle.
- **SubmissionAuthorEntry:** Will link authors to submissions with affiliations and presenter designation.
- **ConferenceParticipant:** Will record user participation in conferences (attendee, presenter, author roles).
- **PresentationFavorite:** Will store user's favorited presentations.
- **ConferenceFavorite:** Will store user's favorited conferences.

**Configuration Entities:**

- **ConferenceCategory:** Will store submission categories defined by organizer.
- **PresentationType:** Will store presentation types with default duration settings.
- **SubmissionRequirement:** Will store conference-specific submission validation rules.
- **RegistrationQuestion:** Will store custom registration questions with type and validation.
- **TimelineMilestone:** Will store important dates and deadlines for conference.

**Submission Assistance (Consent-based Delegation):**

- **SubmissionAssistanceConsent:** Will record author consent for organizer to assist with submissions.
- **SubmissionAssistanceRequest:** Will track organizer requests for consent from author.

**Audit & Logging:**

- **AdminAuditLog:** Will track all administrative actions (create, update, delete, role changes) with metadata.
- **ImpersonationLog:** Will record when admins impersonate users for support purposes.

### Data Dictionary (Summary Table)

| Entity Name | Key Fields |
|:------------|:-----------|
| User | id, cognitoId, email, name, role (user, organizer, admin), bio, organization |
| Conference | id, name, slug, status (draft, published, canceled, completed), startDate, endDate, location, createdById, submissionsOpenFrom, submissionsOpenUntil, submissionsVisibility, registrationOpenFrom, registrationOpenUntil, schedulePublishedAt |
| Day | id, conferenceId, date, name, order |
| Section | id, dayId, conferenceId, name, startTime, endTime, room, capacity, type, order |
| Presentation | id, sectionId, submissionId, title, abstract, keywords, duration, order, status |
| Submission | id, conferenceId, authorId, title, abstract, keywords, status, isLocked, lockedAt, abstractFileUrl, fullTextFileUrl |
| SubmissionAuthorEntry | id, submissionId, firstName, lastName, email, orcid, affiliations[], isPresenter, order |
| ConferenceParticipant | id, userId, conferenceId, role, status, registeredAt, customResponses (JSON) |
| PresentationFavorite | id, userId, presentationId, createdAt |
| ConferenceFavorite | id, userId, conferenceId, createdAt |
| ConferenceCategory | id, conferenceId, name, description, order |
| PresentationType | id, conferenceId, name, defaultDuration, maxPerConference |
| SubmissionRequirement | id, conferenceId, minAbstractLength, maxAbstractLength, minKeywords, maxKeywords, requireOrcid, abstractUploadMode, fullTextTiming |
| RegistrationQuestion | id, conferenceId, label, type, required, options (JSON), order, validation (JSON) |
| TimelineMilestone | id, conferenceId, title, date, description, order |
| SubmissionAssistanceConsent | id, conferenceId, authorId, organizerId, grantedAt, revokedAt, expiresAt |
| SubmissionAssistanceRequest | id, conferenceId, authorId, organizerId, status, message, createdAt, respondedAt |
| AdminAuditLog | id, adminId, action, entityType, entityId, metadata (JSON), createdAt, performedById, onBehalfOfUserId |
| ImpersonationLog | id, impersonatorId, impersonatedId, reason, conferenceId, startedAt, endedAt |

### Enumerations

| Enum | Values |
|:-----|:-------|
| Role | user, organizer, admin |
| ConferenceStatus | draft, published, canceled, completed |
| ConferenceParticipationRole | attendee, presenter, author, reviewer, sponsor, volunteer |
| ConferenceParticipantStatus | registered, canceled, waitlisted, withdrawn |
| SubmissionStatus | draft, submitted, under_review, revision_requested, accepted, rejected, withdrawn |
| PresentationStatus | draft, submitted, scheduled, locked |
| SubmissionType | internal, external |
| SectionType | presentation, break, keynote, workshop, panel, networking |
| SubmissionsVisibility | public, invite_only, private |
| AbstractUploadMode | TEXT, FILE, BOTH |
| FullTextTiming | onSubmission, afterAcceptance |
| RegistrationQuestionType | text, textarea, select, multiselect, checkbox, radio, number, email, phone, date |
| SubmissionAssistanceRequestStatus | pending, approved, denied, expired |

---

## 9. Integration

### Integration Points

- **AWS Cognito:** User authentication and group management will be implemented via JWKS token verification.
- **PostgreSQL:** Primary data store will be accessed through Prisma ORM.
- **File System:** Document uploads will be handled via Express middleware.

### API Architecture

- **Base URL:** /api/*
- **Authentication:** Will use Bearer token in Authorization header.
- **Content Type:** JSON (application/json)
- **Error Format:** { message: string, errors?: object }

### Route Organization

| Route Group | Prefix | Purpose |
|:------------|:-------|:--------|
| Public | /api/public | Will provide unauthenticated conference access and published views |
| Auth | /api/auth | Will handle authentication flows |
| Account | /api/account | Will provide user account features (favourites, submissions, settings) |
| Organizer | /api/organizer | Will provide conference management and organizer tools |
| Admin | /api/admin | Will provide administrative operations and oversight |

---

## 10. Testing Requirements

### Testing Criteria

**Performance:**
- API responses should complete in under 1 second for typical CRUD operations.
- Program/schedule queries should load efficiently with proper indexing.
- Search functionality should return results within acceptable latency.
- File uploads should handle concurrent requests without degradation.

**Security:**
- Authentication: JWT token validation must reject tampered or expired tokens.
- Authorization: Role-based guards must prevent unauthorized access across all routes.
- Audit Logging: All admin actions must create AdminAuditLog entries with correct metadata.
- File Upload: MIME type and size restrictions must enforce security policies.
- Submission Assistance: Consent requirement must prevent unauthorized delegation.

**Usability:**
- Multi-step submission wizard should validate each step before progression.
- Inline error messages should guide users to correct validation failures.
- Loading states should provide feedback during async operations.
- Responsive design should function correctly on mobile, tablet, and desktop viewports.

**Reliability:**
- Draft auto-save should prevent data loss during submission creation.
- Database transactions should ensure consistency for multi-entity operations.
- Error boundaries should catch and display errors gracefully without crashing the application.
- Optimistic UI updates should roll back correctly on server errors.

### Test Types

**Unit Testing:**
- Will validate individual functions: authentication helpers, validation schemas, utility functions.
- Will test Prisma model methods and business logic in isolation.
- Will verify React components render correctly with various props and states.

**Integration Testing:**
- Will verify API endpoints return correct responses for valid and invalid requests.
- Will test authentication middleware correctly validates tokens and extracts user context.
- Will confirm role-based authorization middleware enforces access control.
- Will validate submission workflow from creation to acceptance and locking.
- Will test consent-based delegation flow: request → approval → delegation.

**API Testing:**
- Will verify all REST endpoints conform to expected request/response schemas.
- Will test error handling returns appropriate HTTP status codes and messages.
- Will validate query parameters and request body validation.
- Will confirm file upload endpoints handle multipart/form-data correctly.

**End-to-End Testing:**
- Will test complete user flows: signup → create conference → submit abstract → review → accept → publish.
- Will verify organizer flow: create conference → configure settings → review submissions → build program → publish.
- Will test admin flow: manage users → change roles → view audit logs → impersonate user.

**Security Testing:**
- Will validate JWT token verification rejects invalid tokens.
- Will test role-based access control prevents privilege escalation.
- Will verify file upload restrictions prevent malicious file types.
- Will test SQL injection prevention in database queries.

**Test Coverage:**
- Backend: Integration tests for all API routes and controllers.
- Frontend: Component tests for critical UI elements.
- E2E: Key user journeys through automated testing framework.

---

**End of Document**
