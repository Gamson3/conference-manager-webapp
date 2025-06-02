import { useState } from 'react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';

export function useFavorites() {
  const [favoriteLoading, setFavoriteLoading] = useState<Set<number>>(new Set());

  const toggleFavorite = async (
    presentationId: number, 
    isFavorite: boolean,
    onUpdate: (id: number, newState: boolean) => void
  ) => {
    try {
      setFavoriteLoading(prev => new Set([...prev, presentationId]));
      const api = await createAuthenticatedApi();

      if (isFavorite) {
        await api.delete(`/conferences/presentations/${presentationId}/favorite`);
        toast.success('Removed from favorites');
        onUpdate(presentationId, false);
      } else {
        await api.post(`/conferences/presentations/${presentationId}/favorite`);
        toast.success('Added to favorites');
        onUpdate(presentationId, true);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    } finally {
      setFavoriteLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(presentationId);
        return newSet;
      });
    }
  };

  return {
    favoriteLoading,
    toggleFavorite
  };
}