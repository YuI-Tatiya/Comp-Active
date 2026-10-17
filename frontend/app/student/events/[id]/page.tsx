"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { AlertTriangle, Loader2 } from "lucide-react"
import { eventsAPI, registrationsAPI, EventSummary, RegistrationAnswerBody } from "@/lib/api"
import { eventImagePathFor } from "@/lib/event-image"
import { referenceCode } from "@/components/denim/denim-ui"
import { useAuth } from "@/lib/auth-context"
import { formatActivitySchedule, pickMyRegistration } from "@/lib/activity-view"
import { ActivityRegistrationView } from "@/components/activity/activity-registration-view"

type EventActivity = EventSummary["activities"][number]

/** ข้อมูลย่อของการลงทะเบียนตัวเอง — ใช้บอกสถานะของแต่ละกิจกรรมย่อย (รอยืนยัน/สำเร็จ/เช็คอินแล้ว) */
interface MyRegistrationLite {
    id: number
    status: string
    attendance?: string | null
    activity: { id: number }
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
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

    const showToast = (message: string, description?: string) => {
        setToast({ open: true, message, description })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2500)
    }

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(String(params.id))
            loadMyRegistrations()
        }
    }, [params.id])

    const fetchEventDetails = async (publicId: string) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getPublicById(publicId)
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
    const myRegistrationForActive = activeActivity ? pickMyRegistration(myRegistrations, activeActivity.id) : undefined

    async function confirmCancelRegistration() {
        if (!myRegistrationForActive) return
        setCancelling(true)
        try {
            await registrationsAPI.cancel(myRegistrationForActive.id)
            setCancelConfirmOpen(false)
            showToast("ยกเลิกการลงทะเบียนแล้ว")
            if (event?.publicId) fetchEventDetails(event.publicId)
            loadMyRegistrations()
        } catch (err: unknown) {
            showToast("ยกเลิกไม่สำเร็จ", (err as Error).message)
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

        if (activeActivity.registrationType === "staff_volunteer") {
            if (!registrationTypeFields.dutyRole) {
                setFormError("กรุณาเลือกบทบาท/หน้าที่")
                return
            }
            if ((activeActivity.dutyShiftOptions?.length ?? 0) > 0 && !registrationTypeFields.dutyShift) {
                setFormError("กรุณาเลือกรอบ/กะเวลา")
                return
            }
        }
        if (activeActivity.registrationType === "contestant") {
            if (!registrationTypeFields.teamName.trim()) {
                setFormError("กรุณาระบุชื่อทีม")
                return
            }
            const size = parseInt(registrationTypeFields.teamSize)
            if (activeActivity.teamSizeMin != null && (Number.isNaN(size) || size < activeActivity.teamSizeMin)) {
                setFormError(`จำนวนสมาชิกทีมต้องไม่น้อยกว่า ${activeActivity.teamSizeMin} คน`)
                return
            }
            if (activeActivity.teamSizeMax != null && (Number.isNaN(size) || size > activeActivity.teamSizeMax)) {
                setFormError(`จำนวนสมาชิกทีมต้องไม่เกิน ${activeActivity.teamSizeMax} คน`)
                return
            }
            if ((activeActivity.competitionCategoryOptions?.length ?? 0) > 0 && !registrationTypeFields.competitionCategory) {
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
                activeActivity.registrationType === "staff_volunteer"
                    ? { dutyRole: registrationTypeFields.dutyRole, dutyShift: registrationTypeFields.dutyShift || undefined }
                    : activeActivity.registrationType === "contestant"
                        ? {
                            teamName: registrationTypeFields.teamName,
                            teamSize: registrationTypeFields.teamSize ? parseInt(registrationTypeFields.teamSize) : undefined,
                            competitionCategory: registrationTypeFields.competitionCategory || undefined,
                            submissionLink: registrationTypeFields.submissionLink || undefined,
                        }
                        : undefined
            await registrationsAPI.create(
                activeActivity.id,
                answerPayload,
                activeActivity.volunteerRole ? certRequest : undefined,
                registrationTypeFieldsPayload,
            )
            setIsRegisterOpen(false)
            showToast("ลงทะเบียนสำเร็จ!", "ติดตามสถานะได้ที่หน้ากิจกรรมของฉัน")
            if (event?.publicId) fetchEventDetails(event.publicId)
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

    const activeSchedule = activeActivity ? formatActivitySchedule(activeActivity) : null

    return (
        <ActivityRegistrationView
            title={event.name}
            imagePath={eventImagePathFor(event, activeActivity)}
            code={referenceCode("EVT", event.id)}
            organizerName={activeActivity?.organizer?.name ?? event.activities[0]?.organizer?.name}
            intro={event.description}
            activities={event.activities}
            activeId={activeActivityId}
            onSelectActivity={setActiveActivityId}
            registrationOpenAt={event.registrationOpenAt}
            registrationCloseAt={event.registrationCloseAt}
            myRegistrations={myRegistrations}
            onRegister={openRegisterDialog}
            onCancel={() => setCancelConfirmOpen(true)}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${event.publicId}`}
            onShareCopied={() => showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")}
            backHref="/student/events"
            showActivityImage
        >
            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วม &quot;{activeActivity?.name}&quot;</DialogTitle>
                        <p className="text-fg-muted text-sm">กรุณายืนยันข้อมูลของคุณเพื่อยืนยันตัวตนก่อนลงทะเบียน</p>
                        {activeActivity && activeSchedule && (
                            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                                {activeSchedule.dateLabel}
                                {activeSchedule.timeLabel ? ` · ${activeSchedule.timeLabel}` : ""} · {activeActivity.location}
                            </p>
                        )}
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

                        {activeActivity?.registrationType === "staff_volunteer" && (
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
                                        {(activeActivity.dutyRoleOptions ?? []).map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </Select>
                                </div>
                                {(activeActivity.dutyShiftOptions?.length ?? 0) > 0 && (
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
                                            {activeActivity.dutyShiftOptions!.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeActivity?.registrationType === "contestant" && (
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
                                {(activeActivity.teamSizeMin != null || activeActivity.teamSizeMax != null) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-team-size" className="text-xs font-normal text-fg-muted">
                                            จำนวนสมาชิกทีม
                                            {activeActivity.teamSizeMin != null && activeActivity.teamSizeMax != null
                                                ? ` (${activeActivity.teamSizeMin}-${activeActivity.teamSizeMax} คน)`
                                                : ""}{" "}
                                            <span className="text-danger">*</span>
                                        </Label>
                                        <Input
                                            id="reg-team-size"
                                            type="number"
                                            min={activeActivity.teamSizeMin ?? 1}
                                            max={activeActivity.teamSizeMax ?? undefined}
                                            value={registrationTypeFields.teamSize}
                                            onChange={(e) => setRegistrationTypeFields((prev) => ({ ...prev, teamSize: e.target.value }))}
                                            className="max-w-[140px]"
                                        />
                                    </div>
                                )}
                                {(activeActivity.competitionCategoryOptions?.length ?? 0) > 0 && (
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
                                            {activeActivity.competitionCategoryOptions!.map((opt) => (
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
        </ActivityRegistrationView>
    )
}
