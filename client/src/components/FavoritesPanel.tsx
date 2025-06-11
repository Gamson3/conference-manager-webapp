"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ExternalLink, TreePine } from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

interface FavoritePresentation {
  id: number;
  createdAt: string;
  presentation: {
    id: number;
    title: string;
    abstract?: string;
    keywords: string[];
    duration?: number;
    authors: Array<{
      id: number;
      authorName: string;
      affiliation?: string;
      isPresenter: boolean;
    }>;
    section: {
      id: number;
      name: string;
      type: string;
      startTime?: string;
      endTime?: string;
      room?: string;
      day: {
        id: number;
        name: string;
        date: string;
        conference: {
          id: number;
          name: string;
          startDate: string;
          endDate: string;
        };
      };
    };
  };
}

interface FavoritesPanelProps {
  onJumpToPresentation?: (conferenceId: number, presentationId: number) => void;
}

export default function FavoritesPanel({ onJumpToPresentation }: FavoritesPanelProps) {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async (): Promise<void> => {
    try {
      const api = await createAuthenticatedApi();
      const response = await api.get('/api/attendee/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      // Don't show toast error for dashboard component
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToPresentation = (favorite: FavoritePresentation): void => {
    const { day, id: sectionId } = favorite.presentation.section;
    const { conference } = day;
    const presentationId = favorite.presentation.id;
    
    const url = `/attendee/conferences/${conference.id}/tree?expandDay=${day.id}&expandSection=${sectionId}&highlight=${presentationId}`;
    router.push(url);
    
    if (onJumpToPresentation) {
      onJumpToPresentation(conference.id, presentationId);
    }
    
    toast.success('Jumping to presentation in schedule');
  };

  const handleRemoveFavorite = async (presentationId: number, event: React.MouseEvent): Promise<void> => {
    event.stopPropagation();
    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/api/presentations/${presentationId}/favorite`);
      setFavorites(prev => prev.filter(fav => fav.presentation.id !== presentationId));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl text-white">
              <Heart className="h-6 w-6" />
            </div>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between pt-4">
          {/* <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            My Favorites ({favorites.length})
          </div> */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg text-white shadow-lg">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <span>My Favorites ({favorites.length})</span>
              <p className="text-sm font-normal text-gray-600 mt-1">
                Your saved presentations and sessions
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/attendee/favorites')}
          >
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="border-t border-gray-200">
        {favorites.length === 0 ? (
          <div className="mt-4 text-center py-6 text-gray-500">
            <Heart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No favorite presentations yet</p>
            <Button
              variant="link"
              onClick={() => router.push('/attendee/discover')}
              className="mt-2"
            >
              Discover conferences
            </Button>
          </div>
        ) : (
          <div className="pt-4 space-y-3 max-h-96 overflow-y-auto">
            {favorites.slice(0, 5).map((favorite) => (
              <div
                key={favorite.id}
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm line-clamp-2">
                    {favorite.presentation.title}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleJumpToPresentation(favorite)}
                    className="ml-2 p-1 h-auto"
                  >
                    <TreePine className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-1 text-xs text-gray-600">
                  <p className="font-medium">{favorite.presentation.section.day.conference.name}</p>
                  <p>{favorite.presentation.section.day.name} • {favorite.presentation.section.name}</p>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {favorite.presentation.keywords.slice(0, 3).map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}