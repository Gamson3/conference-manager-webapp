'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PeopleTab } from '@/features/conferences/components/tabs';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';

interface Speaker {
  id: string;
  name: string;
  email?: string;
  affiliation?: string;
  bio?: string;
  photoUrl?: string;
  isKeynote?: boolean;
  presentations: {
    id: string;
    title: string;
    sessionTitle?: string;
  }[];
}

interface Organizer {
  id: string;
  name: string;
  email?: string;
  affiliation?: string;
  role: string;
  photoUrl?: string;
}

interface ProgramDay {
  id: string;
  sessions: Session[];
}

interface Session {
  id: string;
  title: string;
  type: 'presentation' | 'keynote' | 'panel' | 'workshop' | 'break' | 'networking';
  presentations?: Presentation[];
}

interface Presentation {
  id: string;
  title: string;
  authors?: Author[];
}

interface Author {
  id?: number;
  name: string;
  email?: string;
}

export default function ConferencePeoplePage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = params?.id;

  const [conferenceName, setConferenceName] = useState<string>('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Load conference name
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.PUBLIC.CONFERENCE(id));
        setConferenceName(data.name || 'Conference');
      } catch (e) {
        console.error('Failed to load conference name:', e);
      }
    };
    load();
  }, [id]);

  // Load program data (needed for speaker enrichment)
  useEffect(() => {
    if (!id) return;
    const loadSchedule = async () => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.PUBLIC.SCHEDULE(id), {
          headers: { 'X-Suppress-403-Redirect': 'true' }
        });
        setProgramDays(data.days || []);
      } catch (e) {
        console.error('Failed to load schedule:', e);
      }
    };
    loadSchedule();
  }, [id]);

  // Load speakers and enrich with presentation data
  useEffect(() => {
    if (!id || programDays.length === 0) return;

    const loadSpeakers = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.PUBLIC.SPEAKERS(id), {
          headers: { 'X-Suppress-403-Redirect': 'true' }
        });
        const speakersData = Array.isArray(data) ? data : (data.speakers || []);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedSpeakers = speakersData.map((speaker: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const presentations: any[] = [];
          let isKeynote = false;
          
          programDays.forEach((day) => {
            (day.sessions || []).forEach((session) => {
              if (session.type === 'keynote') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.presentations || []).forEach((pres: any) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  if (pres.authors?.some((author: any) => 
                    author.id === speaker.id || author.email === speaker.email
                  )) {
                    isKeynote = true;
                  }
                });
              }
              
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (session.presentations || []).forEach((pres: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (pres.authors?.some((author: any) => 
                  author.id === speaker.id || author.email === speaker.email
                )) {
                  presentations.push({
                    id: pres.id,
                    title: pres.title,
                    sessionTitle: session.title,
                  });
                }
              });
            });
          });
          
          return {
            ...speaker,
            id: String(speaker.id),
            isKeynote,
            presentations: presentations.map(p => ({
              ...p,
              id: String(p.id)
            })),
          };
        });
        
        setSpeakers(enrichedSpeakers);

        // Load organizers if available
        if (data.organizers) {
          setOrganizers(data.organizers.map((org: { id: number; name: string; email?: string; affiliation?: string; role?: string; photoUrl?: string }) => ({
            ...org,
            id: String(org.id),
            role: org.role || 'Organizer'
          })));
        }
      } catch (e) {
        setError('Failed to load speakers');
        console.error('Failed to load speakers:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSpeakers();
  }, [id, programDays]);

  const handlePresentationClick = (presentationId: string) => {
    router.push(`/conferences/${id}?tab=program&highlight=${presentationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="app-container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="app-container py-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => router.push(`/conferences/${id}`)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Conference
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="app-container py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/conferences/${id}`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{conferenceName}</h1>
              <p className="text-sm text-slate-600">
                {speakers.length} {speakers.length === 1 ? 'Speaker' : 'Speakers'}
                {organizers.length > 0 && ` • ${organizers.length} ${organizers.length === 1 ? 'Organizer' : 'Organizers'}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* People Content */}
      <div className="app-container py-8">
        <PeopleTab
          conferenceId={String(id)}
          speakers={speakers}
          organizers={organizers.length > 0 ? organizers : undefined}
          isLoading={false}
          onPresentationClick={handlePresentationClick}
        />
      </div>
    </div>
  );
}
