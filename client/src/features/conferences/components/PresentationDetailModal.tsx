'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Tag,
  Users,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PresentationAuthor {
  id: string;
  name: string;
  affiliation?: string;
  isPresenter?: boolean;
}

export interface PresentationDetailData {
  id: string;
  title: string;
  abstract?: string;
  keywords?: string[];
  authors: PresentationAuthor[];
  isFavorite?: boolean;
  session?: {
    title: string;
    room?: string;
    startTime: string;
    endTime: string;
    dayLabel?: string;
    dayDate?: string;
  };
}

interface PresentationDetailModalProps {
  presentation: PresentationDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated?: boolean;
  onToggleFavorite?: (presentationId: string) => void;
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

export function PresentationDetailModal({
  presentation,
  open,
  onOpenChange,
  isAuthenticated = false,
  onToggleFavorite,
}: PresentationDetailModalProps): React.JSX.Element | null {
  if (!presentation) return null;

  const hasAuthors = presentation.authors.length > 0;
  const hasKeywords = presentation.keywords && presentation.keywords.length > 0;
  const hasAbstract = presentation.abstract && presentation.abstract.trim().length > 0;
  const hasSession = !!presentation.session;
  
  // Find presenter (first author marked as presenter, or first author)
  const presenter = presentation.authors.find((a) => a.isPresenter) || presentation.authors[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-tight pr-8">
            {presentation.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Session Info */}
          {hasSession && presentation.session && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Session Information
              </h4>
              <p className="font-medium text-blue-800 mb-1">{presentation.session.title}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-700">
                {presentation.session.dayLabel && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {presentation.session.dayLabel}
                    {presentation.session.dayDate && ` (${presentation.session.dayDate})`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(presentation.session.startTime)} - {formatTime(presentation.session.endTime)}
                </span>
                {presentation.session.room && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {presentation.session.room}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Keywords - shown here in modal (not in classic view) */}
          {hasKeywords && presentation.keywords && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {presentation.keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="bg-gray-100 text-gray-700"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Authors */}
          {hasAuthors && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Authors
              </h4>
              <ul className="space-y-1.5">
                {presentation.authors.map((author, idx) => (
                  <li key={author.id || idx} className="text-sm">
                    <span className={cn(
                      "font-medium",
                      author.isPresenter && "text-blue-700"
                    )}>
                      {author.name}
                    </span>
                    {author.affiliation && (
                      <span className="text-muted-foreground"> — {author.affiliation}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Title Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Title
            </h4>
            <p className="text-base font-semibold text-slate-900">{presentation.title}</p>
          </div>

          {/* Speaker/Presenter */}
          {presenter && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Speaker
              </h4>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-semibold">
                  {presenter.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-blue-900">{presenter.name}</p>
                  {presenter.affiliation && (
                    <p className="text-sm text-blue-700">{presenter.affiliation}</p>
                  )}
                </div>
                <Badge variant="outline" className="ml-auto text-xs py-0.5 px-2 border-blue-300 text-blue-700">
                  Presenter
                </Badge>
              </div>
            </div>
          )}

          {/* Abstract */}
          {hasAbstract && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Abstract
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {presentation.abstract}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          {isAuthenticated && onToggleFavorite && (
            <div className="pt-2 border-t">
              <Button
                variant={presentation.isFavorite ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'w-full',
                  presentation.isFavorite &&
                    'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
                )}
                onClick={() => onToggleFavorite(presentation.id)}
              >
                <Heart
                  className={cn(
                    'h-4 w-4 mr-2',
                    presentation.isFavorite && 'fill-current'
                  )}
                />
                {presentation.isFavorite ? 'Favorited' : 'Add to Favorites'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
