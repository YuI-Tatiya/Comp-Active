# Plan: Event-Aware Organizer/Student Pages — Manage, Edit, Detail, Registration

**Status:** Draft for review
**Author:** Claude Code (with user)
**Date:** 2026-08-20

## 1. Problem Statement

`/organizer/create` was rebuilt (see `docs/superpowers/plans/2026-08-20-activity-creation-ux.md`) onto a
new two-level data model: an **Event** ("งาน") containing one or more **Activities** ("กิจกรรมย่อย"),
each with its own image, schedule, capacity, conditions, benefits, soft-skill rates, and custom
registration questions, plus Event-level cover image, visibility rules, and a post-event survey.

Five other surfaces were never migrated off the older, pre-Event single-Activity model:

| Page | Reads via | Problem |
|---|---|---|
| `/organizer/manage` | `activitiesAPI.getMy()` | Lists flat Activities, not Events; Event cover image is invisible |
| `/organizer/manage/[id]/edit` | `activitiesAPI.update()` | Hardcoded legacy single-step-per-page form; unrelated visual style; can't edit Event fields, survey, per-activity soft-skill rates, custom questions, volunteer role, or add/remove activities |
| `/organizer/events/[id]` | `activitiesAPI.getById()` | Shows one Activity only — no Event context, can't see sibling activities |
| `/student/events` | `activitiesAPI.getAll()` | Same flat-Activity view; a multi-activity Event shows as N duplicate-looking cards |
| `/student/events/[id]` | `activitiesAPI.getById()` | Same; registration modal uses raw Tailwind colors, inconsistent with the rest of the app |

**Root cause of "the uploaded image doesn't show":** the Event's cover image lives on `Event.imageUrl`,
set once in wizard step 1. An organizer who sets only that (and leaves a given Activity's own image
blank — a legitimate, expected case) sees no image at all on any of the five pages above, because
none of them ever read `Event.imageUrl` — they only know about `Activity.imageUrl`.

There is also **no backend endpoint to update an Event** at all today — only `create`, `findById`,
`findByOrganizer`, and `survey-results` exist on `EventsOrganizerController`. The legacy
`PATCH /api/activities/:id` exists but its DTO (`UpdateActivityDto = PartialType(CreateActivityDto)`)
predates the Event model: it has no `startAt`/`endAt`, no `questions`, no `volunteerRole`/certificate
flag, no per-skill rate (only a flat skill list), no `attachmentUrl`. Using it against an
Event-wizard-created Activity would silently drop data.

## 2. Scope

**In scope:**
- New backend `PATCH /api/events/:id` (update Event + its Activities: edit fields, add/remove activities, edit survey).
- New backend public/student endpoints to read Events (list + by id) with the same visibility filtering activities already get.
- Rebuild `/organizer/manage` to list Events (grouped card per Event, not per Activity).
- Rebuild `/organizer/manage/[id]/edit` to reuse the same 4 section components as `/organizer/create`, pre-filled, in an edit mode.
- Rebuild `/organizer/events/[id]` to show full Event detail with a tab per Activity, covering every field collected by the 4-step wizard.
- Rebuild `/student/events` and `/student/events/[id]` on the same Event model — one card/page per Event, tabs to pick an Activity, registration scoped to the chosen Activity.
- Restyle the registration modal onto the app's shared design tokens.
- Fix the missing-image bug as a consequence of the above (Event cover → first-Activity-image → placeholder fallback, applied consistently).

**Out of scope (explicitly not touched):**
- Admin portal.
- Certificate issuance / evaluation scoring flows.
- The legacy standalone-Activity create path (`/organizer/create`'s old sibling, if any exists elsewhere) — Activities with `eventId = null` keep working exactly as today via `activitiesAPI`.
- Newsfeed / public `api.compactive.com` developer endpoints.

## 3. Backend Design

### 3.1 `PATCH /api/events/:id` (Organizer/Admin, ownership-checked)

New DTO `UpdateEventDto`, structurally mirroring `CreateEventDto` but with every field optional, plus
an `activities` array where each entry is either:
- an existing activity (`id` present) → updated in place, including nested tags/conditions/benefits/soft-skill-rates/questions (replace-all-children strategy, same as `create`'s nested-create — simplest correct approach, avoids diffing individual condition/benefit rows)
- a new activity (`id` absent) → created and attached to the event, same as `create` today

Activities present in the DB but **absent** from the submitted array are deleted — **unless** they have
at least one `Registration`, in which case the request is rejected with a 400 naming the activity
(`ไม่สามารถลบกิจกรรม "{name}" ได้ เนื่องจากมีผู้ลงทะเบียนแล้ว`). This protects registrant data from
silent loss and matches the existing pattern of explicit Thai validation messages in `EventsService.create`.

All the same per-activity validation `EventsService.create` already runs (`endAt > startAt`, cert
requires `volunteerRole`, choice questions need ≥2 options, `scaleMax >= 2`) is reused unchanged.

Implementation: `EventsService.update(organizerId, callerRole, eventId, dto)` → ownership check
(404 for not-found, 403-as-400 for not-owner, matching the existing `getSurveyResults` pattern) →
delegates to `EventsRepository.update`, which runs inside a `$transaction` (delete-then-recreate
children on each surviving/new activity, like `create` does, wrapped in one transaction so a failure
mid-update can't leave the Event half-edited).

### 3.2 Student-facing read endpoints

`ActivitiesPublicController`'s pattern (`OptionalJwtAuthGuard`, `findAllApproved`/`findById` with
`Viewer`-based visibility filtering via `event-visibility.util.ts`) is proven and stays as-is for the
legacy standalone-Activity case. Add a parallel `EventsPublicController`:

- `GET /api/events` — public/student list of Events that have ≥1 `approved` Activity, filtered by
  `isViewerEligibleForEvent` (same util, reused directly — no new visibility logic).
- `GET /api/events/:id` — same 404-for-both-cases treatment `ActivitiesService.findById` already uses.

Both live under `api/events` but on a separate controller from `EventsOrganizerController` (which is
gated `@Roles(ORGANIZER, ADMIN)`), the same split already used for `activities.controller.ts` vs
`activities-public.controller.ts`.

### 3.3 Image resolution helper

A single small helper (`resolveEventImageUrl(event, activity?)` — cover → activity image → null) used
identically by the organizer manage/detail pages and student pages, so "which image shows where" has
one definition instead of being re-derived five times.

## 4. Frontend Design

### 4.1 `/organizer/manage`

Switch to `eventsAPI.getMy()`. One card per Event: cover image (via the resolver), name, activity-count
chip ("3 กิจกรรมย่อย"), aggregate registered/capacity summed across its activities, and the two existing
actions (`แก้ไข` → edit page, `ดูรายละเอียด` → detail page) unchanged in destination. Standalone legacy
Activities (`eventId === null`, fetched from `activitiesAPI.getMy()` in parallel) render in a second,
clearly-labeled section below so nothing already in the DB disappears from the list.

### 4.2 `/organizer/manage/[id]/edit`

Full rewrite. Reuses `StepperSidebar`, `SectionEventBasics`, `SectionActivities`, `SectionSurvey`,
`SectionPublish` from `/organizer/create/_components/` unchanged — same field-level validation
(`validateEventField`/`validateActivityField` etc., factored out of `create/page.tsx` into a shared
module both pages import, since duplicating ~150 lines of validation logic across two pages is the
kind of copy-paste this project is explicitly trying to eliminate).

On mount: `eventsAPI.getById(id)` → map `EventSummary` back into `EventFormState`/`ActivityFormState[]`
(existing image URLs become `imagePreview` with `imageFile: null`; unchanged images are never
re-uploaded). Submit calls the new `eventsAPI.update(id, body)` instead of `create`. No success screen
on save — returns to `/organizer/manage` (edit is a maintenance action, not a first-creation moment).

### 4.3 `/organizer/events/[id]` (detail)

Switch to `eventsAPI.getById(id)`. Header shows Event-level info (name, cover image, visibility badge,
survey question count). A tab strip lists each Activity by name; the active tab's panel shows every
field the wizard collects for that activity (description, category, image, date/time, location,
capacity/registered progress, conditions, benefits, soft skills, custom questions, volunteer
role+hours if certificate-enabled) plus its own registrant table (participants tab, since
`Registration.activityId` is per-activity) with the existing confirm/check-in actions untouched.
Cancel-activity dialog scopes to the active tab's activity, not the whole event.

### 4.4 `/student/events`

Switch to a new `eventsAPI.getAllPublic()` (student-facing list). One card per Event; if it has >1
activity, show an activity-count chip and the card's date/time/location row shows the nearest upcoming
activity's schedule instead of a single activity's. "ลงทะเบียน" goes to the Event detail page instead of
opening the modal directly from the list (since which activity to register for is now a choice made on
the detail page), "ดูรายละเอียด" unchanged.

### 4.5 `/student/events/[id]`

Switch to `eventsAPI.getPublicById(id)`. Same tab-per-activity layout as the organizer detail page for
consistency (info panel per tab: description, conditions, benefits, soft skills, date/time/location/
capacity). "ลงทะเบียนเข้าร่วม" button is scoped to the active tab's Activity; the registration modal
receives that Activity's `id` and its `questions`, unchanged submit logic
(`registrationsAPI.create(activityId, answers)` — already activity-scoped, no change needed there).

Registration modal restyle: replace every raw color (`bg-red-50`, `text-gray-500`, `bg-blue-600`,
`border-gray-100`, …) with the shared tokens (`bg-danger-bg`, `text-fg-muted`, `bg-brand-600`,
`border-border`) already used elsewhere in the app, matching `FormField`'s red-border/error-text
pattern from the create-wizard work for the profile-mismatch and required-question errors.

## 5. Data Flow Summary

```
organizer create/edit  →  Event + Activity[] (Prisma, transactional)
organizer manage list  →  GET /api/events/my           (Event[] with nested Activity[])
organizer detail       →  GET /api/events/:id           (Event with nested Activity[] + registrations)
student list            →  GET /api/events (public)      (Event[], visibility-filtered)
student detail          →  GET /api/events/:id (public)   (Event, visibility-filtered)
registration            →  POST /api/registrations {activityId, answers}   (unchanged)
```

## 6. Error Handling

- Backend: same conventions as `EventsService.create` — `BadRequestException` with a specific Thai
  message per violated rule, `NotFoundException` for missing/unauthorized-to-view Event (same
  can't-distinguish-404 pattern as `ActivitiesService.findById`).
- Frontend: field-level validation reused verbatim from the create wizard (`FormField`, red border +
  error text, `scrollToFirstError`); page-level errors (failed fetch, failed save) shown in the same
  `bg-danger-bg` banner pattern already used on `/organizer/create`.
- Activity deletion during edit: blocked server-side (see §3.1); surfaced client-side as the returned
  error message in the same banner, not a silent failure.

## 7. Testing Approach

No test framework exists in `frontend/` (confirmed during the prior create-wizard project — still
true). `backend/` has Jest configured. Plan:
- Backend: unit tests for `EventsService.update` covering the add/edit/remove-with-registrations-blocked
  paths, following the existing spec-file conventions in `backend/src/modules/**/*.spec.ts`.
- Frontend: manual verification against a live dev server for each of the 5 pages, using the existing
  organizer/student test accounts — same approach used for the create-wizard project, documented per
  task in the SDD ledger.

## 8. Open Questions Resolved During Brainstorming

- **Multi-activity Event display to students:** one card/page per Event, with in-page tabs to choose
  an Activity to view/register for (not one card per Activity). Confirmed by user.
