"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Minimal shape we need; compatible with both organizer Conference and public conference DTO
export type DetailsConference = {
  websiteUrl?: string | null;
  venue?: string | null;
  capacity?: number | null;
  timezone?: string | null;
  topics?: string[] | string | null;
  location?: string | null;
  isPublic?: boolean | null;
};

export function ConferenceDetails({
  conf,
  variant = 'organizer',
  className,
  title = 'Details',
}: {
  conf: DetailsConference;
  variant?: 'organizer' | 'public' | 'auth';
  className?: string;
  title?: string;
}) {
  const showCapacity = variant === 'organizer'; // keep capacity internal for now
  const topicsArray = Array.isArray(conf.topics)
    ? conf.topics
    : (typeof conf.topics === 'string' ? conf.topics.split(',').map(s => s.trim()).filter(Boolean) : []);

  return (
    <Card className={cn('p-4', className)}>
      <div className="font-medium mb-2">{title}</div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
        {conf.venue && (
          <div>
            <dt className="text-muted-foreground">Venue</dt>
            <dd className="font-medium">{conf.venue}</dd>
          </div>
        )}
        {conf.location && (
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-medium">{conf.location}</dd>
          </div>
        )}
        {showCapacity && typeof conf.capacity === 'number' && conf.capacity > 0 && (
          <div>
            <dt className="text-muted-foreground">Capacity</dt>
            <dd className="font-medium">{conf.capacity}</dd>
          </div>
        )}
        {conf.websiteUrl && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Website</dt>
            <dd className="font-medium truncate">
              <a className="underline underline-offset-2" href={conf.websiteUrl} target="_blank" rel="noopener noreferrer">
                {conf.websiteUrl}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Timezone</dt>
          <dd className="font-medium">{conf.timezone || 'UTC'}</dd>
        </div>
        {topicsArray.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Topics</dt>
            <dd className="font-medium">
              <div className="flex flex-wrap gap-2 mt-1">
                {topicsArray.map((t, i) => (
                  <span key={i} className="text-xs rounded border px-2 py-0.5 bg-muted">
                    {t}
                  </span>
                ))}
              </div>
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

export default ConferenceDetails;
