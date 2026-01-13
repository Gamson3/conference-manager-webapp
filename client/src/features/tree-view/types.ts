/**
 * Tree View Types
 * Shared types for conference tree view components
 * 
 * NOTE: File-related fields are intentionally excluded from public tree view.
 * Files are only accessible to authors (own submissions) and organizers.
 */

export interface TreePresentation {
  id: number;
  title: string;
  abstract?: string;
  keywords: string[];
  order: number;
  duration?: number;
  status: string;
  authors: TreeAuthor[];
  isFavorite?: boolean;
}

export interface TreeAuthor {
  id: number;
  authorName: string;
  authorEmail?: string;
  affiliation?: string;
  isPresenter: boolean;
}

export interface TreeSession {
  id: number;
  name: string;
  type: 'presentation' | 'break' | 'keynote' | 'workshop' | 'panel' | 'networking';
  room?: string;
  startTime?: string;
  endTime?: string;
  chairs?: string[];
  presentations: TreePresentation[];
}

export interface TreeDay {
  id: number;
  date: string;
  name: string;
  order: number;
  sessions: TreeSession[];
}

export interface TreeViewState {
  expandedDays: Set<number>;
  expandedSessions: Set<number>;
  highlightedPresentationId: number | null;
  selectedPresentationId: number | null;
}

export interface TreeScheduleData {
  conferenceId: number;
  conferenceName: string;
  days: TreeDay[];
}
