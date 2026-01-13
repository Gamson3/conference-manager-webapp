"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { PeopleTab, type Speaker, type Organizer } from '@/features/conferences/components/tabs';

interface PeopleSectionProps {
  conferenceId: string;
  speakers: Speaker[];
  organizers?: Organizer[];
  loading?: boolean;
  onViewAllPeople?: () => void;
}

export function PeopleSection({ 
  conferenceId,
  speakers, 
  organizers,
  loading = false,
  onViewAllPeople 
}: PeopleSectionProps) {
  if (loading) {
    return (
      <section id="people-section" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  // Show preview of first 6 speakers
  const previewSpeakers = speakers.slice(0, 6);
  const hasMore = speakers.length > 6;

  return (
    <section id="people-section" className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Speakers & Organizers</h2>
          {hasMore && onViewAllPeople && (
            <Button variant="outline" onClick={onViewAllPeople}>
              View All ({speakers.length})
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        
        <PeopleTab 
          conferenceId={conferenceId}
          speakers={hasMore ? previewSpeakers : speakers} 
          organizers={organizers}
        />
        
        {hasMore && !onViewAllPeople && (
          <div className="text-center mt-6">
            <p className="text-muted-foreground">
              Showing {previewSpeakers.length} of {speakers.length} speakers
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
