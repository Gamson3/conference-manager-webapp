"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Clock,
  MapPin,
  User,
  ChevronRight,
  XCircle,
} from "lucide-react";

import { ScheduleConflict, SchedulerDay } from "@/types/scheduler";

interface ConflictPanelProps {
  conflicts: ScheduleConflict[];
  days: SchedulerDay[];
  onNavigate: (sessionId: number) => void;
}

interface ConflictDialogProps extends ConflictPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ConflictContent({ conflicts, days, onNavigate }: ConflictPanelProps) {
  // Group conflicts by type
  const sessionOverflows = conflicts.filter(c => c.type === "SESSION_OVERFLOW");
  const roomOverlaps = conflicts.filter(c => c.type === "ROOM_OVERLAP");
  const presenterConflicts = conflicts.filter(c => c.type === "PRESENTER_CONFLICT");

  // Helper to find session name by ID
  const getSessionName = (sessionId: number): string => {
    for (const day of days) {
      const session = day.sessions.find(s => s.id === sessionId);
      if (session) return session.name;
    }
    return `Session #${sessionId}`;
  };

  // Helper to find presentation title by ID
  const getPresentationTitle = (presentationId: number): string => {
    for (const day of days) {
      for (const session of day.sessions) {
        const pres = session.presentations.find(p => p.id === presentationId);
        if (pres) return pres.title;
      }
    }
    return `Presentation #${presentationId}`;
  };

  const criticalCount = roomOverlaps.length + presenterConflicts.length;
  const warningCount = sessionOverflows.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {criticalCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            {criticalCount} Critical
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warningCount} Warning
          </Badge>
        )}
      </div>

      {criticalCount > 0 && (
        <p className="text-xs text-destructive">
          Critical conflicts must be resolved before publishing.
        </p>
      )}

      {/* Session Overflow (Warnings) */}
      {sessionOverflows.length > 0 && (
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            Session Overflow
          </h3>
          <div className="space-y-2">
            {sessionOverflows.map((conflict, idx) => (
              <Card key={`overflow-${idx}`} className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getSessionName(conflict.sessionId!)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total duration exceeds session time
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(conflict.sessionId!)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Room Overlaps (Critical) */}
      {roomOverlaps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-red-600" />
            Room Overlap
          </h3>
          <div className="space-y-2">
            {roomOverlaps.map((conflict, idx) => (
              <Card key={`room-${idx}`} className="bg-red-50 border-red-200">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {conflict.roomKey?.split("::")[1] || "Unknown room"}
                  </p>
                  <div className="space-y-1">
                    {conflict.sessions?.map(sessionId => (
                      <div key={sessionId} className="flex items-center justify-between">
                        <p className="text-sm truncate flex-1">
                          {getSessionName(sessionId)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate(sessionId)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Presenter Conflicts (Critical) */}
      {presenterConflicts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-red-600" />
            Presenter Double-Booked
          </h3>
          <div className="space-y-2">
            {presenterConflicts.map((conflict, idx) => (
              <Card key={`presenter-${idx}`} className="bg-red-50 border-red-200">
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-1">{conflict.presenter}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Scheduled for overlapping presentations:
                  </p>
                  <ul className="space-y-1 text-xs">
                    {conflict.presentations?.map(presId => (
                      <li key={presId} className="truncate">
                        • {getPresentationTitle(presId)}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No conflicts */}
      {conflicts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No conflicts detected</p>
        </div>
      )}
    </div>
  );
}

export function ConflictDialog({ open, onOpenChange, conflicts, days, onNavigate }: ConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Schedule Validation
          </DialogTitle>
          <DialogDescription>
            Review and resolve conflicts. Critical conflicts block publishing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <ConflictContent conflicts={conflicts} days={days} onNavigate={onNavigate} />
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConflictPanel({ conflicts, days, onNavigate }: ConflictPanelProps) {
  const sessionOverflows = conflicts.filter(c => c.type === "SESSION_OVERFLOW");
  const roomOverlaps = conflicts.filter(c => c.type === "ROOM_OVERLAP");
  const presenterConflicts = conflicts.filter(c => c.type === "PRESENTER_CONFLICT");
  const criticalCount = roomOverlaps.length + presenterConflicts.length;
  const warningCount = sessionOverflows.length;

  return (
    <div className="hidden md:flex md:w-80 md:border-l bg-muted/30 flex-col">
      <div className="p-3 md:p-4 border-b bg-background">
        <h2 className="font-semibold flex items-center gap-2 text-sm md:text-base">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          Conflicts
        </h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              {criticalCount} Critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {warningCount} Warning
            </Badge>
          )}
        </div>
        {criticalCount > 0 && (
          <p className="text-xs text-destructive mt-2">
            Critical conflicts must be resolved before publishing.
          </p>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 md:p-4 space-y-4">
          <ConflictContent conflicts={conflicts} days={days} onNavigate={onNavigate} />
        </div>
      </ScrollArea>
    </div>
  );
}
