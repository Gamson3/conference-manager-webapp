# Schedule Builder — Design & Implementation Plan

This document is the canonical reference for building, validating, and publishing the conference schedule. It aligns to our active Prisma schema and organizer UI. Treat this as the source of truth — updates to scope or behavior should be recorded here before implementation.

## Overview
- Frontend: Next.js component suite embedded under `app/organizer/conferences/[id]/schedule/builder`.
- Backend: Node/Express REST endpoints with strong server-side validation.
- Schema: Uses existing `Day → Section → Presentation` models; minimal tweaks noted.

## Schema Alignment
- `Day` maps to JSON `days[]` with `date` per conference.
- `Section` is our session entity:
  - Fields used: `name`, `room?`, `startTime`, `endTime`, `type`, `dayId`.
  - Recommended additions (optional): `chairs Json?`.
- `Presentation` assignment:
  - Scheduled via `presentation.sectionId` and `presentation.order` (unique per section).
  - `status` should transition to `scheduled` when assigned; `locked` prevents moves.
- Duration: Prefer `PresentationType.defaultDuration` as default; allow per-presentation override `Presentation.durationMins?`.

## Canonical Payload (Frontend ↔ Backend)
```json
{
  "conferenceId": 123,
  "days": [
    {
      "id": 10,
      "date": "2025-10-27",
      "label": "Day 1",
      "sessions": [
        {
          "id": 55,
          "name": "Civil Engineering 2",
          "room": "A019",
          "startTime": "10:30",
          "endTime": "12:00",
          "chair": ["Prof. A", "Prof. B"],
          "presentations": [
            { "id": 49, "title": "Hydraulic Modeling...", "presenters": ["D P", "L C"], "durationMins": 15, "order": 1 }
          ]
        }
      ]
    }
  ],
  "meta": { "lastSavedAt": "2025-10-01T13:22:00Z", "savedByUserId": 42 }
}
```
Rules:
- Times stored as `HH:mm` with `date` at day level.
- Presentations carry `durationMins` and `order` (order is canonical within section).
- Section `startTime`/`endTime` define capacity; overflow is invalid.

## Frontend Components
- `ScheduleBuilder` (top-level container)
  - Props:
    - `conferenceId: number`
    - `initialDays: Day[]` (from GET /schedule)
    - `acceptedPresentations: Presentation[]` (from GET /accepted-presentations)
    - `timeZone?: string`
    - `onSave(schedule): Promise<void>`
    - `onPublish(schedule): Promise<void>`
    - `onChange(schedule): void`
  - Children:
    - `ScheduleToolbar` (Save, Publish, Undo, Redo, View toggle, Search)
    - `PresentationsSidebar` (virtualized list, draggable)
    - `ScheduleCanvas` → `DayView` → `SessionCard` → `PresentationCard`
    - `ConflictPanel` (live conflicts, navigation)
    - `PreviewPanel` (read-only publish preview)

UX Rules
- Manual save only; `unsavedChanges` indicator and sticky Save.
- `beforeunload` warns when unsaved.
- Undo/Redo stack; Revert to last saved (refetch from server).
- Default prevent-drop for obvious conflicts (room overlap, session overflow). Offer explicit override.
- Show Published badge when `schedulePublishedAt` set.

## Validation Logic (Shared)
Normalization
- Convert `date + time` to timestamps in conference timezone via `dayjs.tz`.

Conflicts
- Presenter double-book (overlapping allocations).
- Room overlap (two sessions in same room/time window).
- Session overflow (sum durations exceed section duration).

Pseudo-code (client/server):
```js
function toTimestamp(dateStr, timeStr, tz) {
  return dayjs.tz(`${dateStr}T${timeStr}`, tz).valueOf();
}
function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function validateSchedule(schedule, tz) {
  const conflicts = [];
  const presenterMap = new Map();
  const roomMap = new Map();
  schedule.days.forEach(day => {
    day.sessions.forEach(session => {
      const sessStart = toTimestamp(day.date, session.startTime, tz);
      const sessEnd = toTimestamp(day.date, session.endTime, tz);
      // Room-level overlaps
      const roomKey = `${day.date}::${session.room}`;
      if (!roomMap.has(roomKey)) roomMap.set(roomKey, []);
      roomMap.get(roomKey).push({ start: sessStart, end: sessEnd, sessionId: session.id });
      // Session overflow
      const totalPresMins = session.presentations.reduce((s, p) => s + (p.durationMins || 0), 0);
      const sessionCapacityMins = dayjs.tz(`${day.date}T${session.endTime}`, tz)
        .diff(dayjs.tz(`${day.date}T${session.startTime}`, tz), 'minute');
      if (totalPresMins > sessionCapacityMins) {
        conflicts.push({ type: 'SESSION_OVERFLOW', sessionId: session.id });
      }
      // Presenter allocations (sequential cursor)
      let cursor = sessStart;
      session.presentations.forEach(p => {
        const pStart = cursor;
        const pEnd = pStart + (p.durationMins * 60 * 1000);
        cursor = pEnd;
        (p.presenters || []).forEach(pr => {
          if (!presenterMap.has(pr)) presenterMap.set(pr, []);
          presenterMap.get(pr).push({ start: pStart, end: pEnd, sessionId: session.id, presentationId: p.id });
        });
      });
    });
  });
  // Room overlaps
  roomMap.forEach((arr, key) => {
    arr.sort((a,b) => a.start - b.start);
    for (let i=0;i<arr.length-1;i++) {
      if (intervalsOverlap(arr[i].start, arr[i].end, arr[i+1].start, arr[i+1].end)) {
        conflicts.push({ type: 'ROOM_OVERLAP', roomKey: key, sessions: [arr[i].sessionId, arr[i+1].sessionId] });
      }
    }
  });
  // Presenter double-book
  presenterMap.forEach((allocs, presenter) => {
    allocs.sort((a,b) => a.start - b.start);
    for (let i=0;i<allocs.length-1;i++) {
      if (intervalsOverlap(allocs[i].start, allocs[i].end, allocs[i+1].start, allocs[i+1].end)) {
        conflicts.push({ type: 'PRESENTER_CONFLICT', presenter, presentations: [allocs[i].presentationId, allocs[i+1].presentationId] });
      }
    }
  });
  return conflicts;
}
```
Note: If we support per-presentation `startTime`, use it instead of sequential cursor.

## Backend Endpoints & Contracts
Paths
- `GET /api/conferences/:id/accepted-presentations`
  - Response: `[{ id, title, presenters: string[], durationMins?: number, type?: { defaultDuration: number } }]`
- `GET /api/conferences/:id/schedule`
  - Response: Canonical payload above (server derives `meta.lastSavedAt`).
- `POST /api/conferences/:id/schedule/validate` (optional)
  - Response: `{ conflicts: [...] }` using the same structure as client.
- `PUT /api/conferences/:id/schedule`
  - Request: Canonical payload.
  - Success: `200 { saved: true, lastSavedAt: ISOString, conflicts: [] }`
  - Failure: `400 { saved: false, conflicts: [...] }`
- `POST /api/conferences/:id/schedule/publish`
  - Behavior: Validate, then set `conference.schedulePublishedAt` when valid.

Persistence (Prisma)
- Transactionally upsert:
  - Days by `date + conferenceId`.
  - Sections by `id` or create with `dayId, name, room, startTime, endTime, chairs`.
  - Presentations: set `sectionId` and `order`, set `status='scheduled'` when assigned; respect `locked` guard.
  - Remove orphaned section assignments for this conference if not in payload.
- Constraints:
  - `unique(sectionId, order)` preserved.
  - Optional index: `(dayId, room, startTime, endTime)` to speed overlap checks.
- Concurrency:
  - Include a revision (e.g., `conference.updatedAt`) as an If‑Match token in `PUT` to avoid stale overwrites.

## Organizer Panel Integration
- Route: `app/organizer/conferences/[id]/schedule/builder/page.tsx`.
- Data loading: parallel `GET /schedule` and `GET /accepted-presentations`.
- Save: `PUT /schedule`, update `meta.lastSavedAt`, reset `unsavedChanges`.
- Publish: `POST /schedule/publish`, then consumers may access public schedule (`status=published`, `isPublic=true`, `schedulePublishedAt!=null`).
- Fixed sidebars: Use CSS variables for widths (`--sb-primary`, `--sb-secondary`, `--top-nav`) and set main `padding-left: calc(var(--sb-primary) + var(--sb-secondary))` to avoid content overlay when collapsed.

## Libraries & Tech Choices
- Drag & drop: `dnd-kit`.
- Timezone: `dayjs` + `timezone` plugin (or `luxon`).
- Virtualization: `react-window` for accepted list.
- Optional timeline: `FullCalendar` or `react-big-calendar` for read-only publish preview.
- State: local reducer + optional `zustand` if shared across routes.
- Styling: Tailwind CSS; CSS modules where encapsulation helps.

## Roadmap (Milestones)
- A — MVP
  - Implement `GET accepted-presentations` and `GET schedule` (server).
  - Build `ScheduleBuilder` shell, drag/drop assign, unsaved flag, `PUT /schedule` save.
  - Client-side validate for overflow + presenter conflict.
  - `beforeunload` warning.
- B — Usability & Safety
  - Undo/Redo; ConflictPanel; Revert to last saved; session editing (name/room/times).
  - Optional `POST /schedule/validate` for pre-check.
  - Performance (virtualized lists, lazy DOM).
- C — Publish & Polish
  - Publish endpoint; public timeline preview; exports (ICS/CSV/website schedule).
  - Unit tests for validator (client/server) and E2E save/publish flows.

## Testing Plan
- Unit: `validateSchedule` for all conflict types.
- Component: drag/drop operations, unsaved indicators, beforeunload.
- Integration: server `PUT /schedule` returns success & conflicts; publish flow.

## Guardrails & Non‑Goals
- Non‑goals: Hard DB constraints for overlaps beyond unique ordering — handled by application validation.
- Guardrails: Server always re‑validates pre‑save/publish; locked presentations cannot be moved; double‑booking and room overlap rejected unless explicit override path is defined.

---
Last updated: Nov 2025. Update this document before implementing changes.