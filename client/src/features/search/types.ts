// Search types for conference search functionality

export type SearchField = 'all' | 'title' | 'author' | 'keyword' | 'abstract' | 'session';

export interface SearchFiltersState {
  query: string;
  field: SearchField;
  dayIds: string[];
  sessionTypes: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  abstract?: string;
  keywords: string[];
  authors: Array<{
    id: string;
    name: string;
    affiliation?: string;
  }>;
  session: {
    id: string;
    title: string;
    type: string;
    startTime: string;
    endTime: string;
    room?: string;
  };
  day: {
    id: string;
    date: string;
    label?: string;
  };
  // Match highlights for display
  highlights?: {
    title?: string;
    abstract?: string;
    authors?: string[];
    keywords?: string[];
  };
  // Relevance score (optional, from backend)
  score?: number;
}

export interface SearchState {
  results: SearchResult[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export interface SearchSuggestion {
  type: 'author' | 'keyword' | 'session' | 'title';
  value: string;
  count?: number;
}

export interface SearchApiParams {
  conferenceId: string;
  query: string;
  field?: SearchField;
  dayIds?: string[];
  sessionTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchApiResponse {
  results: SearchResult[];
  total: number;
  query: string;
  filters: {
    field: SearchField;
    dayIds: string[];
    sessionTypes: string[];
  };
}
