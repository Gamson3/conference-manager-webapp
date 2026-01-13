'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgramSection } from '@/features/conferences/components/sections';
import { FavoritesProvider, useFavoritesContext } from '@/features/favorites';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import { toast } from 'sonner';

interface ProgramDay {
  id: string;
  date: string;
  label: string;
  rooms: string[];
  sessions: Session[];
}

interface Session {
  id: string;
  title: string;
  type: 'presentation' | 'keynote' | 'panel' | 'workshop' | 'break' | 'networking';
  startTime: string;
  endTime: string;
  room?: string;
  capacity?: number;
  description?: string;
  presentations: Presentation[];
}

interface Presentation {
  id: string;
  title: string;
  abstract?: string;
  abstractFileUrl?: string | null;
  abstractFileName?: string | null;
  abstractFileMimeType?: string | null;
  abstractFileSizeBytes?: number | null;
  fullTextFileUrl?: string | null;
  fullTextFileName?: string | null;
  fullTextFileMimeType?: string | null;
  fullTextFileSizeBytes?: number | null;
  keywords?: string[];
  authors: Author[];
  isFavorite: boolean;
}

interface Author {
  id: string;
  name: string;
  affiliation?: string;
}

// Utility function
function extractRooms(days: ProgramDay[]): string[] {
  const roomSet = new Set<string>();
  days.forEach(day => {
    day.sessions?.forEach(session => {
      if (session.room) roomSet.add(session.room);
    });
  });
  return Array.from(roomSet);
}

function ConferenceProgramPageContent() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { favoriteIds } = useFavoritesContext();
  const id = params?.id;

  const [conferenceName, setConferenceName] = useState<string>('');
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

  // Load program data
  useEffect(() => {
    if (!id) return;
    const loadSchedule = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.PUBLIC.SCHEDULE(id), {
          headers: { 'X-Suppress-403-Redirect': 'true' }
        });
        const rawDays: unknown = data.days;
        const daysArray = Array.isArray(rawDays) ? rawDays : [];
        const days: ProgramDay[] = daysArray.map((day) => {
          const d = day as Record<string, unknown>;
          const rawSections = d.sections;
          const sectionsArray = Array.isArray(rawSections) ? rawSections : [];
          const dayId = typeof d.id === 'number' || typeof d.id === 'string' ? String(d.id) : '';
          const dayDate = typeof d.date === 'string' ? d.date : '';
          const dayLabel = typeof d.name === 'string' ? d.name : (typeof d.label === 'string' ? d.label : '');

          const sessions: Session[] = sectionsArray.map((section) => {
            const s = section as Record<string, unknown>;
            const rawPresentations = s.presentations;
            const presentationsArray = Array.isArray(rawPresentations) ? rawPresentations : [];

            const presentations: Presentation[] = presentationsArray.map((pres) => {
              const p = pres as Record<string, unknown>;
              const idValue = typeof p.id === 'number' || typeof p.id === 'string' ? String(p.id) : '';
              return {
                id: idValue,
                title: typeof p.title === 'string' ? p.title : '',
                abstract: typeof p.abstract === 'string' ? p.abstract : undefined,
                abstractFileUrl: typeof p.abstractFileUrl === 'string' ? p.abstractFileUrl : null,
                abstractFileName: typeof p.abstractFileName === 'string' ? p.abstractFileName : null,
                abstractFileMimeType: typeof p.abstractFileMimeType === 'string' ? p.abstractFileMimeType : null,
                abstractFileSizeBytes: typeof p.abstractFileSizeBytes === 'number' ? p.abstractFileSizeBytes : null,
                fullTextFileUrl: typeof p.fullTextFileUrl === 'string' ? p.fullTextFileUrl : null,
                fullTextFileName: typeof p.fullTextFileName === 'string' ? p.fullTextFileName : null,
                fullTextFileMimeType: typeof p.fullTextFileMimeType === 'string' ? p.fullTextFileMimeType : null,
                fullTextFileSizeBytes: typeof p.fullTextFileSizeBytes === 'number' ? p.fullTextFileSizeBytes : null,
                keywords: Array.isArray(p.keywords) ? (p.keywords.filter(k => typeof k === 'string') as string[]) : [],
                authors: Array.isArray(p.authors) ? (p.authors as Author[]) : [],
                isFavorite: favoriteIds.has(idValue),
              };
            });

            const sectionType = s.type;
            const typedType: Session['type'] =
              sectionType === 'presentation' ||
              sectionType === 'keynote' ||
              sectionType === 'panel' ||
              sectionType === 'workshop' ||
              sectionType === 'break' ||
              sectionType === 'networking'
                ? sectionType
                : 'presentation';

            return {
              id: typeof s.id === 'number' || typeof s.id === 'string' ? String(s.id) : '',
              title: typeof s.name === 'string' ? s.name : '',
              type: typedType,
              startTime: typeof s.startTime === 'string' ? s.startTime : '',
              endTime: typeof s.endTime === 'string' ? s.endTime : '',
              room: typeof s.room === 'string' ? s.room : undefined,
              capacity: typeof s.capacity === 'number' ? s.capacity : undefined,
              description: typeof s.description === 'string' ? s.description : undefined,
              presentations,
            };
          });

          return {
            id: dayId,
            date: dayDate,
            label: dayLabel,
            rooms: [],
            sessions,
          };
        });
        
        const daysWithRooms = days.map((day: ProgramDay) => ({
          ...day,
          rooms: extractRooms([day]),
        }));
        
        setProgramDays(daysWithRooms);
      } catch (e) {
        setError('Failed to load program schedule');
        console.error('Failed to load schedule:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, [id, favoriteIds]);

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
          <div className="flex items-center justify-between">
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
                <p className="text-sm text-slate-600">Full Program Schedule</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info('PDF download coming soon');
              }}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Program Content - Full Mode */}
      <ProgramSection
        conferenceId={String(id)}
        programDays={programDays}
        loading={loading}
        previewMode={false}
      />
    </div>
  );
}

export default function ConferenceProgramPage() {
  return (
    <FavoritesProvider>
      <ConferenceProgramPageContent />
    </FavoritesProvider>
  );
}
