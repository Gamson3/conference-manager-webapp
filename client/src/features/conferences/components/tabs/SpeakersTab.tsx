// SpeakersTab - List of conference speakers/presenters
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { User, Search, ExternalLink, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface Speaker {
  id: string;
  name: string;
  email?: string;
  affiliation?: string;
  bio?: string;
  photoUrl?: string;
  presentations: Array<{
    id: string;
    title: string;
    sessionTitle?: string;
  }>;
}

interface SpeakersTabProps {
  conferenceId: string;
  speakers: Speaker[];
  isLoading?: boolean;
  onSpeakerClick?: (speakerId: string) => void;
  onPresentationClick?: (presentationId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function SpeakerCard({
  speaker,
  conferenceId,
  onSpeakerClick: _onSpeakerClick,
  onPresentationClick,
}: {
  speaker: Speaker;
  conferenceId: string;
  onSpeakerClick?: (speakerId: string) => void;
  onPresentationClick?: (presentationId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 shrink-0">
            <AvatarImage src={speaker.photoUrl} alt={speaker.name} />
            <AvatarFallback className="text-lg">
              {getInitials(speaker.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{speaker.name}</h3>
            
            {speaker.affiliation && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" />
                {speaker.affiliation}
              </p>
            )}

            {/* Bio preview */}
            {speaker.bio && (
              <p className={cn(
                'text-sm text-muted-foreground mt-2',
                !isExpanded && 'line-clamp-2'
              )}>
                {speaker.bio}
              </p>
            )}
            {speaker.bio && speaker.bio.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs mt-1"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </Button>
            )}

            {/* Presentations */}
            {speaker.presentations && speaker.presentations.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {speaker.presentations.length} presentation{speaker.presentations.length !== 1 ? 's' : ''}:
              </p>
              <div className="space-y-1">
                {speaker.presentations.map((pres) => (
                  <button
                    key={pres.id}
                    className="block text-left text-sm hover:text-primary transition-colors group w-full"
                    onClick={() => onPresentationClick?.(pres.id)}
                  >
                    <span className="line-clamp-1 group-hover:underline">
                      {pres.title}
                    </span>
                    {pres.sessionTitle && (
                      <span className="text-xs text-muted-foreground">
                        {' '}in {pres.sessionTitle}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>

          {/* Actions */}
          {speaker.presentations && speaker.presentations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0"
            >
              <Link href={`/conferences/${conferenceId}/tree?highlight=${speaker.presentations[0].id}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SpeakersTab({
  conferenceId,
  speakers,
  isLoading,
  onSpeakerClick,
  onPresentationClick,
}: SpeakersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter speakers by search
  const filteredSpeakers = useMemo(() => {
    if (!searchQuery.trim()) {
      return speakers;
    }

    const query = searchQuery.toLowerCase();
    return speakers.filter((speaker) =>
      speaker.name.toLowerCase().includes(query) ||
      speaker.affiliation?.toLowerCase().includes(query) ||
      speaker.presentations.some((p) => p.title.toLowerCase().includes(query))
    );
  }, [speakers, searchQuery]);

  // Sort alphabetically
  const sortedSpeakers = useMemo(() => {
    return [...filteredSpeakers].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSpeakers]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (speakers.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">No Speakers Listed</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Speaker information has not been published yet. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search speakers by name, affiliation, or presentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {sortedSpeakers.length} speaker{sortedSpeakers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Results */}
      {sortedSpeakers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No speakers match &quot;{searchQuery}&quot;
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedSpeakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              conferenceId={conferenceId}
              onSpeakerClick={onSpeakerClick}
              onPresentationClick={onPresentationClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
