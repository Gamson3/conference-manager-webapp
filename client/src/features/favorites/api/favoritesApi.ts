// Favorites API functions for interacting with the backend

import { API_ENDPOINTS } from '@/lib/api/endpoints';
import apiClient from '@/lib/api/client';
import { isAxiosError } from 'axios';
import type { FavoritePresentation, ToggleFavoriteResponse } from '../types';

/**
 * Fetch all favorited presentations for the current user
 */
export async function fetchFavorites(): Promise<FavoritePresentation[]> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ACCOUNT.FAVORITES_PRESENTATIONS);
    const data = response.data;
    return data.favorites || data || [];
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      // User not authenticated - return empty array
      return [];
    }
    throw new Error('Failed to load favorites. Please try again.');
  }
}

/**
 * Toggle favorite status for a presentation
 * Uses optimistic update pattern - returns immediately with expected state
 */
export async function toggleFavorite(
  presentationId: string
): Promise<ToggleFavoriteResponse> {
  try {
    // Use PATCH endpoint which handles toggle logic on backend
    const response = await apiClient.patch(
      API_ENDPOINTS.ACCOUNT.FAVORITE_PRESENTATION(Number(presentationId))
    );
    
    return {
      success: true,
      isFavorite: response.data.isFavorite,
      message: response.data.message || 'Favorite status updated',
    };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      throw new Error('Please sign in to favorite presentations.');
    }
    throw new Error('Failed to update favorite. Please try again.');
  }
}

/**
 * Check if a specific presentation is favorited
 */
export async function checkFavoriteStatus(
  presentationId: string
): Promise<boolean> {
  try {
    const favorites = await fetchFavorites();
    return favorites.some((fav) => fav.id === presentationId);
  } catch {
    return false;
  }
}

/**
 * Fetch favorited conferences for the current user
 */
export async function fetchFavoriteConferences(): Promise<
  Array<{ id: string; name: string; slug?: string }>
> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ACCOUNT.FAVORITES);
    const data = response.data;
    return data.favorites || data || [];
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return [];
    }
    throw new Error('Failed to load favorite conferences. Please try again.');
  }
}

/**
 * Toggle favorite status for a conference
 */
export async function toggleConferenceFavorite(
  _conferenceId: string
): Promise<ToggleFavoriteResponse> {
  try {
    // Note: Conference favorites might not be implemented yet
    // This is a placeholder that will need proper endpoint
    throw new Error('Conference favorites not yet implemented');
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      throw new Error('You must be logged in to favorite conferences');
    }
    throw error instanceof Error ? error : new Error('Unknown error');
  }
}
