"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Toast } from "@/components/ui/toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { cn } from "@/lib/utils"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, registrationsAPI, isUnlimitedCapacity, isActiveRegistration, Activity, RegistrationAnswerBody } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { useAuth } from "@/lib/auth-context"
import { categoriesBadgeLabel } from "@/lib/categories"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

const QUICK_FACT_TONES = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
} as const

/** การ์ดข้อมูลย่อยขนาดเท่ากัน 4 ช่อง — เหมือนกับหน้า /student/events/[id] เพื่อให้ประสบการณ์สอดคล้องกัน */
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

/** ข้อมูลย่อของการลงทะเบียนตัวเอง — ใช้แค่เช็คว่าลงทะเบียนกิจกรรมนี้ไว้แล้วหรือยัง */
interface MyRegistrationLite {
    id: number
    status: string
    evaluation?: unknown
    activity: { id: number }
}

export default function StudentActivityDetailsPage() {
    const { user } = useAuth()
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [event, setEvent] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [registerForm, setRegisterForm] = useState({ name: "", studentId: "", email: "" })
    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<number, { textValue?: string; optionIds?: number[] }>>({})
    const [registrationTypeFields, setRegistrationTypeFields] = useState({
        dutyRole: "",
        dutyShift: "",
        teamName: "",
        teamSize: "",
        competitionCategory: "",
        submissionLink: "",
    })
    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [myRegistration, setMyRegistration] = useState<MyRegistrationLite | null>(null)
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    useEffect(() => {
        if (params.id) {
            const id = Number(params.id)
            fetchEventDetails(id)
            loadMyRegistration(id)
        }
    }, [params.id])

    async function loadMyRegistration(activityId: number) {
        try {
            const data = await registrationsAPI.getMy()
            const list = Array.isArray(data) ? (data as MyRegistrationLite[]) : []
            setMyRegistration(list.find((r) => r.activity?.id === activityId && isActiveRegistration(r)) ?? null)
        } catch {
            setMyRegistration(null)
        }
    }

    async function confirmCancelRegistration() {
        if (!myRegistration) return
        setCancelling(true)
        try {
            await registrationsAPI.cancel(myRegistration.id)
            setCancelConfirmOpen(false)
            setMyRegistration(null)
            showToast("ยกเลิกการลงทะเบียนแล้ว")
            if (event) fetchEventDetails(event.id)
        } catch (err: unknown) {
            alert((err as Error).message || "ยกเลิกไม่สำเร็จ")
        } finally {
            setCancelling(false)
        }
    }

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

    const openRegisterDialog = useCallback(() => {
        setRegisterForm({
            name: user?.name || "",
            studentId: (user as { studentId?: string } | null)?.studentId || "",
            email: user?.email || "",
        })
        setFormError("")
        setAnswers({})
        setRegistrationTypeFields({
            dutyRole: "",
            dutyShift: "",
            teamName: "",
            teamSize: "",
            competitionCategory: "",
            submissionLink: "",
        })
        setIsRegisterOpen(true)
    }, [user])

    // เปิด dialog ลงทะเบียนอัตโนมัติเมื่อมาจากลิงก์ ?register=true
    useEffect(() => {
        if (!loading && event && searchParams.get("register") === "true") {
            openRegisterDialog()
        }
    }, [loading, event, searchParams, openRegisterDialog])

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(id)
            setEvent(data)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/student/activities/${event?.id}`)
        showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError("")
        if (!event) return

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

        for (const q of event.questions ?? []) {
            if (!q.required) continue
            const a = answers[q.id]
            const answered = q.type === "text" ? !!a?.textValue?.trim() : (a?.optionIds?.length ?? 0) > 0
            if (!answered) {
                setFormError(`กรุณาตอบคำถาม: ${q.label}`)
                return
            }
        }

        if (event.registrationType === "staff_volunteer") {
            if (!registrationTypeFields.dutyRole) {
                setFormError("กรุณาเลือกบทบาท/หน้าที่")
                return
            }
            if ((event.dutyShiftOptions?.length ?? 0) > 0 && !registrationTypeFields.dutyShift) {
                setFormError("กรุณาเลือกรอบ/กะเวลา")
                return
            }
        }
        if (event.registrationType === "contestant") {
            if (!registrationTypeFields.teamName.trim()) {
                setFormError("กรุณาระบุชื่อทีม")
                return
            }
            const size = parseInt(registrationTypeFields.teamSize)
            if (event.teamSizeMin != null && (Number.isNaN(size) || size < event.teamSizeMin)) {
                setFormError(`จำนวนสมาชิกทีมต้องไม่น้อยกว่า ${event.teamSizeMin} คน`)
                return
            }
            if (event.teamSizeMax != null && (Number.isNaN(size) || size > event.teamSizeMax)) {
                setFormError(`จำนวนสมาชิกทีมต้องไม่เกิน ${event.teamSizeMax} คน`)
                return
            }
            if ((event.competitionCategoryOptions?.length ?? 0) > 0 && !registrationTypeFields.competitionCategory) {
                setFormError("กรุณาเลือกประเภท/รุ่นการแข่งขัน")
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
            const registrationTypeFieldsPayload =
                event.registrationType === "staff_volunteer"
                    ? { dutyRole: registrationTypeFields.dutyRole, dutyShift: registrationTypeFields.dutyShift || undefined }
                    : event.registrationType === "contestant"
                        ? {
                            teamName: registrationTypeFields.teamName,
                            teamSize: registrationTypeFields.teamSize ? parseInt(registrationTypeFields.teamSize) : undefined,
                            competitionCategory: registrationTypeFields.competitionCategory || undefined,
                            submissionLink: registrationTypeFields.submissionLink || undefined,
                        }
                        : undefined
            await registrationsAPI.create(event.id, answerPayload, undefined, registrationTypeFieldsPayload)
            setIsRegisterOpen(false)
            showToast("ลงทะเบียนสำเร็จ!", "ติดตามสถานะได้ที่หน้ากิจกรรมของฉัน")
            fetchEventDetails(event.id)
            loadMyRegistration(event.id)
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
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดกิจกรรม...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface flex flex-col items-center justify-center p-4">
                <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-border">
                    <AlertTriangle className="mx-auto mb-4 size-12 text-danger" aria-hidden="true" />
                    <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบกิจกรรม</h2>
                    <p className="text-fg-muted mb-6">{error || "กิจกรรมนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push("/student/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                </div>
            </div>
        )
    }

    const capacity = event.capacity
    const registeredCount = event.registeredCount ?? 0
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

                {/* Hero — รูปปก 16:9 เต็มความกว้าง สไตล์เดียวกับ /student/events/[id] */}
                <div className="relative mb-3 overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-sm">
                    <div className="aspect-video w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={resolveEventImageUrl(event)}
                            alt={event.name}
                            className="size-full object-cover"
                        />
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                    />
                    <div className="absolute left-4 top-4">
                        <Badge className="bg-brand-600 text-white">{categoriesBadgeLabel(event.categories)}</Badge>
                    </div>
                    <div className="absolute right-4 top-4">
                        <Badge className={event.status === "open" ? "bg-success text-white" : "bg-fg-subtle text-white"}>
                            {event.status === "open" ? "กำลังเปิดรับสมัคร" : "ปิดรับสมัคร"}
                        </Badge>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                        <h1 className="text-2xl font-black text-white drop-shadow-sm sm:text-3xl md:text-4xl">{event.name}</h1>
                        {event.organizer?.name && (
                            <p className="mt-1 text-sm text-white/85">จัดโดย {event.organizer.name}</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="space-y-8 lg:col-span-2">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <QuickFact icon={Calendar} label="วันที่" value={formatEventDate(event.date)} />
                            <QuickFact icon={Clock} label="เวลา" value={`${event.startTime} - ${event.endTime}`} />
                            <QuickFact icon={MapPin} label="สถานที่" value={event.location} tone="success" />
                            <QuickFact
                                icon={Users}
                                label="ที่นั่งเหลือ"
                                value={unlimited ? "ไม่จำกัด" : `${seatsRemaining} ที่นั่ง`}
                                tone={unlimited ? "brand" : urgency}
                            />
                        </div>

                        <ActivityAboutPanel activity={event} />
                        <ActivityRewardsPanel activity={event} />
                        <ActivityRegistrationPanel activity={event} />
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

                                    <div className="space-y-3">
                                        {myRegistration ? (
                                            <>
                                                <div className="rounded-xl border border-success bg-success-bg px-4 py-3 text-center text-sm font-semibold text-success">
                                                    คุณลงทะเบียนกิจกรรมนี้แล้ว
                                                    {myRegistration.status === "pending" && " (รอดำเนินการ)"}
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
                                                {event.status !== "open" && (
                                                    <div className="flex justify-center">
                                                        <Badge variant="neutral">ปิดรับสมัคร</Badge>
                                                    </div>
                                                )}
                                                <Button
                                                    className="h-11 w-full rounded-xl text-base font-semibold"
                                                    onClick={openRegisterDialog}
                                                    disabled={event.status !== "open"}
                                                >
                                                    ลงทะเบียนเข้าร่วม
                                                </Button>
                                            </>
                                        )}
                                        <Button variant="outline" className="w-full rounded-xl" onClick={handleShare}>
                                            <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> แชร์กิจกรรม
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </Container>

            <Dialog open={isRegisterOpen} onOpenChange={(open) => { setIsRegisterOpen(open); if (open) openRegisterDialog(); }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วมกิจกรรม</DialogTitle>
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

                        {event.registrationType === "staff_volunteer" && (
                            <div className="space-y-3 border-t border-border pt-4">
                                <Label>ลงทะเบียนในฐานะสตาฟฟ์ / จิตอาสา</Label>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-duty-role" className="text-xs font-normal text-fg-muted">
                                        บทบาท/หน้าที่ <span className="text-danger">*</span>
                                    </Label>
                                    <Select
                                        id="reg-duty-role"
                                        value={registrationTypeFields.dutyRole}
                                        onChange={(e) => setRegistrationTypeFields((prev) => ({ ...prev, dutyRole: e.target.value }))}
                                    >
                                        <option value="">เลือกบทบาท/หน้าที่</option>
                                        {(event.dutyRoleOptions ?? []).map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </Select>
                                </div>
                                {(event.dutyShiftOptions?.length ?? 0) > 0 && (
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-duty-shift" className="text-xs font-normal text-fg-muted">
                                            รอบ/กะเวลา <span className="text-danger">*</span>
                                        </Label>
                                        <Select
                                            id="reg-duty-shift"
                                            value={registrationTypeFields.dutyShift}
                                            onChange={(e) => setRegistrationTypeFields((prev) => ({ ...prev, dutyShift: e.target.value }))}
                                        >
                                            <option value="">เลือกรอบ/กะเวลา</option>
                                            {event.dutyShiftOptions!.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}

                        {event.registrationType === "contestant" && (
                            <div className="space-y-3 border-t border-border pt-4">
                                <Label>ลงทะเบียนในฐานะผู้สมัครแข่งขัน</Label>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-team-name" className="text-xs font-normal text-fg-muted">
                                        ชื่อทีม <span className="text-danger">*</span>
                                    </Label>
                                    <Input
                                        id="reg-team-name"
                                        value={registrationTypeFields.teamName}
                                        onChange={(e) => setRegistrationTypeFields((prev) => ({ ...prev, teamName: e.target.value }))}
                                    />
                                </div>
                                {(event.teamSizeMin != null || event.teamSizeMax != null) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-team-size" className="text-xs font-normal text-fg-muted">
                                            จำนวนสมาชิกทีม
                                            {event.teamSizeMin != null && event.teamSizeMax != null
                                                ? ` (${event.teamSizeMin}-${event.teamSizeMax} คน)`
                                                : ""}{" "}
                                            <span className="text-danger">*</span>
                                        </Label>
                                        <Input
                                            id="reg-team-size"
                                            type="number"
                                            min={event.teamSizeMin ?? 1}
                                            max={event.teamSizeMax ?? undefined}
                                            value={registrationTypeFields.teamSize}
                                            onChange={(e) => setRegistrationTypeFields((prev) => ({ ...prev, teamSize: e.target.value }))}
                                            className="max-w-[140px]"
                                        />
                                    </div>
                                )}
                                {(event.competitionCategoryOptions?.length ?? 0) > 0 && (
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-competition-category" className="text-xs font-normal text-fg-muted">
                                            ประเภท/รุ่นการแข่งขัน <span className="text-danger">*</span>
                                        </Label>
                                        <Select
                                            id="reg-competition-category"
                                            value={registrationTypeFields.competitionCategory}
                                            onChange={(e) => setRegistrationTypeFields((prev) => ({ ...prev, competitionCategory: e.target.value }))}
                                        >
                                            <option value="">เลือกประเภท/รุ่นการแข่งขัน</option>
                                            {event.competitionCategoryOptions!.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </Select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="reg-submission-link" className="text-xs font-normal text-fg-muted">
                                        ลิงก์ผลงาน/ไฟล์ส่ง (ถ้ามี)
                                    </Label>
                                    <Input
                                        id="reg-submission-link"
                                        type="url"
                                        placeholder="https://..."
                                        value={registrationTypeFields.submissionLink}
                                        onChange={(e) => setRegistrationTypeFields((prev) => ({ ...prev, submissionLink: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}

                        {event.questions && event.questions.length > 0 && (
                            <div className="space-y-4 border-t border-border pt-4">
                                <p className="text-sm font-medium text-fg">คำถามเพิ่มเติม</p>
                                {event.questions.map((q) => (
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
