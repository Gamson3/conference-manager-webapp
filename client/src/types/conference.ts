/**
 * Conference Types
 */

export type ConferenceStatus = 'draft' | 'published' | 'canceled' | 'completed';

export interface Conference {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  status: ConferenceStatus;
  topics: string[];
  createdById: number;
  createdAt: string;
  updatedAt: string;
  
  // Additional fields
  capacity?: number;
  registrationDeadline?: string;
  isPublic: boolean;
  timezone?: string;
  websiteUrl?: string;
  venue?: string;
  venueAddress?: string;
  organizerNotes?: string;
  bannerImageUrl?: string;

  // CFP and Registration windows
  submissionsOpenFrom?: string;
  submissionsOpenUntil?: string;
  submissionsVisibility?: 'public' | 'invite_only' | 'private';
  submissionInviteCode?: string;
  registrationOpenFrom?: string;
  registrationOpenUntil?: string;
  
  // Review window
  reviewStartsAt?: string;
  reviewEndsAt?: string;
  
  // Organizer profile fields
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  organizerWebsite?: string;
  organizerLogoUrl?: string;
  
  // Schedule publishing
  schedulePublishedAt?: string;
  
  // Relations (optional, loaded on demand)
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
  days?: Day[];
  sections?: Section[];
  _count?: {
    attendances?: number;
    days?: number;
    sections?: number;
  };
}

export interface Day {
  id: number;
  conferenceId: number;
  date: string;
  name: string;
  order: number;
  sections?: Section[];
}

export type SectionType = 'presentation' | 'break' | 'keynote' | 'workshop' | 'panel' | 'networking';

export interface Section {
  id: number;
  name: string;
  startTime?: string;
  endTime?: string;
  conferenceId: number;
  dayId?: number;
  order: number;
  room?: string;
  capacity?: number;
  description?: string;
  type: SectionType;
  presentations?: Presentation[];
}

export interface Presentation {
  id: number;
  title: string;
  abstract?: string;
  affiliations: string[];
  keywords: string[];
  duration?: number;
  order: number;
  status: 'draft' | 'submitted' | 'scheduled' | 'locked';
  submissionType: 'internal' | 'external';
  sectionId: number;
  createdAt: string;
  lockedById?: number;
  authors?: PresentationAuthor[];
}

export interface PresentationAuthor {
  id: number;
  presentationId: number;
  authorName: string;
  authorEmail?: string;
  affiliation?: string;
  isPresenter: boolean;
  isExternal: boolean;
  order: number;
  title?: string;
  bio?: string;
  profileUrl?: string;
  orcidId?: string;
  department?: string;
  country?: string;
  userId?: number;
}

export interface ConferenceFormData {
  name: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  location?: string;
  topics: string[];
  capacity?: number;
  registrationDeadline?: Date | string;
  isPublic: boolean;
  timezone?: string;
  websiteUrl?: string;
  venue?: string;
  venueAddress?: string;
}
