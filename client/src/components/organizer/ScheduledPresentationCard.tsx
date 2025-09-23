import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClockIcon, EyeIcon, MoveIcon } from "lucide-react";


interface Presentation {
  id: number;
  title: string;
  authors?: Array<{
    id: number;
    authorName: string;
    authorEmail: string;
    affiliation: string;
    isPresenter: boolean;
  }>;
  category?: {
    id: number;
    name: string;
    color: string;
  };
  finalDuration?: number;
}

interface ScheduledPresentationCardProps {
  presentation: Presentation;
  onView: () => void;
  onUnschedule: () => void;
  isCompact?: boolean;
}

export function ScheduledPresentationCard({
  presentation,
  onView,
  onUnschedule,
  isCompact = false,
}: ScheduledPresentationCardProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">
            {presentation.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {presentation.authors?.[0]?.authorName}
            {presentation.authors &&
              presentation.authors.length > 1 &&
              ` +${presentation.authors.length - 1}`}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {presentation.category && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  backgroundColor: `${presentation.category.color || "#6B7280"}20`,
                  borderColor: presentation.category.color || "#6B7280",
                  color: presentation.category.color || "#6B7280",
                }}
              >
                {presentation.category.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              {presentation.finalDuration || 0}min
            </span>
          </div>
        </div>
        <div className="flex gap-1 ml-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-1 py-1 h-auto"
            onClick={onView}
            title="View details"
          >
            <EyeIcon className="h-3 w-3" />
            {!isCompact && <span className="ml-1">View</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-1 py-1 h-auto"
            onClick={onUnschedule}
            title="Unschedule presentation"
          >
            <MoveIcon className="h-3 w-3" />
            {!isCompact && <span className="ml-1">Unschedule</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}