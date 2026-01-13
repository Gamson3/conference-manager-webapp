// SearchResults - Displays search results with highlighting
'use client';

import Link from 'next/link';
import { Search, Calendar, Clock, MapPin, User, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FavoriteButton } from '@/features/favorites';
import { highlightMatches } from '../api/searchApi';
import type { SearchResult } from '../types';
import type { UseSearchReturn } from '../hooks/useSearch';

interface SearchResultsProps {
  searchHook: UseSearchReturn;
  conferenceId: string;
  /**
   * Maximum height for scrollable results
   */
  maxHeight?: string;
  /**
   * Show "Jump to Tree" button
   */
  showJumpToTree?: boolean;
  /**
   * Callback when a result is clicked
   */
  onResultClick?: (result: SearchResult) => void;
  className?: string;
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function ResultCard({
  result,
  query,
  conferenceId,
  showJumpToTree,
  onResultClick,
}: {
  result: SearchResult;
  query: string;
  conferenceId: string;
  showJumpToTree?: boolean;
  onResultClick?: (result: SearchResult) => void;
}) {
  const handleClick = () => {
    onResultClick?.(result);
  };

  // Create highlighted title
  const highlightedTitle = highlightMatches(result.title, query);

  return (
    <Card 
      className={cn(
        'hover:bg-accent/50 transition-colors',
        onResultClick && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title with highlighting */}
            <h4 
              className="font-medium text-sm leading-tight mb-1"
              dangerouslySetInnerHTML={{ __html: highlightedTitle }}
            />

            {/* Authors */}
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <User className="h-3 w-3" />
              {result.authors.map((a) => a.name).join(', ')}
            </p>

            {/* Session info */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(result.day.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(result.session.startTime)} - {formatTime(result.session.endTime)}
              </span>
              {result.session.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {result.session.room}
                </span>
              )}
            </div>

            {/* Session title */}
            <p className="text-xs text-muted-foreground mb-2">
              <span className="font-medium">Session:</span> {result.session.title}
            </p>

            {/* Keywords */}
            {result.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.keywords.slice(0, 4).map((keyword) => {
                  const isMatch = query.toLowerCase().includes(keyword.toLowerCase()) ||
                    keyword.toLowerCase().includes(query.toLowerCase());
                  return (
                    <Badge 
                      key={keyword} 
                      variant={isMatch ? 'default' : 'secondary'} 
                      className="text-xs py-0 px-1.5"
                    >
                      {keyword}
                    </Badge>
                  );
                })}
                {result.keywords.length > 4 && (
                  <Badge variant="outline" className="text-xs py-0 px-1.5">
                    +{result.keywords.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Abstract snippet */}
            {result.abstract && (
              <p 
                className="text-xs text-muted-foreground mt-2 line-clamp-2"
                dangerouslySetInnerHTML={{ 
                  __html: highlightMatches(
                    result.abstract.substring(0, 200) + (result.abstract.length > 200 ? '...' : ''),
                    query
                  )
                }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <FavoriteButton presentationId={result.id} buttonSize="sm" />
            {showJumpToTree && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 px-2 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <Link href={`/conferences/${conferenceId}/tree?highlight=${result.id}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Tree
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SearchResults({
  searchHook,
  conferenceId,
  maxHeight,
  showJumpToTree = true,
  onResultClick,
  className,
}: SearchResultsProps) {
  const { results, totalCount, isLoading, error, hasSearched, query } = searchHook;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => searchHook.searchNow()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Initial state (no search yet)
  if (!hasSearched) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">
          Enter a search term to find presentations
        </p>
      </div>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">No results found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          No presentations match &quot;{query}&quot;. Try adjusting your search terms or filters.
        </p>
      </div>
    );
  }

  // Results list
  const resultsList = (
    <div className="space-y-3">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {totalCount} result{totalCount !== 1 ? 's' : ''} for &quot;{query}&quot;
        </span>
      </div>

      {/* Results */}
      {results.map((result) => (
        <ResultCard
          key={result.id}
          result={result}
          query={query}
          conferenceId={conferenceId}
          showJumpToTree={showJumpToTree}
          onResultClick={onResultClick}
        />
      ))}
    </div>
  );

  if (maxHeight) {
    return (
      <ScrollArea className={cn(maxHeight, className)}>
        {resultsList}
      </ScrollArea>
    );
  }

  return <div className={className}>{resultsList}</div>;
}
