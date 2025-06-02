"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ExternalLink, TreePine } from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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

  const fetchFavorites = async () => {
    try {
      const api = await createAuthenticatedApi();
      const response = await api.get('/attendee/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToPresentation = (favorite) => {
    const { conference, day, section } = favorite.presentation.section;
    const presentationId = favorite.presentation.id;
    
    const url = `/attendee/conferences/${conference.id}/tree?expandDay=${day.id}&expandSection=${section.id}&highlight=${presentationId}`;
    router.push(url);
    
    if (onJumpToPresentation) {
      onJumpToPresentation(conference.id, presentationId);
    }
    
    toast.success('Jumping to presentation in schedule');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            My Favorites ({favorites.length})
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
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
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
          <div className="space-y-3 max-h-96 overflow-y-auto">
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
                  <p className="font-medium">{favorite.presentation.section.conference.name}</p>
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