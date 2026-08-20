# Activity Creation UX & Cross-Role Display Consistency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add field-level inline validation, a client-side 16:9 image cropper, and a post-create success screen to the organizer's 4-step activity creation wizard, and align design tokens between the student and organizer event-detail pages.

**Architecture:** Pure frontend change inside `frontend/app/organizer/create/` plus two new shared components in `frontend/components/ui/`. Validation moves from a single top-of-step error string to a per-field error map held in `page.tsx` and rendered by a new `<FormField>` wrapper. Image uploads route through a new `<ImageCropUpload>` component that crops to 16:9 client-side via `<canvas>` before handing a `File` to the existing (unchanged) upload API. A new unnumbered "success" view replaces the immediate `router.push` on submit.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4 (existing design tokens: `text-fg`, `text-fg-muted`, `text-danger`, `border-border`, `bg-surface`, `bg-bg`), no new npm dependencies.

**Spec:** `fullPlan.md` (repo root)

## Global Constraints

- No new npm dependencies — the crop UI is built with native `<canvas>` + CSS `object-position`, not a library.
- No backend changes — `POST /api/events`, `POST /api/activities`, `POST /api/activities/upload-image`, `POST /api/events/upload-attachment` all stay exactly as they are today.
- `frontend/package.json` has no test framework (no jest/vitest/testing-library, no `test` script) and no other file in `frontend/` has a companion test file. Do **not** add a test framework as part of this plan — every task's verification step is `npx tsc --noEmit`, `npm run lint`, and a manual dev-server check written out in the step. This is a deliberate deviation from the default TDD step shape, forced by the existing codebase having zero frontend test infrastructure.
- Match existing design tokens in every touched file — never introduce raw Tailwind gray/red palette classes (`text-gray-900`, `bg-red-50`, etc.) in files this plan touches; use `text-fg`, `text-fg-muted`, `text-danger`, `bg-danger-bg`, `border-border`, `bg-surface`.
- Keep the existing Thai-language copy style (`กรุณากรอก...`, `ต้องมีอย่างน้อย...`) for every new/changed validation message.
- Run all commands from `frontend/` (`cd "C:\Users\HP VICTU\Desktop\Project 1\CP_Check\frontend"`).

---

## File Structure

New files:
- `frontend/components/ui/form-field.tsx` — `<FormField>` wrapper (label + input slot + inline error) and `scrollToFirstError()` helper.
- `frontend/components/ui/image-crop-upload.tsx` — `<ImageCropUpload>` component + exported `computeCoverSourceRect()` pure function.
- `frontend/public/activity-placeholder.svg` — real placeholder asset (16:9) referenced by `EventCard`.
- `frontend/app/organizer/create/_components/section-5-success.tsx` — post-submit success view.

Modified files:
- `frontend/app/organizer/create/_components/types.ts` — add `EventFormErrors` / `ActivityFormErrors` types.
- `frontend/app/organizer/create/page.tsx` — per-field validators, error state, blur handlers, submit/success wiring.
- `frontend/app/organizer/create/_components/section-1-event-basics.tsx` — use `FormField` + `ImageCropUpload`.
- `frontend/app/organizer/create/_components/activity-tab-form.tsx` — use `FormField` + `ImageCropUpload`.
- `frontend/app/organizer/create/_components/section-2-activities.tsx` — red-dot badge on tabs with errors.
- `frontend/components/ui/event-card.tsx` — point placeholder `src` at the new SVG.
- `frontend/app/student/events/[id]/page.tsx` — swap hardcoded gray classes for design tokens (image/text area only).

---

## Task 1: `<FormField>` shared component

**Files:**
- Create: `frontend/components/ui/form-field.tsx`

**Interfaces:**
- Produces: `FormField({ name, label, required?, error?, children, className? })` — wraps any input, renders `<Label>`, the child, and a red inline error message; sets `data-field={name}` on the wrapping `<div>` for scroll/focus targeting.
- Produces: `fieldInputClass(error?: string): string` — returns the border/ring classes to append to an `<Input>`/`<Textarea>`/`<select>` className when `error` is truthy, `""` otherwise.
- Produces: `scrollToFirstError(errors: Record<string, string | undefined>): void` — finds the first key with a truthy value, scrolls the matching `[data-field="<key>"]` element into view, and focuses its first `input`/`textarea`/`select` descendant.

- [ ] **Step 1: Write the component**

```tsx
// frontend/components/ui/form-field.tsx
"use client"

import * as React from "react"
import { Label } from "./label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
    /** ต้องตรงกับ key ที่ใช้ใน error map ของ parent — ใช้เป็น scroll/focus target ตอน validate ไม่ผ่าน */
    name: string
    label: string
    required?: boolean
    error?: string
    children: React.ReactNode
    className?: string
}

export function FormField({ name, label, required, error, children, className }: FormFieldProps) {
    return (
        <div className={cn("space-y-2", className)} data-field={name}>
            <Label>
                {label} {required && <span className="text-danger">*</span>}
            </Label>
            {children}
            {error && <p className="text-xs text-danger">{error}</p>}
        </div>
    )
}

/** ต่อท้าย className ของ Input/Textarea/select เพื่อให้ขึ้นกรอบแดงเมื่อ field นั้น invalid */
export function fieldInputClass(error?: string): string {
    return error ? "border-danger ring-1 ring-danger/30 focus-visible:ring-danger/50" : ""
}

/** เลื่อนจอไปหาฟิลด์แรกที่ error แล้ว focus input ข้างในให้ */
export function scrollToFirstError(errors: Record<string, string | undefined>): void {
    const firstKey = Object.keys(errors).find((k) => errors[k])
    if (!firstKey) return
    requestAnimationFrame(() => {
        const el = document.querySelector(`[data-field="${firstKey}"]`)
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        const input = el.querySelector<HTMLElement>("input, textarea, select")
        input?.focus()
    })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `form-field.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/form-field.tsx
git commit -m "feat(organizer): add shared FormField component for inline validation"
```

---

## Task 2: Per-field validators + error state in the wizard shell

**Files:**
- Modify: `frontend/app/organizer/create/_components/types.ts`
- Modify: `frontend/app/organizer/create/page.tsx`

**Interfaces:**
- Consumes: `FormField`, `fieldInputClass`, `scrollToFirstError` from Task 1 (`@/components/ui/form-field`).
- Produces (for Tasks 3–4 to consume): `EventFormErrors`, `ActivityFormErrors` types from `types.ts`; and from `page.tsx`, the props `eventErrors: EventFormErrors`, `onEventFieldBlur: (field: keyof EventFormErrors) => void` passed to `SectionEventBasics`, and `activityErrors: Record<string, ActivityFormErrors>`, `onActivityFieldBlur: (key: string, field: keyof ActivityFormErrors) => void` passed to `SectionActivities`/`ActivityTabForm`.

- [ ] **Step 1: Add error types to `types.ts`**

Append to the end of `frontend/app/organizer/create/_components/types.ts` (after the existing `createEmptyActivity` function, i.e. after current line 94):

```ts

export type EventFormErrors = Partial<Record<"name" | "description", string>>

export type ActivityFormErrors = Partial<Record<
    "name" | "category" | "description" | "startAt" | "endAt" | "location" | "capacity" | "volunteerRole",
    string
>>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Replace the validator functions and imports in `page.tsx`**

Replace lines 1–52 of `frontend/app/organizer/create/page.tsx` (the imports through the end of `validateActivities`) with:

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import { activitiesAPI, eventsAPI, type CreateEventActivityBody, type QuestionBody, type SurveyQuestionBody } from "@/lib/api"
import { scrollToFirstError } from "@/components/ui/form-field"
import { StepperSidebar, type StepMeta } from "./_components/stepper-sidebar"
import { SectionEventBasics } from "./_components/section-1-event-basics"
import { SectionActivities } from "./_components/section-2-activities"
import { SectionSurvey } from "./_components/section-3-survey"
import { SectionPublish } from "./_components/section-4-publish"
import { SectionSuccess } from "./_components/section-5-success"
import {
    createEmptyEvent,
    createEmptyActivity,
    type EventFormState,
    type ActivityFormState,
    type EventFormErrors,
    type ActivityFormErrors,
} from "./_components/types"

const STEPS: StepMeta[] = [
    { number: 1, title: "ข้อมูลพื้นฐาน", subtitle: "ชื่อและรายละเอียดงาน" },
    { number: 2, title: "กิจกรรมย่อย", subtitle: "รายละเอียดแต่ละกิจกรรม" },
    { number: 3, title: "แบบสำรวจ", subtitle: "คำถามหลังจบกิจกรรม" },
    { number: 4, title: "เผยแพร่", subtitle: "ตรวจสอบและยืนยัน" },
]

function validateEventField(event: EventFormState, field: keyof EventFormErrors): string | undefined {
    switch (field) {
        case "name":
            return event.name.trim() ? undefined : "กรุณากรอกชื่องาน"
        case "description":
            return event.description.trim() ? undefined : "กรุณากรอกรายละเอียดงาน"
    }
}

function validateEventFields(event: EventFormState): EventFormErrors {
    const errors: EventFormErrors = {}
    const nameErr = validateEventField(event, "name")
    if (nameErr) errors.name = nameErr
    const descErr = validateEventField(event, "description")
    if (descErr) errors.description = descErr
    return errors
}

function validateActivityField(a: ActivityFormState, field: keyof ActivityFormErrors): string | undefined {
    switch (field) {
        case "name":
            return a.name.trim() ? undefined : "กรุณากรอกชื่อกิจกรรม"
        case "category":
            return a.category ? undefined : "กรุณาเลือกหมวดหมู่"
        case "description":
            return a.description.trim() ? undefined : "กรุณากรอกรายละเอียด"
        case "startAt":
            return a.startAt ? undefined : "กรุณาระบุวันเวลาเริ่ม"
        case "endAt":
            if (!a.endAt) return "กรุณาระบุวันเวลาสิ้นสุด"
            if (a.startAt && new Date(a.endAt) <= new Date(a.startAt)) return "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม"
            return undefined
        case "location":
            return a.location.trim() ? undefined : "กรุณากรอกสถานที่"
        case "capacity":
            if (!a.capacityEnabled) return undefined
            return !a.capacity || parseInt(a.capacity) < 1 ? "กรุณาระบุจำนวนที่รับ" : undefined
        case "volunteerRole":
            if (!a.certEnabled) return undefined
            return a.volunteerRole.trim() ? undefined : "กรุณาระบุชื่อบทบาทสำหรับใบจิตอาสา"
    }
}

const ACTIVITY_FIELDS: (keyof ActivityFormErrors)[] = [
    "name", "category", "description", "startAt", "endAt", "location", "capacity", "volunteerRole",
]

function validateActivityFields(a: ActivityFormState): ActivityFormErrors {
    const errors: ActivityFormErrors = {}
    for (const field of ACTIVITY_FIELDS) {
        const message = validateActivityField(a, field)
        if (message) errors[field] = message
    }
    return errors
}

function validateAllActivities(activities: ActivityFormState[]): Record<string, ActivityFormErrors> {
    const map: Record<string, ActivityFormErrors> = {}
    for (const a of activities) {
        const errs = validateActivityFields(a)
        if (Object.keys(errs).length > 0) map[a.key] = errs
    }
    return map
}

function countErrors(errors: Record<string, string | undefined>): number {
    return Object.values(errors).filter(Boolean).length
}
```

- [ ] **Step 4: Add error state and blur handlers**

In `frontend/app/organizer/create/page.tsx`, replace the component's state block (originally lines 56–61, now shifted — locate `export default function CreateEventPage()` and its first few `useState` lines) so it reads:

```tsx
export default function CreateEventPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [event, setEvent] = useState<EventFormState>(createEmptyEvent)
    const [activities, setActivities] = useState<ActivityFormState[]>(() => [createEmptyActivity()])
    const [activeActivityKey, setActiveActivityKey] = useState(() => activities[0].key)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState("")
    const [eventErrors, setEventErrors] = useState<EventFormErrors>({})
    const [activityErrors, setActivityErrors] = useState<Record<string, ActivityFormErrors>>({})
```

Immediately after `patchActivity` (the function that follows `patchEvent`), add:

```tsx
    function handleEventFieldBlur(field: keyof EventFormErrors) {
        const message = validateEventField(event, field)
        setEventErrors((prev) => ({ ...prev, [field]: message }))
    }

    function handleActivityFieldBlur(key: string, field: keyof ActivityFormErrors) {
        const activity = activities.find((a) => a.key === key)
        if (!activity) return
        const message = validateActivityField(activity, field)
        setActivityErrors((prev) => ({
            ...prev,
            [key]: { ...prev[key], [field]: message },
        }))
    }
```

- [ ] **Step 5: Rewrite `handleNext` to use the error maps**

Replace the existing `handleNext` function with:

```tsx
    function handleNext() {
        if (step === 1) {
            const errs = validateEventFields(event)
            setEventErrors(errs)
            const n = countErrors(errs)
            if (n > 0) {
                setError(`มี ${n} ฟิลด์ที่ต้องแก้ไข`)
                scrollToFirstError(errs)
                return
            }
        } else if (step === 2) {
            if (activities.length === 0) {
                setError("ต้องมีอย่างน้อย 1 กิจกรรม")
                return
            }
            const errsByKey = validateAllActivities(activities)
            setActivityErrors(errsByKey)
            const total = Object.values(errsByKey).reduce((sum, e) => sum + countErrors(e), 0)
            if (total > 0) {
                setError(`มี ${total} ฟิลด์ที่ต้องแก้ไข`)
                const firstKey = Object.keys(errsByKey)[0]
                if (firstKey) setActiveActivityKey(firstKey)
                scrollToFirstError(errsByKey[firstKey] ?? {})
                return
            }
        }
        // ขั้นที่ 3 (แบบสำรวจ) ไม่มีฟิลด์บังคับ — ไปต่อได้เสมอ
        setError("")
        setStep((prev) => Math.min(prev + 1, STEPS.length))
    }
```

- [ ] **Step 6: Update `handleSubmit` to validate with the error maps and show the success view instead of redirecting**

Inside the existing `async function handleSubmit() {` (do **not** duplicate this line — it's already there), replace only its first 5 lines:

```tsx
        const eventErr = validateEvent(event)
        const activitiesErr = validateActivities(activities)
        if (eventErr || activitiesErr) {
            setError(eventErr || activitiesErr || "")
            return
        }
```

with:

```tsx
        const eventErrs = validateEventFields(event)
        const activityErrsByKey = validateAllActivities(activities)
        setEventErrors(eventErrs)
        setActivityErrors(activityErrsByKey)
        const total = countErrors(eventErrs) + Object.values(activityErrsByKey).reduce((sum, e) => sum + countErrors(e), 0)
        if (total > 0) {
            setError(`มี ${total} ฟิลด์ที่ต้องแก้ไข`)
            return
        }
```

Everything below this in `handleSubmit` (the `setSubmitting(true)` line onward) stays where it is, unchanged, except one line: replace `router.push("/organizer/manage")` (inside the `try` block, after `await eventsAPI.create(...)`) with `setSubmitted(true)`.

- [ ] **Step 7: Add the reset-and-restart handler**

Add this function next to `handleSubmit`:

```tsx
    function handleCreateAnother() {
        const nextActivities = [createEmptyActivity()]
        setEvent(createEmptyEvent())
        setActivities(nextActivities)
        setActiveActivityKey(nextActivities[0].key)
        setStep(1)
        setSubmitted(false)
        setEventErrors({})
        setActivityErrors({})
        setError("")
    }
```

- [ ] **Step 8: Branch the JSX on `submitted`, and pass error props down**

Replace the component's `return (...)` block. The wizard card content is unchanged except: `SectionEventBasics` now receives `errors={eventErrors}` and `onFieldBlur={handleEventFieldBlur}`; `SectionActivities` now receives `errorsByKey={activityErrors}` and `onFieldBlur={handleActivityFieldBlur}`. When `submitted` is true, render `SectionSuccess` instead of the stepper/card:

```tsx
    return (
        <div className="bg-surface">
            <Container className="py-10">
                {submitted ? (
                    <SectionSuccess event={event} activities={activities} onCreateAnother={handleCreateAnother} />
                ) : (
                    <>
                        <div className="mb-8 flex items-center">
                            <Button variant="ghost" onClick={handleBack} className="mr-4">
                                <ArrowLeft className="size-4" />
                                กลับ
                            </Button>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-black text-fg">
                                    <div className="rounded-lg bg-brand-100 p-2 text-brand-600">
                                        <Plus className="size-5" />
                                    </div>
                                    สร้างงานใหม่
                                </h1>
                                <p className="mt-1 text-fg-muted">
                                    งานหนึ่งมีได้หลายกิจกรรมย่อย พร้อมตั้งค่าใบจิตอาสาและการให้คะแนน Soft Skills
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
                            <StepperSidebar steps={STEPS} currentStep={step} className="hidden md:flex" />

                            <div>
                                <div className="min-h-[500px] rounded-2xl border border-border bg-bg p-8 shadow-xs">
                                    {error && (
                                        <div className="mb-6 rounded-lg border border-danger bg-danger-bg px-4 py-3 text-center text-sm text-danger">
                                            {error}
                                        </div>
                                    )}

                                    {step === 1 && (
                                        <SectionEventBasics
                                            data={event}
                                            errors={eventErrors}
                                            onChange={patchEvent}
                                            onFieldBlur={handleEventFieldBlur}
                                        />
                                    )}
                                    {step === 2 && (
                                        <SectionActivities
                                            activities={activities}
                                            activeKey={activeActivityKey}
                                            errorsByKey={activityErrors}
                                            onActiveKeyChange={setActiveActivityKey}
                                            onChangeActivity={patchActivity}
                                            onFieldBlur={handleActivityFieldBlur}
                                            onAdd={handleAddActivity}
                                            onRemove={handleRemoveActivity}
                                        />
                                    )}
                                    {step === 3 && <SectionSurvey event={event} onChange={patchEvent} />}
                                    {step === 4 && (
                                        <SectionPublish event={event} activities={activities} onChangeEvent={patchEvent} />
                                    )}
                                </div>

                                <div className="mt-6 flex justify-between">
                                    <Button variant="outline" onClick={handleBack}>
                                        {step === 1 ? "ยกเลิก" : "ก่อนหน้า"}
                                    </Button>
                                    <Button
                                        onClick={step === STEPS.length ? handleSubmit : handleNext}
                                        disabled={submitting}
                                        className="w-36"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" />
                                                กำลังสร้าง...
                                            </>
                                        ) : step === STEPS.length ? (
                                            "สร้างงาน"
                                        ) : (
                                            "ถัดไป"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Container>
        </div>
    )
}
```

- [ ] **Step 9: Type-check (expect errors — component props don't exist yet)**

Run: `npx tsc --noEmit`
Expected: errors on `SectionEventBasics`/`SectionActivities` missing props (`errors`, `onFieldBlur`, `errorsByKey`) and on the missing `./_components/section-5-success` module — these are resolved in Tasks 3, 4, and 7. Confirm the errors are *only* about those, nothing else in `page.tsx`.

- [ ] **Step 10: Commit**

```bash
git add frontend/app/organizer/create/_components/types.ts frontend/app/organizer/create/page.tsx
git commit -m "feat(organizer): move create-wizard validation to per-field error maps"
```

---

## Task 3: Wire `FormField` into Step 1 (event basics)

**Files:**
- Modify: `frontend/app/organizer/create/_components/section-1-event-basics.tsx`

**Interfaces:**
- Consumes: `EventFormErrors` (Task 2, `./types`), `FormField`/`fieldInputClass` (Task 1, `@/components/ui/form-field`).
- Consumes (image upload — wired fully in Task 6, stub for now): keep the existing plain `<input type="file">` block in this task; Task 6 swaps it for `<ImageCropUpload>`.

- [ ] **Step 1: Replace the file with the `FormField`-wired version**

```tsx
// frontend/app/organizer/create/_components/section-1-event-basics.tsx
"use client"

import type { ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import type { EventFormState, EventFormErrors } from "./types"

interface Props {
    data: EventFormState
    errors: EventFormErrors
    onChange: (patch: Partial<EventFormState>) => void
    onFieldBlur: (field: keyof EventFormErrors) => void
}

export function SectionEventBasics({ data, errors, onChange, onFieldBlur }: Props) {
    function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => onChange({ imageFile: file, imagePreview: reader.result as string })
        reader.readAsDataURL(file)
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-fg">ข้อมูลพื้นฐานของงาน</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    ตั้งชื่อและอธิบายภาพรวมของงาน — งานหนึ่งสามารถมีกิจกรรมย่อยได้หลายกิจกรรมในขั้นตอนถัดไป
                </p>
            </div>

            <FormField name="name" label="ชื่องาน" required error={errors.name}>
                <Input
                    value={data.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    onBlur={() => onFieldBlur("name")}
                    className={fieldInputClass(errors.name)}
                />
            </FormField>

            <FormField name="description" label="รายละเอียด" required error={errors.description}>
                <Textarea
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    onBlur={() => onFieldBlur("description")}
                    className={`min-h-[120px] ${fieldInputClass(errors.description)}`}
                />
            </FormField>

            <div className="space-y-2">
                <FormField name="imageFile" label="รูปภาพหน้าปกงาน">
                    <Input type="file" accept="image/*" onChange={handleImageChange} />
                </FormField>
                {data.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={data.imagePreview}
                        alt="Preview"
                        className="mt-2 w-full max-w-sm rounded-lg border border-border"
                    />
                )}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `section-1-event-basics.tsx`

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `http://localhost:3000/organizer/create` logged in as an organizer, go to step 1: click into "ชื่องาน", leave it empty, blur (click elsewhere) — the field should get a red border and a red message underneath immediately, without pressing "ถัดไป".

- [ ] **Step 4: Commit**

```bash
git add frontend/app/organizer/create/_components/section-1-event-basics.tsx
git commit -m "feat(organizer): inline validation on step 1 (event basics)"
```

---

## Task 4: Wire `FormField` into Step 2 (activities) + tab error badges

**Files:**
- Modify: `frontend/app/organizer/create/_components/activity-tab-form.tsx`
- Modify: `frontend/app/organizer/create/_components/section-2-activities.tsx`

**Interfaces:**
- Consumes: `ActivityFormErrors` (Task 2, `./types`), `FormField`/`fieldInputClass` (Task 1).
- Consumes (image upload — wired fully in Task 6): keep the existing plain `<input type="file">` for the activity image in this task.

- [ ] **Step 1: Update `activity-tab-form.tsx` props and the six required fields**

In `frontend/app/organizer/create/_components/activity-tab-form.tsx`, change the imports and `Props` interface (lines 1–23) to:

```tsx
"use client"

import type { ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import { DynamicQuestionBuilder } from "@/components/ui/dynamic-question-builder"
import { CATEGORIES } from "@/lib/categories"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { Paperclip, X } from "lucide-react"
import type { ActivityFormState, ActivityFormErrors } from "./types"

const QUESTION_TYPE_OPTIONS = [
    { value: "text", label: "คำตอบแบบข้อความ" },
    { value: "single_choice", label: "เลือกตอบข้อเดียว" },
    { value: "multi_choice", label: "เลือกตอบได้หลายข้อ" },
]

interface Props {
    activity: ActivityFormState
    errors: ActivityFormErrors
    onChange: (patch: Partial<ActivityFormState>) => void
    onFieldBlur: (field: keyof ActivityFormErrors) => void
}
```

Then in the function signature, change `export function ActivityTabForm({ activity, onChange }: Props) {` to `export function ActivityTabForm({ activity, errors, onChange, onFieldBlur }: Props) {`.

Replace the "ชื่อกิจกรรม" / "หมวดหมู่" block with:

```tsx
                <FormField name="name" label="ชื่อกิจกรรม" required error={errors.name}>
                    <Input
                        value={activity.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        onBlur={() => onFieldBlur("name")}
                        className={fieldInputClass(errors.name)}
                    />
                </FormField>
                <FormField name="category" label="หมวดหมู่" required error={errors.category}>
                    <select
                        className={`h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldInputClass(errors.category)}`}
                        value={activity.category}
                        onChange={(e) => onChange({ category: e.target.value })}
                        onBlur={() => onFieldBlur("category")}
                    >
                        <option value="">เลือกหมวดหมู่</option>
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </FormField>
```

(This replaces the two `<div className="space-y-2">...</div>` blocks inside the first `grid grid-cols-1 gap-6 md:grid-cols-2` — keep that wrapping `<div className="grid ...">` as-is, only its two children change.)

Replace the "รายละเอียดกิจกรรม" block with:

```tsx
            <FormField name="description" label="รายละเอียดกิจกรรม" required error={errors.description}>
                <Textarea
                    value={activity.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    onBlur={() => onFieldBlur("description")}
                    className={`min-h-[100px] ${fieldInputClass(errors.description)}`}
                />
            </FormField>
```

Replace the "วันเวลาเริ่ม" / "วันเวลาสิ้นสุด" pair with:

```tsx
                <FormField name="startAt" label="วันเวลาเริ่ม" required error={errors.startAt}>
                    <Input
                        type="datetime-local"
                        value={activity.startAt}
                        onChange={(e) => onChange({ startAt: e.target.value })}
                        onBlur={() => onFieldBlur("startAt")}
                        className={fieldInputClass(errors.startAt)}
                    />
                </FormField>
                <FormField name="endAt" label="วันเวลาสิ้นสุด" required error={errors.endAt}>
                    <Input
                        type="datetime-local"
                        value={activity.endAt}
                        onChange={(e) => onChange({ endAt: e.target.value })}
                        onBlur={() => onFieldBlur("endAt")}
                        className={fieldInputClass(errors.endAt)}
                    />
                </FormField>
```

Replace the "สถานที่" block with:

```tsx
            <FormField name="location" label="สถานที่" required error={errors.location}>
                <Input
                    value={activity.location}
                    onChange={(e) => onChange({ location: e.target.value })}
                    onBlur={() => onFieldBlur("location")}
                    className={fieldInputClass(errors.location)}
                />
            </FormField>
```

Replace the "จำนวนที่รับ (คน)" block (inside `{activity.capacityEnabled && (...)}`) with:

```tsx
                {activity.capacityEnabled && (
                    <FormField name="capacity" label="จำนวนที่รับ (คน)" required error={errors.capacity} className="max-w-[200px]">
                        <Input
                            type="number"
                            min={1}
                            value={activity.capacity}
                            onChange={(e) => onChange({ capacity: e.target.value })}
                            onBlur={() => onFieldBlur("capacity")}
                            className={fieldInputClass(errors.capacity)}
                        />
                    </FormField>
                )}
```

Replace the "ชื่อบทบาท/การทำงาน" block (inside `{activity.certEnabled && (...)}`) with:

```tsx
                {activity.certEnabled && (
                    <div className="space-y-4">
                        <FormField name="volunteerRole" label="ชื่อบทบาท/การทำงาน" required error={errors.volunteerRole} className="max-w-sm">
                            <Input
                                value={activity.volunteerRole}
                                onChange={(e) => onChange({ volunteerRole: e.target.value })}
                                onBlur={() => onFieldBlur("volunteerRole")}
                                className={fieldInputClass(errors.volunteerRole)}
                            />
                        </FormField>
                        <p className="text-sm text-fg-muted">
                            ชั่วโมงจิตอาสาโดยประมาณ:{" "}
                            <span className="font-bold text-brand-600">
                                {hoursPreview ? `${hoursPreview} ชั่วโมง` : "กรุณาระบุวันเวลาเริ่ม-สิ้นสุดก่อน"}
                            </span>
                        </p>
                    </div>
                )}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only about `ActivityTabForm` being called without the new `errors`/`onFieldBlur` props from `section-2-activities.tsx` — fixed in the next step.

- [ ] **Step 3: Update `section-2-activities.tsx` to pass errors through and show tab badges**

Replace the full contents of `frontend/app/organizer/create/_components/section-2-activities.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ActivityTabForm } from "./activity-tab-form"
import { Plus, X } from "lucide-react"
import type { ActivityFormState, ActivityFormErrors } from "./types"

interface Props {
    activities: ActivityFormState[]
    activeKey: string
    errorsByKey: Record<string, ActivityFormErrors>
    onActiveKeyChange: (key: string) => void
    onChangeActivity: (key: string, patch: Partial<ActivityFormState>) => void
    onFieldBlur: (key: string, field: keyof ActivityFormErrors) => void
    onAdd: () => void
    onRemove: (key: string) => void
}

export function SectionActivities({
    activities,
    activeKey,
    errorsByKey,
    onActiveKeyChange,
    onChangeActivity,
    onFieldBlur,
    onAdd,
    onRemove,
}: Props) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-fg">กิจกรรมย่อยในงานนี้</h2>
                    <p className="mt-1 text-sm text-fg-muted">
                        งานหนึ่งมีได้หลายกิจกรรม แต่ละกิจกรรมมีเวลาและเงื่อนไขของตัวเอง
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onAdd}>
                    <Plus className="size-4" />
                    เพิ่มกิจกรรม
                </Button>
            </div>

            <Tabs value={activeKey} onValueChange={onActiveKeyChange}>
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface p-1">
                    {activities.map((a, i) => {
                        const hasError = Object.keys(errorsByKey[a.key] ?? {}).length > 0
                        return (
                            <div key={a.key} className="relative">
                                <TabsTrigger value={a.key} className={activities.length > 1 ? "pr-7" : ""}>
                                    {hasError && (
                                        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-danger" aria-label="มีฟิลด์ที่ต้องแก้ไข" />
                                    )}
                                    {`กิจกรรมที่ ${i + 1}`}{a.name ? `: ${a.name}` : ""}
                                </TabsTrigger>
                                {activities.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRemove(a.key)
                                        }}
                                        aria-label="ลบกิจกรรมนี้"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-fg-subtle hover:bg-danger-bg hover:text-danger"
                                    >
                                        <X className="size-3" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </TabsList>

                {activities.map((a) => (
                    <TabsContent key={a.key} value={a.key} className="mt-6">
                        <ActivityTabForm
                            activity={a}
                            errors={errorsByKey[a.key] ?? {}}
                            onChange={(patch) => onChangeActivity(a.key, patch)}
                            onFieldBlur={(field) => onFieldBlur(a.key, field)}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `activity-tab-form.tsx` or `section-2-activities.tsx`. `page.tsx` should now also be clean except for the still-missing `section-5-success` module (Task 7).

- [ ] **Step 5: Manual check**

On the dev server, go to step 2, leave "ชื่อกิจกรรม" empty and blur it — red border + message appear under that field only, and the active tab trigger shows a small red dot. Add a second activity, leave it invalid, switch tabs — the dot should show on whichever tab has errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/organizer/create/_components/activity-tab-form.tsx frontend/app/organizer/create/_components/section-2-activities.tsx
git commit -m "feat(organizer): inline validation on step 2 (activities) with per-tab error badges"
```

---

## Task 5: `<ImageCropUpload>` component

**Files:**
- Create: `frontend/components/ui/image-crop-upload.tsx`

**Interfaces:**
- Produces: `computeCoverSourceRect(naturalWidth, naturalHeight, aspect, posXPercent, posYPercent): { sx, sy, sw, sh }` — pure function implementing the same "cover" crop-and-position algorithm as CSS `object-fit: cover` + `object-position: X% Y%`.
- Produces: `IMAGE_CROP_ASPECT = 16 / 9` constant.
- Produces: `ImageCropUpload({ label, helperText?, preview, onChange, onClear?, aspect? })` — file input + crop dialog; calls `onChange(file: File, previewDataUrl: string)` once the organizer confirms the crop.

- [ ] **Step 1: Write the component**

```tsx
// frontend/components/ui/image-crop-upload.tsx
"use client"

import { useState, type ChangeEvent, type SyntheticEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { Button } from "./button"
import { Input } from "./input"
import { X } from "lucide-react"

export const IMAGE_CROP_ASPECT = 16 / 9
const MAX_SIZE_MB = 5
const OUTPUT_WIDTH = 1280

/**
 * คำนวณ source rect แบบเดียวกับ CSS object-fit:cover + object-position: X% Y%
 * — ใช้ทั้งฝั่ง preview (CSS) และฝั่ง canvas (ตอน export) เพื่อให้สิ่งที่เห็นตรงกับไฟล์จริง 100%
 */
export function computeCoverSourceRect(
    naturalWidth: number,
    naturalHeight: number,
    aspect: number,
    posXPercent: number,
    posYPercent: number,
): { sx: number; sy: number; sw: number; sh: number } {
    const imageAspect = naturalWidth / naturalHeight
    let sw: number
    let sh: number
    if (imageAspect > aspect) {
        sh = naturalHeight
        sw = sh * aspect
    } else {
        sw = naturalWidth
        sh = sw / aspect
    }
    const maxX = naturalWidth - sw
    const maxY = naturalHeight - sh
    return {
        sx: maxX * (posXPercent / 100),
        sy: maxY * (posYPercent / 100),
        sw,
        sh,
    }
}

interface ImageCropUploadProps {
    label: string
    helperText?: string
    preview: string | null
    onChange: (file: File, preview: string) => void
    onClear?: () => void
    aspect?: number
}

export function ImageCropUpload({
    label,
    helperText = "แนะนำอัตราส่วน 16:9 (เช่น 1280×720) ไฟล์ไม่เกิน 5MB",
    preview,
    onChange,
    onClear,
    aspect = IMAGE_CROP_ASPECT,
}: ImageCropUploadProps) {
    const [rawUrl, setRawUrl] = useState<string | null>(null)
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
    const [posX, setPosX] = useState(50)
    const [posY, setPosY] = useState(50)
    const [error, setError] = useState("")

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`ไฟล์ต้องมีขนาดไม่เกิน ${MAX_SIZE_MB}MB`)
            return
        }
        setError("")
        setPosX(50)
        setPosY(50)
        setRawUrl(URL.createObjectURL(file))
    }

    function handleImageLoad(e: SyntheticEvent<HTMLImageElement>) {
        setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
    }

    function handleConfirm() {
        if (!rawUrl || naturalSize.width === 0) return
        const { sx, sy, sw, sh } = computeCoverSourceRect(naturalSize.width, naturalSize.height, aspect, posX, posY)

        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = OUTPUT_WIDTH
            canvas.height = Math.round(OUTPUT_WIDTH / aspect)
            const ctx = canvas.getContext("2d")
            if (!ctx) return
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
                (blob) => {
                    if (!blob) return
                    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" })
                    onChange(file, canvas.toDataURL("image/jpeg", 0.9))
                    setRawUrl(null)
                },
                "image/jpeg",
                0.9,
            )
        }
        img.src = rawUrl
    }

    return (
        <div className="space-y-2">
            <Input type="file" accept="image/jpeg,image/png,image/gif" onChange={handleFileChange} />
            <p className="text-xs text-fg-subtle">{helperText}</p>
            {error && <p className="text-xs text-danger">{error}</p>}

            {preview && (
                <div className="relative mt-2 w-full max-w-sm overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={label} className="aspect-video w-full object-cover" />
                    {onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            aria-label="ลบรูปภาพ"
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
            )}

            <Dialog open={!!rawUrl} onOpenChange={(open) => !open && setRawUrl(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ปรับตำแหน่งรูปภาพ ({label})</DialogTitle>
                    </DialogHeader>

                    {rawUrl && (
                        <div className="space-y-4">
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={rawUrl}
                                    alt="ต้นฉบับ"
                                    onLoad={handleImageLoad}
                                    className="size-full object-cover"
                                    style={{ objectPosition: `${posX}% ${posY}%` }}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg-muted">เลื่อนแนวนอน</label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={posX}
                                        onChange={(e) => setPosX(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg-muted">เลื่อนแนวตั้ง</label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={posY}
                                        onChange={(e) => setPosY(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setRawUrl(null)}>ยกเลิก</Button>
                        <Button type="button" onClick={handleConfirm}>ยืนยันการครอป</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `image-crop-upload.tsx`

- [ ] **Step 3: Verify the crop math by hand**

Open the browser console on any page and run:

```js
// สี่เหลี่ยมแนวตั้ง 1000x2000, aspect เป้าหมาย 16:9, ตำแหน่งกึ่งกลาง (50,50)
// คาดว่า sw = sh * (16/9), sh = 1000/(16/9) ~ 562.5, sx = (1000-562.5)/2 ~ 218.75, sy = 0 (เพราะ maxY เป็นบวกแต่เราไม่ได้ import ฟังก์ชันตรงนี้ — แค่ตรวจด้วยมือว่า logic สมเหตุผล)
```

This step is a logic sanity check, not an automated test — confirm that for a portrait image (`imageAspect < aspect`), `sw === naturalWidth` and `sh === naturalWidth / aspect` (full width, cropped height), and for a landscape image (`imageAspect > aspect`), `sh === naturalHeight` and `sw === naturalHeight * aspect` (full height, cropped width). Re-read `computeCoverSourceRect` and confirm this matches before moving on.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/image-crop-upload.tsx
git commit -m "feat(ui): add dependency-free 16:9 ImageCropUpload component"
```

---

## Task 6: Wire `ImageCropUpload` into the wizard + fix the missing placeholder asset

**Files:**
- Modify: `frontend/app/organizer/create/_components/section-1-event-basics.tsx`
- Modify: `frontend/app/organizer/create/_components/activity-tab-form.tsx`
- Create: `frontend/public/activity-placeholder.svg`
- Modify: `frontend/components/ui/event-card.tsx`

**Interfaces:**
- Consumes: `ImageCropUpload`, `IMAGE_CROP_ASPECT` (Task 5, `@/components/ui/image-crop-upload`).

- [ ] **Step 1: Swap the cover-image block in `section-1-event-basics.tsx`**

Replace the image block (the `<div className="space-y-2">` containing the file `<FormField name="imageFile" ...>` and the manual `<img>` preview, plus the now-unused `handleImageChange` function and the `ChangeEvent` import) with:

```tsx
"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import { ImageCropUpload } from "@/components/ui/image-crop-upload"
import type { EventFormState, EventFormErrors } from "./types"

interface Props {
    data: EventFormState
    errors: EventFormErrors
    onChange: (patch: Partial<EventFormState>) => void
    onFieldBlur: (field: keyof EventFormErrors) => void
}

export function SectionEventBasics({ data, errors, onChange, onFieldBlur }: Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-fg">ข้อมูลพื้นฐานของงาน</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    ตั้งชื่อและอธิบายภาพรวมของงาน — งานหนึ่งสามารถมีกิจกรรมย่อยได้หลายกิจกรรมในขั้นตอนถัดไป
                </p>
            </div>

            <FormField name="name" label="ชื่องาน" required error={errors.name}>
                <Input
                    value={data.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    onBlur={() => onFieldBlur("name")}
                    className={fieldInputClass(errors.name)}
                />
            </FormField>

            <FormField name="description" label="รายละเอียด" required error={errors.description}>
                <Textarea
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    onBlur={() => onFieldBlur("description")}
                    className={`min-h-[120px] ${fieldInputClass(errors.description)}`}
                />
            </FormField>

            <div className="space-y-2">
                <FormField name="imageFile" label="รูปภาพหน้าปกงาน">
                    <ImageCropUpload
                        label="รูปภาพหน้าปกงาน"
                        preview={data.imagePreview}
                        onChange={(file, preview) => onChange({ imageFile: file, imagePreview: preview })}
                        onClear={() => onChange({ imageFile: null, imagePreview: null })}
                    />
                </FormField>
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Swap the activity-image block in `activity-tab-form.tsx`**

Replace the "รูปภาพกิจกรรม" `<div className="space-y-2">` block (containing the `<Input type="file">` and the manual `<img>` preview) with:

```tsx
                <div className="space-y-2">
                    <FormField name="imageFile" label="รูปภาพกิจกรรม">
                        <ImageCropUpload
                            label="รูปภาพกิจกรรม"
                            preview={activity.imagePreview}
                            onChange={(file, preview) => onChange({ imageFile: file, imagePreview: preview })}
                            onClear={() => onChange({ imageFile: null, imagePreview: null })}
                        />
                    </FormField>
                </div>
```

Add the import next to the other `@/components/ui/*` imports at the top of the file:

```tsx
import { ImageCropUpload } from "@/components/ui/image-crop-upload"
```

Remove the now-unused `handleImageChange` function and the `ChangeEvent` import if `handleAttachmentChange` no longer needs it — check: `handleAttachmentChange` also uses `ChangeEvent<HTMLInputElement>`, so keep the `import type { ChangeEvent } from "react"` line, only delete the `handleImageChange` function body.

- [ ] **Step 3: Create the SVG placeholder**

```xml
<!-- frontend/public/activity-placeholder.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" />
  <g fill="#ffffff" fill-opacity="0.85" font-family="sans-serif">
    <text x="640" y="360" font-size="42" font-weight="700" text-anchor="middle" dominant-baseline="middle">
      Comp Active
    </text>
  </g>
</svg>
```

- [ ] **Step 4: Point `EventCard`'s fallback `src` at the new asset**

In `frontend/components/ui/event-card.tsx`, change:

```tsx
                    src={
                        activity.imageUrl
                            ? `${API_BASE_URL}${activity.imageUrl}`
                            : "/activity-placeholder.jpg"
                    }
```

to:

```tsx
                    src={
                        activity.imageUrl
                            ? `${API_BASE_URL}${activity.imageUrl}`
                            : "/activity-placeholder.svg"
                    }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manual check**

On the dev server, step 1 and step 2 of the wizard: pick a portrait photo for the cover image, confirm the crop dialog opens showing a 16:9 frame with two sliders, drag "เลื่อนแนวตั้ง" and confirm the visible crop changes, click "ยืนยันการครอป" and confirm the resulting preview thumbnail is 16:9. Then visit `/organizer/manage` and any activity with no `imageUrl` and confirm the gradient "Comp Active" placeholder renders (not a broken image icon, not the old Unsplash fallback).

- [ ] **Step 7: Commit**

```bash
git add frontend/app/organizer/create/_components/section-1-event-basics.tsx frontend/app/organizer/create/_components/activity-tab-form.tsx frontend/public/activity-placeholder.svg frontend/components/ui/event-card.tsx
git commit -m "feat(organizer): crop uploads to 16:9 client-side; fix missing placeholder asset"
```

---

## Task 7: Success screen

**Files:**
- Create: `frontend/app/organizer/create/_components/section-5-success.tsx`

**Interfaces:**
- Consumes: `EventFormState`, `ActivityFormState` (`./types`); `submitted`/`handleCreateAnother` wiring already added to `page.tsx` in Task 2, Step 8 (which imports `SectionSuccess` from this file — that import was already added there).

- [ ] **Step 1: Write the component**

```tsx
// frontend/app/organizer/create/_components/section-5-success.tsx
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import type { EventFormState, ActivityFormState } from "./types"

interface Props {
    event: EventFormState
    activities: ActivityFormState[]
    onCreateAnother: () => void
}

export function SectionSuccess({ event, activities, onCreateAnother }: Props) {
    return (
        <div className="flex flex-col items-center space-y-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-8" />
            </div>
            <div>
                <h2 className="text-xl font-black text-fg">สร้างงานสำเร็จ!</h2>
                <p className="mt-2 max-w-md text-sm text-fg-muted">
                    งานของคุณกำลังรออนุมัติจากแอดมิน จะยังไม่แสดงต่อนักศึกษาจนกว่าจะได้รับการอนุมัติ
                </p>
            </div>

            <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4 text-left">
                {event.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={event.imagePreview}
                        alt={event.name}
                        className="mb-3 aspect-video w-full rounded-md object-cover"
                    />
                )}
                <div className="font-bold text-fg">{event.name}</div>
                <div className="mt-1 text-sm text-fg-muted">{activities.length} กิจกรรมย่อย</div>
            </div>

            <div className="flex w-full max-w-sm gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onCreateAnother}>
                    สร้างงานใหม่อีกครั้ง
                </Button>
                <Button asChild className="flex-1">
                    <Link href="/organizer/manage">ไปหน้าจัดการกิจกรรม</Link>
                </Button>
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in `frontend/app/organizer/create/` — this resolves the last outstanding error left over from Task 2, Step 9.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Manual check — full end-to-end run**

On the dev server, complete all 4 steps with valid data (including a cropped cover image) and submit. Confirm: the wizard card is replaced by the success view (no navigation happened), the summary shows the correct name/activity count/cropped image, "สร้างงานใหม่อีกครั้ง" clears the form back to a blank step 1, and "ไปหน้าจัดการกิจกรรม" navigates to `/organizer/manage` where the new event appears with `รออนุมัติ` badge.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/organizer/create/_components/section-5-success.tsx
git commit -m "feat(organizer): show pending-approval success screen after create instead of instant redirect"
```

---

## Task 8: Design-token cleanup on the student event-detail page

**Files:**
- Modify: `frontend/app/student/events/[id]/page.tsx`

**Interfaces:** none (leaf UI cleanup, no prop/type changes).

- [ ] **Step 1: Replace hardcoded gray/blue Tailwind classes with design tokens**

In `frontend/app/student/events/[id]/page.tsx`, apply these exact replacements (all within the loading state, error state, hero image, title/info block, and sidebar — leave the `Dialog`/registration form section untouched, it is out of scope):

- `bg-gray-50` → `bg-surface`
- `text-gray-900` → `text-fg`
- `text-gray-600` → `text-fg-muted`
- `text-gray-500` → `text-fg-muted`
- `text-gray-400` → `text-fg-subtle`
- `border-gray-100` / `border-gray-200` → `border-border`
- `bg-white` (on `Card`/panel backgrounds only, not on buttons) → `bg-bg`
- `bg-blue-50` → `bg-brand-100`
- `text-blue-600` → `text-brand-600`
- `bg-blue-600 hover:bg-blue-700` (the "ลงทะเบียนเข้าร่วม" button and loading spinner) → `bg-brand-600 hover:bg-brand-700`

Do this with targeted edits per occurrence rather than a blind find-replace, since a few `bg-blue-600`/`text-blue-*` instances are semantic accents (e.g. the "Tags" badge icon, category badge) that should become `text-brand-600`/`bg-brand-600` too for consistency, and the green/orange/purple accent colors used for the tab icons (`text-orange-500`, `text-purple-500`, `text-green-500`) are intentional per-tab accent colors — leave those as-is, they are not part of this cleanup.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual visual check**

On the dev server, open `/student/events/[id]` for any activity and `/organizer/events/[id]` for the same activity side by side (two tabs) — confirm the text colors, borders, and card backgrounds now match between the two pages, and nothing looks unstyled or broken.

- [ ] **Step 4: Commit**

```bash
git add "frontend/app/student/events/[id]/page.tsx"
git commit -m "style(student): align event-detail page colors with shared design tokens"
```

---

## Post-Plan Note

This plan does not include live end-to-end testing against a real organizer account with a running backend + database, because no such account was available in the planning session (see `fullPlan.md` §5 Testing Plan). Before merging, run through Task 4's and Task 7's manual-check steps against a real `organizer`-role account to confirm the full submit → `pending_approval` → admin-approval loop still works against the actual backend.
