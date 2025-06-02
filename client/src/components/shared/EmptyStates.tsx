import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  Search, 
  Heart, 
  BookOpen, 
  Users, 
  FileText,
  Filter,
  Clock,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  variant?: 'search' | 'favorites' | 'schedule' | 'presentations' | 'general';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const getEmptyStateConfig = (variant: string) => {
  switch (variant) {
    case 'search':
      return {
        icon: Search,
        title: 'No results found',
        description: 'Try adjusting your search terms or check your spelling.'
      };
    case 'favorites':
      return {
        icon: Heart,
        title: 'No favorites yet',
        description: 'Save presentations you\'re interested in to see them here.'
      };
    case 'schedule':
      return {
        icon: Calendar,
        title: 'No schedule available',
        description: 'The schedule for this conference hasn\'t been published yet.'
      };
    case 'presentations':
      return {
        icon: BookOpen,
        title: 'No presentations available',
        description: 'There are no presentations matching your current filters.'
      };
    default:
      return {
        icon: FileText,
        title: 'No content available',
        description: 'There\'s nothing to show here at the moment.'
      };
  }
};

export function EmptySearchResults({ 
  query, 
  onClearSearch, 
  onTryGlobal,
  className 
}: { 
  query: string; 
  onClearSearch: () => void;
  onTryGlobal?: () => void;
  className?: string; 
}) {
  return (
    <Card className={className}>
      <CardContent className="text-center py-12">
        <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No results found</h3>
        <p className="text-gray-500 mb-6">
          No presentations match your search for "{query}"
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onClearSearch}>
            Clear Search
          </Button>
          {onTryGlobal && (
            <Button onClick={onTryGlobal}>
              <Globe className="h-4 w-4 mr-2" />
              Search All Conferences
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyFavorites({ 
  onDiscoverClick,
  className 
}: { 
  onDiscoverClick: () => void;
  className?: string; 
}) {
  return (
    <div className={cn("text-center py-16", className)}>
      <Heart className="h-16 w-16 mx-auto text-gray-300 mb-6" />
      <h3 className="text-xl font-semibold mb-3">No favorites yet</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Start exploring presentations and save the ones you're interested in to see them here.
      </p>
      <Button onClick={onDiscoverClick}>
        <BookOpen className="h-4 w-4 mr-2" />
        Discover Presentations
      </Button>
    </div>
  );
}

export function EmptySchedule({ 
  filterType,
  onResetFilters,
  className 
}: { 
  filterType?: string;
  onResetFilters: () => void;
  className?: string; 
}) {
  const isFiltered = filterType && filterType !== 'all';
  
  return (
    <Card className={className}>
      <CardContent className="text-center py-12">
        {isFiltered ? (
          <>
            <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matching sessions</h3>
            <p className="text-gray-500 mb-6">
              No sessions found for the current filter. Try adjusting your filters.
            </p>
            <Button variant="outline" onClick={onResetFilters}>
              Reset Filters
            </Button>
          </>
        ) : (
          <>
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Schedule not available</h3>
            <p className="text-gray-500">
              The schedule for this conference hasn't been published yet.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyPresentations({ 
  isFiltered,
  onResetFilters,
  className 
}: { 
  isFiltered: boolean;
  onResetFilters: () => void;
  className?: string; 
}) {
  return (
    <div className={cn("text-center py-12", className)}>
      {isFiltered ? (
        <>
          <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matching presentations</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your filters or search criteria
          </p>
          <Button variant="outline" onClick={onResetFilters}>
            Reset Filters
          </Button>
        </>
      ) : (
        <>
          <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No presentations available</h3>
          <p className="text-gray-500">
            Presentations will appear here once they're added to the conference.
          </p>
        </>
      )}
    </div>
  );
}

export function NoDataState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div className={cn("text-center py-12", className)}>
      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function NoPresentationsState({ 
  filterType,
  onResetFilters,
  className 
}: { 
  filterType?: string;
  onResetFilters: () => void;
  className?: string; 
}) {
  return (
    <EmptyPresentations
      isFiltered={filterType !== undefined && filterType !== 'all'}
      onResetFilters={onResetFilters}
      className={className}
    />
  );
}

export default function EmptyStates({ 
  variant = 'general', 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  const config = getEmptyStateConfig(variant);
  const Icon = config.icon;
  
  return (
    <div className={cn("text-center py-12", className)}>
      <Icon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {title || config.title}
      </h3>
      <p className="text-gray-500 mb-4">
        {description || config.description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}