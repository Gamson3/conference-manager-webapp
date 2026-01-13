# Organizer Routes and Endpoints Alignment

This document lists newly scaffolded Organizer pages (to match the primary/secondary sidebars) and the corresponding backend endpoints to use or add. It complements `docs/IA-Rationale-and-Nav-Decisions.md` and `server/docs/Endpoints.md`.

## Program & Schedule

- `GET /conferences/:id/schedule` – Fetch hierarchical schedule (Days → Sections → Presentations)
- `PUT /conferences/:id/schedule/builder` – Save builder state (transactional, validates conflicts)
- `PUT /conferences/:id/publish-schedule` – Publish schedule timestamp (gate public access)
- `POST /conferences/:id/days` / `PUT /conferences/:id/days/:dayId` / `DELETE /conferences/:id/days/:dayId`
- `POST /conferences/:id/sections` / `PUT /conferences/:id/sections/:sectionId` / `DELETE /conferences/:id/sections/:sectionId`
- `POST /sections/:sectionId/presentations/:presentationId/assign` (or `PUT /presentations/:id/move`)

Pages:
- `app/organizer/conferences/[id]/schedule/page.tsx` – Presentations view (existing)
- `app/organizer/conferences/[id]/schedule/days/page.tsx` – Manage days
- `app/organizer/conferences/[id]/schedule/sections/page.tsx` – Manage sessions
- `app/organizer/conferences/[id]/schedule/builder/page.tsx` – Drag/drop builder (uses save/validate endpoints)

Backend notes:
- See `server/src/routes/scheduleRoutes.ts`, `sectionRoutes.ts`, `presentationRoutes.ts`.
- Ensure unique `(sectionId, order)` invariant; lock guards in `presentationControllers.ts`.

## Website

- `GET/PUT /conferences/:id` – Read/update public fields (`websiteUrl`, `bannerImageUrl`, description, etc.)
- `GET/POST/DELETE /conferences/:id/materials` – Manage files and links
- `PUT /conferences/:id/publish` – Visibility/publish controls

Pages:
- `app/organizer/conferences/[id]/website/page.tsx` – Public details editor
- `app/organizer/conferences/[id]/materials/page.tsx` – Materials manager
- `app/organizer/conferences/[id]/publish/page.tsx` – Visibility controls (existing)

Backend notes:
- See `server/src/routes/conferenceRoutes.ts` and `materialRoutes.ts`.
- Respect `Conference.isPublic`, `schedulePublishedAt` for public exposure.

## Reports

- `GET /conferences/:id/reports/abstracts` – Generate submissions export (CSV/JSON)
- `GET /conferences/:id/reports/program` – Generate program export (CSV/ICS)
- `GET /conferences/:id/reports/summary` – Aggregate metrics (counts, acceptance rates, per-type stats)

Pages:
- `app/organizer/conferences/[id]/reports/abstracts/page.tsx`
- `app/organizer/conferences/[id]/reports/program/page.tsx`
- `app/organizer/conferences/[id]/reports/summary/page.tsx`

Backend notes:
- Add a dedicated `reportsRoutes.ts` (server) if not present; or extend `analyticsRoutes.ts`.
- Ensure heavy exports stream results; prefer pagination or background jobs for large datasets.

## Abstracts (for reference)

- `GET /conferences/:id/submissions` – Legacy overview (kept compatible)
- `GET/PUT /conferences/:id/abstracts/*` – New IA paths mapped to existing controllers (`submissionsRoutes.ts`, `conferenceSetupRoutes.ts`)

Pages (added earlier):
- `abstracts/overview`, `abstracts/categories`, `abstracts/presentation-types`, `abstracts/submission-form/*`, `abstracts/review-criteria`

## Implementation Checklist

1. Hook up client-side data fetching to existing endpoints in `client/src/lib/api`.
2. Add missing server routes for reports and schedule builder save if absent.
3. Gate public schedule via `isPublic` and `schedulePublishedAt` in `scheduleControllers`.
4. Update `docs/Endpoints.md` after adding new endpoints.

## Notes

- Keep shared validation logic for schedule builder consistent with `docs/Schedule-Builder.md`.
- Prefer transactional operations for reordering and assignment to maintain invariants.
