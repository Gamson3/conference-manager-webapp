import { Presentation, Day, Section } from './presentation';

export interface ScheduleViewProps {
  conferenceId: number;
  className?: string;
  viewMode?: 'list' | 'grid' | 'timeline';
  showFavoritesOnly?: boolean;
  onPresentationSelect?: (presentation: Presentation) => void;
  groupBy?: 'day' | 'section' | 'type' | 'none';
}

export interface ScheduleData {
  conference: {
    id: number;
    name: string;
    status: string;
  };
  days: Day[];
  presentations?: Presentation[];
}

export interface GroupedPresentations {
  [key: string]: Presentation[];
}

export interface ConferenceSchedule {
  conference: {
    id: number;
    name: string;
    status: string;
  };
  days: Day[];
}

export type ViewMode = 'list' | 'grid' | 'timeline';
export type GroupBy = 'day' | 'section' | 'type' | 'none';
export type FilterBy = 'all' | 'favorites' | 'keynote' | 'presentation' | 'workshop' | 'panel';
export type SortBy = 'time' | 'title' | 'popularity';

// Re-export from presentation.ts for convenience
export type { Presentation, Day, Section } from './presentation';