import { Conference, User, Category } from './prismaTypes';

// Query parameters for conference list
export interface ConferenceQueryParams {
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Response from conference list API
export interface ConferenceListResponse {
  conferences: ConferenceSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}

// Simplified conference data for listings
export interface ConferenceSummary extends Omit<Conference, 'createdBy'> {
  createdBy: Pick<User, 'id' | 'name' | 'email' | 'organization'>;
  categories: Category[];
  _count: {
    sections: number;
    presentations: number;
    attendances: number;
  };
  userInteractions?: {
    isFavorited?: boolean;
    isRegistered?: boolean;
  };
}

// Featured conferences response
export interface FeaturedConferences {
  popular: ConferenceSummary[];
  upcoming: ConferenceSummary[];
}

// Category items for filtering
export interface CategoryItem {
  name: string;
  color: string;
}

// Full conference details with hierarchical structure
export interface ConferenceDetail extends ConferenceSummary {
  days: DayWithSections[];
  materials: ConferenceMaterial[];
  userInteractions?: {
    isFavorited: boolean;
    isRegistered: boolean;
    registrationStatus?: string;
  };
}

export interface DayWithSections {
  id: number;
  date: string;
  name: string;
  order: number;
  sections: SectionWithTimeslots[];
}

export interface SectionWithTimeslots {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  category: Category | null;
  type: string;
  timeSlots: TimeSlotWithPresentation[];
}

export interface TimeSlotWithPresentation {
  id: number;
  startTime: string;
  endTime: string;
  slotType: string;
  title: string | null;
  isFixed: boolean;
  breakType: string | null;
  description: string | null;
  presentation: PresentationWithDetails | null;
}

export interface PresentationWithDetails {
  id: number;
  title: string;
  abstract: string | null;
  authors: PresentationAuthor[];
  category: Category | null;
  presentationType: {
    id: number;
    name: string;
  } | null;
  userInteractions?: {
    isFavorited?: boolean;
  };
}

export interface PresentationAuthor {
  id: number;
  authorName: string;
  authorEmail: string | null;
  affiliation: string | null;
  isPresenter: boolean;
  order: number;
  internalUser: {
    id: number;
    name: string;
    organization: string | null;
  } | null;
}

export interface ConferenceMaterial {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}