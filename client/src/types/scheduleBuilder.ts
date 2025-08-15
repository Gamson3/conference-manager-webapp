import { Author } from './presentation';

// Schedule-specific presentation type
export interface Presentation {
  id: number;
  title: string;
  abstract: string;
  duration: number;
  scheduledTime?: string;
  finalDuration?: number;
  authors: Array<{
    id: number;
    authorName: string;
    authorEmail: string;
    affiliation: string;
    isPresenter: boolean;
  }>;
  category: {
    id: number;
    name: string;
    color: string;
  };
  presentationType?: {
    id: number;
    name: string;
    defaultDuration: number;
  };
}

export interface BreakSlot {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: "COFFEE_BREAK" | "LUNCH_BREAK" | "NETWORKING_BREAK" | "REST_BREAK";
  sectionId: number;
}

export interface Section {
  id: number;
  name: string;
  room?: string;
  capacity?: number;
  type: string;
  startTime?: string;
  endTime?: string;
  presentations: Presentation[];
  breaks: BreakSlot[];
}

export interface Day {
  id: number;
  name: string;
  date: string;
  order: number;
  sections: Section[];
}

export interface CategoryWithPresentations {
  category: {
    id: number;
    name: string;
    color: string;
  };
  presentations: Presentation[];
}

export interface ScheduleData {
  conference: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  days: Day[];
  statistics: {
    totalPresentations: number;
    scheduledPresentations: number;
    unscheduledPresentations: number;
    schedulingProgress: number;
  };
}