import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClockIcon, EyeIcon, GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Presentation } from "@/types/scheduleBuilder";

interface DraggablePresentationCardProps {
  presentation: Presentation;
  isDragging?: boolean;
  onView?: () => void;
}

export function DraggablePresentationCard({
  presentation,
  isDragging = false,
  onView,
}: DraggablePresentationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: presentation.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-white shadow-sm transition-all hover:shadow-md overflow-hidden",
        isCurrentlyDragging && "opacity-50",
        isDragging && "rotate-2 shadow-lg"
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className="p-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {presentation.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {presentation.authors?.[0]?.authorName}
              {presentation.authors &&
                presentation.authors.length > 1 &&
                ` +${presentation.authors.length - 1}`}
            </p>
          </div>
          <GripVerticalIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
        </div>

        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: `${presentation.category?.color || "#6B7280"}20`,
              color: presentation.category?.color || "#6B7280",
            }}
          >
            {presentation.category?.name || "Uncategorized"}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            {presentation.finalDuration || 0}min
          </span>
        </div>
      </div>

      <div className="px-3 pb-3 bg-gray-50/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs hover:bg-gray-100"
          onClick={onView}
        >
          <EyeIcon className="h-3 w-3 mr-2" />
          View Details
        </Button>
      </div>
    </div>
  );
}