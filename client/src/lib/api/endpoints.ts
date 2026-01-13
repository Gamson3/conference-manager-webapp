/**
 * API Endpoints Configuration
 * Centralized location for all API endpoint URLs
 * 
 * NEW STRUCTURE (Phase 2 Migration):
 * - PUBLIC: /api/public/* - No auth required
 * - ACCOUNT: /api/account/* - Any authenticated user
 * - ORGANIZER: /api/organizer/* - Organizer/Admin only
 * - ADMIN: /api/admin/* - Admin only
 * 
 * LEGACY STRUCTURE (Will be removed in Phase 3):
 * - EVENTS, ATTENDEE, CONFERENCES, SECTIONS, etc.
 * 
 * @see docs/Route-Naming-Convention-Analysis.md
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

export const API_ENDPOINTS = {
  /* ============================================================
   * NEW ROUTE STRUCTURE (Phase 2 - Recommended)
   * ============================================================ */

  // PUBLIC - No authentication required
  PUBLIC: {
    // Conference listing and discovery
    CONFERENCES: `${API_BASE_URL}/api/public/conferences`,
    CONFERENCE: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}`,
    CONFERENCE_DETAILS: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/details`,
    DISCOVER: `${API_BASE_URL}/api/public/discover`,
    // Schedule and presentations
    SCHEDULE: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/schedule`,
    PRESENTATIONS: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/presentations`,
    SPEAKERS: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/speakers`,
    // Materials and participants
    MATERIALS: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/materials`,
    PARTICIPANTS: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/participants`,
    // Search
    SEARCH: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/search`,
    SEARCH_SUGGESTIONS: (id: string | number) => `${API_BASE_URL}/api/public/conferences/${id}/search/suggestions`,
  },

  // ACCOUNT - Any authenticated user (replaces ATTENDEE)
  ACCOUNT: {
    // Profile
    PROFILE: `${API_BASE_URL}/api/account/profile`,
    // Dashboard
    DASHBOARD: `${API_BASE_URL}/api/account/dashboard`,
    RECENT_CONFERENCES: `${API_BASE_URL}/api/account/recent-conferences`,
    // My Conferences (registrations)
    MY_CONFERENCES: `${API_BASE_URL}/api/account/my-conferences`,
    REGISTER_CONFERENCE: `${API_BASE_URL}/api/account/register-conference`,
    UNREGISTER_CONFERENCE: (conferenceId: number) => `${API_BASE_URL}/api/account/unregister-conference/${conferenceId}`,
    // My Submissions
    MY_SUBMISSIONS: `${API_BASE_URL}/api/account/my-submissions`,
    // Favorites
    FAVORITES: `${API_BASE_URL}/api/account/favorites`,
    FAVORITES_STATUS: `${API_BASE_URL}/api/account/favorites/status`,
    FAVORITES_PRESENTATIONS: `${API_BASE_URL}/api/account/favorites/presentations`,
    FAVORITE_PRESENTATION: (id: number) => `${API_BASE_URL}/api/account/favorites/presentations/${id}`,
    // Networking
    NETWORKING: `${API_BASE_URL}/api/account/networking`,
    // Submission Assistance (consent management for authors)
    ASSISTANCE_REQUESTS: `${API_BASE_URL}/api/account/assistance/requests`,
    ASSISTANCE_CONSENTS: `${API_BASE_URL}/api/account/assistance/consents`,
    ASSISTANCE_RESPOND: (requestId: number) => `${API_BASE_URL}/api/account/assistance/requests/${requestId}/respond`,
    ASSISTANCE_REVOKE: (consentId: number) => `${API_BASE_URL}/api/account/assistance/consents/${consentId}`,
  },

  // ORGANIZER - Organizer/Admin only (replaces EVENTS and per-conference management)
  ORGANIZER: {
    // Conference CRUD
    CONFERENCES: `${API_BASE_URL}/api/organizer/conferences`,
    CONFERENCE: (id: string | number) => `${API_BASE_URL}/api/organizer/conferences/${id}`,
    DASHBOARD_STATS: (id: string | number) => `${API_BASE_URL}/api/organizer/conferences/${id}/dashboard/stats`,
    CONFERENCE_DRAFTS: `${API_BASE_URL}/api/organizer/conferences/drafts`,
    CONFERENCE_DRAFT: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/draft`,
    CONFERENCE_STATUS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/status`,
    // Publishing
    PUBLISH_VALIDATION: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/publish-validation`,
    PUBLISH: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/publish`,
    UNPUBLISH: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/unpublish`,
    // Setup - Categories
    CATEGORIES: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/categories`,
    CATEGORY: (id: number, categoryId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/categories/${categoryId}`,
    // Setup - Types
    TYPES: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/types`,
    TYPE: (id: number, typeId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/types/${typeId}`,
    // Setup - Requirements
    REQUIREMENTS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/requirements`,
    // Setup - Milestones
    MILESTONES: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/milestones`,
    MILESTONE: (id: number, milestoneId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/milestones/${milestoneId}`,
    // Setup - Windows
    CFP_OPEN: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/windows/cfp/open`,
    CFP_CLOSE: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/windows/cfp/close`,
    REG_OPEN: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/windows/registration/open`,
    REG_CLOSE: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/windows/registration/close`,
    // Submissions
    SUBMISSIONS: (id: string | number) => `${API_BASE_URL}/api/organizer/conferences/${id}/submissions`,
    SUBMISSIONS_EXPORT: (id: string | number) => `${API_BASE_URL}/api/organizer/conferences/${id}/submissions/export`,
    SUBMISSION_REVIEW: (submissionId: number) => `${API_BASE_URL}/api/organizer/submissions/${submissionId}/review`,
    SUBMISSION_START_REVIEW: (submissionId: number) => `${API_BASE_URL}/api/organizer/submissions/${submissionId}/start-review`,
    SUBMISSION_DECISION: (submissionId: number) => `${API_BASE_URL}/api/organizer/submissions/${submissionId}/decision`,
    SUBMISSION_REQUEST_REVISION: (submissionId: number) => `${API_BASE_URL}/api/organizer/submissions/${submissionId}/request-revision`,
    // Registration
    REGISTRATION_SETTINGS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/registration/settings`,
    REGISTRATION_OVERVIEW: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/registration/overview`,
    REGISTRATION_QUESTIONS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/registration/questions`,
    REGISTRATION_QUESTION: (id: number, questionId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/registration/questions/${questionId}`,
    REGISTRATION_QUESTIONS_REORDER: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/registration/questions/reorder`,
    // Program - Stats
    PROGRAM_STATS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/program/stats`,
    // Program - Days
    DAYS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/days`,
    DAY: (id: number, dayId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/days/${dayId}`,
    DAYS_REORDER: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/days/reorder`,
    // Program - Sessions (Note: using "sessions" in routes, "Section" in Prisma)
    SESSIONS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/sessions`,
    SESSION: (sessionId: number) => `${API_BASE_URL}/api/organizer/sessions/${sessionId}`,
    SESSION_CREATE: `${API_BASE_URL}/api/organizer/sessions`,
    SESSION_SUMMARY: (sessionId: number) => `${API_BASE_URL}/api/organizer/sessions/${sessionId}/summary`,
    SESSION_STATUS: (sessionId: number) => `${API_BASE_URL}/api/organizer/sessions/${sessionId}/status`,
    SESSION_ATTENDANCE: (sessionId: number) => `${API_BASE_URL}/api/organizer/sessions/${sessionId}/attendance`,
    SESSION_REORDER_PRESENTATIONS: (sessionId: number) => `${API_BASE_URL}/api/organizer/sessions/${sessionId}/presentations/reorder`,
    // Program - Presentations
    PRESENTATIONS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/presentations`,
    ACCEPTED_PRESENTATIONS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/accepted-presentations`,
    SPEAKERS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/speakers`,
    SESSION_PRESENTATIONS: (sessionId: number) => `${API_BASE_URL}/api/organizer/sessions/${sessionId}/presentations`,
    PRESENTATION: (id: number) => `${API_BASE_URL}/api/organizer/presentations/${id}`,
    PRESENTATION_CREATE: `${API_BASE_URL}/api/organizer/presentations`,
    PRESENTATION_AUTHORS: (id: number) => `${API_BASE_URL}/api/organizer/presentations/${id}/authors`,
    PRESENTATION_ASSIGN_SESSION: (id: number) => `${API_BASE_URL}/api/organizer/presentations/${id}/assign-session`,
    // Program - Schedule
    SCHEDULE: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/schedule`,
    SCHEDULE_VALIDATE: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/schedule/validate`,
    SCHEDULE_PUBLISH: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/schedule/publish`,
    SCHEDULE_UNPUBLISH: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/schedule/unpublish`,
    // Website
    MATERIALS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/materials`,
    MATERIAL: (id: number, materialId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/materials/${materialId}`,
    VISIBILITY: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/visibility`,
    PUBLIC_PAGE: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/public-page`,
    CFP: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/website/cfp`,
    // People - Participants
    PARTICIPANTS: (id: string | number) => `${API_BASE_URL}/api/organizer/conferences/${id}/participants`,
    PARTICIPANT_STATS: (id: string | number) => `${API_BASE_URL}/api/organizer/conferences/${id}/participants/stats`,
    PARTICIPANT: (id: string | number, participantId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/participants/${participantId}`,
    PARTICIPANT_APPROVE: (id: string | number, participantId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/participants/${participantId}/approve`,
    PARTICIPANTS_EXPORT: (id: string | number) => `${API_BASE_URL}/api/organizer/conferences/${id}/participants/export`,
    // People - Attendees & Feedback
    ATTENDEES: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/attendees`,
    FEEDBACK: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/feedback`,
    // Submission Assistance (consent management for organizers)
    ASSISTANCE_CHECK_CONSENT: (id: number, authorId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/assistance/consent/${authorId}`,
    ASSISTANCE_REQUEST_CONSENT: (id: number, authorId: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/assistance/request/${authorId}`,
    ASSISTANCE_AUTHORS: (id: number) => `${API_BASE_URL}/api/organizer/conferences/${id}/assistance/authors`,
  },

  // ADMIN - Admin only
  ADMIN: {
    DASHBOARD: `${API_BASE_URL}/api/admin/dashboard`,
    HEALTH: `${API_BASE_URL}/api/admin/health`,
    // Users
    USERS: `${API_BASE_URL}/api/admin/users`,
    USER: (id: number) => `${API_BASE_URL}/api/admin/users/${id}`,
    USER_BY_COGNITO: (cognitoId: string) => `${API_BASE_URL}/api/admin/users/${cognitoId}`,
    USER_ROLE: `${API_BASE_URL}/api/admin/users/role`,
    // Conferences
    CONFERENCES: `${API_BASE_URL}/api/admin/conferences`,
    CONFERENCE: (id: number) => `${API_BASE_URL}/api/admin/conferences/${id}`,
    CONFERENCE_PUBLISH: (id: number) => `${API_BASE_URL}/api/admin/conferences/${id}/publish`,
    CONFERENCE_UNPUBLISH: (id: number) => `${API_BASE_URL}/api/admin/conferences/${id}/unpublish`,
  },

  /* ============================================================
   * LEGACY ROUTES (DEPRECATED - Will be removed in Phase 3)
   * These are kept for backward compatibility during migration
   * ============================================================ */

  // Authentication
  AUTH: {
    REFRESH_TOKEN: `${API_BASE_URL}/auth/refresh-token`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },

  // User Management
  USERS: {
    BASE: `${API_BASE_URL}/users`,
    BY_ID: (id: number) => `${API_BASE_URL}/users/${id}`,
    PROFILE: `${API_BASE_URL}/users/profile`,
    ME: `${API_BASE_URL}/users/me`,
    UPGRADE_ORGANIZER: `${API_BASE_URL}/users/upgrade-organizer`,
  },

  // DEPRECATED: Events (Organizer Routes) → Use ORGANIZER
  EVENTS: {
    BASE: `${API_BASE_URL}/events`,
    BY_ID: (id: number) => `${API_BASE_URL}/events/${id}`,
    DRAFTS: `${API_BASE_URL}/events/drafts`,
    UPDATE_DRAFT: (id: number) => `${API_BASE_URL}/events/${id}/draft`,
    STATUS: (id: number) => `${API_BASE_URL}/events/${id}/status`,
    MATERIALS: (id: number) => `${API_BASE_URL}/events/${id}/materials`,
    ATTENDEES: (id: number) => `${API_BASE_URL}/events/${id}/attendees`,
    FEEDBACK: (id: number) => `${API_BASE_URL}/events/${id}/feedback`,
    ABSTRACTS: (id: number) => `${API_BASE_URL}/events/${id}/abstracts`,
    PUBLISH_VALIDATION: (id: number) => `${API_BASE_URL}/events/${id}/publish-validation`,
    PUBLISH: (id: number) => `${API_BASE_URL}/events/${id}/publish`,
    UNPUBLISH: (id: number) => `${API_BASE_URL}/events/${id}/unpublish`,
  },

  // DEPRECATED: Conferences (Public Routes) → Use PUBLIC
  CONFERENCES: {
    BASE: `${API_BASE_URL}/conferences`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/conferences/${id}`,
    MINE: `${API_BASE_URL}/conferences?mine=1`,
    MATERIALS: (id: string | number) => `${API_BASE_URL}/conferences/${id}/materials`,
    PARTICIPANTS: (id: string | number) => `${API_BASE_URL}/conferences/${id}/participants`,
    SEARCH: (id: string | number) => `${API_BASE_URL}/conferences/${id}/search`,
    SEARCH_SUGGESTIONS: (id: string | number) => `${API_BASE_URL}/conferences/${id}/search/suggestions`,
    PRIVATE_BY_ID: (id: string | number) => `${API_BASE_URL}/conferences/private/${id}`,
  },

  // DEPRECATED: Organizer Setup → Use ORGANIZER
  SETUP: {
    CATEGORIES: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/categories`,
    CATEGORY: (conferenceId: number, categoryId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/categories/${categoryId}`,
    TYPES: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/types`,
    TYPE: (conferenceId: number, typeId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/types/${typeId}`,
    REQUIREMENTS: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/requirements`,
    MILESTONES: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/milestones`,
    MILESTONE: (conferenceId: number, milestoneId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/milestones/${milestoneId}`,
    CFP_OPEN: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/windows/cfp/open`,
    CFP_CLOSE: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/windows/cfp/close`,
    REG_OPEN: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/windows/registration/open`,
    REG_CLOSE: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/windows/registration/close`,
    SCHEDULE_PUBLISH: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/schedule/publish`,
    SCHEDULE_UNPUBLISH: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/schedule/unpublish`,
  },

  // DEPRECATED: Sections → Use ORGANIZER.SESSIONS
  SECTIONS: {
    BASE: `${API_BASE_URL}/sections`,
    BY_ID: (id: number) => `${API_BASE_URL}/sections/${id}`,
    BY_CONFERENCE: (conferenceId: number) => `${API_BASE_URL}/sections/conference/${conferenceId}`,
  },

  // Sessions (for compatibility with code using SESSIONS.LIST)
  SESSIONS: {
    LIST: (conferenceId: number) => `${API_BASE_URL}/sections/conference/${conferenceId}`,
    BY_ID: (id: number) => `${API_BASE_URL}/sections/${id}`,
  },

  // DEPRECATED: Presentations → Use ORGANIZER
  PRESENTATIONS: {
    BASE: `${API_BASE_URL}/api/presentations`,
    BY_ID: (id: number) => `${API_BASE_URL}/api/presentations/${id}`,
    BY_SECTION: (sectionId: number) => `${API_BASE_URL}/api/presentations/section/${sectionId}`,
  },

  // Schedule (keeping for now as it has mixed concerns)
  SCHEDULE: {
    BY_CONFERENCE: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/schedule`,
    DAYS: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/days`,
    SAVE: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/schedule`,
    VALIDATE: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/schedule/validate`,
    PUBLISH: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/schedule/publish`,
    UNPUBLISH: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/schedule/unpublish`,
  },

  // Days (for compatibility with code using DAYS.LIST)
  DAYS: {
    LIST: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/days`,
    BY_ID: (conferenceId: number, dayId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/days/${dayId}`,
  },

  // DEPRECATED: Program → Use ORGANIZER
  PROGRAM: {
    STATS: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/program/stats`,
    DAYS: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/days`,
    DAY: (conferenceId: number, dayId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/days/${dayId}`,
    DAYS_REORDER: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/days/reorder`,
    SESSIONS: (conferenceId: number) => `${API_BASE_URL}/sections/conference/${conferenceId}`,
    SESSION: (sessionId: number) => `${API_BASE_URL}/sections/${sessionId}`,
    SESSION_CREATE: `${API_BASE_URL}/sections`,
    SESSION_SUMMARY: (sessionId: number) => `${API_BASE_URL}/sections/${sessionId}/summary`,
    SESSION_REORDER_PRESENTATIONS: (sessionId: number) => `${API_BASE_URL}/sections/${sessionId}/presentations/reorder`,
    PRESENTATIONS: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/presentations`,
    ACCEPTED_SUBMISSIONS: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/accepted-presentations`,
    SPEAKERS: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/speakers`,
  },

  // Submissions (keeping for now as it's used by both users and organizers)
  SUBMISSIONS: {
    LIST: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/submissions`,
    CREATE: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/submissions`,
    DETAIL: (submissionId: number) => `${API_BASE_URL}/api/submissions/${submissionId}`,
    UPDATE: (submissionId: number) => `${API_BASE_URL}/api/submissions/${submissionId}`,
    SUBMIT: (submissionId: number) => `${API_BASE_URL}/api/submissions/${submissionId}/submit`,
    WITHDRAW: (submissionId: number) => `${API_BASE_URL}/api/submissions/${submissionId}/withdraw`,
    REVIEW: (submissionId: number) => `${API_BASE_URL}/api/submissions/${submissionId}/review`,
    DECIDE: (submissionId: number) => `${API_BASE_URL}/api/submissions/${submissionId}/decision`,
    EXPORT: (conferenceId: string | number) => `${API_BASE_URL}/api/conferences/${conferenceId}/submissions/export`,
    // File access (private files with signed URLs)
    FILE: (submissionId: number, type: 'abstract' | 'fulltext') => 
      `${API_BASE_URL}/api/submissions/${submissionId}/file?type=${type}`,
    FILE_DOWNLOAD: (submissionId: number, type: 'abstract' | 'fulltext') => 
      `${API_BASE_URL}/api/submissions/${submissionId}/file?type=${type}&download=true`,
  },

  // DEPRECATED: Favorites → Use ACCOUNT.FAVORITES
  FAVORITES: {
    BASE: `${API_BASE_URL}/favorites`,
    CONFERENCES: `${API_BASE_URL}/favorites/conferences`,
    PRESENTATIONS: `${API_BASE_URL}/favorites/presentations`,
    TOGGLE_CONFERENCE: (conferenceId: number) => `${API_BASE_URL}/favorites/conferences/${conferenceId}`,
    TOGGLE_PRESENTATION: (presentationId: number) => `${API_BASE_URL}/favorites/presentations/${presentationId}`,
  },

  // Search
  SEARCH: {
    GLOBAL: `${API_BASE_URL}/search`,
    CONFERENCES: `${API_BASE_URL}/search/conferences`,
    PRESENTATIONS: `${API_BASE_URL}/search/presentations`,
  },

  // DEPRECATED: Attendee (User Dashboard) → Use ACCOUNT
  ATTENDEE: {
    PROFILE: `${API_BASE_URL}/api/attendee/profile`,
    DASHBOARD_STATS: `${API_BASE_URL}/api/attendee/dashboard-stats`,
    RECENT_CONFERENCES: `${API_BASE_URL}/api/attendee/recent-conferences`,
    REGISTERED_CONFERENCES: `${API_BASE_URL}/api/attendee/registered-conferences`,
    REGISTER_CONFERENCE: `${API_BASE_URL}/api/attendee/register-conference`,
    UNREGISTER_CONFERENCE: (conferenceId: number) => `${API_BASE_URL}/api/attendee/unregister-conference/${conferenceId}`,
    MY_SUBMISSIONS: `${API_BASE_URL}/api/attendee/my-submissions`,
    FAVORITES: `${API_BASE_URL}/api/attendee/favorites`,
    FAVORITES_STATUS: `${API_BASE_URL}/api/attendee/favorites/status`,
    DISCOVER: `${API_BASE_URL}/api/attendee/discover`,
    CONFERENCE_DETAILS: (conferenceId: number) => `${API_BASE_URL}/api/attendee/conferences/${conferenceId}/details`,
    NETWORKING: `${API_BASE_URL}/api/attendee/networking`,
  },

  // DEPRECATED: Website Module → Use ORGANIZER
  WEBSITE: {
    MATERIALS: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/materials`,
    MATERIAL: (conferenceId: number, materialId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/materials/${materialId}`,
    VISIBILITY: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/visibility`,
    PUBLIC_PAGE: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/public-page`,
  },

  // DEPRECATED: Registration Module → Use ORGANIZER
  REGISTRATION: {
    SETTINGS: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/registration/settings`,
    OVERVIEW: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/registration/overview`,
    QUESTIONS: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/registration/questions`,
    QUESTIONS_ACTIVE: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/registration/questions/active`,
    QUESTION: (conferenceId: number, questionId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/registration/questions/${questionId}`,
    QUESTIONS_REORDER: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/registration/questions/reorder`,
    REGISTER_ENHANCED: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/register/enhanced`,
    PARTICIPANT: (conferenceId: number, participantId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/participants/${participantId}`,
    PARTICIPANT_STATUS: (conferenceId: number, participantId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/participants/${participantId}`,
    PARTICIPANT_APPROVE: (conferenceId: number, participantId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/participants/${participantId}/approve`,
    EXPORT: (conferenceId: number) => `${API_BASE_URL}/api/conferences/${conferenceId}/participants/export`,
  },
} as const;

export default API_ENDPOINTS;
