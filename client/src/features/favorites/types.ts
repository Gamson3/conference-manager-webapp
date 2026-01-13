// Favorite types for attendee/base user favorites functionality

export interface FavoritePresentation {
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
    startTime: string;
    endTime: string;
    room?: string;
  };
  day: {
    id: string;
    date: string;
    label?: string;
  };
  conference: {
    id: string;
    name: string;
    slug?: string;
  };
  favoritedAt: string;
}

export interface FavoritesState {
  items: FavoritePresentation[];
  isLoading: boolean;
  error: string | null;
  pendingIds: Set<string>; // IDs currently being toggled (for optimistic updates)
}

export interface FavoritesContextValue {
  favorites: FavoritePresentation[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  isFavorite: (presentationId: string) => boolean;
  isPending: (presentationId: string) => boolean;
  toggleFavorite: (presentationId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

export interface ToggleFavoriteResponse {
  success: boolean;
  isFavorite: boolean;
  message?: string;
}

export interface FavoritesGroupedByConference {
  conferenceId: string;
  conferenceName: string;
  conferenceSlug?: string;
  presentations: FavoritePresentation[];
}

export interface FavoritesGroupedByDay {
  date: string;
  label?: string;
  presentations: FavoritePresentation[];
}
