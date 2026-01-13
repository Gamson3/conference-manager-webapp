export interface Author {
  id: number;
  name: string;
  email?: string;
  affiliation?: string;
  isPresenter: boolean;
  isExternal: boolean;
  order: number;
}

export interface Presentation {
  id: number;
  title: string;
  abstract?: string;
  keywords: string[];
  affiliations: string[];
  duration?: number;
  order: number;
  status: string;
  submissionType: string;
  authors: Author[];
  isFavorite: boolean;
  favoriteCount: number;
  section: {
    id: number;
    name: string;
    type: string;
    startTime?: string;
    endTime?: string;
    room?: string;
    day?: {
      id: number;
      name: string;
      date: string;
    };
  };
  navigationPath?: {
    dayId: number;
    dayName: string;
    sectionId: number;
    sectionName: string;
  };
  matchedFields?: string[];
}

export interface Section {
  id: number;
  name: string;
  type: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  capacity?: number;
  description?: string;
  order: number;
  presentationCount: number;
  attendeeCount: number;
  presentations: Presentation[];
}

export interface Day {
  id: number;
  name: string;
  date: string;
  order: number;
  sections: Section[];
}