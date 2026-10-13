"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ArrowLeft, Loader2 } from "lucide-react"
import {
    activitiesAPI,
    eventsAPI,
    resolveUploadUrl,
    type CreateEventActivityBody,
    type QuestionBody,
    type SurveyQuestionBody,
} from "@/lib/api"
import { uploadPathFromPreview } from "@/lib/api-base"
import { buildDutyShiftOptions, deriveVolunteerRole, resolveDutyRoleOptions } from "@/lib/duty-shift"
import { scrollToFirstError } from "@/components/ui/form-field"
import { StepperSidebar, type StepMeta } from "./_components/stepper-sidebar"
import { SectionEventBasics } from "./_components/section-1-event-basics"
import { SectionActivities } from "./_components/section-2-activities"
import { SectionSurvey } from "./_components/section-3-survey"
import { SectionPublish } from "./_components/section-4-publish"
import { SectionSuccess } from "./_components/section-5-success"
import { serializeDraft, deserializeDraft } from "./_components/draft"
import {
    createEmptyEvent,
    createEmptyActivity,
    duplicateActivity,
    type EventFormState,
    type ActivityFormState,
    type EventFormErrors,
    type ActivityFormErrors,
} from "./_components/types"
import {
    validateEventField,
    validateEventFields,
    validateActivityField,
    validateAllActivities,
    countErrors,
} from "./_components/validation"

const STEPS: StepMeta[] = [
    { number: 1, title: "ข้อมูลพื้นฐาน", subtitle: "ชื่อและรายละเอียดงาน" },
    { number: 2, title: "กิจกรรมย่อย", subtitle: "รายละเอียดแต่ละกิจกรรม" },
    { number: 3, title: "แบบสำรวจ", subtitle: "คำถามหลังจบกิจกรรม" },
    { number: 4, title: "เผยแพร่", subtitle: "ตรวจสอบและยืนยัน" },
]

/** เวลาแบบอ่านง่าย ใช้โชว์ตอน "บันทึกฉบับร่างล่าสุดเมื่อ..." — ไม่ทำ relative time (เช่น "5 นาทีที่แล้ว") เพื่อไม่ต้องมี useEffect คอยอัปเดตตัวเลข */
function formatDraftTime(iso: string): string {
    try {
        return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(iso))
    } catch {
        return iso
    }
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
    // ฉบับร่างที่เจอตอนเปิดหน้า (รอผู้จัดเลือกว่าจะดำเนินการต่อหรือเริ่มใหม่) — คนละตัวกับสถานะ "กำลังบันทึก" ด้านล่าง
    const [draftOffer, setDraftOffer] = useState<{ payload: unknown; updatedAt: string } | null>(null)
    const [savingDraft, setSavingDraft] = useState(false)
    const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)

    // ฉบับร่างมีได้ทีละ 1 ต่อผู้จัด — เช็คครั้งเดียวตอนเปิดหน้า ไม่รบกวนถ้าดึงไม่ได้ (เป็นแค่ความสะดวก ไม่ใช่ข้อมูลที่พลาดแล้วเสียหาย)
    useEffect(() => {
        eventsAPI
            .getDraft()
            .then((draft) => {
                if (draft) setDraftOffer(draft)
            })
            .catch(() => {})
    }, [])

    function patchEvent(patch: Partial<EventFormState>) {
        setEvent((prev) => ({ ...prev, ...patch }))
        // สลับมาเป็น "กิจกรรมเดี่ยว" ขณะมีหลายกิจกรรมย่อยอยู่แล้ว — เหลือไว้แค่รายการแรก
        if (patch.type === "single") {
            setActivities((prev) => (prev.length > 1 ? [prev[0]] : prev))
        }
        // ประเภทการรับสมัครเลือกครั้งเดียวระดับงาน — เปลี่ยนที่นี่ต้องสำเนาลงทุกกิจกรรมย่อยที่มีอยู่แล้วด้วย กันกิจกรรมเก่าค้างประเภทเดิม
        if (patch.registrationType) {
            const nextType = patch.registrationType
            setActivities((prev) => prev.map((a) => ({ ...a, registrationType: nextType })))
        }
    }

    function patchActivity(key: string, patch: Partial<ActivityFormState>) {
        setActivities((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
    }

    function handleEventFieldBlur(field: keyof EventFormErrors) {
        const message = validateEventField(event, field)
        setEventErrors((prev) => ({ ...prev, [field]: message }))
    }

    function handleActivityFieldBlur(key: string, field: keyof ActivityFormErrors, patch?: Partial<ActivityFormState>) {
        const activity = activities.find((a) => a.key === key)
        if (!activity) return
        // patch: ค่าที่เพิ่งเปลี่ยนจาก onChange เดียวกัน (เช่น checkbox) — activities ใน state ยัง commit ไม่ทันตอนนี้
        const message = validateActivityField(patch ? { ...activity, ...patch } : activity, field, event.type !== "single")
        setActivityErrors((prev) => ({
            ...prev,
            [key]: { ...prev[key], [field]: message },
        }))
    }

    function handleAddActivity() {
        const next = createEmptyActivity(event.registrationType)
        setActivities((prev) => [...prev, next])
        setActiveActivityKey(next.key)
    }

    /** ทำซ้ำกิจกรรมหนึ่งเป็นแท็บใหม่ — แทรกต่อท้ายกิจกรรมต้นฉบับทันที แล้วสลับไปแท็บสำเนาให้แก้ไขต่อได้เลย */
    function handleDuplicateActivity(key: string) {
        const source = activities.find((a) => a.key === key)
        if (!source) return
        const copy = duplicateActivity(source)
        const sourceIndex = activities.findIndex((a) => a.key === key)
        setActivities((prev) => [...prev.slice(0, sourceIndex + 1), copy, ...prev.slice(sourceIndex + 1)])
        setActiveActivityKey(copy.key)
    }

    function handleRemoveActivity(key: string) {
        const next = activities.filter((a) => a.key !== key)
        setActivities(next)
        if (activeActivityKey === key) {
            setActiveActivityKey(next[0]?.key ?? "")
        }
    }

    function handleResumeDraft() {
        if (!draftOffer) return
        const restored = deserializeDraft(draftOffer.payload, createEmptyEvent(), createEmptyActivity)
        setEvent(restored.event)
        setActivities(restored.activities)
        setActiveActivityKey(restored.activeActivityKey)
        setStep(Math.min(Math.max(restored.step, 1), STEPS.length))
        setDraftOffer(null)
    }

    async function handleDiscardDraft() {
        setDraftOffer(null)
        try {
            await eventsAPI.clearDraft()
        } catch {
            // เงียบไว้ — ไม่ใช่ error ที่ผู้จัดต้องรู้ ฉบับร่างเก่าจะถูกทับตอนบันทึกฉบับร่างใหม่ครั้งต่อไปอยู่แล้ว
        }
    }

    /**
     * อัปโหลดไฟล์ที่เลือกค้างไว้ก่อน (รูปงาน/รูปกิจกรรม/ไฟล์แนบ) แล้วค่อยบันทึกฉบับร่างเป็น JSON ล้วนๆ — ทำแบบเดียว
     * กับตอน "สร้างงาน" จริง (handleSubmit) เพื่อให้ resume กลับมาแล้วเห็นรูป/ไฟล์แนบที่เลือกไว้ครบ ไม่ใช่แค่ชื่อไฟล์เปล่าๆ
     * ไม่ validate ก่อนบันทึก — จุดประสงค์ของฉบับร่างคือเก็บงานที่ยังไม่เสร็จไว้ก่อน
     */
    async function handleSaveDraft() {
        setSavingDraft(true)
        setError("")
        try {
            let nextEvent = event
            if (nextEvent.imageFile) {
                const uploadRes = await activitiesAPI.uploadImage(nextEvent.imageFile)
                if (uploadRes?.imageUrl) {
                    nextEvent = { ...nextEvent, imageFile: null, imagePreview: resolveUploadUrl(uploadRes.imageUrl)! }
                }
            }

            const nextActivities: ActivityFormState[] = []
            for (const a of activities) {
                let next = a
                if (next.imageFile) {
                    const uploadRes = await activitiesAPI.uploadImage(next.imageFile)
                    if (uploadRes?.imageUrl) {
                        next = { ...next, imageFile: null, imagePreview: resolveUploadUrl(uploadRes.imageUrl)! }
                    }
                }
                if (next.attachmentFile) {
                    const file = next.attachmentFile
                    const uploadRes = await eventsAPI.uploadAttachment(file)
                    if (uploadRes?.attachmentUrl) {
                        next = { ...next, attachmentFile: null, attachmentUrl: uploadRes.attachmentUrl, attachmentName: file.name }
                    }
                }
                nextActivities.push(next)
            }

            // sync state ไว้ด้วย — กันอัปโหลดไฟล์เดิมซ้ำถ้ากดบันทึกฉบับร่างอีกครั้ง หรือกดสร้างงานต่อจากนี้เลย
            setEvent(nextEvent)
            setActivities(nextActivities)

            const payload = serializeDraft({ step, activeActivityKey, event: nextEvent, activities: nextActivities })
            const res = await eventsAPI.saveDraft(payload)
            setDraftSavedAt(res.updatedAt)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "บันทึกฉบับร่างไม่สำเร็จ")
        } finally {
            setSavingDraft(false)
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
                setError("กรุณากรอกข้อมูลให้ครบถ้วน")
                scrollToFirstError(errs)
                return
            }
        } else if (step === 2) {
            if (activities.length === 0) {
                setError("ต้องมีอย่างน้อย 1 กิจกรรม")
                return
            }
            const errsByKey = validateAllActivities(activities, event.type !== "single")
            setActivityErrors(errsByKey)
            const total = Object.values(errsByKey).reduce((sum, e) => sum + countErrors(e), 0)
            if (total > 0) {
                setError("กรุณากรอกข้อมูลให้ครบถ้วน")
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
        const activityErrsByKey = validateAllActivities(activities, event.type !== "single")
        setEventErrors(eventErrs)
        setActivityErrors(activityErrsByKey)
        const total = countErrors(eventErrs) + Object.values(activityErrsByKey).reduce((sum, e) => sum + countErrors(e), 0)
        if (total > 0) {
            setError("กรุณากรอกข้อมูลให้ครบถ้วน")
            return
        }

        setSubmitting(true)
        setError("")
        try {
            // fallback ไปที่ imagePreview/attachmentUrl ที่อัปโหลดไว้แล้ว — เกิดขึ้นได้เมื่อดำเนินการต่อจากฉบับร่าง
            // ที่เคยกด "บันทึกฉบับร่าง" ไปแล้วรอบหนึ่ง (อัปโหลดไฟล์เสร็จไปแล้ว ไม่มี File ให้เลือกอัปโหลดซ้ำอีกรอบ)
            let eventImageUrl: string | undefined = uploadPathFromPreview(event.imagePreview)
            if (event.imageFile) {
                const uploadRes = await activitiesAPI.uploadImage(event.imageFile)
                eventImageUrl = uploadRes?.imageUrl
            }

            const activityBodies: CreateEventActivityBody[] = []
            for (const a of activities) {
                let imageUrl: string | undefined = uploadPathFromPreview(a.imagePreview)
                if (a.imageFile) {
                    const uploadRes = await activitiesAPI.uploadImage(a.imageFile)
                    imageUrl = uploadRes?.imageUrl
                }

                let attachmentUrl: string | undefined = a.attachmentUrl ?? undefined
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
                    categories: a.categories,
                    imageUrl,
                    attachmentUrl,
                    startAt: new Date(a.startAt).toISOString(),
                    endAt: new Date(a.endAt).toISOString(),
                    location: a.location,
                    capacity: a.capacityEnabled ? parseInt(a.capacity) : undefined,
                    // ใบจิตอาสามีความหมายเฉพาะประเภทสตาฟฟ์/จิตอาสา — บทบาทบนใบอ้างอิงจาก dutyRoleOptions ไม่ใช่ฟิลด์แยก
                    issueVolunteerCertificate:
                        (a.registrationType === "staff_volunteer" && a.certEnabled) || undefined,
                    // โหมดบทบาทต่อแท็บ (isMultiActivity) ไม่เก็บ dutyRoleOptions แล้ว — ใช้ชื่อกิจกรรม (= ชื่อบทบาทนั้น) แทน
                    volunteerRole:
                        a.registrationType === "staff_volunteer" && a.certEnabled
                            ? deriveVolunteerRole(a.dutyRoleOptions) || a.name
                            : undefined,
                    softSkillRates: a.softSkillsEnabled
                        ? Object.entries(a.softSkillRates).map(([skillType, rate]) => ({ skillType, rate }))
                        : undefined,
                    questions,
                    registrationType: a.registrationType,
                    dutyRoleOptions:
                        a.registrationType === "staff_volunteer" ? resolveDutyRoleOptions(a.dutyRoleOptions, a.name) : [],
                    dutyShiftOptions:
                        a.registrationType === "staff_volunteer"
                            ? buildDutyShiftOptions(a.dutyShiftMode, a.dutyShiftRows)
                            : [],
                    teamSizeMin: a.registrationType === "contestant" && a.teamSizeMin ? parseInt(a.teamSizeMin) : null,
                    teamSizeMax: a.registrationType === "contestant" && a.teamSizeMax ? parseInt(a.teamSizeMax) : null,
                    competitionCategoryOptions:
                        a.registrationType === "contestant" ? a.competitionCategoryOptions.filter(Boolean) : [],
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
                registrationOpenAt: event.registrationOpenAt ? new Date(event.registrationOpenAt).toISOString() : undefined,
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
            // เผยแพร่สำเร็จแล้ว ฉบับร่างหมดหน้าที่ — ลบทิ้งแบบ best-effort ไม่ต้องรอ/ไม่ต้องบล็อกหน้าสำเร็จถ้าลบไม่ได้
            eventsAPI.clearDraft().catch(() => {})
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
        setDraftSavedAt(null)
    }

    return (
        <div className="bg-surface">
            <Container className="py-10">
                {submitted ? (
                    <SectionSuccess event={event} activities={activities} onCreateAnother={handleCreateAnother} />
                ) : (
                    <>
                        {draftOffer && (
                            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-brand-900">
                                    พบฉบับร่างที่บันทึกไว้ล่าสุดเมื่อ {formatDraftTime(draftOffer.updatedAt)} — ดำเนินการต่อจากที่ค้างไว้หรือไม่?
                                </p>
                                <div className="flex shrink-0 gap-2">
                                    <Button variant="outline" size="sm" onClick={handleDiscardDraft}>
                                        เริ่มใหม่
                                    </Button>
                                    <Button size="sm" onClick={handleResumeDraft}>
                                        ดำเนินการต่อ
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                            <Button variant="outline" onClick={handleBack} className="mb-4">
                                <ArrowLeft className="size-4" />
                                กลับ
                            </Button>
                            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                                <div className="hidden md:block" />
                                <div className="text-center">
                                    <h1 className="text-2xl font-black text-fg">สร้างงานใหม่</h1>
                                    <p className="mt-1 text-fg-muted">
                                        งานหนึ่งมีได้หลายกิจกรรมย่อย พร้อมตั้งค่าใบจิตอาสาและการให้คะแนน Soft Skills
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/*
                          md:items-start: ปล่อยให้ความสูงแต่ละคอลัมน์เป็นอิสระต่อกัน ไม่งั้น grid จะยืดทั้งคู่
                          เท่าคอลัมน์ที่สูงที่สุด แล้ว sticky บนแถบขั้นตอนจะไม่มีระยะให้ขยับ (เห็นผลเหมือนไม่ sticky)
                        */}
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr] md:items-start">
                            {/* top-24 เว้นระยะใต้ AppHeader (sticky top-0 h-16) ไม่ให้แถบขั้นตอนชนขอบบนพอดี */}
                            <StepperSidebar
                                steps={STEPS}
                                currentStep={step}
                                className="hidden md:sticky md:top-24 md:flex"
                            />

                            <div>
                                {/*
                                  การ์ดฟอร์มเลื่อนในตัวเอง (overflow-y-auto + max-h) แทนที่จะให้ทั้งหน้าเลื่อน —
                                  กันไม่ให้แถบขั้นตอนทางซ้ายหลุดจอเวลาฟอร์มยาว (รวม 4 หัวข้อย่อยในขั้นตอน "กิจกรรมย่อย" แล้วยาวมาก)
                                  contain-layout: ไม่งั้นตอนเนื้อหาในการ์ดเปลี่ยนความสูงมากๆ (เช่น เปิด toggle ทักษะที่กิจกรรม
                                  ช่วยพัฒนาที่ดึงรายการ 12 ทักษะมาแสดง) Chrome จะรายงาน documentElement.scrollHeight ผิด
                                  เกินจริงหลายร้อยพิกเซล ทำให้เลื่อนหน้าเว็บเกินเนื้อหาจริงไปเจอพื้นที่ว่างใต้ footer ได้
                                  (ยืนยันแล้วว่า Dialog ปลอดภัย เพราะ components/ui/dialog.tsx พอร์ทัลไป document.body แล้ว
                                  ไม่งั้น contain-layout จะทำให้ dialog ที่ซ้อนอยู่ข้างในถูกบีบให้เล็กเท่ากรอบการ์ดไปด้วย)
                                */}
                                <div className="contain-layout max-h-[calc(100vh-16rem)] min-h-[500px] overflow-y-auto rounded-2xl border border-border bg-bg p-8 shadow-xs">
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
                                            isSingleMode={event.type === "single"}
                                            onActiveKeyChange={setActiveActivityKey}
                                            onChangeActivity={patchActivity}
                                            onFieldBlur={handleActivityFieldBlur}
                                            onAdd={handleAddActivity}
                                            onRemove={handleRemoveActivity}
                                            onDuplicate={handleDuplicateActivity}
                                        />
                                    )}
                                    {step === 3 && <SectionSurvey event={event} onChange={patchEvent} />}
                                    {step === 4 && (
                                        <SectionPublish
                                            event={event}
                                            activities={activities}
                                            errors={eventErrors}
                                            onChangeEvent={patchEvent}
                                            onFieldBlur={handleEventFieldBlur}
                                        />
                                    )}
                                </div>

                                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                    <Button variant="outline" onClick={handleBack}>
                                        {step === 1 ? "ยกเลิก" : "ก่อนหน้า"}
                                    </Button>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {draftSavedAt && (
                                            <span className="text-xs text-fg-muted">
                                                บันทึกฉบับร่างล่าสุดเมื่อ {formatDraftTime(draftSavedAt)}
                                            </span>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={handleSaveDraft}
                                            disabled={savingDraft || submitting}
                                        >
                                            {savingDraft ? (
                                                <>
                                                    <Loader2 className="size-4 animate-spin" />
                                                    กำลังบันทึก...
                                                </>
                                            ) : (
                                                "บันทึกฉบับร่าง"
                                            )}
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
                        </div>
                    </>
                )}
            </Container>
        </div>
    )
}
