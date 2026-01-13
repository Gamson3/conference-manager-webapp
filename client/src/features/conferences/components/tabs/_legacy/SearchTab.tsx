// SearchTab - Search within conference presentations
'use client';

import { SearchBar, SearchFilters, SearchResults, useSearch } from '@/features/search';

interface SearchTabProps {
  conferenceId: string;
  days: Array<{ id: string; date: string; label?: string }>;
  onResultClick?: (presentationId: string) => void;
}

export function SearchTab({ conferenceId, days, onResultClick }: SearchTabProps) {
  const searchHook = useSearch({
    conferenceId,
    debounceMs: 300,
    minQueryLength: 2,
  });

  const handleResultClick = (result: { id: string }) => {
    onResultClick?.(result.id);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <SearchBar
        searchHook={searchHook}
        placeholder="Search by title, author, keyword, or session..."
        showFieldSelector
      />

      {/* Filters */}
      <SearchFilters
        searchHook={searchHook}
        days={days}
        sessionTypes={[
          { value: 'presentation', label: 'Presentations' },
          { value: 'keynote', label: 'Keynotes' },
          { value: 'workshop', label: 'Workshops' },
          { value: 'panel', label: 'Panels' },
        ]}
      />

      {/* Results */}
      <SearchResults
        searchHook={searchHook}
        conferenceId={conferenceId}
        showJumpToTree
        onResultClick={handleResultClick}
      />
    </div>
  );
}
