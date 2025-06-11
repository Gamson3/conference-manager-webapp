"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  HeartIcon,
  BuildingIcon,
  MailIcon,
  FileTextIcon
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface PresentationDetail {
  id: number;
  title: string;
  abstract: string;
  keywords: string[];
  duration: number;
  authors: Array<{
    id: number;
    name: string;
    email?: string;
    affiliation?: string;
    isPresenter: boolean;
    title?: string;
    bio?: string;
    profileUrl?: string;
  }>;
  section: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    room?: string;
    day: {
      id: number;
      name: string;
      date: string;
    };
  };
  conference: {
    id: number;
    name: string;
  };
  isFavorite: boolean;
  favoriteCount: number;
}

export default function PresentationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = Number(params.id);
  
  const [presentation, setPresentation] = useState<PresentationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    fetchPresentationDetails();
  }, [presentationId]);

  const fetchPresentationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const api = await createAuthenticatedApi();
      const response = await api.get(`/presentations/${presentationId}`);
      setPresentation(response.data);
    } catch (error: any) {
      console.error('Error fetching presentation details:', error);
      setError(error.response?.data?.message || 'Failed to load presentation details');
      toast.error('Failed to load presentation details');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!presentation) return;
    
    try {
      setFavoriteLoading(true);
      const api = await createAuthenticatedApi();
      
      if (presentation.isFavorite) {
        await api.delete(`/attendee/favorites/presentations/${presentationId}`);
        setPresentation(prev => prev ? {
          ...prev,
          isFavorite: false,
          favoriteCount: prev.favoriteCount - 1
        } : null);
        toast.success('Removed from favorites');
      } else {
        await api.post(`/attendee/favorites/presentations/${presentationId}`);
        setPresentation(prev => prev ? {
          ...prev,
          isFavorite: true,
          favoriteCount: prev.favoriteCount + 1
        } : null);
        toast.success('Added to favorites');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          {error || "Presentation not found"}
        </h2>
        <Button onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-6 pl-0"
        onClick={() => router.back()}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-4">{presentation.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {presentation.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFavoriteToggle}
                disabled={favoriteLoading}
                className="shrink-0"
              >
                <HeartIcon 
                  className={`h-5 w-5 ${
                    presentation.isFavorite ? 'fill-red-500 text-red-500' : ''
                  }`} 
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Abstract */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FileTextIcon className="h-5 w-5 mr-2" />
                Abstract
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">
                  {presentation.abstract}
                </p>
              </div>
            </div>

            <Separator />

            {/* Authors */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <UsersIcon className="h-5 w-5 mr-2" />
                Authors ({presentation.authors.length})
              </h3>
              <div className="grid gap-4">
                {presentation.authors.map((author, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {author.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {author.title && (
                            <span className="text-sm text-gray-500">{author.title}</span>
                          )}
                          <h4 className="font-semibold">{author.name}</h4>
                          {author.isPresenter && (
                            <Badge variant="default" className="text-xs">
                              Presenter
                            </Badge>
                          )}
                        </div>
                        
                        {author.affiliation && (
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <BuildingIcon className="h-4 w-4 mr-1" />
                            {author.affiliation}
                          </div>
                        )}
                        
                        {author.email && (
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <MailIcon className="h-4 w-4 mr-1" />
                            {author.email}
                          </div>
                        )}
                        
                        {author.bio && (
                          <p className="text-sm text-gray-700">{author.bio}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Session Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Session Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Session</p>
                    <p className="font-medium">{presentation.section.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Conference</p>
                    <p className="font-medium">{presentation.conference.name}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(presentation.section.day.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">
                        {new Date(presentation.section.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {presentation.section.endTime && (
                          ` - ${new Date(presentation.section.endTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}`
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {presentation.section.room && (
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-2 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Room</p>
                        <p className="font-medium">{presentation.section.room}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => router.push(`/attendee/conferences/${presentation.conference.id}/tree?highlight=${presentation.id}`)}
                variant="outline"
              >
                View in Schedule Tree
              </Button>
              <Button
                onClick={() => router.push(`/attendee/conferences/${presentation.conference.id}`)}
                variant="outline"
              >
                View Conference
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}