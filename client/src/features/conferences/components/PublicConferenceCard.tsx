// PublicConferenceCard - Card component for public conference listings
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Users, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PublicConferenceData {
  id: number | string;
  name: string;
  slug?: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  venue?: string;
  bannerImageUrl?: string;
  topics?: string[];
  isRegistrationOpen?: boolean;
  isSubmissionOpen?: boolean;
  participantCount?: number;
  websiteUrl?: string;
}

interface PublicConferenceCardProps {
  conference: PublicConferenceData;
  /**
   * Card size variant
   */
  variant?: 'default' | 'compact' | 'featured';
  /**
   * Whether to show registration/CFP badges
   */
  showOpenBadges?: boolean;
  className?: string;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric' 
  };
  
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = start.getFullYear();
  
  if (startStr === endStr) {
    return `${startStr}, ${year}`;
  }
  
  return `${startStr} - ${endStr}, ${year}`;
}

function isUpcoming(startDate: string): boolean {
  return new Date(startDate) > new Date();
}

function isPast(endDate: string): boolean {
  return new Date(endDate) < new Date();
}

export function PublicConferenceCard({
  conference,
  variant = 'default',
  showOpenBadges = true,
  className,
}: PublicConferenceCardProps) {
  const linkHref = `/conferences/${conference.id}`;
  const upcoming = isUpcoming(conference.startDate);
  const past = isPast(conference.endDate);
  
  return (
    <Link href={linkHref} className="block group">
      <Card className={cn(
        'h-full transition-all hover:shadow-md hover:border-primary/30',
        variant === 'featured' && 'border-primary/20 bg-primary/5',
        past && 'opacity-75',
        className
      )}>
        {/* Banner image if available */}
        {conference.bannerImageUrl && variant === 'featured' && (
          <div className="relative h-32 overflow-hidden rounded-t-lg">
            <Image
              src={conference.bannerImageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}

        <CardHeader className={cn(
          variant === 'compact' && 'pb-2',
          conference.bannerImageUrl && variant === 'featured' && '-mt-8 relative z-10'
        )}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className={cn(
                'line-clamp-2 group-hover:text-primary transition-colors',
                variant === 'compact' && 'text-base',
                variant === 'featured' && 'text-xl'
              )}>
                {conference.name}
              </CardTitle>
              {conference.description && variant !== 'compact' && (
                <CardDescription className="line-clamp-2 mt-1">
                  {conference.description}
                </CardDescription>
              )}
            </div>
            
            {/* Status indicator */}
            {past && (
              <Badge variant="secondary" className="shrink-0">
                Completed
              </Badge>
            )}
            {upcoming && !past && (
              <Badge variant="outline" className="shrink-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                Upcoming
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={cn('space-y-3', variant === 'compact' && 'py-2')}>
          {/* Date and location */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDateRange(conference.startDate, conference.endDate)}
            </span>
            {conference.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {conference.location}
              </span>
            )}
            {conference.participantCount !== undefined && conference.participantCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {conference.participantCount} attending
              </span>
            )}
          </div>
          
          {/* Topics */}
          {conference.topics && conference.topics.length > 0 && variant !== 'compact' && (
            <div className="flex flex-wrap gap-1.5">
              {conference.topics.slice(0, 4).map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {conference.topics.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{conference.topics.length - 4} more
                </Badge>
              )}
            </div>
          )}
          
          {/* Open registration/CFP badges */}
          {showOpenBadges && (conference.isRegistrationOpen || conference.isSubmissionOpen) && (
            <div className="flex flex-wrap gap-2">
              {conference.isRegistrationOpen && (
                <Badge className="bg-green-600 hover:bg-green-700">
                  Registration Open
                </Badge>
              )}
              {conference.isSubmissionOpen && (
                <Badge className="bg-purple-600 hover:bg-purple-700">
                  Call for Papers
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        
        {variant !== 'compact' && (
          <CardFooter className="pt-0 flex items-center justify-between">
            {conference.websiteUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a href={conference.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Website
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="ml-auto gap-1">
              View Details
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}

// Skeleton loader for PublicConferenceCard
export function PublicConferenceCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'featured' }) {
  return (
    <Card className="h-full animate-pulse">
      {variant === 'featured' && (
        <div className="h-32 bg-muted rounded-t-lg" />
      )}
      <CardHeader className={cn(variant === 'compact' && 'pb-2')}>
        <div className="h-5 bg-muted rounded w-3/4 mb-2" />
        {variant !== 'compact' && <div className="h-4 bg-muted rounded w-full" />}
      </CardHeader>
      <CardContent className={cn('space-y-3', variant === 'compact' && 'py-2')}>
        <div className="flex gap-4">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-4 bg-muted rounded w-24" />
        </div>
        {variant !== 'compact' && (
          <div className="flex gap-2">
            <div className="h-5 bg-muted rounded w-16" />
            <div className="h-5 bg-muted rounded w-20" />
            <div className="h-5 bg-muted rounded w-14" />
          </div>
        )}
      </CardContent>
      {variant !== 'compact' && (
        <CardFooter className="pt-0">
          <div className="h-8 bg-muted rounded w-28 ml-auto" />
        </CardFooter>
      )}
    </Card>
  );
}
