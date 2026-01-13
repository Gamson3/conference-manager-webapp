"use client";

import React from "react";
import { TreeDay } from "../types";
import { SessionNode } from "./SessionNode";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DayNodeProps {
  day: TreeDay;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSessions: Set<number>;
  onToggleSession: (sessionId: number) => void;
  highlightedPresentationId: number | null;
  selectedPresentationId: number | null;
  onSelectPresentation: (id: number | null) => void;
  onToggleFavorite?: (presentationId: number) => void;
  onViewPresentationDetails?: (presentationId: number) => void;
}

export function DayNode({
  day,
  isExpanded,
  onToggle,
  expandedSessions,
  onToggleSession,
  highlightedPresentationId,
  selectedPresentationId,
  onSelectPresentation,
  onToggleFavorite,
  onViewPresentationDetails,
}: DayNodeProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        weekday: "long", 
        month: "long", 
        day: "numeric", 
        year: "numeric" 
      });
    } catch {
      return dateStr;
    }
  };

  const totalSessions = day.sessions.length;
  const totalPresentations = day.sessions.reduce(
    (sum, s) => sum + s.presentations.length, 
    0
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Day Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 py-3 px-4 text-left transition-colors",
          isExpanded ? "bg-primary/5" : "bg-card hover:bg-muted/50"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-primary flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
        
        <Calendar className={cn(
          "h-5 w-5 flex-shrink-0",
          isExpanded ? "text-primary" : "text-muted-foreground"
        )} />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-semibold",
              isExpanded && "text-primary"
            )}>
              {day.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatDate(day.date)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {totalSessions} session{totalSessions !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalPresentations} presentation{totalPresentations !== 1 ? "s" : ""}
          </Badge>
        </div>
      </button>

      {/* Sessions */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-card">
          {day.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sessions scheduled for this day
            </p>
          ) : (
            day.sessions
              .sort((a, b) => {
                // Sort by start time if available
                if (a.startTime && b.startTime) {
                  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                }
                return 0;
              })
              .map((session) => (
                <SessionNode
                  key={session.id}
                  session={session}
                  isExpanded={expandedSessions.has(session.id)}
                  onToggle={() => onToggleSession(session.id)}
                  highlightedPresentationId={highlightedPresentationId}
                  selectedPresentationId={selectedPresentationId}
                  onSelectPresentation={onSelectPresentation}
                  onToggleFavorite={onToggleFavorite}
                  onViewPresentationDetails={onViewPresentationDetails}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
}

export default DayNode;
