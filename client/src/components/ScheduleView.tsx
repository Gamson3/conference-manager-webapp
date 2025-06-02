"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Components
import ScheduleControls from '@/components/schedule/ScheduleControls';
import ScheduleGrouping from '@/components/schedule/ScheduleGrouping';
import LoadingStates from '@/components/shared/LoadingStates';
import { NoDataState, NoPresentationsState } from '@/components/shared/EmptyStates';

// Hooks
import { useFavorites } from '@/hooks/useFavorites';
import { useScheduleFilters } from '@/hooks/useScheduleFilters';

// Types
import { Presentation, ScheduleViewProps } from '@/types/schedule';

export default function ScheduleView({
  conferenceId,
  className = "",
  viewMode: initialViewMode = 'list',
  showFavoritesOnly = false,
  onPresentationSelect,
  groupBy: initialGroupBy = 'day'
}: ScheduleViewProps) {
  const router = useRouter();
  const { favoriteLoading, toggleFavorite } = useFavorites();
  
  // State management
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and view state
  const {
    viewMode,
    setViewMode,
    groupBy,
    setGroupBy,
    filterBy,
    setFilterBy,
    sortBy,
    setSortBy,
    getFilteredAndSortedPresentations,
    getGroupedPresentations
  } = useScheduleFilters({
    initialViewMode,
    initialGroupBy,
    showFavoritesOnly,
    presentations
  });

  // Fetch presentations
  const fetchPresentations = useCallback(async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      const response = await api.get(`/conferences/${conferenceId}/schedule`);
      
      // Extract presentations from the hierarchical structure
      const extractedPresentations = response.data.days?.flatMap((day: any) =>
        day.sections?.flatMap((section: any) =>
          section.presentations?.map((presentation: any) => ({
            ...presentation,
            section: {
              ...section,
              day: day
            }
          })) || []
        ) || []
      ) || [];
      
      setPresentations(extractedPresentations);
    } catch (error: any) {
      console.error('Error fetching presentations:', error);
      setError(error.response?.data?.message || 'Failed to load presentations');
      toast.error('Failed to load conference presentations');
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  // Handle favorite update
  const handleFavoriteUpdate = (id: number, newState: boolean) => {
    setPresentations(prev => 
      prev.map(p => 
        p.id === id 
          ? { 
              ...p, 
              isFavorite: newState,
              favoriteCount: newState ? p.favoriteCount + 1 : p.favoriteCount - 1
            }
          : p
      )
    );
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (presentationId: number) => {
    const presentation = presentations.find(p => p.id === presentationId);
    if (!presentation) return;
    
    toggleFavorite(presentationId, presentation.isFavorite, handleFavoriteUpdate);
  };

  // Loading state
  if (loading) {
    return <LoadingStates variant="cards" count={6} className={className} />;
  }

  // Error state
  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          Failed to Load Schedule
        </h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchPresentations}>
          Try Again
        </Button>
      </div>
    );
  }

  const groupedPresentations = getGroupedPresentations();
  const groupKeys = Object.keys(groupedPresentations);

  // Empty state
  if (presentations.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <NoPresentationsState
          filterType={filterBy}
          onResetFilters={() => {
            setFilterBy('all');
            setGroupBy('day');
            setSortBy('time');
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Conference Schedule</h2>
          <p className="text-gray-600">
            {presentations.length} presentation{presentations.length !== 1 ? 's' : ''} available
          </p>
        </div>

        <ScheduleControls
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterBy={filterBy}
          setFilterBy={setFilterBy}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </div>

      {/* Presentations grouped content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${groupBy}-${filterBy}-${sortBy}-${viewMode}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {groupKeys.length === 0 ? (
            <NoDataState
              title="No Matching Presentations"
              description="Try adjusting your filters or search criteria"
              action={{
                label: "Reset Filters",
                onClick: () => {
                  setFilterBy('all');
                  setGroupBy('day');
                  setSortBy('time');
                }
              }}
            />
          ) : (
            <ScheduleGrouping
              groupedPresentations={groupedPresentations}
              groupBy={groupBy}
              viewMode={viewMode}
              onPresentationSelect={onPresentationSelect}
              onFavoriteToggle={handleFavoriteToggle}
              favoriteLoading={favoriteLoading}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}