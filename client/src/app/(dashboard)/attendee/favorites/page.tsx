"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  TreePine, 
  ExternalLink, 
  Clock, 
  Calendar,
  MapPin,
  Users,
  Search
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';

interface FavoritePresentation {
  id: number;
  createdAt: string;
  presentation: {
    id: number;
    title: string;
    abstract: string;
    keywords: string[];
    duration: number;
    authors: Array<{
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

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoritePresentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const api = await createAuthenticatedApi();
      const response = await api.get('/api/attendee/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToTree = (favorite: FavoritePresentation) => {
    const { day, id: sectionId } = favorite.presentation.section;
    const { conference } = day;
    // const url = `/attendee/conferences/${conference.id}?tab=schedule&expandDay=${day.id}&expandSection=${sectionId}&highlight=${favorite.presentation.id}`;
    const url = `/attendee/conferences/${conference.id}/tree?expandDay=${day.id}&expandSection=${sectionId}&highlight=${favorite.presentation.id}`;
    router.push(url);
  };

  const handleRemoveFavorite = async (presentationId: number) => {
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

  const filteredFavorites = favorites.filter(favorite =>
    favorite.presentation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    favorite.presentation.abstract.toLowerCase().includes(searchTerm.toLowerCase()) ||
    favorite.presentation.keywords.some(keyword =>
      keyword.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    favorite.presentation.authors.some(author =>
      author.authorName.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    favorite.presentation.section.day.conference.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Heart className="h-8 w-8 text-red-500 mr-3" />
            My Favorites
          </h1>
          <p className="text-gray-600 mt-2">
            {favorites.length} presentation{favorites.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search your favorites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredFavorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">
            {searchTerm ? 'No matching favorites' : 'No favorites yet'}
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Start exploring conferences and presentations to build your favorites list'
            }
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => router.push('/attendee/discover')}
              className="border-primary hover:shadow-lg border-l border-r hover:bg-primary-100"
          >
            Discover Conferences
          </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredFavorites.map((favorite, index) => (
            <motion.div
              key={favorite.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {favorite.presentation.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {favorite.presentation.section.type}
                        </Badge>
                        {favorite.presentation.duration && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {favorite.presentation.duration} min
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(favorite.presentation.section.day.date).toLocaleDateString()}
                        </div>
                        {favorite.presentation.section.startTime && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(favorite.presentation.section.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {favorite.presentation.authors.filter(a => a.isPresenter).length} presenter(s)
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFavorite(favorite.presentation.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {favorite.presentation.abstract}
                    </p>
                    
                    <div className="space-y-1 text-xs text-gray-500">
                      <p><strong>Conference:</strong> {favorite.presentation.section.day.conference.name}</p>
                      <p><strong>Day:</strong> {favorite.presentation.section.day.name}</p>
                      <p><strong>Section:</strong> {favorite.presentation.section.name}</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {favorite.presentation.keywords.slice(0, 3).map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {favorite.presentation.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{favorite.presentation.keywords.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJumpToTree(favorite)}
                        className="flex-1"
                      >
                        <TreePine className="h-3 w-3 mr-1" />
                        View in Schedule
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/attendee/presentations/${favorite.presentation.id}`)}
                        className="flex-1"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}