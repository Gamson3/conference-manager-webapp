// FavoritesList - Displays user's favorited presentations
'use client';

import Link from 'next/link';
import { Heart, Calendar, Clock, MapPin, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useFavoritesContext } from '../context/FavoritesContext';
import { FavoriteButton } from './FavoriteButton';
import type { FavoritePresentation, FavoritesGroupedByConference } from '../types';

interface FavoritesListProps {
  /**
   * Optional: Filter to show only favorites from a specific conference
   */
  conferenceId?: string;
  /**
   * Whether to group by conference (default: true for cross-conference view)
   */
  groupByConference?: boolean;
  /**
   * Maximum height for the list (for embedded views)
   */
  maxHeight?: string;
  /**
   * Callback when a presentation is clicked
   */
  onPresentationClick?: (presentation: FavoritePresentation) => void;
  /**
   * Whether to show the "Jump to Tree" button
   */
  showJumpToTree?: boolean;
  /**
   * Custom class name
   */
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

function PresentationItem({
  presentation,
  showConference = false,
  showJumpToTree = false,
  onPresentationClick,
}: {
  presentation: FavoritePresentation;
  showConference?: boolean;
  showJumpToTree?: boolean;
  onPresentationClick?: (presentation: FavoritePresentation) => void;
}) {
  const handleClick = () => {
    onPresentationClick?.(presentation);
  };

  return (
    <div
      className={cn(
        'group p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary/20 transition-all',
        onPresentationClick && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-semibold text-base leading-tight mb-2 group-hover:text-primary transition-colors">
            {presentation.title}
          </h4>

          {/* Authors */}
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
            <span className="font-medium">Authors:</span>
            {presentation.authors.map((a) => a.name).join(', ')}
          </p>

          {/* Session Info */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{formatDate(presentation.day.date)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4 text-green-600" />
              {formatTime(presentation.session.startTime)} - {formatTime(presentation.session.endTime)}
            </span>
            {presentation.session.room && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4 text-orange-600" />
                {presentation.session.room}
              </span>
            )}
          </div>

          {/* Session Title */}
          <div className="mb-2">
            <Badge variant="outline" className="text-xs">
              Session: {presentation.session.title}
            </Badge>
          </div>

          {/* Conference name (when showing cross-conference) */}
          {showConference && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-primary font-semibold flex items-center gap-1">
                <ChevronRight className="h-4 w-4" />
                {presentation.conference.name}
              </p>
            </div>
          )}

          {/* Keywords */}
          {presentation.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {presentation.keywords.slice(0, 5).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {presentation.keywords.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{presentation.keywords.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          <FavoriteButton
            presentationId={presentation.id}
            buttonSize="sm"
            showLabel={false}
          />
          {showJumpToTree && (
            <Button
              variant="default"
              size="sm"
              asChild
              className="h-8 px-3 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/conferences/${presentation.conference.slug ?? presentation.conference.id}?tab=program&highlight=${presentation.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View in Program
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Abstract preview (if available) */}
      {presentation.abstract && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {presentation.abstract}
          </p>
        </div>
      )}
    </div>
  );
}

function ConferenceGroup({
  group,
  showJumpToTree,
  onPresentationClick,
}: {
  group: FavoritesGroupedByConference;
  showJumpToTree?: boolean;
  onPresentationClick?: (presentation: FavoritePresentation) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <Link
            href={`/conferences/${group.conferenceSlug ?? group.conferenceId}`}
            className="font-bold text-lg hover:text-primary transition-colors flex items-center gap-2 group"
          >
            {group.conferenceName}
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
            {group.presentations.length} favorite{group.presentations.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {group.presentations.map((presentation) => (
            <PresentationItem
              key={presentation.id}
              presentation={presentation}
              showJumpToTree={showJumpToTree}
              onPresentationClick={onPresentationClick}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FavoritesList({
  conferenceId,
  groupByConference = true,
  maxHeight,
  onPresentationClick,
  showJumpToTree = true,
  className,
}: FavoritesListProps) {
  // ✅ Use shared context instead of creating new instance
  const favoritesHook = useFavoritesContext();
  const { favorites, groupedByConference, isLoading, error } = favoritesHook;

  // Filter by conference if specified
  const filteredFavorites = conferenceId
    ? favorites.filter((f) => f.conference.id === conferenceId)
    : favorites;

  const filteredGroups = conferenceId
    ? groupedByConference.filter((g) => g.conferenceId === conferenceId)
    : groupedByConference;

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading favorites...</span>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="py-6">
          <p className="text-sm text-destructive text-center">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 mx-auto block"
            onClick={() => favoritesHook.refreshFavorites()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (filteredFavorites.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No favorites yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {conferenceId
              ? 'Start exploring this conference and save presentations you want to attend.'
              : 'Browse conferences and save presentations to your favorites list.'}
          </p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/conferences">Browse Conferences</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const content = groupByConference ? (
    <div className="space-y-6">
      {filteredGroups.map((group) => (
        <ConferenceGroup
          key={group.conferenceId}
          group={group}
          showJumpToTree={showJumpToTree}
          onPresentationClick={onPresentationClick}
        />
      ))}
    </div>
  ) : (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          My Favorites
        </CardTitle>
        <CardDescription>
          {filteredFavorites.length} presentation{filteredFavorites.length !== 1 ? 's' : ''} saved
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {maxHeight ? (
          <ScrollArea className={maxHeight}>
            <div className="space-y-3">
              {filteredFavorites.map((presentation) => (
                <PresentationItem
                  key={presentation.id}
                  presentation={presentation}
                  showConference={!conferenceId}
                  showJumpToTree={showJumpToTree}
                  onPresentationClick={onPresentationClick}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-3">
            {filteredFavorites.map((presentation) => (
              <PresentationItem
                key={presentation.id}
                presentation={presentation}
                showConference={!conferenceId}
                showJumpToTree={showJumpToTree}
                onPresentationClick={onPresentationClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return maxHeight && groupByConference ? (
    <ScrollArea className={maxHeight}>
      {content}
    </ScrollArea>
  ) : (
    content
  );
}
