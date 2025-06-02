export interface SearchSuggestion {
  type: 'author' | 'keyword' | 'section' | 'title' | 'affiliation';
  value: string;
}

export interface SearchResult {
  id: number;
  title: string;
  abstract?: string;
  keywords: string[];
  affiliations: string[];
  duration?: number;
  order: number;
  status: string;
  authors: Array<{
    id: number;
    name: string;
    email?: string;
    affiliation?: string;
    isPresenter: boolean;
    isExternal: boolean;
  }>;
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
  isFavorite: boolean;
  favoriteCount: number;
  matchedFields: string[];
}

export interface ConferenceResult {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  navigationUrl: string;
}

export interface SearchResponse {
  query: string;
  type: string;
  totalResults?: {
    presentations: number;
    conferences: number;
  };
  resultsCount?: number;
  results?: SearchResult[];
  presentations?: SearchResult[];
  conferences?: ConferenceResult[];
}