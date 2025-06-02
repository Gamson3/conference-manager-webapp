import { useState, useMemo } from 'react';
import { Presentation } from '@/types/presentation';

interface UseScheduleFiltersProps {
  initialViewMode: 'list' | 'grid';
  initialGroupBy: string;
  showFavoritesOnly: boolean;
  presentations: Presentation[];
}

export function useScheduleFilters({
  initialViewMode,
  initialGroupBy,
  showFavoritesOnly,
  presentations
}: UseScheduleFiltersProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(initialViewMode);
  const [groupBy, setGroupBy] = useState<string>(initialGroupBy);
  const [filterBy, setFilterBy] = useState<string>(showFavoritesOnly ? 'favorites' : 'all');
  const [sortBy, setSortBy] = useState<string>('time');

  const getFilteredAndSortedPresentations = useMemo(() => {
    if (!presentations || presentations.length === 0) return [];
    
    let filtered = [...presentations];

    // Apply filters
    switch (filterBy) {
      case 'favorites':
        filtered = filtered.filter(p => p.isFavorite);
        break;
      case 'keynote':
      case 'presentation':
      case 'workshop':
      case 'panel':
        filtered = filtered.filter(p => p.section.type === filterBy);
        break;
      // 'all' case - no filtering needed
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'time':
          if (!a.section.startTime || !b.section.startTime) return 0;
          return new Date(a.section.startTime).getTime() - new Date(b.section.startTime).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'popularity':
          return b.favoriteCount - a.favoriteCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [presentations, filterBy, sortBy]);

  const getGroupedPresentations = useMemo(() => {
    const filtered = getFilteredAndSortedPresentations;
    
    if (groupBy === 'none') {
      return { 'All Presentations': filtered };
    }

    const groups = filtered.reduce((acc: { [key: string]: Presentation[] }, presentation) => {
      let key: string;
      
      switch (groupBy) {
        case 'day':
          key = presentation.section.day?.name || 'Unscheduled';
          break;
        case 'section':
          key = presentation.section.name;
          break;
        case 'type':
          key = presentation.section.type.charAt(0).toUpperCase() + presentation.section.type.slice(1);
          break;
        default:
          key = 'All';
      }

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(presentation);
      return acc;
    }, {});

    // Sort groups by key for consistent ordering
    const sortedGroups: { [key: string]: Presentation[] } = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [getFilteredAndSortedPresentations, groupBy]);

  return {
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
  };
}