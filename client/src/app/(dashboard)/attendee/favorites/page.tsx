"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ExternalLink, TreePine } from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function FavoritesPage() {
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
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToTree = (favorite) => {
    const { conference, day, section } = favorite.presentation.section;
    const url = `/attendee/conferences/${conference.id}/tree?expandDay=${day.id}&expandSection=${section.id}&highlight=${favorite.presentation.id}`;
    router.push(url);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            My Favorites
          </h1>
          <p className="text-gray-600">Your saved presentations and sessions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {favorites.map((favorite, index) => (
          <motion.div
            key={favorite.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base line-clamp-2">
                  {favorite.presentation.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {favorite.presentation.abstract}
                  </p>
                  
                  <div className="space-y-1 text-xs text-gray-500">
                    <p><strong>Conference:</strong> {favorite.presentation.section.conference.name}</p>
                    <p><strong>Day:</strong> {favorite.presentation.section.day.name}</p>
                    <p><strong>Section:</strong> {favorite.presentation.section.name}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {favorite.presentation.keywords.slice(0, 3).map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
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
    </div>
  );
}