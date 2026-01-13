'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { Calendar, MapPin, Heart, Coffee, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProgramDay, ProgramSession, ProgramPresentation, SessionType } from './ProgramTab';

// ============================================================================
// CLASSIC PROGRAM VIEW - EasyChair-inspired minimal design
// ============================================================================

interface ClassicProgramViewProps {
  days: ProgramDay[];
  selectedDayId: string;
  onDayChange: (dayId: string) => void;
  searchQuery: string;
  onPresentationClick?: (presentationId: string) => void;
  isAuthenticated?: boolean;
  onToggleFavorite?: (presentationId: number) => void;
  favoriteIds?: Set<string>;
  highlightPresentationId?: number;
}

function formatTime(timeString: string): string {
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeString;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Get session type styling
function getSessionTypeStyle(type: SessionType): { border: string; bg: string; text: string } {
  switch (type) {
    case 'keynote':
      return { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-900' };
    case 'workshop':
      return { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-900' };
    case 'panel':
      return { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-900' };
    case 'break':
      return { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-900' };
    case 'networking':
      return { border: 'border-l-pink-500', bg: 'bg-pink-50', text: 'text-pink-900' };
    default:
      return { border: 'border-l-slate-400', bg: 'bg-slate-50', text: 'text-slate-900' };
  }
}

// Highlight search matches in text
function HighlightText({ text, query }: { text: string; query: string }): React.JSX.Element {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

// Presentation row with inline abstract toggle - EasyChair style
// Layout: Left indent (where time would be) | Authors line | Title (bold, clickable) + (abstract) toggle beside
function PresentationRow({
  presentation,
  searchQuery,
  onPresentationClick,
  isAuthenticated,
  onToggleFavorite,
  isFavorite,
  isHighlighted,
  rowRef,
}: {
  presentation: ProgramPresentation;
  searchQuery: string;
  onPresentationClick?: (presentationId: string) => void;
  isAuthenticated?: boolean;
  onToggleFavorite?: (presentationId: number) => void;
  isFavorite?: boolean;
  isHighlighted?: boolean;
  rowRef?: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const [showAbstract, setShowAbstract] = useState(false);
  const hasAbstract = presentation.abstract && presentation.abstract.trim().length > 0;

  // Format authors as comma-separated names (EasyChair style: "John Baldwin, Sam Buss, Sy-David Friedman")
  const authorsText = presentation.authors.map((a) => a.name).join(', ');

  return (
    <div 
      ref={rowRef}
      className={cn(
        "group border-b border-slate-100 last:border-b-0 transition-all",
        isHighlighted && "bg-yellow-50 ring-2 ring-yellow-400 ring-inset animate-pulse"
      )}
    >
      {/* EasyChair style: left indent (simulating time column space) + content */}
      <div className="flex py-3 hover:bg-slate-50/50 transition-colors">
        {/* Left indent space - where time would normally appear */}
        <div className="w-16 sm:w-20 flex-shrink-0" aria-hidden="true" />
        
        {/* Main content area */}
        <div className="flex-1 min-w-0 pr-4">
          {/* Authors line - EasyChair style: "John Baldwin, Sam Buss, Sy-David Friedman" */}
          {authorsText && (
            <p className="text-sm text-slate-600 mb-0.5">
              <HighlightText text={authorsText} query={searchQuery} />
            </p>
          )}

          {/* Title line with abstract toggle beside it */}
          <div className="flex items-baseline gap-2 flex-wrap">
            {/* Title - clickable, bold */}
            <button
              onClick={() => onPresentationClick?.(presentation.id)}
              className="text-left font-semibold text-slate-900 hover:text-blue-600 transition-colors leading-snug"
            >
              <HighlightText text={presentation.title} query={searchQuery} />
            </button>

            {/* Abstract toggle - beside title (not below) */}
            {hasAbstract && (
              <button
                onClick={() => setShowAbstract(!showAbstract)}
                className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 flex-shrink-0"
              >
                (<span className="underline">{showAbstract ? 'hide abstract' : 'abstract'}</span>)
              </button>
            )}
          </div>

          {/* Abstract expanded - indented below */}
          {showAbstract && hasAbstract && (
            <div className="mt-2 pl-4 border-l-2 border-slate-200">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                <HighlightText text={presentation.abstract!} query={searchQuery} />
              </p>
            </div>
          )}
        </div>

        {/* Favorite button */}
        {isAuthenticated && onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mr-2',
              isFavorite && 'opacity-100'
            )}
            onClick={() => onToggleFavorite(Number(presentation.id))}
          >
            <Heart
              className={cn(
                'h-4 w-4',
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
              )}
            />
          </Button>
        )}
      </div>
    </div>
  );
}

// Session block component
function SessionBlock({
  session,
  searchQuery,
  onPresentationClick,
  isAuthenticated,
  onToggleFavorite,
  favoriteIds,
  highlightPresentationId,
  highlightRef,
}: {
  session: ProgramSession;
  searchQuery: string;
  onPresentationClick?: (presentationId: string) => void;
  isAuthenticated?: boolean;
  onToggleFavorite?: (presentationId: number) => void;
  favoriteIds?: Set<string>;
  highlightPresentationId?: number;
  highlightRef?: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const style = getSessionTypeStyle(session.type);

  // Break sessions render differently
  if (session.type === 'break') {
    return (
      <div className={cn('border-l-4 rounded-r', style.border, style.bg)}>
        <div className="px-4 py-3 flex items-center gap-3">
          <Coffee className="h-4 w-4 text-amber-600" />
          <span className="font-medium text-sm">{session.title}</span>
          <span className="text-xs text-slate-500">
            {formatTime(session.startTime)} – {formatTime(session.endTime)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Session header */}
      <div className={cn('border-l-4 rounded-r', style.border, style.bg)}>
        <div className="px-4 py-3">
          {/* Time + Title */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono font-semibold text-slate-700">
              {formatTime(session.startTime)}–{formatTime(session.endTime)}
            </span>
            <h3 className={cn('font-semibold', style.text)}>
              <HighlightText text={session.title} query={searchQuery} />
            </h3>
            {session.type !== 'presentation' && (
              <span className="text-xs uppercase tracking-wide text-slate-500">
                {session.type}
              </span>
            )}
          </div>

          {/* Location + Chair */}
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
            {session.room && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.room}
              </span>
            )}
            {session.chair && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Chair: {session.chair}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Presentations list */}
      {session.presentations.length > 0 && (
        <div className="bg-white border border-slate-200 border-t-0 rounded-b">
          {session.presentations.map((pres) => {
            const isHighlighted = highlightPresentationId === Number(pres.id);
            return (
              <PresentationRow
                key={pres.id}
                presentation={pres}
                searchQuery={searchQuery}
                onPresentationClick={onPresentationClick}
                isAuthenticated={isAuthenticated}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favoriteIds?.has(pres.id)}
                isHighlighted={isHighlighted}
                rowRef={isHighlighted ? highlightRef : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Filter presentations by search query
function filterDayBySearch(day: ProgramDay, query: string): ProgramDay {
  if (!query.trim()) return day;

  const lowerQuery = query.toLowerCase();

  const filteredSessions = day.sessions
    .map((session) => {
      // Always keep breaks
      if (session.type === 'break') return session;

      // Check if session title matches
      const sessionMatches = session.title.toLowerCase().includes(lowerQuery);

      // Filter presentations
      const filteredPresentations = session.presentations.filter((pres) => {
        const titleMatch = pres.title.toLowerCase().includes(lowerQuery);
        const authorMatch = pres.authors.some(
          (a) =>
            a.name.toLowerCase().includes(lowerQuery) ||
            a.affiliation?.toLowerCase().includes(lowerQuery)
        );
        const keywordMatch = pres.keywords?.some((k) =>
          k.toLowerCase().includes(lowerQuery)
        );
        const abstractMatch = pres.abstract?.toLowerCase().includes(lowerQuery);

        return titleMatch || authorMatch || keywordMatch || abstractMatch;
      });

      // Keep session if it matches or has matching presentations
      if (sessionMatches || filteredPresentations.length > 0) {
        return {
          ...session,
          presentations: sessionMatches ? session.presentations : filteredPresentations,
        };
      }

      return null;
    })
    .filter((s): s is ProgramSession => s !== null);

  return { ...day, sessions: filteredSessions };
}

export function ClassicProgramView({
  days,
  selectedDayId,
  onDayChange,
  searchQuery,
  onPresentationClick,
  isAuthenticated,
  onToggleFavorite,
  favoriteIds,
  highlightPresentationId,
}: ClassicProgramViewProps): React.JSX.Element {
  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];
  const highlightRef = useRef<HTMLDivElement>(null);

  // Apply search filter
  const filteredDay = useMemo(
    () => (selectedDay ? filterDayBySearch(selectedDay, searchQuery) : null),
    [selectedDay, searchQuery]
  );

  // Auto-scroll to highlighted presentation
  useEffect(() => {
    if (highlightPresentationId && highlightRef.current) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [highlightPresentationId]);

  // Find which day contains the highlighted presentation and switch to it
  useEffect(() => {
    if (highlightPresentationId) {
      for (const day of days) {
        for (const session of day.sessions) {
          const found = session.presentations.find(
            (p) => Number(p.id) === highlightPresentationId
          );
          if (found && day.id !== selectedDayId) {
            onDayChange(day.id);
            return;
          }
        }
      }
    }
  }, [highlightPresentationId, days, selectedDayId, onDayChange]);

  if (days.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No program data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day navigation - horizontal links */}
      {days.length > 1 && (
        <nav className="border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1 text-sm">
            <span className="text-slate-500 font-medium mr-2">Days:</span>
            {days.map((day, idx) => (
              <Fragment key={day.id}>
                {idx > 0 && <span className="text-slate-300 mx-1">·</span>}
                <button
                  onClick={() => onDayChange(day.id)}
                  className={cn(
                    'px-2 py-1 rounded transition-colors',
                    selectedDayId === day.id
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-blue-600 hover:text-blue-800 hover:bg-slate-100'
                  )}
                >
                  {day.label}
                </button>
              </Fragment>
            ))}
          </div>
        </nav>
      )}

      {/* Day header banner */}
      {filteredDay && (
        <div className="bg-slate-700 text-white px-4 py-3 rounded">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-semibold">
              {formatDate(filteredDay.date)}
            </span>
          </div>
        </div>
      )}

      {/* Sessions */}
      {filteredDay && filteredDay.sessions.length > 0 ? (
        <div className="space-y-4">
          {filteredDay.sessions.map((session) => (
            <SessionBlock
              key={session.id}
              session={session}
              searchQuery={searchQuery}
              onPresentationClick={onPresentationClick}
              isAuthenticated={isAuthenticated}
              onToggleFavorite={onToggleFavorite}
              favoriteIds={favoriteIds}
              highlightPresentationId={highlightPresentationId}
              highlightRef={highlightRef}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          {searchQuery ? (
            <p>No results match &quot;{searchQuery}&quot;</p>
          ) : (
            <p>No sessions scheduled for this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
