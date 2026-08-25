"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ArrowLeft, Loader2, Edit } from "lucide-react"
import { activitiesAPI, eventsAPI, API_BASE_URL, type CreateEventActivityBody, type QuestionBody, type SurveyQuestionBody, type EventSummary } from "@/lib/api"
import { scrollToFirstError } from "@/components/ui/form-field"
import { StepperSidebar, type StepMeta } from "../../../create/_components/stepper-sidebar"
import { SectionEventBasics } from "../../../create/_components/section-1-event-basics"
import { SectionActivities } from "../../../create/_components/section-2-activities"
import { SectionSurvey } from "../../../create/_components/section-3-survey"
import { SectionPublish } from "../../../create/_components/section-4-publish"
import type { EventFormState, ActivityFormState, EventFormErrors, ActivityFormErrors } from "../../../create/_components/types"
import {
    validateEventFields,
    validateAllActivities,
    countErrors,
} from "../../../create/_components/validation"

const STEPS: StepMeta[] = [
    { number: 1, title: "ข้อมูลพื้นฐาน", subtitle: "ชื่อและรายละเอียดงาน" },
    { number: 2, title: "กิจกรรมย่อย", subtitle: "รายละเอียดแต่ละกิจกรรม" },
    { number: 3, title: "แบบสำรวจ", subtitle: "คำถามหลังจบกิจกรรม" },
    { number: 4, title: "เผยแพร่", subtitle: "ตรวจสอบและยืนยัน" },
]

let activityKeySeq = 0
function keyFor(activityId: number): string {
    activityKeySeq += 1
    return `activity-${activityId}-${activityKeySeq}`
}

/** แปลง ISO UTC string จาก backend เป็นค่า local wall-clock ที่ <input type="datetime-local"> ต้องการ */
function toLocalDatetimeValue(iso: string): string {
    const d = new Date(iso)
    const offsetMs = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16)
}

/** map ข้อมูลจาก backend (EventSummary) กลับเป็น form state ของ wizard — ฝั่ง client เก็บ id ไว้ใน key ผ่าน map แยกต่างหาก */
function eventToFormState(event: EventSummary): EventFormState {
    return {
        name: event.name,
        description: event.description,
        imageFile: null,
        imagePreview: event.imageUrl ? `${API_BASE_URL}${event.imageUrl}` : null,
        isPublic: event.isPublic,
        registrationCloseAt: event.registrationCloseAt ? toLocalDatetimeValue(event.registrationCloseAt) : "",
        surveyQuestions: (event.surveyQuestions ?? []).map((q) => ({
            label: q.label,
            type: q.type,
            scaleMax: q.scaleMax,
        })),
        visibility: (event.visibility as "everyone" | "restricted") ?? "everyone",
        visibilityPrograms: (event.visibilityProgram ?? []).map((p) => p.programCode),
        visibilityYears: (event.visibilityYears ?? []).map((y) => y.year),
        visibilityStudentIdFilter: event.visibilityStudentIdFilter ?? "",
    }
}

function activityToFormState(a: EventSummary["activities"][number]): ActivityFormState & { activityId: number } {
    const softSkillRates: Record<string, number> = {}
    for (const s of a.softSkills ?? []) {
        if (s.rate !== undefined) softSkillRates[s.skillType] = s.rate
    }
    return {
        key: keyFor(a.id),
        activityId: a.id,
        name: a.name,
        description: a.description,
        categories: a.categories,
        imageFile: null,
        imagePreview: a.imageUrl ? `${API_BASE_URL}${a.imageUrl}` : null,
        attachmentFile: null,
        attachmentName: a.attachmentUrl ? a.attachmentUrl.split("/").pop() ?? null : null,
        startAt: a.startAt ? toLocalDatetimeValue(a.startAt) : "",
        endAt: a.endAt ? toLocalDatetimeValue(a.endAt) : "",
        location: a.location,
        capacityEnabled: a.capacity != null,
        capacity: a.capacity != null ? String(a.capacity) : "",
        certEnabled: !!a.volunteerRole,
        volunteerRole: a.volunteerRole ?? "",
        softSkillsEnabled: Object.keys(softSkillRates).length > 0,
        softSkillRates,
        questionsEnabled: (a.questions?.length ?? 0) > 0,
        questions: (a.questions ?? []).map((q) => ({
            label: q.label,
            type: q.type,
            required: q.required,
            options: q.options?.map((o) => o.label) ?? [],
        })),
    }
}

export default function EditEventPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = Number(params?.id)

    const [step, setStep] = useState(1)
    const [loadingData, setLoadingData] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [event, setEvent] = useState<EventFormState | null>(null)
    // เก็บ activityId คู่กับ key เพื่อรู้ว่าแท็บไหนคือกิจกรรมเดิม (ส่ง id กลับไป) กับแท็บไหนเพิ่มใหม่ (ไม่ส่ง id)
    const [activities, setActivities] = useState<(ActivityFormState & { activityId?: number })[]>([])
    const [activeActivityKey, setActiveActivityKey] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [eventErrors, setEventErrors] = useState<EventFormErrors>({})
    const [activityErrors, setActivityErrors] = useState<Record<string, ActivityFormErrors>>({})

    useEffect(() => {
        if (!eventId || Number.isNaN(eventId)) return
        eventsAPI
            .getById(eventId)
            .then((data) => {
                setEvent(eventToFormState(data))
                const mapped = data.activities.map(activityToFormState)
                setActivities(mapped)
                setActiveActivityKey(mapped[0]?.key ?? "")
            })
            .catch((err: unknown) => {
                const e = err as Error
                setLoadError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
            })
            .finally(() => setLoadingData(false))
    }, [eventId])

    function patchEvent(patch: Partial<EventFormState>) {
        setEvent((prev) => (prev ? { ...prev, ...patch } : prev))
    }

    function patchActivity(key: string, patch: Partial<ActivityFormState>) {
        setActivities((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
    }

    function handleEventFieldBlur(field: keyof EventFormErrors) {
        if (!event) return
        const errs = validateEventFields(event)
        setEventErrors((prev) => ({ ...prev, [field]: errs[field] }))
    }

    function handleActivityFieldBlur(key: string, field: keyof ActivityFormErrors) {
        const activity = activities.find((a) => a.key === key)
        if (!activity) return
        const errs = validateAllActivities([activity])[key] ?? {}
        setActivityErrors((prev) => ({ ...prev, [key]: { ...prev[key], [field]: errs[field] } }))
    }

    function handleAddActivity() {
        activityKeySeq += 1
        const next: ActivityFormState & { activityId?: number } = {
            key: `activity-new-${activityKeySeq}`,
            name: "",
            description: "",
            categories: [],
            imageFile: null,
            imagePreview: null,
            attachmentFile: null,
            attachmentName: null,
            startAt: "",
            endAt: "",
            location: "",
            capacityEnabled: false,
            capacity: "",
            certEnabled: false,
            volunteerRole: "",
            softSkillsEnabled: false,
            softSkillRates: {},
            questionsEnabled: false,
            questions: [],
        }
        setActivities((prev) => [...prev, next])
        setActiveActivityKey(next.key)
    }

    function handleRemoveActivity(key: string) {
        const next = activities.filter((a) => a.key !== key)
        setActivities(next)
        if (activeActivityKey === key) setActiveActivityKey(next[0]?.key ?? "")
    }

    function handleBack() {
        if (step === 1) {
            router.push("/organizer/manage")
            return
        }
        setError("")
        setStep((prev) => prev - 1)
    }

    function handleNext() {
        if (!event) return
        if (step === 1) {
            const errs = validateEventFields(event)
            setEventErrors(errs)
            if (countErrors(errs) > 0) {
                setError(`มี ${countErrors(errs)} ฟิลด์ที่ต้องแก้ไข`)
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
        setError("")
        setStep((prev) => Math.min(prev + 1, STEPS.length))
    }

    async function handleSave() {
        if (!event) return
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
            let eventImageUrl: string | undefined = event.imagePreview?.startsWith(API_BASE_URL)
                ? event.imagePreview.slice(API_BASE_URL.length)
                : undefined
            if (event.imageFile) {
                const uploadRes = await activitiesAPI.uploadImage(event.imageFile)
                eventImageUrl = uploadRes?.imageUrl
            }

            const activityBodies: (CreateEventActivityBody & { id?: number })[] = []
            for (const a of activities) {
                let imageUrl: string | undefined = a.imagePreview?.startsWith(API_BASE_URL)
                    ? a.imagePreview.slice(API_BASE_URL.length)
                    : undefined
                if (a.imageFile) {
                    const uploadRes = await activitiesAPI.uploadImage(a.imageFile)
                    imageUrl = uploadRes?.imageUrl
                }

                let attachmentUrl: string | undefined = a.attachmentName ? undefined : undefined
                if (a.attachmentFile) {
                    const uploadRes = await eventsAPI.uploadAttachment(a.attachmentFile)
                    attachmentUrl = uploadRes?.attachmentUrl
                }

                const questions: QuestionBody[] | undefined = a.questionsEnabled
                    ? a.questions.map((q) => ({ label: q.label, type: q.type as QuestionBody["type"], required: q.required, options: q.options }))
                    : undefined

                activityBodies.push({
                    id: (a as { activityId?: number }).activityId,
                    name: a.name,
                    description: a.description,
                    categories: a.categories,
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

            await eventsAPI.update(eventId, {
                name: event.name,
                description: event.description,
                imageUrl: eventImageUrl,
                isPublic: event.isPublic,
                registrationCloseAt: event.registrationCloseAt ? new Date(event.registrationCloseAt).toISOString() : undefined,
                activities: activityBodies,
                surveyQuestions,
                visibility: event.visibility,
                visibilityPrograms: event.visibility === "restricted" ? event.visibilityPrograms : undefined,
                visibilityYears: event.visibility === "restricted" ? event.visibilityYears : undefined,
                visibilityStudentIdFilter: event.visibility === "restricted" ? event.visibilityStudentIdFilter || undefined : undefined,
            })

            router.push("/organizer/manage")
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "บันทึกการแก้ไขไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingData) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูลงาน...</p>
                </Container>
            </div>
        )
    }

    if (loadError || !event) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{loadError || "ไม่พบข้อมูลงาน"}</p>
                    <Button variant="outline" asChild>
                        <a href="/organizer/manage">กลับไปหน้าจัดการกิจกรรม</a>
                    </Button>
                </Container>
            </div>
        )
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
                                <Edit className="size-5" />
                            </div>
                            แก้ไขงาน
                        </h1>
                        <p className="mt-1 text-fg-muted">แก้ไขข้อมูลงานและกิจกรรมย่อยทั้งหมด</p>
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
                                <SectionEventBasics data={event} errors={eventErrors} onChange={patchEvent} onFieldBlur={handleEventFieldBlur} />
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
                            {step === 4 && <SectionPublish event={event} activities={activities} onChangeEvent={patchEvent} />}
                        </div>

                        <div className="mt-6 flex justify-between">
                            <Button variant="outline" onClick={handleBack}>
                                {step === 1 ? "ยกเลิก" : "ก่อนหน้า"}
                            </Button>
                            <Button onClick={step === STEPS.length ? handleSave : handleNext} disabled={submitting} className="w-36">
                                {submitting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : step === STEPS.length ? (
                                    "บันทึกการแก้ไข"
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
