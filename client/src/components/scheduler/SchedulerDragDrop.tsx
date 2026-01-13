"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  MapPin,
  User,
  GripVertical,
  AlertTriangle,
  Package,
} from "lucide-react";

import {
  SchedulerPresentation,
  SchedulerSession,
  ScheduleConflict,
} from "@/types/scheduler";

// Helper function to format time from ISO datetime or time string
const formatSessionTime = (timeStr?: string): string => {
  if (!timeStr) return "";
  // If it's an ISO datetime string (e.g., "2026-06-15T10:30:00.000Z"), extract the time part
  if (timeStr.includes('T')) {
    return timeStr.split('T')[1].slice(0, 5); // Returns "HH:MM"
  }
  // If it's already just a time string (e.g., "10:30"), return it
  return timeStr.slice(0, 5);
};

// ============================================================================
// Draggable Presentation Card
// ============================================================================

interface DraggablePresentationProps {
  presentation: SchedulerPresentation;
  sessionId: number | null;
  hasConflict?: boolean;
}

export function DraggablePresentation({
  presentation,
  sessionId,
  hasConflict,
}: DraggablePresentationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: presentation.id,
    data: {
      type: "presentation",
      sessionId,
      presentation,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group bg-white border rounded-md p-2 cursor-grab active:cursor-grabbing
        hover:border-primary/50 hover:shadow-sm transition-all
        ${hasConflict ? "border-red-300 bg-red-50" : ""}
        ${isDragging ? "shadow-lg ring-2 ring-primary/20" : ""}
      `}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={presentation.title}>
            {presentation.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {presentation.durationMins} min
            </span>
            {presentation.presenters.length > 0 && (
              <span className="flex items-center gap-1 truncate">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {presentation.presenters.map(p => p.name).join(", ")}
                </span>
              </span>
            )}
          </div>
          {presentation.category && (
            <Badge
              variant="outline"
              className="mt-1 text-xs flex-shrink-0 whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                borderColor: presentation.category.color,
                color: presentation.category.color,
              }}
            >
              {presentation.category.name}
            </Badge>
          )}
        </div>
        {hasConflict && (
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Droppable Session Container
// ============================================================================

interface DroppableSessionProps {
  session: SchedulerSession;
  conflicts: ScheduleConflict[];
}

export function DroppableSession({ session, conflicts }: DroppableSessionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: session.id,
    data: {
      type: "session",
      session,
    },
  });

  // Check if this session is a break/non-presentation session
  const isNonPresentationSession = ['break', 'networking', 'ceremony'].includes(
    session.type?.toLowerCase() || ''
  );

  // Check if this session has conflicts
  const sessionConflicts = conflicts.filter(c => {
    if (c.type === "SESSION_OVERFLOW" && c.sessionId === session.id) return true;
    if (c.type === "ROOM_OVERLAP" && c.sessions?.includes(session.id)) return true;
    return false;
  });

  // Check which presentations have conflicts
  const conflictingPresentationIds = new Set<number>();
  conflicts.forEach(c => {
    if (c.type === "PRESENTER_CONFLICT") {
      c.presentations?.forEach(id => conflictingPresentationIds.add(id));
    }
  });

  // Calculate total duration
  const totalDuration = session.presentations.reduce(
    (sum, p) => sum + (p.durationMins || 0),
    0
  );

  // Calculate session capacity in minutes
  let sessionCapacity = 0;
  if (session.startTime && session.endTime) {
    const start = new Date(`2000-01-01T${session.startTime}`);
    const end = new Date(`2000-01-01T${session.endTime}`);
    sessionCapacity = (end.getTime() - start.getTime()) / (1000 * 60);
  }

  const isOverflow = sessionCapacity > 0 && totalDuration > sessionCapacity;

  return (
    <Card
      id={`session-${session.id}`}
      ref={setNodeRef}
      className={`
        transition-all min-h-[200px]
        ${isOver && !isNonPresentationSession ? "ring-2 ring-primary/50 bg-primary/5" : ""}
        ${sessionConflicts.length > 0 ? "border-red-300" : ""}
        ${isNonPresentationSession ? "opacity-75 bg-muted/30" : ""}
      `}
    >
      <CardHeader className="pb-3">
        <div className="space-y-2">
          {/* Session Name and Type Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium flex-shrink-0">
              {session.name}
            </CardTitle>
            {isNonPresentationSession && (
              <Badge variant="outline" className="text-xs flex-shrink-0" style={{ opacity: 0.7 }}>
                {session.type}
              </Badge>
            )}
          </div>

          {/* Time and Room Info */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {session.startTime && session.endTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                {formatSessionTime(session.startTime)} - {formatSessionTime(session.endTime)}
              </span>
            )}
            {session.room && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {session.room}
              </span>
            )}
          </div>

          {/* Items Count and Capacity */}
          <div className="flex gap-2 text-xs flex-wrap">
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {session.presentations.length} items
            </Badge>
            {sessionCapacity > 0 && (
              <span
                className={`flex-shrink-0 ${
                  isOverflow ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {totalDuration}/{sessionCapacity} min
              </span>
            )}
          </div>

          {/* Conflicts */}
          {sessionConflicts.length > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="text-xs">{sessionConflicts.map(c => c.type).join(", ")}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <SortableContext
          items={session.presentations.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[100px] overflow-hidden">
            {session.presentations.length === 0 ? (
              <div
                className={`
                  flex flex-col items-center justify-center h-24 
                  border-2 border-dashed rounded-md
                  text-muted-foreground text-sm
                  ${isNonPresentationSession ? "border-muted bg-muted/20 cursor-not-allowed opacity-50" : isOver ? "border-primary bg-primary/5" : "border-muted"}
                `}
              >
                <Package className="h-6 w-6 mb-1 opacity-50" />
                {isNonPresentationSession ? (
                  <span className="text-center">
                    <p className="font-medium">Presentations cannot be added</p>
                    <p className="text-xs">This is a {session.type} session</p>
                  </span>
                ) : (
                  "Drop presentations here"
                )}
              </div>
            ) : (
              session.presentations.map(presentation => (
                <DraggablePresentation
                  key={presentation.id}
                  presentation={presentation}
                  sessionId={session.id}
                  hasConflict={conflictingPresentationIds.has(presentation.id)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Unassigned Presentations Sidebar
// ============================================================================

interface UnassignedSidebarProps {
  presentations: SchedulerPresentation[];
}

export function UnassignedSidebar({ presentations }: UnassignedSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned",
    data: {
      type: "unassigned",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        w-full lg:w-80 lg:border-r bg-muted/30 flex flex-col
        max-h-48 lg:max-h-none
        ${isOver ? "bg-primary/5" : ""}
      `}
    >
      <div className="p-4 border-b bg-background">
        <h2 className="font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Unassigned
          <Badge variant="secondary">{presentations.length}</Badge>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Accepted presentations not yet scheduled
        </p>
      </div>
      <ScrollArea className="flex-1">
        <SortableContext
          items={presentations.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-4 space-y-2">
            {presentations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All presentations scheduled!</p>
              </div>
            ) : (
              presentations.map(presentation => (
                <DraggablePresentation
                  key={presentation.id}
                  presentation={presentation}
                  sessionId={null}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
