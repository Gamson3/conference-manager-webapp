/**
 * ProgramSection supports two modes:
 * - previewMode: lightweight, curated highlights for overview pages (3-6 cards)
 * - full mode: complete interactive program experience (tree view, search, filters)
 *
 * ⚠️ If preview logic grows significantly or becomes hard to reason about,
 *    extract ProgramPreviewSection as a separate component.
 */

"use client";
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ProgramTab, type ProgramDay } from '@/features/conferences/components/tabs';
import {
  ProgramPreviewHeader,
  DaySelector,
  ProgramHighlightCard,
  ProgramMetaRow,
  ViewFullProgramCTA,
} from '@/features/conferences/components/program';
import { 
  selectProgramHighlights, 
  extractProgramTopics, 
  countUniqueSpeakers 
} from '@/features/conferences/lib/selectProgramHighlights';
import { useFavoritesContext } from '@/features/favorites';

interface ProgramSectionProps {
  conferenceId: string;
  programDays: ProgramDay[];
  loading?: boolean;
  /**
   * If true, shows curated preview (3-6 highlights).
   * If false, shows full program tab.
   * Default: true
   */
  previewMode?: boolean;
}

export function ProgramSection({ 
  conferenceId,
  programDays, 
  loading = false,
  previewMode = true,
}: ProgramSectionProps) {
  // Hard boundary: delegate to mode-specific implementations
  if (previewMode) {
    return (
      <ProgramPreviewContent
        conferenceId={conferenceId}
        programDays={programDays}
        loading={loading}
      />
    );
  }

  return (
    <FullProgramContent
      conferenceId={conferenceId}
      programDays={programDays}
    />
  );
}

// ============================================================================
// PREVIEW MODE: Curated Highlights
// ============================================================================

interface ProgramPreviewContentProps {
  conferenceId: string;
  programDays: ProgramDay[];
  loading: boolean;
}

function ProgramPreviewContent({
  conferenceId,
  programDays,
  loading,
}: ProgramPreviewContentProps) {
  const { toggleFavorite } = useFavoritesContext();
  const [selectedDayId, setSelectedDayId] = useState(programDays[0]?.id || '');
  if (loading) {
    return (
      <section id="program-section" className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (programDays.length === 0) {
    return (
      <section id="program-section" className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6">Program</h2>
          <p className="text-muted-foreground">
            Program schedule will be published soon.
          </p>
        </div>
      </section>
    );
  }

  // Calculate stats for preview mode
  const totalPresentations = programDays.reduce((total, day) => {
    return total + (day.sessions || []).reduce((dayTotal, session) => {
      return dayTotal + (session.presentations || []).length;
    }, 0);
  }, 0);

  const totalSessions = programDays.reduce((total, day) => {
    return total + (day.sessions || []).length;
  }, 0);

  const totalSpeakers = countUniqueSpeakers(programDays);
  const topics = extractProgramTopics(programDays);

  // Get highlights for selected day
  const selectedDay = programDays.find(d => d.id === selectedDayId) || programDays[0];
  const dayHighlights = selectProgramHighlights(selectedDay ? [selectedDay] : [], 6);

  return (
    <section id="program-section" className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <ProgramPreviewHeader
          totalDays={programDays.length}
          totalPresentations={totalPresentations}
          totalSessions={totalSessions}
        />

        <DaySelector
          days={programDays.map(d => ({ id: d.id, date: d.date, label: d.label }))}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
        />

        {dayHighlights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dayHighlights.map((highlight) => (
              <ProgramHighlightCard
                key={highlight.id}
                highlight={highlight}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No highlights available for this day yet.
          </p>
        )}

        <ProgramMetaRow
          totalDays={programDays.length}
          totalSpeakers={totalSpeakers}
          topics={topics}
        />

        <ViewFullProgramCTA conferenceId={conferenceId} />
      </div>
    </section>
  );
}

// ============================================================================
// FULL MODE: Complete Program Tab
// ============================================================================

interface FullProgramContentProps {
  conferenceId: string;
  programDays: ProgramDay[];
}

function FullProgramContent({
  conferenceId,
  programDays,
}: FullProgramContentProps) {
  const { toggleFavorite } = useFavoritesContext();

  return (
    <section id="program-section" className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Program Schedule</h2>
        </div>
        
        <ProgramTab
          conferenceId={conferenceId}
          days={programDays}
          isAuthenticated={true}
          onToggleFavorite={(presentationId) => toggleFavorite(String(presentationId))}
        />
      </div>
    </section>
  );
}
