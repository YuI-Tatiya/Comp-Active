# fullPlan.md — Activity Creation UX & Cross-Role Display Consistency

Status: Draft for review
Scope: Frontend only (organizer create wizard, student/organizer display), no backend schema changes
Related fix already shipped: `frontend/components/auth/role-guard.tsx` — client-side role gating on `/student/*` and `/organizer/*` layouts (previously any logged-in role could reach any portal and only failed at submit time with a raw `403 Forbidden resource`)

## 1. Background & Current-State Findings

The activity creation flow lives at `frontend/app/organizer/create/` as a 4-step wizard:

1. **ข้อมูลพื้นฐาน** (`section-1-event-basics.tsx`) — event name, description, cover image
2. **กิจกรรมย่อย** (`section-2-activities.tsx` + `activity-tab-form.tsx`) — one or more sub-activities, each with its own image, schedule, capacity, certificate, soft-skill rates, custom questions
3. **แบบสำรวจ** (`section-3-survey.tsx`) — post-event survey questions
4. **เผยแพร่** (`section-4-publish.tsx`) — visibility rules + read-only summary, then submit

State is held in `page.tsx` (`EventFormState` / `ActivityFormState`, defined in `_components/types.ts`) and posted via `eventsAPI.create()` → backend `POST /api/events` (`EventsOrganizerController`, guarded by `@Roles(ORGANIZER, ADMIN)`).

Findings that motivate this plan:

| Area | Current behavior | Problem |
|---|---|---|
| Validation | `validateEvent()` / `validateActivities()` return a single error **string**; shown once at the top of the step | User can't tell which field is wrong; no inline feedback; re-validates only on "ถัดไป"/submit |
| Images | Plain `<input type="file" accept="image/*">`, `FileReader` preview, no crop, no dimension/ratio check | Organizer has no idea what shape looks good; display containers (`EventCard` 200px-tall card, `aspect-video` hero) `object-cover`-crop whatever they get, silently cutting subjects out of portrait/odd-ratio uploads |
| Post-submit | `handleSubmit()` → `router.push("/organizer/manage")` immediately on success | No confirmation, no summary, and critically **no mention that the new event starts as `pending_approval`** (per `APPROVAL_META` in `organizer/manage/page.tsx`) — organizer sees an empty-looking list and assumes something broke |
| Display consistency | `EventCard` (`components/ui/event-card.tsx`) is already correctly shared across `/events`, `/student/events`, `/organizer/manage` | Good — keep as-is. Detail pages (`student/events/[id]`, `organizer/events/[id]`) duplicate hero-image markup with diverging hardcoded colors (`text-gray-900` vs design tokens) |
| Placeholder asset | `EventCard` references `/activity-placeholder.jpg` when `activity.imageUrl` is falsy | File does not exist in `frontend/public/` at all — every placeholder render silently falls through to the `onError` Unsplash fallback URL. Works today only because the `onError` handler saves it; should be fixed properly. |

## 2. Goals

- Every required field shows its own inline error (red border + message) the moment it's invalid, not just a banner.
- Organizer uploads are cropped client-side to a fixed 16:9 ratio before upload, so every image is guaranteed to render correctly wherever it's shown.
- After a successful create, the organizer sees a clear success state that explains the `pending_approval` status before landing on the manage list.
- Student and organizer detail/list views keep rendering from the same cropped-at-source images with no further layout changes needed.

## Non-Goals

- No backend/schema/DTO changes — `POST /api/events`, `POST /api/activities/upload-image` stay as-is.
- No redesign of the visibility/soft-skill/certificate business rules — those are functioning as intended and out of scope.
- No full rewrite of `organizer/events/[id]` or `student/events/[id]` — only the image markup and placeholder asset are touched.

## 3. Design

### 3.1 Field-level validation

**Files touched:** `app/organizer/create/page.tsx`, `_components/section-1-event-basics.tsx`, `_components/activity-tab-form.tsx`, new `components/ui/form-field.tsx`

- Replace the `string | null` return of `validateEvent()` / `validateActivities()` with an error map:
  ```ts
  type EventErrors = Partial<Record<keyof EventFormState, string>>
  type ActivityErrors = Partial<Record<keyof ActivityFormState, string>>
  ```
  `validateActivities` returns `Record<activityKey, ActivityErrors>` so each tab can flag its own fields independently (important because step 2 is a multi-tab form — the current single string can't say *which* activity tab is broken).
- New `<FormField label required error>` wrapper around the existing `Input`/`Textarea`/`select` usages:
  - No error → renders normally.
  - `error` present → adds `border-danger ring-1 ring-danger/30` to the child input and renders `<p className="mt-1 text-xs text-danger">{error}</p>` directly under it.
- Validate on blur per field (not just on step-advance) using the same validator functions, scoped to one field.
- On "ถัดไป" / "สร้างงาน": if the map is non-empty, scroll to and focus the first invalid field (`document.querySelector('[data-field-error="true"]')` or a ref list keyed by field name) and keep a one-line summary banner ("มี 3 ฟิลด์ที่ต้องแก้ไข") instead of a single ad-hoc message.
- Keep existing Thai copy ("กรุณากรอกชื่องาน", etc.) — just re-key it per field instead of returning the first match.
- Step 2's per-activity tab trigger (`SectionActivities`) gets a small red dot/badge when that activity's error map is non-empty, so the organizer can see which tab needs attention without opening each one.

### 3.2 Image standard + client-side crop

**Files touched:** new `components/ui/image-crop-upload.tsx`, `_components/section-1-event-basics.tsx`, `_components/activity-tab-form.tsx`

- Standard: **16:9**, recommended minimum 1280×720, max 5MB (matches the existing backend multer limit in `activities-organizer.controller.ts`), `jpg/jpeg/png/gif` (matches existing `fileFilter`).
- New `<ImageCropUpload value preview onChange aspect={16/9} maxSizeMB={5} label helperText>`:
  1. File picked → opens a crop dialog (pan/zoom, fixed 16:9 crop frame).
  2. On confirm, draws the cropped region to an off-screen `<canvas>` and exports a `Blob` (jpeg, quality ~0.9).
  3. Emits that blob as the `File` to upload plus a same-shape `imagePreview` data URL — **no backend change**, `activitiesAPI.uploadImage()` keeps receiving a normal `File`.
  4. Helper text under the dropzone: "แนะนำอัตราส่วน 16:9 (เช่น 1280×720) ไฟล์ไม่เกิน 5MB".
- Swap this component in for both the event cover image (`section-1-event-basics.tsx`) and each activity's image (`activity-tab-form.tsx`).
- Fix the missing `frontend/public/activity-placeholder.jpg`: add a real 16:9 placeholder asset so `EventCard`'s primary `src` resolves instead of always relying on the `onError` Unsplash fallback.

### 3.3 Post-create success state

**Files touched:** `app/organizer/create/page.tsx`, new `_components/section-5-success.tsx`

- `handleSubmit()` no longer calls `router.push` directly on success — it sets a local `createdEvent` result and advances to an unnumbered "success" view rendered in place of the stepper content (stepper itself stops at step 4; this view has no step number, consistent with how confirmation screens work elsewhere in checkout-style flows).
- Success view shows:
  - Success icon + headline: "สร้างงานสำเร็จ! กำลังรออนุมัติจากแอดมิน"
  - One-line explanation that the event is not visible to students until an admin approves it (`pending_approval`), directly addressing the confusion the current instant-redirect causes.
  - Summary card: event name, activity count, cropped cover image preview.
  - Two actions: "ไปหน้าจัดการกิจกรรม" (→ `/organizer/manage`) and "สร้างงานใหม่อีกครั้ง" (resets `event`/`activities` state and returns to step 1).

### 3.4 Student ↔ Organizer display consistency

**Files touched:** `app/student/events/[id]/page.tsx`, `app/organizer/events/[id]/page.tsx`

- No layout changes needed for the hero image itself — both already use `aspect-video` + `object-cover`, and once uploads are pre-cropped to 16:9 (3.2), both will render pixel-consistent without any further work.
- While touching these files for the placeholder fix, align the hardcoded `text-gray-900` / `text-gray-500` classes in `student/events/[id]/page.tsx` to the same design tokens (`text-fg`, `text-fg-muted`) already used in the organizer version — pure visual consistency, no structural change.

## 4. Rollout Order

1. Field-level validation (3.1) — smallest surface, no new dependency, immediately fixes the worst UX complaint.
2. Image crop component (3.2) — new shared component, then wire into both upload sites; add the missing placeholder asset.
3. Success screen (3.3) — depends on the cropped preview from 3.2 to show a correct-looking summary image.
4. Display token cleanup (3.4) — cosmetic, can land anytime after 3.2, independent of 3.1/3.3.

## 5. Testing Plan

- Manual: log in as an approved `organizer` account (role-guard fix required a real organizer/admin account — not yet verified live in this session), run the 4-step wizard end to end with at least one deliberately invalid field per step to confirm inline errors, then a full valid submission to confirm the new success screen and correct `pending_approval` messaging.
- Manual: upload a portrait and a landscape source image through `ImageCropUpload`, confirm the exported blob is 16:9 and under 5MB, and that the same image renders correctly in `EventCard`, the organizer detail hero, and the student detail hero.
- No backend tests needed (no backend changes in this plan).
