"use client";

import React, { useEffect, useReducer, useCallback, useMemo, useState } from "react";
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Calendar,
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Undo2,
  GripVertical,
  Package,
} from "lucide-react";

import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  SchedulerState,
  SchedulerAction,
  SchedulerDay,
  SchedulerPresentation,
  SchedulePayload,
  SaveScheduleResponse,
  ValidateScheduleResponse,
  PublishScheduleResponse,
} from "@/types/scheduler";

import { DroppableSession, UnassignedSidebar } from "./SchedulerDragDrop";
import { ConflictDialog } from "./ConflictPanel";

const NON_PRESENTATION_SESSION_TYPES = new Set(["break", "networking", "ceremony"]);

const normalizeTimeToHHmm = (timeStr: string | undefined): string | undefined => {
  if (!timeStr) return undefined;

  let candidate = timeStr;
  if (candidate.includes("T")) {
    candidate = candidate.split("T")[1] ?? candidate;
  }
  candidate = candidate.replace("Z", "");
  candidate = candidate.split(".")[0] ?? candidate;

  // Support HH:mm:ss by trimming to HH:mm
  if (/^\d{2}:\d{2}/.test(candidate)) {
    return candidate.slice(0, 5);
  }

  return undefined;
};

// ============================================================================
// Reducer for managing scheduler state
// ============================================================================

function schedulerReducer(state: SchedulerState, action: SchedulerAction): SchedulerState {
  switch (action.type) {
    case "LOAD_SCHEDULE": {
      return {
        ...state,
        ...action.payload,
        unsavedChanges: false,
        conflicts: [],
      };
    }

    case "MOVE_PRESENTATION": {
      const { presentationId, targetSessionId, targetIndex } = action.payload;
      
      // Find the presentation in either unassigned or a session
      let presentation: SchedulerPresentation | undefined;
      let sourceSessionId: number | null = null;

      // Check unassigned first
      const unassignedIdx = state.unassignedPresentations.findIndex(p => p.id === presentationId);
      if (unassignedIdx !== -1) {
        presentation = state.unassignedPresentations[unassignedIdx];
      } else {
        // Find in sessions
        for (const day of state.days) {
          for (const session of day.sessions) {
            const idx = session.presentations.findIndex(p => p.id === presentationId);
            if (idx !== -1) {
              presentation = session.presentations[idx];
              sourceSessionId = session.id;
              break;
            }
          }
          if (presentation) break;
        }
      }

      if (!presentation) return state;

      // Remove from source
      let newUnassigned = [...state.unassignedPresentations];
      let newDays = state.days.map(day => ({
        ...day,
        sessions: day.sessions.map(session => ({
          ...session,
          presentations: [...session.presentations],
        })),
      }));

      if (sourceSessionId === null) {
        newUnassigned = newUnassigned.filter(p => p.id !== presentationId);
      } else {
        newDays = newDays.map(day => ({
          ...day,
          sessions: day.sessions.map(session => {
            if (session.id === sourceSessionId) {
              return {
                ...session,
                presentations: session.presentations.filter(p => p.id !== presentationId),
              };
            }
            return session;
          }),
        }));
      }

      // Add to target
      if (targetSessionId === null) {
        // Moving to unassigned
        newUnassigned.splice(targetIndex, 0, { ...presentation, status: "accepted" });
      } else {
        // Moving to a session
        newDays = newDays.map(day => ({
          ...day,
          sessions: day.sessions.map(session => {
            if (session.id === targetSessionId) {
              const newPresentations = [...session.presentations];
              newPresentations.splice(targetIndex, 0, { ...presentation!, status: "scheduled" });
              // Reorder
              return {
                ...session,
                presentations: newPresentations.map((p, i) => ({ ...p, order: i })),
              };
            }
            return session;
          }),
        }));
      }

      return {
        ...state,
        days: newDays,
        unassignedPresentations: newUnassigned,
        unsavedChanges: true,
      };
    }

    case "REORDER_PRESENTATION": {
      const { sessionId, fromIndex, toIndex } = action.payload;
      
      const newDays = state.days.map(day => ({
        ...day,
        sessions: day.sessions.map(session => {
          if (session.id === sessionId) {
            const newPresentations = arrayMove(session.presentations, fromIndex, toIndex);
            return {
              ...session,
              presentations: newPresentations.map((p, i) => ({ ...p, order: i })),
            };
          }
          return session;
        }),
      }));

      return {
        ...state,
        days: newDays,
        unsavedChanges: true,
      };
    }

    case "UPDATE_SESSION": {
      const { sessionId, updates } = action.payload;
      
      const newDays = state.days.map(day => ({
        ...day,
        sessions: day.sessions.map(session => {
          if (session.id === sessionId) {
            return { ...session, ...updates };
          }
          return session;
        }),
      }));

      return {
        ...state,
        days: newDays,
        unsavedChanges: true,
      };
    }

    case "SET_CONFLICTS": {
      return { ...state, conflicts: action.payload };
    }

    case "MARK_SAVED": {
      return {
        ...state,
        unsavedChanges: false,
        lastSavedAt: action.payload.lastSavedAt,
      };
    }

    case "MARK_UNSAVED": {
      return { ...state, unsavedChanges: true };
    }

    case "SET_PUBLISHED": {
      return {
        ...state,
        schedulePublishedAt: action.payload.publishedAt,
      };
    }

    case "SET_UNPUBLISHED": {
      return {
        ...state,
        schedulePublishedAt: undefined,
      };
    }

    default:
      return state;
  }
}

const initialState: SchedulerState = {
  conferenceId: 0,
  conferenceName: "",
  timezone: "UTC",
  schedulePublishedAt: undefined,
  days: [],
  unassignedPresentations: [],
  conflicts: [],
  unsavedChanges: false,
};

type ConferenceScheduleAuthor = {
  id: number;
  name: string;
  email?: string | null;
  affiliation?: string | null;
  isPresenter: boolean;
};

type ConferenceSchedulePresentation = {
  id: number;
  title: string;
  order: number;
  duration: number | null;
  status: string;
  authors: ConferenceScheduleAuthor[];
  type: null | {
    id: number;
    name: string;
    defaultDuration: number | null;
  };
  category: null | {
    id: number;
    name: string;
  };
};

type ConferenceScheduleSection = {
  id: number;
  name: string;
  type: string;
  startTime?: string | null;
  endTime?: string | null;
  room: string | null;
  capacity: number | null;
  order: number;
  presentations: ConferenceSchedulePresentation[];
};

type ConferenceScheduleDay = {
  id: number;
  name: string;
  date: string;
  order: number;
  sections: ConferenceScheduleSection[];
};

type ConferenceScheduleResponse = {
  conference: {
    id: number;
    name: string;
    schedulePublishedAt: string | null;
  };
  days: ConferenceScheduleDay[];
};

type AcceptedPresentationAuthor = {
  id: number;
  authorName: string;
  authorEmail: string | null;
  affiliation: string | null;
  isPresenter: boolean;
};

type AcceptedPresentationItem = {
  id: number;
  title: string;
  presentation: null | {
    id: number;
    title: string;
    duration: number | null;
    type: null | {
      id: number;
      name: string;
      defaultDuration: number;
    };
    category: null | {
      id: number;
      name: string;
    };
    authors: AcceptedPresentationAuthor[];
  };
};

// ============================================================================
// Main ScheduleBuilder Component
// ============================================================================

interface ScheduleBuilderProps {
  conferenceId: number;
}

export default function ScheduleBuilder({ conferenceId }: ScheduleBuilderProps) {
  const [state, dispatch] = useReducer(schedulerReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [mobileUnassignedOpen, setMobileUnassignedOpen] = useState(false);
  const [conflictsOpen, setConflictsOpen] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const collisionDetection = useMemo<CollisionDetection>(() => {
    return (args) => {
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) return pointerCollisions;
      return closestCenter(args);
    };
  }, []);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch schedule structure and accepted presentations in parallel
      const [scheduleRes, acceptedRes] = await Promise.all([
        apiClient.get<ConferenceScheduleResponse>(API_ENDPOINTS.ORGANIZER.SCHEDULE(conferenceId)),
        apiClient.get<AcceptedPresentationItem[]>(API_ENDPOINTS.ORGANIZER.ACCEPTED_PRESENTATIONS(conferenceId)),
      ]);

      const scheduleData = scheduleRes.data;
      const acceptedData = acceptedRes.data;

      // Build the scheduler state
      // Map schedule days with their sessions and presentations
      const days: SchedulerDay[] = scheduleData.days.map((day) => ({
        id: day.id,
        name: day.name,
        date: day.date,
        order: day.order || 0,
        sessions: day.sections.map((section) => ({
          id: section.id,
          name: section.name,
          room: section.room ?? undefined,
          startTime: section.startTime ?? undefined,
          endTime: section.endTime ?? undefined,
          capacity: section.capacity ?? undefined,
          type: section.type,
          order: section.order || 0,
          chairs: undefined,
          presentations: section.presentations.map((p) => ({
            id: p.id,
            title: p.title,
            order: p.order || 0,
            durationMins: p.duration ?? 15,
            status: p.status,
            presenters: p.authors
              .filter((a) => a.isPresenter)
              .map((a) => ({
                id: a.id,
                name: a.name,
                email: a.email ?? undefined,
                affiliation: a.affiliation ?? undefined,
                isPresenter: a.isPresenter,
              })),
            type: p.type
              ? {
                  id: p.type.id,
                  name: p.type.name,
                  defaultDuration: p.type.defaultDuration ?? 15,
                }
              : undefined,
            category: p.category
              ? {
                  id: p.category.id,
                  name: p.category.name,
                }
              : undefined,
          })),
        })),
      }));

      // Find scheduled presentation IDs
      const scheduledIds = new Set<number>();
      days.forEach(day => {
        day.sessions.forEach(session => {
          session.presentations.forEach(p => {
            scheduledIds.add(p.id);
          });
        });
      });

      // Unassigned = accepted but not scheduled
      const unassigned: SchedulerPresentation[] = acceptedData
        .map((item) => item.presentation)
        .filter(
          (p): p is NonNullable<AcceptedPresentationItem["presentation"]> => p !== null
        )
        .map((presentation) => {
          const durationMins = presentation.duration ?? presentation.type?.defaultDuration ?? 15;

          return {
            id: presentation.id,
            title: presentation.title,
            order: 0,
            durationMins,
            status: "accepted",
            presenters: presentation.authors
              .filter((a) => a.isPresenter)
              .map((a) => ({
                id: a.id,
                name: a.authorName,
                email: a.authorEmail ?? undefined,
                affiliation: a.affiliation ?? undefined,
                isPresenter: a.isPresenter,
              })),
            type: presentation.type
              ? {
                  id: presentation.type.id,
                  name: presentation.type.name,
                  defaultDuration: presentation.type.defaultDuration,
                }
              : undefined,
            category: presentation.category
              ? {
                  id: presentation.category.id,
                  name: presentation.category.name,
                }
              : undefined,
          };
        })
        .filter((p) => !scheduledIds.has(p.id));

      dispatch({
        type: "LOAD_SCHEDULE",
        payload: {
          conferenceId,
          conferenceName: scheduleData.conference?.name || "",
          timezone: "UTC",
          schedulePublishedAt: scheduleData.conference?.schedulePublishedAt ?? undefined,
          days,
          unassignedPresentations: unassigned,
          lastSavedAt: undefined,
        },
      });
    } catch (err: unknown) {
      console.error("Error fetching schedule:", err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Warn on unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.unsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.unsavedChanges]);

  // ============================================================================
  // Actions
  // ============================================================================

  const buildPayload = useCallback((): SchedulePayload => {
    return {
      conferenceId,
      timezone: state.timezone,
      days: state.days.map(day => ({
        id: day.id,
        date: day.date,
        sessions: day.sessions.map(session => ({
          id: session.id,
          name: session.name,
          room: session.room,
          startTime: normalizeTimeToHHmm(session.startTime),
          endTime: normalizeTimeToHHmm(session.endTime),
          presentations: session.presentations.map((p, idx) => ({
            id: p.id,
            order: idx,
            durationMins: p.durationMins,
            presenters: p.presenters.map(pr => pr.email || pr.name),
          })),
        })),
      })),
    };
  }, [conferenceId, state.days, state.timezone]);

  const validateSchedule = useCallback(async () => {
    try {
      const payload = buildPayload();
      const { data } = await apiClient.post<ValidateScheduleResponse>(
        API_ENDPOINTS.ORGANIZER.SCHEDULE_VALIDATE(conferenceId),
        payload
      );
      dispatch({ type: "SET_CONFLICTS", payload: data.conflicts });
      
      if (data.conflicts.length === 0) {
        setConflictsOpen(false);
        toast.success("✓ Schedule validation passed - no conflicts found!");
      } else {
        setConflictsOpen(true);
        toast.error(`Schedule has ${data.conflicts.length} conflict(s) - see details below`);
      }
      return data.conflicts;
    } catch (err: unknown) {
      console.error("Validation error:", err);
      toast.error("Failed to validate schedule");
      return [];
    }
  }, [buildPayload, conferenceId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const { data } = await apiClient.put<SaveScheduleResponse>(
        API_ENDPOINTS.ORGANIZER.SCHEDULE(conferenceId),
        payload
      );

      if (data.saved) {
        dispatch({ type: "MARK_SAVED", payload: { lastSavedAt: data.lastSavedAt! } });
        dispatch({ type: "SET_CONFLICTS", payload: data.conflicts });

        if (data.conflicts.length > 0) {
          setConflictsOpen(true);
        }
        
        // Check for skipped presentations
        if (data.skippedPresentations && data.skippedPresentations.length > 0) {
          const skippedCount = data.skippedPresentations.length;
          const skippedList = data.skippedPresentations.map(p => `ID ${p.id}: ${p.reason}`).join(', ');
          toast.warning(`Schedule saved, but ${skippedCount} presentation(s) were skipped: ${skippedList}`);
          
          // Reload schedule to sync state with backend
          await fetchSchedule();
        } else {
          toast.success("Schedule saved successfully");
        }
        
        // Show warnings if any
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach(warning => toast.warning(warning));
        }
      } else {
        dispatch({ type: "SET_CONFLICTS", payload: data.conflicts });

        if (data.conflicts.length > 0) {
          setConflictsOpen(true);
        }
        toast.error(data.message || "Failed to save schedule");
      }
    } catch (err: unknown) {
      console.error("Save error:", err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }, [buildPayload, conferenceId, fetchSchedule]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      // First save if there are unsaved changes
      if (state.unsavedChanges) {
        await handleSave();
      }

      // Validate before publishing
      const conflicts = await validateSchedule();
      
      if (conflicts && conflicts.length > 0) {
        toast.error(`Cannot publish: ${conflicts.length} conflict(s) must be resolved first`);
        setPublishing(false);
        return;
      }

      const { data } = await apiClient.post<PublishScheduleResponse>(
        API_ENDPOINTS.ORGANIZER.SCHEDULE_PUBLISH(conferenceId)
      );

      if (data.published) {
        dispatch({ type: "SET_PUBLISHED", payload: { publishedAt: data.publishedAt! } });
        toast.success("Schedule published successfully!");
      } else {
        if (data.conflicts?.length) {
          dispatch({ type: "SET_CONFLICTS", payload: data.conflicts });
        }
        toast.error(data.message || "Cannot publish schedule with conflicts");
      }
    } catch (err: unknown) {
      console.error("Publish error:", err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || "Failed to publish schedule");
    } finally {
      setPublishing(false);
      setConfirmPublish(false);
    }
  }, [conferenceId, handleSave, state.unsavedChanges, validateSchedule]);

  const handleUnpublish = useCallback(async () => {
    setPublishing(true);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.SCHEDULE_UNPUBLISH(conferenceId));
      dispatch({ type: "SET_UNPUBLISHED" });
      toast.success("Schedule unpublished");
    } catch (err: unknown) {
      console.error("Unpublish error:", err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || "Failed to unpublish schedule");
    } finally {
      setPublishing(false);
      setConfirmUnpublish(false);
    }
  }, [conferenceId]);

  const handleRevert = useCallback(() => {
    fetchSchedule();
    toast.info("Reverted to last saved state");
  }, [fetchSchedule]);

  // ============================================================================
  // Drag and Drop Handlers
  // ============================================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overId = over.id;
    const overData = over.data.current;

    // Determine if dropping onto a session or reordering within one
    if (activeData?.type === "presentation") {
      const presentationId = active.id as number;
      const sourceSessionId = activeData.sessionId;

      // Determine target
      let targetSessionId: number | null = null;
      let targetIndex = 0;

      if (overData?.type === "session") {
        // Dropped on a session container
        targetSessionId = overId as number;
        // Find the session and get presentation count
        for (const day of state.days) {
          const session = day.sessions.find(s => s.id === targetSessionId);
          if (session) {
            targetIndex = session.presentations.length;
            break;
          }
        }
      } else if (overData?.type === "session-dropzone") {
        const dropzoneSessionId = (overData as { sessionId?: unknown }).sessionId;
        if (typeof dropzoneSessionId === "number") {
          targetSessionId = dropzoneSessionId;
          const targetSession = state.days
            .flatMap((d) => d.sessions)
            .find((s) => s.id === targetSessionId);
          const targetCount = targetSession?.presentations.length ?? 0;

          const position = (overData as { position?: unknown }).position;
          targetIndex = position === "empty" ? 0 : targetCount;
        }
      } else if (overData?.type === "presentation") {
        // Dropped on another presentation
        targetSessionId = overData.sessionId;
        // Find index of the target presentation
        for (const day of state.days) {
          const session = day.sessions.find(s => s.id === targetSessionId);
          if (session) {
            targetIndex = session.presentations.findIndex(p => p.id === overId);
            if (targetIndex === -1) targetIndex = session.presentations.length;
            break;
          }
        }
      } else if (overData?.type === "unassigned") {
        // Dropped on unassigned sidebar
        targetSessionId = null;
        targetIndex = state.unassignedPresentations.length;
      }

      if (typeof targetSessionId === "number") {
        const targetSession = state.days
          .flatMap((d) => d.sessions)
          .find((s) => s.id === targetSessionId);

        if (targetSession) {
          const sessionType = targetSession.type?.toLowerCase();
          if (sessionType && NON_PRESENTATION_SESSION_TYPES.has(sessionType)) {
            toast.error(`Can't add presentations to a ${targetSession.type} session`);
            return;
          }
        }
      }

      // Check if it's a reorder within the same session
      if (sourceSessionId === targetSessionId && sourceSessionId !== null) {
        const session = state.days.flatMap(d => d.sessions).find(s => s.id === sourceSessionId);
        if (session) {
          const fromIndex = session.presentations.findIndex(p => p.id === presentationId);
          if (fromIndex !== -1 && fromIndex !== targetIndex) {
            dispatch({
              type: "REORDER_PRESENTATION",
              payload: { sessionId: sourceSessionId, fromIndex, toIndex: targetIndex },
            });
          }
        }
      } else {
        // Move between containers
        dispatch({
          type: "MOVE_PRESENTATION",
          payload: { presentationId, targetSessionId, targetIndex },
        });
      }
    }
  }, [state.days, state.unassignedPresentations]);

  // Find active presentation for drag overlay
  const activePresentation = useMemo(() => {
    if (!activeId) return null;
    
    // Check unassigned
    const unassigned = state.unassignedPresentations.find(p => p.id === activeId);
    if (unassigned) return unassigned;

    // Check sessions
    for (const day of state.days) {
      for (const session of day.sessions) {
        const found = session.presentations.find(p => p.id === activeId);
        if (found) return found;
      }
    }
    return null;
  }, [activeId, state.days, state.unassignedPresentations]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading schedule...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchSchedule} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <h1 className="text-lg sm:text-xl font-semibold">Schedule Builder</h1>
            <div className="flex gap-2 flex-wrap">
              {state.schedulePublishedAt && (
                <Badge variant="default" className="bg-green-600 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Published
                </Badge>
              )}
              {state.unsavedChanges && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                  Unsaved changes
                </Badge>
              )}
            </div>
            {state.lastSavedAt && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Last saved: {new Date(state.lastSavedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevert}
              disabled={!state.unsavedChanges || saving}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Revert
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={validateSchedule}
              disabled={saving}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Validate
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!state.unsavedChanges || saving}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
            {state.schedulePublishedAt ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmUnpublish(true)}
                disabled={publishing}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setConfirmPublish(true)}
                disabled={publishing || state.conflicts.some(c => c.type !== "SESSION_OVERFLOW")}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-1" />
                {publishing ? "Publishing..." : "Publish"}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Sidebar - Unassigned Presentations (Hidden on mobile, visible on lg+) */}
          <div className="hidden lg:flex lg:w-80 lg:border-r lg:bg-muted/30 lg:flex-col">
            <UnassignedSidebar presentations={state.unassignedPresentations} />
          </div>

          {/* Mobile Drawer Button for Unassigned Presentations */}
          <div className="lg:hidden absolute top-20 right-4 z-10">
            <Sheet open={mobileUnassignedOpen} onOpenChange={setMobileUnassignedOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Package className="h-4 w-4" />
                  Unassigned ({state.unassignedPresentations.length})
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetTitle className="sr-only">Unassigned Presentations</SheetTitle>
                <UnassignedSidebar presentations={state.unassignedPresentations} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Schedule Canvas */}
          <div className="flex-1 overflow-auto p-2 sm:p-4">
            {state.days.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4" />
                <p>No days configured for this conference.</p>
                <p className="text-sm">Add days in the Program → Days section first.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 pt-12 lg:pt-0">
                {state.days.map(day => (
                  <Card key={day.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {day.name}
                        <span className="text-sm font-normal text-muted-foreground">
                          {new Date(day.date).toLocaleDateString()}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {day.sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No sessions for this day. Add sessions in Program → Sessions.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                          {day.sessions.map(session => (
                            <DroppableSession
                              key={session.id}
                              session={session}
                              conflicts={state.conflicts}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <ConflictDialog
            open={conflictsOpen}
            onOpenChange={setConflictsOpen}
            conflicts={state.conflicts}
            days={state.days}
            onNavigate={(sessionId: number) => {
              const el = document.getElementById(`session-${sessionId}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              setConflictsOpen(false);
            }}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activePresentation && (
            <div className="bg-white border rounded-md p-2 shadow-lg opacity-90 w-64">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{activePresentation.title}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {activePresentation.durationMins} min
              </div>
            </div>
          )}
        </DragOverlay>
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the schedule visible to all attendees. You can unpublish later if needed.
              {state.unsavedChanges && (
                <span className="block mt-2 text-yellow-600">
                  Note: Your unsaved changes will be saved automatically.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
              Publish Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={confirmUnpublish} onOpenChange={setConfirmUnpublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the schedule from attendees. The schedule data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpublish}>
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
