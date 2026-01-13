/**
 * Scheduler Types - Phase 5
 * Types for the drag-and-drop schedule builder
 */

// Conflict types returned by validation
export type ConflictType = 'SESSION_OVERFLOW' | 'ROOM_OVERLAP' | 'PRESENTER_CONFLICT';

export interface ScheduleConflict {
  type: ConflictType;
  sessionId?: number;
  roomKey?: string;
  sessions?: number[];
  presenter?: string;
  presentations?: number[];
}

// Presentation in scheduler context
export interface SchedulerPresentation {
  id: number;
  title: string;
  order: number;
  durationMins: number;
  status: string;
  presenters: {
    id: number;
    name: string;
    email?: string;
    affiliation?: string;
    isPresenter: boolean;
  }[];
  type?: {
    id: number;
    name: string;
    defaultDuration: number;
  };
  category?: {
    id: number;
    name: string;
    color?: string;
  };
}

// Session/Section in scheduler context
export interface SchedulerSession {
  id: number;
  name: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  type: string;
  order: number;
  chairs?: { name: string; email?: string }[];
  presentations: SchedulerPresentation[];
}

// Day in scheduler context
export interface SchedulerDay {
  id: number;
  name: string;
  date: string;
  order: number;
  sessions: SchedulerSession[];
}

// Full schedule state
export interface SchedulerState {
  conferenceId: number;
  conferenceName: string;
  timezone: string;
  schedulePublishedAt?: string;
  days: SchedulerDay[];
  unassignedPresentations: SchedulerPresentation[];
  conflicts: ScheduleConflict[];
  unsavedChanges: boolean;
  lastSavedAt?: string;
}

// API payload for saving schedule
export interface SchedulePayload {
  conferenceId: number;
  days: {
    id: number;
    date: string;
    sessions: {
      id: number;
      name: string;
      room?: string;
      startTime?: string;
      endTime?: string;
      presentations: {
        id: number;
        order: number;
        durationMins?: number;
        presenters?: string[];
      }[];
    }[];
  }[];
  timezone?: string;
}

// API response for save
export interface SaveScheduleResponse {
  saved: boolean;
  lastSavedAt?: string;
  conflicts: ScheduleConflict[];
  message?: string;
  skippedPresentations?: Array<{ id: number; reason: string }>;
  warnings?: string[];
}

// API response for validate
export interface ValidateScheduleResponse {
  conflicts: ScheduleConflict[];
}

// API response for publish
export interface PublishScheduleResponse {
  published: boolean;
  publishedAt?: string;
  conflicts?: ScheduleConflict[];
  message?: string;
}

// API response for unpublish
export interface UnpublishScheduleResponse {
  unpublished: boolean;
  message?: string;
}

// Drag and drop types
export type DragItemType = 'presentation' | 'session';

export interface DragData {
  type: DragItemType;
  presentationId?: number;
  sessionId?: number;
  sourceSessionId?: number | null; // null means unassigned
  sourceIndex?: number;
}

// Scheduler action types for reducer
export type SchedulerAction =
  | { type: 'LOAD_SCHEDULE'; payload: Omit<SchedulerState, 'unsavedChanges' | 'conflicts'> }
  | { type: 'MOVE_PRESENTATION'; payload: { presentationId: number; targetSessionId: number | null; targetIndex: number } }
  | { type: 'REORDER_PRESENTATION'; payload: { sessionId: number; fromIndex: number; toIndex: number } }
  | { type: 'UPDATE_SESSION'; payload: { sessionId: number; updates: Partial<SchedulerSession> } }
  | { type: 'SET_CONFLICTS'; payload: ScheduleConflict[] }
  | { type: 'MARK_SAVED'; payload: { lastSavedAt: string } }
  | { type: 'MARK_UNSAVED' }
  | { type: 'SET_PUBLISHED'; payload: { publishedAt: string } }
  | { type: 'SET_UNPUBLISHED' };
