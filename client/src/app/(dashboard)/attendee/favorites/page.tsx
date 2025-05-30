"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  HeartIcon, 
  CalendarIcon, 
  MapPinIcon, 
  ExternalLinkIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

interface Conference {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizer: string;
  topics?: string[];
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        const response = await api.get('/attendee/favorites');
        setFavorites(response.data);
      } catch (error: any) {
        console.error('Error fetching favorites:', error);
        setError(error.response?.data?.message || 'Failed to load your favorites');
        toast.error("Couldn't load your favorite conferences");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (conferenceId: number) => {
    try {
      setRemovingId(conferenceId);
      const api = await createAuthenticatedApi();
      await api.delete(`/attendee/favorites/${conferenceId}`);
      
      // Update UI after successful removal
      setFavorites(favorites.filter(favorite => favorite.id !== conferenceId));
      toast.success("Removed from favorites");
    } catch (error: any) {
      console.error('Error removing from favorites:', error);
      toast.error(error.response?.data?.message || "Failed to remove from favorites");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          My Favorites
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-0">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <div className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-gray-50 flex justify-between">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <HeartIcon className="h-6 w-6 text-red-500 mr-2" />
          My Favorites
        </h1>
        <Button 
          variant="outline"
          onClick={() => router.push('/attendee/discover')}
          className="flex items-center"
        >
          <SearchIcon className="h-4 w-4 mr-2" />
          Discover Conferences
        </Button>
      </div>
      
      <Separator className="mb-6" />
      
      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((conference, index) => (
            <motion.div
              key={conference.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col border-none shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6 flex-grow">
                  <h2 className="font-bold mb-2 text-xl line-clamp-2">
                    {conference.title}
                  </h2>
                  
                  <div className="flex items-center text-gray-500 mb-2">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <p className="text-sm">
                      {new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center text-gray-500 mb-4">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <p className="text-sm">
                      {conference.location}
                    </p>
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {conference.description}
                  </p>
                  
                  <p className="text-gray-500 italic text-sm">
                    Organized by {conference.organizer}
                  </p>

                  {conference.topics && conference.topics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {conference.topics.slice(0, 3).map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {conference.topics.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{conference.topics.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="px-6 py-4 bg-gray-50 flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/attendee/conferences/${conference.id}`)}
                    className="flex items-center"
                  >
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => handleRemoveFavorite(conference.id)}
                    disabled={removingId === conference.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
          <HeartIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            No favorite conferences yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            When you find conferences you're interested in, add them to your favorites for quick access.
          </p>
          <Button 
            onClick={() => router.push('/attendee/discover')}
          >
            Discover Conferences
          </Button>
        </div>
      )}
    </div>
  );
}