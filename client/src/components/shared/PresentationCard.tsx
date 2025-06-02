"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Heart, User, Clock, MapPin, Calendar, BookOpen, Star, Eye, Share 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Author {
  id: number;
  name: string;
  email?: string;
  affiliation?: string;
  isPresenter: boolean;
  isExternal: boolean;
  order: number;
}

interface Presentation {
  id: number;
  title: string;
  abstract?: string;
  keywords: string[];
  affiliations: string[];
  duration?: number;
  order: number;
  status: string;
  submissionType: string;
  authors: Author[];
  isFavorite: boolean;
  favoriteCount: number;
  section: {
    id: number;
    name: string;
    type: string;
    startTime?: string;
    endTime?: string;
    room?: string;
    day?: {
      id: number;
      name: string;
      date: string;
    };
  };
}

interface PresentationCardProps {
  presentation: Presentation;
  onFavoriteToggle: (id: number) => void;
  onSelect?: (presentation: Presentation) => void;
  favoriteLoading: boolean;
  compact?: boolean;
  showActions?: boolean;
  highlighted?: boolean;
}

export default function PresentationCard({
  presentation,
  onFavoriteToggle,
  onSelect,
  favoriteLoading,
  compact = false,
  showActions = true,
  highlighted = false
}: PresentationCardProps) {
  const router = useRouter();

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(presentation);
    } else {
      router.push(`/attendee/presentations/${presentation.id}`);
    }
  };

  return (
    <Card 
      className={cn(
        "h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary-200 hover:border-l-primary-500",
        highlighted && "bg-yellow-50 border-l-yellow-400",
        compact && "p-2"
      )}
    >
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className={cn(
              "font-semibold line-clamp-2 group-hover:text-primary-700 transition-colors",
              compact ? "text-base" : "text-lg"
            )}>
              {presentation.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {presentation.section.type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {presentation.submissionType}
              </Badge>
              {presentation.status === 'approved' && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                  Approved
                </Badge>
              )}
            </div>
          </div>

          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle(presentation.id);
              }}
              disabled={favoriteLoading}
              className="ml-2"
            >
              <Heart 
                className={cn(
                  "h-4 w-4 transition-colors",
                  presentation.isFavorite 
                    ? "fill-red-500 text-red-500" 
                    : "text-gray-400 hover:text-red-400"
                )}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0" onClick={handleClick}>
        {!compact && presentation.abstract && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {presentation.abstract}
          </p>
        )}

        {/* Authors */}
        {presentation.authors.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <User className="h-3 w-3 mr-1" />
              <span>Speakers</span>
            </div>
            <div className="space-y-1">
              {presentation.authors.slice(0, compact ? 1 : 2).map((author) => (
                <div key={author.id} className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {author.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium">{author.name}</span>
                    {author.isPresenter && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        Presenter
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {presentation.authors.length > (compact ? 1 : 2) && (
                <span className="text-xs text-gray-400">
                  +{presentation.authors.length - (compact ? 1 : 2)} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Session Details */}
        <div className="space-y-2 text-sm text-gray-500">
          {presentation.section.startTime && (
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-2" />
              <span>
                {formatTime(presentation.section.startTime)}
                {presentation.section.endTime && ` - ${formatTime(presentation.section.endTime)}`}
              </span>
            </div>
          )}

          {presentation.section.room && (
            <div className="flex items-center">
              <MapPin className="h-3 w-3 mr-2" />
              <span>{presentation.section.room}</span>
            </div>
          )}

          {presentation.section.day && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-2" />
              <span>{formatDate(presentation.section.day.date)}</span>
            </div>
          )}

          {presentation.duration && (
            <div className="flex items-center">
              <BookOpen className="h-3 w-3 mr-2" />
              <span>{presentation.duration} minutes</span>
            </div>
          )}
        </div>

        {/* Keywords */}
        {!compact && presentation.keywords.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-1">
              {presentation.keywords.slice(0, 3).map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {presentation.keywords.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{presentation.keywords.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {showActions && !compact && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex items-center text-xs text-gray-400">
              <Star className="h-3 w-3 mr-1" />
              <span>{presentation.favoriteCount} favorites</span>
            </div>
            
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                <Share className="h-3 w-3 mr-1" />
                Share
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}