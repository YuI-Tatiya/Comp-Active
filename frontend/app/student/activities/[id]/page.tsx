"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Toast } from "@/components/ui/toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import { activitiesAPI, registrationsAPI, Activity, RegistrationAnswerBody } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { useAuth } from "@/lib/auth-context"
import { formatActivitySchedule, pickMyRegistration } from "@/lib/activity-view"
import { ActivityRegistrationView } from "@/components/activity/activity-registration-view"

/** ข้อมูลย่อของการลงทะเบียนตัวเอง — ใช้บอกสถานะของกิจกรรมนี้ (รอยืนยัน/สำเร็จ/เช็คอินแล้ว) */
interface MyRegistrationLite {
    id: number
    status: string
    attendance?: string | null
    activity: { id: number }
}

export default function StudentActivityDetailsPage() {
    const { user } = useAuth()
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    // กลับไปหน้าที่ผู้ใช้มาจริง — whitelist เท่านั้น ไม่รับ path จาก query ตรงๆ
    const backHref = searchParams.get("from") === "my-registrations" ? "/student/my-registrations" : "/student/events"
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
    const [myRegistrations, setMyRegistrations] = useState<MyRegistrationLite[]>([])
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    useEffect(() => {
        if (params.id) {
            const id = Number(params.id)
            fetchEventDetails(id)
            loadMyRegistrations()
        }
    }, [params.id])

    async function loadMyRegistrations() {
        try {
            const data = await registrationsAPI.getMy()
            setMyRegistrations(Array.isArray(data) ? (data as MyRegistrationLite[]) : [])
        } catch {
            setMyRegistrations([])
        }
    }

    const myRegistration = event ? pickMyRegistration(myRegistrations, event.id) : undefined

    async function confirmCancelRegistration() {
        if (!myRegistration) return
        setCancelling(true)
        try {
            await registrationsAPI.cancel(myRegistration.id)
            setCancelConfirmOpen(false)
            showToast("ยกเลิกการลงทะเบียนแล้ว")
            loadMyRegistrations()
            if (event) fetchEventDetails(event.id)
        } catch (err: unknown) {
            showToast("ยกเลิกไม่สำเร็จ", (err as Error).message)
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

    const schedule = formatActivitySchedule(event)

    return (
        <ActivityRegistrationView
            title={event.name}
            imageUrl={resolveEventImageUrl(event)}
            organizerName={event.organizer?.name}
            activities={[event]}
            activeId={event.id}
            onSelectActivity={() => {}}
            myRegistrations={myRegistrations}
            onRegister={openRegisterDialog}
            onCancel={() => setCancelConfirmOpen(true)}
            onShare={handleShare}
            backHref={backHref}
        >
            <Dialog open={isRegisterOpen} onOpenChange={(open) => { setIsRegisterOpen(open); if (open) openRegisterDialog(); }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วม &quot;{event.name}&quot;</DialogTitle>
                        <p className="text-fg-muted text-sm">กรุณายืนยันข้อมูลของคุณเพื่อยืนยันตัวตนก่อนลงทะเบียน</p>
                        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                            {schedule.dateLabel}
                            {schedule.timeLabel ? ` · ${schedule.timeLabel}` : ""} · {event.location}
                        </p>
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
        </ActivityRegistrationView>
    )
}
