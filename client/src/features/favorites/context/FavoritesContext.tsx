// FavoritesContext - Provider for app-wide favorites state
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFavorites, UseFavoritesReturn } from '../hooks/useFavorites';

const FavoritesContext = createContext<UseFavoritesReturn | null>(null);

interface FavoritesProviderProps {
  children: ReactNode;
}

/**
 * Provider component for app-wide favorites state.
 * Wrap your app or a section of it to share favorites state across components.
 */
export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const favoritesState = useFavorites({ autoFetch: true });

  return (
    <FavoritesContext.Provider value={favoritesState}>
      {children}
    </FavoritesContext.Provider>
  );
}

/**
 * Hook to access the shared favorites context.
 * Must be used within a FavoritesProvider.
 */
export function useFavoritesContext(): UseFavoritesReturn {
  const context = useContext(FavoritesContext);
  
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  
  return context;
}

/**
 * Hook that tries to use context first, falls back to local state.
 * Useful for components that might be used inside or outside a provider.
 */
export function useFavoritesOptionalContext(): UseFavoritesReturn {
  const context = useContext(FavoritesContext);
  const localState = useFavorites({ autoFetch: !context });
  
  return context || localState;
}
