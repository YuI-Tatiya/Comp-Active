"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { cn } from "@/lib/utils"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, AlertTriangle, Loader2, CalendarClock, Layers } from "lucide-react"
import Link from "next/link"
import { eventsAPI, registrationsAPI, isUnlimitedCapacity, isActiveRegistration, EventSummary, RegistrationAnswerBody } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { useAuth } from "@/lib/auth-context"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

type EventActivity = EventSummary["activities"][number]

/** ข้อมูลย่อของการลงทะเบียนตัวเอง — ใช้แค่เช็คว่าลงทะเบียนกิจกรรมย่อยนี้ไว้แล้วหรือยัง */
interface MyRegistrationLite {
    id: number
    status: string
    evaluation?: unknown
    activity: { id: number }
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

const QUICK_FACT_TONES = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
} as const

/** การ์ดข้อมูลย่อยขนาดเท่ากัน 4 ช่อง — วันที่/เวลา/สถานที่/ที่นั่งเหลือ */
function QuickFact({
    icon: Icon,
    label,
    value,
    tone = "brand",
}: {
    icon: LucideIcon
    label: string
    value: React.ReactNode
    tone?: keyof typeof QUICK_FACT_TONES
}) {
    return (
        <div className="rounded-2xl border border-border bg-bg p-4 shadow-xs">
            <div className={cn("mb-3 flex size-10 items-center justify-center rounded-xl", QUICK_FACT_TONES[tone])}>
                <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="text-xs text-fg-muted">{label}</div>
            <div
                className="mt-0.5 truncate text-sm font-semibold text-fg"
                title={typeof value === "string" ? value : undefined}
            >
                {value}
            </div>
        </div>
    )
}

export default function StudentEventDetailsPage() {
    const { user } = useAuth()
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const [registerForm, setRegisterForm] = useState({ name: "", studentId: "", email: "" })
    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<number, { textValue?: string; optionIds?: number[] }>>({})
    const [certRequest, setCertRequest] = useState({ wantsCertLoanFund: false, wantsCertScholarship: false })
    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [myRegistrations, setMyRegistrations] = useState<MyRegistrationLite[]>([])
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

    const showToast = (message: string, description?: string) => {
        setToast({ open: true, message, description })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2500)
    }

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/events/${event?.id}`)
        showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")
    }

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(Number(params.id))
            loadMyRegistrations()
        }
    }, [params.id])

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getPublicById(id)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    async function loadMyRegistrations() {
        try {
            const data = await registrationsAPI.getMy()
            setMyRegistrations(Array.isArray(data) ? (data as MyRegistrationLite[]) : [])
        } catch {
            setMyRegistrations([])
        }
    }

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)
    const myRegistrationForActive = activeActivity
        ? myRegistrations.find((r) => r.activity?.id === activeActivity.id && isActiveRegistration(r))
        : undefined

    async function confirmCancelRegistration() {
        if (!myRegistrationForActive) return
        setCancelling(true)
        try {
            await registrationsAPI.cancel(myRegistrationForActive.id)
            setCancelConfirmOpen(false)
            showToast("ยกเลิกการลงทะเบียนแล้ว")
            if (event) fetchEventDetails(event.id)
            loadMyRegistrations()
        } catch (err: unknown) {
            alert((err as Error).message || "ยกเลิกไม่สำเร็จ")
        } finally {
            setCancelling(false)
        }
    }

    const openRegisterDialog = useCallback(() => {
        setRegisterForm({
            name: user?.name || "",
            studentId: (user as { studentId?: string } | null)?.studentId || "",
            email: user?.email || "",
        })
        setFormError("")
        setAnswers({})
        setCertRequest({ wantsCertLoanFund: false, wantsCertScholarship: false })
        setIsRegisterOpen(true)
    }, [user])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError("")
        if (!activeActivity) return

        const profileName = user?.name?.trim().toLowerCase() || ""
        const profileStudentId = ((user as { studentId?: string } | null)?.studentId || "").trim()
        const profileEmail = user?.email?.trim().toLowerCase() || ""

        const enteredName = registerForm.name.trim().toLowerCase()
        const enteredStudentId = registerForm.studentId.trim()
        const enteredEmail = registerForm.email.trim().toLowerCase()

        if (enteredName !== profileName) {
            setFormError("ชื่อ-นามสกุลไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }
        if (profileStudentId && enteredStudentId !== profileStudentId) {
            setFormError("รหัสนักศึกษาไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }
        if (enteredEmail !== profileEmail) {
            setFormError("อีเมลไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }

        for (const q of activeActivity.questions ?? []) {
            if (!q.required) continue
            const a = answers[q.id]
            const answered = q.type === "text" ? !!a?.textValue?.trim() : (a?.optionIds?.length ?? 0) > 0
            if (!answered) {
                setFormError(`กรุณาตอบคำถาม: ${q.label}`)
                return
            }
        }

        try {
            setSubmitting(true)
            const answerPayload: RegistrationAnswerBody[] = Object.entries(answers).map(([questionId, a]) => ({
                questionId: Number(questionId),
                textValue: a.textValue,
                optionIds: a.optionIds,
            }))
            await registrationsAPI.create(activeActivity.id, answerPayload, activeActivity.volunteerRole ? certRequest : undefined)
            setIsRegisterOpen(false)
            showToast("ลงทะเบียนสำเร็จ!", "ติดตามสถานะได้ที่หน้ากิจกรรมของฉัน")
            fetchEventDetails(event!.id)
            loadMyRegistrations()
        } catch (err: unknown) {
            const e = err as Error
            setFormError(e.message || "ลงทะเบียนไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-surface flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดงาน...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface flex flex-col items-center justify-center p-4">
                <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-border">
                    <AlertTriangle className="mx-auto mb-4 size-12 text-danger" aria-hidden="true" />
                    <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบงาน</h2>
                    <p className="text-fg-muted mb-6">{error || "งานนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push("/student/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                </div>
            </div>
        )
    }

    const capacity = activeActivity?.capacity ?? null
    const registeredCount = activeActivity?.registeredCount ?? 0
    const unlimited = isUnlimitedCapacity(capacity)
    const seatsRemaining = !unlimited && capacity ? Math.max(capacity - registeredCount, 0) : null
    const percent = !unlimited && capacity ? Math.min((registeredCount / capacity) * 100, 100) : 0
    const urgency: "success" | "warning" | "danger" = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "success"
    const urgencyBar = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[urgency]
    const urgencyText = { success: "text-fg-subtle", warning: "text-warning", danger: "text-danger" }[urgency]

    return (
        <div className="min-h-screen bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6">
                    <Link href="/student/events" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Link>
                </div>

                {/* Hero — รูปปก 16:9 แท้ ไม่มี max-h มาบังคับทับสัดส่วนที่ครอปไว้ตอนอัปโหลด */}
                <div className="relative mb-3 overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-sm">
                    <div className="aspect-video w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={resolveEventImageUrl(event, activeActivity)}
                            alt={event.name}
                            className="size-full object-cover"
                        />
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                    />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        {event.activities.length > 1 && (
                            <Badge className="bg-brand-600 text-white">{event.activities.length} กิจกรรมย่อย</Badge>
                        )}
                    </div>
                    {activeActivity && (
                        <div className="absolute right-4 top-4">
                            <Badge className={activeActivity.status === "open" ? "bg-success text-white" : "bg-fg-subtle text-white"}>
                                {activeActivity.status === "open" ? "กำลังเปิดรับสมัคร" : "ปิดรับสมัคร"}
                            </Badge>
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                        <h1 className="text-2xl font-black text-white drop-shadow-sm sm:text-3xl md:text-4xl">{event.name}</h1>
                        {activeActivity?.organizer?.name && (
                            <p className="mt-1 text-sm text-white/85">จัดโดย {activeActivity.organizer.name}</p>
                        )}
                    </div>
                </div>

                {event.description && (
                    <p className="mb-8 max-w-3xl whitespace-pre-line leading-relaxed text-fg-muted">{event.description}</p>
                )}

                {/* ตัวเลือกกิจกรรมย่อย — pill ระดับเดียว ไม่ซ้อน tab อีกชั้น */}
                {event.activities.length > 1 && (
                    <div className="mb-8 flex flex-wrap gap-2">
                        {event.activities.map((a) => {
                            const active = a.id === activeActivityId
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setActiveActivityId(a.id)}
                                    className={cn(
                                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                                        active
                                            ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                                            : "border-border bg-bg text-fg-muted hover:border-brand-300 hover:text-fg"
                                    )}
                                >
                                    {a.name}
                                </button>
                            )
                        })}
                    </div>
                )}

                {activeActivity && (
                    <div className="grid gap-8 lg:grid-cols-3">
                        <div className="space-y-8 lg:col-span-2">
                            {/* ชื่อกิจกรรมย่อยที่กำลังดูอยู่ — ต้องแสดงเสมอ ไม่ผูกกับจำนวนกิจกรรมย่อย
                                เดิมชื่อโผล่แค่ในปุ่ม pill ด้านบนซึ่งซ่อนเมื่อมีกิจกรรมย่อยตัวเดียว
                                ทำให้งานที่มีกิจกรรมย่อยตัวเดียวไม่แสดงชื่อกิจกรรมย่อยที่ไหนเลย */}
                            <div>
                                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                                    <Layers className="size-3.5" aria-hidden="true" />
                                    กิจกรรมย่อย
                                </span>
                                <h2 className="text-xl font-bold text-fg sm:text-2xl">{activeActivity.name}</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <QuickFact icon={Calendar} label="วันที่" value={formatEventDate(activeActivity.date)} />
                                <QuickFact icon={Clock} label="เวลา" value={`${activeActivity.startTime} - ${activeActivity.endTime}`} />
                                <QuickFact icon={MapPin} label="สถานที่" value={activeActivity.location} tone="success" />
                                <QuickFact
                                    icon={Users}
                                    label="ที่นั่งเหลือ"
                                    value={unlimited ? "ไม่จำกัด" : `${seatsRemaining} ที่นั่ง`}
                                    tone={unlimited ? "brand" : urgency}
                                />
                            </div>

                            <ActivityAboutPanel activity={activeActivity} showActivityImage />
                            <ActivityRewardsPanel activity={activeActivity} />
                            <ActivityRegistrationPanel activity={activeActivity} registrationCloseAt={event.registrationCloseAt} />
                        </div>

                        <div className="lg:col-span-1">
                            <div className="lg:sticky lg:top-24">
                                <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
                                    <div className="space-y-5 p-6">
                                        <div>
                                            <div className="mb-2 flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-1.5 font-medium text-fg">
                                                    <Users className="size-4" aria-hidden="true" /> ผู้เข้าร่วม
                                                </span>
                                                <span className="text-fg-muted">
                                                    {registeredCount}{unlimited ? " คน (ไม่จำกัด)" : `/${capacity} คน`}
                                                </span>
                                            </div>
                                            {!unlimited && capacity && (
                                                <>
                                                    <Progress value={registeredCount} max={capacity} indicatorClassName={urgencyBar} />
                                                    <p className={cn("mt-2 text-right text-xs font-medium", urgencyText)}>
                                                        {seatsRemaining === 0 ? "เต็มแล้ว" : `เหลืออีก ${seatsRemaining} ที่นั่ง`}
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        {event.registrationCloseAt && (
                                            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-fg-muted">
                                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                                ปิดรับสมัคร {formatDateTime(event.registrationCloseAt)}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {myRegistrationForActive ? (
                                                <>
                                                    <div className="rounded-xl border border-success bg-success-bg px-4 py-3 text-center text-sm font-semibold text-success">
                                                        คุณลงทะเบียนกิจกรรมนี้แล้ว
                                                        {myRegistrationForActive.status === "pending" && " (รอดำเนินการ)"}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        className="h-11 w-full rounded-xl text-base font-semibold text-danger hover:bg-danger-bg hover:text-danger"
                                                        onClick={() => setCancelConfirmOpen(true)}
                                                    >
                                                        ยกเลิกการลงทะเบียน
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    {activeActivity.status !== "open" && (
                                                        <div className="flex justify-center">
                                                            <Badge variant="neutral">ปิดรับสมัคร</Badge>
                                                        </div>
                                                    )}
                                                    <Button
                                                        className="h-11 w-full rounded-xl text-base font-semibold"
                                                        onClick={openRegisterDialog}
                                                        disabled={activeActivity.status !== "open"}
                                                    >
                                                        ลงทะเบียนเข้าร่วม
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-xl"
                                                onClick={handleShare}
                                            >
                                                <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> แชร์งานนี้
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </Container>

            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วม &quot;{activeActivity?.name}&quot;</DialogTitle>
                        <p className="text-fg-muted text-sm">กรุณายืนยันข้อมูลของคุณเพื่อยืนยันตัวตนก่อนลงทะเบียน</p>
                    </DialogHeader>

                    <form onSubmit={handleRegister} className="space-y-4 py-2">
                        {formError && (
                            <div className="bg-danger-bg border border-danger text-danger text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="reg-name">ชื่อ-นามสกุล <span className="text-danger">*</span></Label>
                            <Input id="reg-name" value={registerForm.name} onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="กรอกชื่อ-นามสกุล" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-studentId">รหัสนักศึกษา <span className="text-danger">*</span></Label>
                            <Input id="reg-studentId" value={registerForm.studentId} onChange={(e) => setRegisterForm((prev) => ({ ...prev, studentId: e.target.value }))} placeholder="กรอกรหัสนักศึกษา" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-email">อีเมล <span className="text-danger">*</span></Label>
                            <Input id="reg-email" type="email" value={registerForm.email} onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="กรอกอีเมล" required />
                        </div>

                        {activeActivity?.volunteerRole && (
                            <div className="space-y-2 border-t border-border pt-4">
                                <Label>ขอใบรับรองจิตอาสาเพื่อ</Label>
                                <p className="text-xs text-fg-subtle">เลือกได้มากกว่า 1 ข้อ หรือไม่เลือกเลยหากไม่ต้องการใบจิตอาสา</p>
                                <label className="flex items-center gap-2 text-sm text-fg-muted">
                                    <input
                                        type="checkbox"
                                        checked={certRequest.wantsCertLoanFund}
                                        onChange={(e) => setCertRequest((prev) => ({ ...prev, wantsCertLoanFund: e.target.checked }))}
                                    />
                                    กยศ. (กองทุนเงินให้กู้ยืมเพื่อการศึกษา)
                                </label>
                                <label className="flex items-center gap-2 text-sm text-fg-muted">
                                    <input
                                        type="checkbox"
                                        checked={certRequest.wantsCertScholarship}
                                        onChange={(e) => setCertRequest((prev) => ({ ...prev, wantsCertScholarship: e.target.checked }))}
                                    />
                                    ทุนการศึกษา
                                </label>
                            </div>
                        )}

                        {activeActivity?.questions && activeActivity.questions.length > 0 && (
                            <div className="space-y-4 border-t border-border pt-4">
                                <p className="text-sm font-medium text-fg">คำถามเพิ่มเติม</p>
                                {activeActivity.questions.map((q) => (
                                    <div key={q.id} className="space-y-2">
                                        <Label>{q.label} {q.required && <span className="text-danger">*</span>}</Label>
                                        {q.type === "text" && (
                                            <Input
                                                value={answers[q.id]?.textValue || ""}
                                                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { textValue: e.target.value } }))}
                                            />
                                        )}
                                        {q.type === "single_choice" && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => (
                                                    <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                        <input
                                                            type="radio"
                                                            name={`question-${q.id}`}
                                                            checked={(answers[q.id]?.optionIds ?? [])[0] === opt.id}
                                                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: [opt.id] } }))}
                                                        />
                                                        {opt.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === "multi_choice" && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => {
                                                    const selected = answers[q.id]?.optionIds ?? []
                                                    const checked = selected.includes(opt.id)
                                                    return (
                                                        <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const next = e.target.checked ? [...selected, opt.id] : selected.filter((id) => id !== opt.id)
                                                                    setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: next } }))
                                                                }}
                                                            />
                                                            {opt.label}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-fg-subtle bg-surface px-3 py-2 rounded-lg">* ข้อมูลจะถูกตรวจสอบกับบัญชีผู้ใช้ที่ลงทะเบียนไว้ หากไม่ตรงกันจะไม่สามารถลงทะเบียนได้</p>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} disabled={submitting}>ยกเลิก</Button>
                            <Button type="submit" disabled={submitting}>{submitting ? "กำลังลงทะเบียน..." : "ยืนยันการลงทะเบียน"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Toast open={toast.open} message={toast.message} description={toast.description} />

            <ConfirmDialog
                open={cancelConfirmOpen}
                onOpenChange={setCancelConfirmOpen}
                title="ยกเลิกการลงทะเบียน?"
                description="เมื่อยกเลิกแล้ว ที่นั่งของคุณจะถูกปล่อยคืนให้ผู้อื่น และต้องลงทะเบียนใหม่หากเปลี่ยนใจภายหลัง"
                confirmLabel="ยกเลิกการลงทะเบียน"
                cancelLabel="ไม่ยกเลิก"
                tone="danger"
                loading={cancelling}
                onConfirm={confirmCancelRegistration}
            />
        </div>
    )
}
