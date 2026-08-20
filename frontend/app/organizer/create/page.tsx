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

    function patchEvent(patch: Partial<EventFormState>) {
        setEvent((prev) => ({ ...prev, ...patch }))
    }

    function patchActivity(key: string, patch: Partial<ActivityFormState>) {
        setActivities((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
    }

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

    function handleAddActivity() {
        const next = createEmptyActivity()
        setActivities((prev) => [...prev, next])
        setActiveActivityKey(next.key)
    }

    function handleRemoveActivity(key: string) {
        const next = activities.filter((a) => a.key !== key)
        setActivities(next)
        if (activeActivityKey === key) {
            setActiveActivityKey(next[0]?.key ?? "")
        }
    }

    function handleBack() {
        if (step === 1) {
            router.back()
            return
        }
        setError("")
        setStep((prev) => prev - 1)
    }

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

    async function handleSubmit() {
        const eventErrs = validateEventFields(event)
        const activityErrsByKey = validateAllActivities(activities)
        setEventErrors(eventErrs)
        setActivityErrors(activityErrsByKey)
        const total = countErrors(eventErrs) + Object.values(activityErrsByKey).reduce((sum, e) => sum + countErrors(e), 0)
        if (total > 0) {
            setError(`มี ${total} ฟิลด์ที่ต้องแก้ไข`)
            return
        }

        setSubmitting(true)
        setError("")
        try {
            let eventImageUrl: string | undefined
            if (event.imageFile) {
                const uploadRes = await activitiesAPI.uploadImage(event.imageFile)
                eventImageUrl = uploadRes?.imageUrl
            }

            const activityBodies: CreateEventActivityBody[] = []
            for (const a of activities) {
                let imageUrl: string | undefined
                if (a.imageFile) {
                    const uploadRes = await activitiesAPI.uploadImage(a.imageFile)
                    imageUrl = uploadRes?.imageUrl
                }

                let attachmentUrl: string | undefined
                if (a.attachmentFile) {
                    const uploadRes = await eventsAPI.uploadAttachment(a.attachmentFile)
                    attachmentUrl = uploadRes?.attachmentUrl
                }

                const questions: QuestionBody[] | undefined = a.questionsEnabled
                    ? a.questions.map((q) => ({
                        label: q.label,
                        type: q.type as QuestionBody["type"],
                        required: q.required,
                        options: q.options,
                    }))
                    : undefined

                activityBodies.push({
                    name: a.name,
                    description: a.description,
                    category: a.category,
                    imageUrl,
                    attachmentUrl,
                    startAt: new Date(a.startAt).toISOString(),
                    endAt: new Date(a.endAt).toISOString(),
                    location: a.location,
                    capacity: a.capacityEnabled ? parseInt(a.capacity) : undefined,
                    issueVolunteerCertificate: a.certEnabled || undefined,
                    volunteerRole: a.certEnabled ? a.volunteerRole : undefined,
                    softSkillRates: a.softSkillsEnabled
                        ? Object.entries(a.softSkillRates).map(([skillType, rate]) => ({ skillType, rate }))
                        : undefined,
                    questions,
                })
            }

            const surveyQuestions: SurveyQuestionBody[] = event.surveyQuestions.map((q) => ({
                label: q.label,
                type: q.type as SurveyQuestionBody["type"],
                scaleMax: q.scaleMax,
            }))

            await eventsAPI.create({
                name: event.name,
                description: event.description,
                imageUrl: eventImageUrl,
                isPublic: event.isPublic,
                registrationCloseAt: event.registrationCloseAt
                    ? new Date(event.registrationCloseAt).toISOString()
                    : undefined,
                activities: activityBodies,
                surveyQuestions,
                visibility: event.visibility,
                visibilityPrograms: event.visibility === "restricted" ? event.visibilityPrograms : undefined,
                visibilityYears: event.visibility === "restricted" ? event.visibilityYears : undefined,
                visibilityStudentIdFilter:
                    event.visibility === "restricted" ? event.visibilityStudentIdFilter || undefined : undefined,
            })

            setSubmitted(true)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "สร้างงานไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

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
