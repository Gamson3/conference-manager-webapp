import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Users, Clock, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgramHighlight {
  id: string;
  title: string;
  authors: Array<{ name: string; affiliation?: string }>;
  startTime: string;
  endTime: string;
  room?: string;
  sessionType: 'keynote' | 'presentation' | 'panel' | 'workshop' | 'poster' | 'other';
  isFavorite: boolean;
  isKeynote: boolean;
}

interface ProgramHighlightCardProps {
  highlight: ProgramHighlight;
  onToggleFavorite: (id: string) => void;
}

const SESSION_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  keynote: { label: 'Keynote', icon: <Sparkles className="h-3.5 w-3.5" /> },
  panel: { label: 'Panel', icon: <Users className="h-3.5 w-3.5" /> },
  workshop: { label: 'Workshop', icon: <Users className="h-3.5 w-3.5" /> },
  presentation: { label: 'Talk', icon: null },
  poster: { label: 'Poster', icon: null },
  other: { label: 'Session', icon: null },
};

export function ProgramHighlightCard({ highlight, onToggleFavorite }: ProgramHighlightCardProps) {
  const typeInfo = SESSION_TYPE_LABELS[highlight.sessionType] || SESSION_TYPE_LABELS.other;
  const primaryAuthor = highlight.authors[0];
  const hasMultipleAuthors = highlight.authors.length > 1;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      highlight.isKeynote && 'border-primary bg-primary/5'
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Type Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {typeInfo.icon}
            <span>{typeInfo.label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(highlight.id);
            }}
          >
            <Star
              className={cn(
                'h-4 w-4',
                highlight.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
              )}
            />
          </Button>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">
          {highlight.title}
        </h3>

        {/* Author */}
        {primaryAuthor && (
          <p className="text-xs text-muted-foreground">
            {primaryAuthor.name}
            {primaryAuthor.affiliation && (
              <span className="text-muted-foreground/60"> · {primaryAuthor.affiliation}</span>
            )}
            {hasMultipleAuthors && (
              <span className="text-muted-foreground/60"> +{highlight.authors.length - 1} more</span>
            )}
          </p>
        )}

        {/* Time & Location */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {highlight.startTime} – {highlight.endTime}
            </span>
          </div>
          {highlight.room && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{highlight.room}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
