// useFavorites hook - manages favorites state with optimistic updates
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchFavorites, toggleFavorite as toggleFavoriteApi } from '../api/favoritesApi';
import type { FavoritesState, FavoritesGroupedByConference, FavoritesGroupedByDay } from '../types';

interface UseFavoritesOptions {
  /**
   * Whether to fetch favorites on mount
   * @default true
   */
  autoFetch?: boolean;
  /**
   * Callback when a favorite is toggled
   */
  onToggle?: (presentationId: string, isFavorite: boolean) => void;
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export function useFavorites(options: UseFavoritesOptions = {}) {
  const { autoFetch = true, onToggle, onError } = options;

  const [state, setState] = useState<FavoritesState>({
    items: [],
    isLoading: false,
    error: null,
    pendingIds: new Set(),
  });

  // Memoized set of favorite IDs for O(1) lookups
  const favoriteIds = useMemo(
    () => new Set(state.items.map((item) => item.id)),
    [state.items]
  );

  // Check if a presentation is favorited
  const isFavorite = useCallback(
    (presentationId: string): boolean => {
      return favoriteIds.has(presentationId);
    },
    [favoriteIds]
  );

  // Check if a toggle is pending
  const isPending = useCallback(
    (presentationId: string): boolean => {
      return state.pendingIds.has(presentationId);
    },
    [state.pendingIds]
  );

  // Fetch favorites from API
  const refreshFavorites = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const favorites = await fetchFavorites();
      setState((prev) => ({
        ...prev,
        items: favorites,
        isLoading: false,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch favorites');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
      }));
      onError?.(err);
    }
  }, [onError]);

  // Toggle favorite with optimistic update
  const toggleFavorite = useCallback(
    async (presentationId: string) => {
      // Add to pending
      setState((prev) => ({
        ...prev,
        pendingIds: new Set([...prev.pendingIds, presentationId]),
      }));

      const wasCurrentlyFavorite = favoriteIds.has(presentationId);

      // Optimistic update
      setState((prev) => {
        if (wasCurrentlyFavorite) {
          // Remove from favorites
          return {
            ...prev,
            items: prev.items.filter((item) => item.id !== presentationId),
          };
        } else {
          // We don't have full data to add, so we'll refresh after API call
          return prev;
        }
      });

      try {
        const result = await toggleFavoriteApi(presentationId);
        
        // Remove from pending
        setState((prev) => {
          const newPendingIds = new Set(prev.pendingIds);
          newPendingIds.delete(presentationId);
          return { ...prev, pendingIds: newPendingIds };
        });

        // Notify callback
        onToggle?.(presentationId, result.isFavorite);

        // If we added a favorite, refresh to get full data
        if (result.isFavorite) {
          await refreshFavorites();
        }
      } catch (error) {
        // Revert optimistic update on error
        if (wasCurrentlyFavorite) {
          await refreshFavorites();
        }

        // Remove from pending
        setState((prev) => {
          const newPendingIds = new Set(prev.pendingIds);
          newPendingIds.delete(presentationId);
          return { ...prev, pendingIds: newPendingIds };
        });

        const err = error instanceof Error ? error : new Error('Failed to toggle favorite');
        setState((prev) => ({ ...prev, error: err.message }));
        onError?.(err);
      }
    },
    [favoriteIds, onToggle, onError, refreshFavorites]
  );

  // Group favorites by conference
  const groupedByConference = useMemo((): FavoritesGroupedByConference[] => {
    const groups = new Map<string, FavoritesGroupedByConference>();

    state.items.forEach((item) => {
      // Guard: Skip items with missing conference data
      if (!item.conference || !item.conference.id) {
        return;
      }
      
      const conferenceId = item.conference.id;
      if (!groups.has(conferenceId)) {
        groups.set(conferenceId, {
          conferenceId,
          conferenceName: item.conference.name,
          conferenceSlug: item.conference.slug,
          presentations: [],
        });
      }
      groups.get(conferenceId)!.presentations.push(item);
    });

    // Sort groups by conference name
    return Array.from(groups.values()).sort((a, b) =>
      a.conferenceName.localeCompare(b.conferenceName)
    );
  }, [state.items]);

  // Group favorites by day (for current conference view)
  const groupedByDay = useMemo((): FavoritesGroupedByDay[] => {
    const groups = new Map<string, FavoritesGroupedByDay>();

    state.items.forEach((item) => {
      // Guard: Skip items with missing day data
      if (!item.day || !item.day.date) {
        return;
      }
      
      const date = item.day.date;
      if (!groups.has(date)) {
        groups.set(date, {
          date,
          label: item.day.label,
          presentations: [],
        });
      }
      groups.get(date)!.presentations.push(item);
    });

    // Sort groups by date
    return Array.from(groups.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [state.items]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      refreshFavorites();
    }
  }, [autoFetch, refreshFavorites]);

  return {
    // State
    favorites: state.items,
    favoriteIds,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    isFavorite,
    isPending,
    toggleFavorite,
    refreshFavorites,

    // Grouped data
    groupedByConference,
    groupedByDay,
  };
}

export type UseFavoritesReturn = ReturnType<typeof useFavorites>;
