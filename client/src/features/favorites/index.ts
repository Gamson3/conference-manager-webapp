// Favorites feature barrel exports

// Types
export * from './types';

// API
export * from './api/favoritesApi';

// Hooks
export { useFavorites } from './hooks/useFavorites';
export type { UseFavoritesReturn } from './hooks/useFavorites';

// Components
export { FavoriteButton, FavoriteButtonStandalone } from './components/FavoriteButton';
export { FavoritesList } from './components/FavoritesList';

// Context
export {
  FavoritesProvider,
  useFavoritesContext,
  useFavoritesOptionalContext,
} from './context/FavoritesContext';
