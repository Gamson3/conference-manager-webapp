// ============================================================================
// PEOPLE TAB - Speakers, Organizers with Keynote Highlighting
// ============================================================================
'use client';

import { useState, useMemo } from 'react';
import { User, Search, Building2, Star, X, Users, Mail } from 'lucide-react';
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
  isKeynote?: boolean; // NEW: Keynote speaker flag
  presentations: Array<{
    id: string;
    title: string;
    sessionTitle?: string;
  }>;
}

export interface Organizer {
  id: string;
  name: string;
  email?: string;
  role: string; // e.g., "General Chair", "Program Chair", "Publicity Chair"
  affiliation?: string;
  photoUrl?: string;
}

interface PeopleTabProps {
  conferenceId: string;
  speakers: Speaker[];
  organizers?: Organizer[]; // NEW: Organizers list
  isLoading?: boolean;
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
  onPresentationClick,
}: {
  speaker: Speaker;
  onPresentationClick?: (presentationId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={cn(
      "border border-slate-200 shadow-sm hover:shadow-md transition-all",
      speaker.isKeynote && "ring-2 ring-blue-200"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 shrink-0 border-2 border-slate-200">
            <AvatarImage src={speaker.photoUrl} alt={speaker.name} />
            <AvatarFallback className="text-base font-semibold bg-slate-100 text-slate-700">
              {getInitials(speaker.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h3 className="font-bold text-base text-slate-900">{speaker.name}</h3>
              {speaker.isKeynote && (
                <Badge className="bg-blue-600 text-white shrink-0 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Keynote
                </Badge>
              )}
            </div>
            
            {speaker.affiliation && (
              <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                <Building2 className="h-3.5 w-3.5" />
                {speaker.affiliation}
              </p>
            )}

            {/* Bio */}
            {speaker.bio && (
              <>
                <p className={cn(
                  'text-sm text-slate-700 mt-2 leading-relaxed',
                  !isExpanded && 'line-clamp-2'
                )}>
                  {speaker.bio}
                </p>
                {speaker.bio.length > 150 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs mt-1 text-blue-600 hover:text-blue-700"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </Button>
                )}
              </>
            )}

            {/* Presentations */}
            {speaker.presentations && speaker.presentations.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs font-semibold text-slate-900 mb-2">
                  {speaker.presentations.length} Presentation{speaker.presentations.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {speaker.presentations.map((pres) => (
                    <button
                      key={pres.id}
                      className="block text-left text-sm hover:text-blue-600 transition-colors w-full p-2 rounded hover:bg-white"
                      onClick={() => onPresentationClick?.(pres.id)}
                    >
                      <span className="line-clamp-1 font-medium">
                        {pres.title}
                      </span>
                      {pres.sessionTitle && (
                        <span className="text-xs text-slate-600 block mt-0.5">
                          in {pres.sessionTitle}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Organizer Card Component
function OrganizerCard({
  organizer,
}: {
  organizer: Organizer;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 shrink-0 border-2 border-blue-200">
            <AvatarImage src={organizer.photoUrl} alt={organizer.name} />
            <AvatarFallback className="text-base font-semibold bg-blue-50 text-blue-700">
              {getInitials(organizer.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-slate-900">{organizer.name}</h3>
            <Badge className="mt-1 bg-blue-600 text-white">
              {organizer.role}
            </Badge>
            
            {organizer.affiliation && (
              <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-2">
                <Building2 className="h-3.5 w-3.5" />
                {organizer.affiliation}
              </p>
            )}

            {organizer.email && (
              <a
                href={`mailto:${organizer.email}`}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mt-1"
              >
                <Mail className="h-3.5 w-3.5" />
                {organizer.email}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PeopleTab({
  speakers,
  organizers = [], // NEW: Organizers with default empty array
  isLoading,
  onPresentationClick,
}: PeopleTabProps) {
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

  // Sort: Keynotes first, then alphabetically
  const sortedSpeakers = useMemo(() => {
    return [...filteredSpeakers].sort((a, b) => {
      // Keynotes first
      if (a.isKeynote && !b.isKeynote) return -1;
      if (!a.isKeynote && b.isKeynote) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [filteredSpeakers]);

  // Count keynotes
  const keynoteCount = speakers.filter(s => s.isKeynote).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (speakers.length === 0) {
    return (
      <div className="text-center py-16">
        <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">No Speakers Listed</h3>
        <p className="text-slate-600">Speaker information has not been published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organizers Section */}
      {organizers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Conference Organizers</h2>
              <p className="text-sm text-slate-600">Meet the people organizing this conference</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizers.map((organizer) => (
              <OrganizerCard
                key={organizer.id}
                organizer={organizer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Speakers Section */}
      <div className="space-y-4">
        {organizers.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <User className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Speakers & Presenters</h2>
              <p className="text-sm text-slate-600">Browse all conference speakers</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search speakers by name, affiliation, or presentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-slate-300"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-2 bg-slate-100 text-slate-700">
            {sortedSpeakers.length} speaker{sortedSpeakers.length !== 1 ? 's' : ''}
          </Badge>
          {keynoteCount > 0 && (
            <Badge className="bg-blue-600 text-white px-3 py-2 flex items-center gap-1">
              <Star className="h-3 w-3" />
              {keynoteCount} keynote{keynoteCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Results */}
      {sortedSpeakers.length === 0 ? (
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">
              No speakers match <strong>&quot;{searchQuery}&quot;</strong>
            </p>
            <Button
              variant="link"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Clear search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedSpeakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              onPresentationClick={onPresentationClick}
            />
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
