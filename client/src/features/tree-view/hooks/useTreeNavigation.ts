"use client";

import { useState, useCallback, useEffect } from "react";
import { TreeViewState, TreeDay } from "../types";

interface UseTreeNavigationProps {
  days: TreeDay[];
  highlightPresentationId?: number | null;
}

export function useTreeNavigation({ days, highlightPresentationId }: UseTreeNavigationProps) {
  const [state, setState] = useState<TreeViewState>({
    expandedDays: new Set<number>(),
    expandedSessions: new Set<number>(),
    highlightedPresentationId: null,
    selectedPresentationId: null,
  });

  // Auto-expand when highlight is requested
  useEffect(() => {
    if (highlightPresentationId) {
      // Find which day and session contains this presentation
      for (const day of days) {
        for (const session of day.sessions) {
          const found = session.presentations.find(p => p.id === highlightPresentationId);
          if (found) {
            setState(prev => ({
              ...prev,
              expandedDays: new Set([...prev.expandedDays, day.id]),
              expandedSessions: new Set([...prev.expandedSessions, session.id]),
              highlightedPresentationId: highlightPresentationId,
              selectedPresentationId: highlightPresentationId,
            }));
            
            // Scroll to element after a short delay to allow expansion
            setTimeout(() => {
              const element = document.getElementById(`presentation-${highlightPresentationId}`);
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 100);
            return;
          }
        }
      }
    }
  }, [highlightPresentationId, days]);

  const toggleDay = useCallback((dayId: number) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedDays);
      if (newExpanded.has(dayId)) {
        newExpanded.delete(dayId);
      } else {
        newExpanded.add(dayId);
      }
      return { ...prev, expandedDays: newExpanded };
    });
  }, []);

  const toggleSession = useCallback((sessionId: number) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedSessions);
      if (newExpanded.has(sessionId)) {
        newExpanded.delete(sessionId);
      } else {
        newExpanded.add(sessionId);
      }
      return { ...prev, expandedSessions: newExpanded };
    });
  }, []);

  const selectPresentation = useCallback((presentationId: number | null) => {
    setState(prev => ({
      ...prev,
      selectedPresentationId: presentationId,
    }));
  }, []);

  const expandAll = useCallback(() => {
    const allDayIds = new Set(days.map(d => d.id));
    const allSessionIds = new Set(days.flatMap(d => d.sessions.map(s => s.id)));
    setState(prev => ({
      ...prev,
      expandedDays: allDayIds,
      expandedSessions: allSessionIds,
    }));
  }, [days]);

  const collapseAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      expandedDays: new Set(),
      expandedSessions: new Set(),
    }));
  }, []);

  const clearHighlight = useCallback(() => {
    setState(prev => ({
      ...prev,
      highlightedPresentationId: null,
    }));
  }, []);

  const isDayExpanded = useCallback((dayId: number) => {
    return state.expandedDays.has(dayId);
  }, [state.expandedDays]);

  const isSessionExpanded = useCallback((sessionId: number) => {
    return state.expandedSessions.has(sessionId);
  }, [state.expandedSessions]);

  return {
    state,
    toggleDay,
    toggleSession,
    selectPresentation,
    expandAll,
    collapseAll,
    clearHighlight,
    isDayExpanded,
    isSessionExpanded,
  };
}
