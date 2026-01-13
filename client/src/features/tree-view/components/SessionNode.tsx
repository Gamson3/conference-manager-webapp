"use client";

import React from "react";
import { TreeSession } from "../types";
import { PresentationNode } from "./PresentationNode";
import { cn } from "@/lib/utils";
import { 
  ChevronRight, 
  ChevronDown, 
  Presentation, 
  Coffee, 
  Mic, 
  Users, 
  MessageSquare,
  Handshake,
  Clock,
  MapPin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SessionNodeProps {
  session: TreeSession;
  isExpanded: boolean;
  onToggle: () => void;
  highlightedPresentationId: number | null;
  selectedPresentationId: number | null;
  onSelectPresentation: (id: number | null) => void;
  onToggleFavorite?: (presentationId: number) => void;
  onViewPresentationDetails?: (presentationId: number) => void;
}

const sessionTypeConfig: Record<string, { icon: typeof Presentation; label: string; color: string }> = {
  presentation: { icon: Presentation, label: "Session", color: "bg-blue-500/10 text-blue-600" },
  break: { icon: Coffee, label: "Break", color: "bg-orange-500/10 text-orange-600" },
  keynote: { icon: Mic, label: "Keynote", color: "bg-purple-500/10 text-purple-600" },
  workshop: { icon: Users, label: "Workshop", color: "bg-green-500/10 text-green-600" },
  panel: { icon: MessageSquare, label: "Panel", color: "bg-indigo-500/10 text-indigo-600" },
  networking: { icon: Handshake, label: "Networking", color: "bg-pink-500/10 text-pink-600" },
};

export function SessionNode({
  session,
  isExpanded,
  onToggle,
  highlightedPresentationId,
  selectedPresentationId,
  onSelectPresentation,
  onToggleFavorite,
  onViewPresentationDetails,
}: SessionNodeProps) {
  const config = sessionTypeConfig[session.type] || sessionTypeConfig.presentation;
  const Icon = config.icon;
  const isBreak = session.type === "break";
  
  const formatTime = (time?: string) => {
    if (!time) return "";
    try {
      return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return time;
    }
  };

  const timeRange = session.startTime && session.endTime
    ? `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`
    : "";

  // Break sections don't have presentations, render differently
  if (isBreak) {
    return (
      <div className="ml-4 py-2 px-3 rounded-md bg-orange-50 border border-orange-100">
        <div className="flex items-center gap-3">
          <Coffee className="h-4 w-4 text-orange-500" />
          <div className="flex-1">
            <span className="text-sm font-medium text-orange-700">{session.name}</span>
            {timeRange && (
              <span className="text-xs text-orange-500 ml-2">({timeRange})</span>
            )}
          </div>
          {session.room && (
            <div className="flex items-center gap-1 text-xs text-orange-500">
              <MapPin className="h-3 w-3" />
              {session.room}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ml-4">
      {/* Session Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors text-left"
      >
        {session.presentations.length > 0 ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}
        
        <Icon className={cn("h-4 w-4 flex-shrink-0", config.color.split(" ")[1])} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{session.name}</span>
            <Badge variant="secondary" className={cn("text-xs", config.color)}>
              {config.label}
            </Badge>
            {session.presentations.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {session.presentations.length} presentation{session.presentations.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {timeRange && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeRange}
              </div>
            )}
            {session.room && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.room}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Presentations */}
      {isExpanded && session.presentations.length > 0 && (
        <div className="space-y-1 mt-1">
          {session.presentations
            .sort((a, b) => a.order - b.order)
            .map((presentation) => (
              <PresentationNode
                key={presentation.id}
                presentation={presentation}
                isHighlighted={highlightedPresentationId === presentation.id}
                isSelected={selectedPresentationId === presentation.id}
                onSelect={() => onSelectPresentation(presentation.id)}
                onToggleFavorite={onToggleFavorite}
                onViewDetails={onViewPresentationDetails}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default SessionNode;
