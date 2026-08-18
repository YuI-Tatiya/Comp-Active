"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import { activitiesAPI, eventsAPI, type CreateEventActivityBody, type QuestionBody, type SurveyQuestionBody } from "@/lib/api"
import { StepperSidebar, type StepMeta } from "./_components/stepper-sidebar"
import { SectionEventBasics } from "./_components/section-1-event-basics"
import { SectionActivities } from "./_components/section-2-activities"
import { SectionSurvey } from "./_components/section-3-survey"
import { SectionPublish } from "./_components/section-4-publish"
import {
    createEmptyEvent,
    createEmptyActivity,
    type EventFormState,
    type ActivityFormState,
} from "./_components/types"

const STEPS: StepMeta[] = [
    { number: 1, title: "ข้อมูลพื้นฐาน", subtitle: "ชื่อและรายละเอียดงาน" },
    { number: 2, title: "กิจกรรมย่อย", subtitle: "รายละเอียดแต่ละกิจกรรม" },
    { number: 3, title: "แบบสำรวจ", subtitle: "คำถามหลังจบกิจกรรม" },
    { number: 4, title: "เผยแพร่", subtitle: "ตรวจสอบและยืนยัน" },
]

function validateEvent(event: EventFormState): string | null {
    if (!event.name.trim()) return "กรุณากรอกชื่องาน"
    if (!event.description.trim()) return "กรุณากรอกรายละเอียดงาน"
    return null
}

function validateActivities(activities: ActivityFormState[]): string | null {
    if (activities.length === 0) return "ต้องมีอย่างน้อย 1 กิจกรรม"
    for (const [i, a] of activities.entries()) {
        const label = `กิจกรรมที่ ${i + 1}`
        if (!a.name.trim()) return `${label}: กรุณากรอกชื่อกิจกรรม`
        if (!a.category) return `${label}: กรุณาเลือกหมวดหมู่`
        if (!a.description.trim()) return `${label}: กรุณากรอกรายละเอียด`
        if (!a.startAt || !a.endAt) return `${label}: กรุณาระบุวันเวลาเริ่ม-สิ้นสุด`
        if (new Date(a.endAt) <= new Date(a.startAt)) return `${label}: เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม`
        if (!a.location.trim()) return `${label}: กรุณากรอกสถานที่`
        if (a.capacityEnabled && (!a.capacity || parseInt(a.capacity) < 1)) {
            return `${label}: กรุณาระบุจำนวนที่รับ`
        }
        if (a.certEnabled && !a.volunteerRole.trim()) {
            return `${label}: กรุณาระบุชื่อบทบาทสำหรับใบจิตอาสา`
        }
    }
    return null
}

export default function CreateEventPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [event, setEvent] = useState<EventFormState>(createEmptyEvent)
    const [activities, setActivities] = useState<ActivityFormState[]>(() => [createEmptyActivity()])
    const [activeActivityKey, setActiveActivityKey] = useState(() => activities[0].key)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    function patchEvent(patch: Partial<EventFormState>) {
        setEvent((prev) => ({ ...prev, ...patch }))
    }

    function patchActivity(key: string, patch: Partial<ActivityFormState>) {
        setActivities((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
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
        let err: string | null = null
        if (step === 1) err = validateEvent(event)
        else if (step === 2) err = validateActivities(activities)
        // ขั้นที่ 3 (แบบสำรวจ) ไม่มีฟิลด์บังคับ — ไปต่อได้เสมอ
        if (err) {
            setError(err)
            return
        }
        setError("")
        setStep((prev) => Math.min(prev + 1, STEPS.length))
    }

    async function handleSubmit() {
        const eventErr = validateEvent(event)
        const activitiesErr = validateActivities(activities)
        if (eventErr || activitiesErr) {
            setError(eventErr || activitiesErr || "")
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

            router.push("/organizer/manage")
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "สร้างงานไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="bg-surface">
            <Container className="py-10">
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

                            {step === 1 && <SectionEventBasics data={event} onChange={patchEvent} />}
                            {step === 2 && (
                                <SectionActivities
                                    activities={activities}
                                    activeKey={activeActivityKey}
                                    onActiveKeyChange={setActiveActivityKey}
                                    onChangeActivity={patchActivity}
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
            </Container>
        </div>
    )
}
