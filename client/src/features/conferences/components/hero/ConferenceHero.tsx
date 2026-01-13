"use client";
import React from 'react';
import { Calendar, MapPin, Globe, Users, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ConferenceHeroProps {
  conference: {
    id: number;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    venue?: string;
    websiteUrl?: string;
    isPublic?: boolean;
  };
  stats?: {
    presentations?: number;
    speakers?: number;
    days?: number;
  };
  onRegister?: () => void;
  onSubmit?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  cfpOpen?: boolean;
  registrationOpen?: boolean;
}

export function ConferenceHero({
  conference,
  stats,
  onRegister,
  onSubmit,
  onShare,
  onBookmark,
  isBookmarked = false,
  cfpOpen = false,
  registrationOpen = true,
}: ConferenceHeroProps) {
  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return 'Dates TBA';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-white/10 opacity-40" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {cfpOpen && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              CFP Open
            </Badge>
          )}
          {registrationOpen && (
            <Badge variant="secondary">
              Registration Open
            </Badge>
          )}
          {!conference.isPublic && (
            <Badge variant="outline">
              Private Event
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          {conference.name}
        </h1>

        {/* Description */}
        {conference.description && (
          <p className="text-lg text-muted-foreground max-w-3xl mb-6">
            {conference.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formatDateRange(conference.startDate, conference.endDate)}</span>
          </div>
          
          {conference.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{conference.location}</span>
            </div>
          )}

          {stats && stats.presentations && stats.presentations > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>{stats.presentations} presentations</span>
            </div>
          )}

          {conference.websiteUrl && (
            <a
              href={conference.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <Globe className="h-4 w-4" />
              <span>Official Website</span>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Primary CTA */}
          {registrationOpen && onRegister && (
            <Button size="lg" onClick={onRegister}>
              Register Now
            </Button>
          )}

          {cfpOpen && onSubmit && (
            <Button size="lg" variant="secondary" onClick={onSubmit}>
              Submit Abstract
            </Button>
          )}

          {/* Secondary actions */}
          <Button size="lg" variant="outline" onClick={() => {
            document.getElementById('program-section')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            View Program
          </Button>

          <div className="flex gap-2">
            {onBookmark && (
              <Button size="lg" variant="ghost" onClick={onBookmark}>
                <Star className={`h-5 w-5 ${isBookmarked ? 'fill-current text-yellow-500' : ''}`} />
              </Button>
            )}
            {onShare && (
              <Button size="lg" variant="ghost" onClick={onShare}>
                Share
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
