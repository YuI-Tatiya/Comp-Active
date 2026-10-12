"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { ShareMenu } from "@/components/ui/share-menu"
import { Calendar, Edit, CheckSquare, Loader2, MapPin, XCircle } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, isCancelledByOrganizer, Activity } from "@/lib/api"
import { ActivityParticipantManager, type RegistrationRow } from "@/components/activity/activity-participant-manager"
import { EventSurveyResults } from "@/components/activity/event-survey-results"
import { categoryTag, referenceCode } from "@/components/denim/denim-ui"
import {
    HERO_DANGER_BUTTON,
    HERO_OUTLINE_BUTTON,
    HERO_PRIMARY_BUTTON,
    HeroCoverPill,
    OrganizerActivityHero,
} from "@/components/organizer/organizer-activity-hero"

export default function OrganizerActivityDetailsPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [event, setEvent] = useState<Activity<RegistrationRow> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [submitting, setSubmitting] = useState(false)

    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

    useEffect(() => {
        if (id) fetchEventDetails(id)
    }, [id])

    // silent=true ใช้ตอน refetch หลังทำ action (ยืนยัน/เช็คอิน ฯลฯ) — ไม่ toggle loading เพื่อไม่ให้ทั้งหน้าถูก unmount
    // จนเสีย state ของแท็บ/ตัวกรองที่เลือกอยู่ (สำคัญมากสำหรับหน้าเช็คอิน ที่ organizer จะกดเช็คชื่อรัวๆ ต่อเนื่องหน้างาน)
    const fetchEventDetails = async (activityId: number, silent = false) => {
        try {
            if (!silent) setLoading(true)
            const data = await activitiesAPI.getByIdForOrganizer(activityId)
            setEvent(data as Activity<RegistrationRow>)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            if (silent) return
            setLoading(false)
        }
    }

    const handleRequestCancel = async () => {
        if (!cancelReason.trim()) {
            alert("กรุณาระบุเหตุผลในการยกเลิก")
            return
        }
        try {
            setSubmitting(true)
            await activitiesAPI.requestCancel(id, cancelReason)

            alert("ยกเลิกกิจกรรมสำเร็จ")
            setIsCancelOpen(false)
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "ดำเนินการไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    const handleMarkCompleted = async () => {
        if (!event) return
        if (!confirm(`ยืนยันจบกิจกรรม "${event.name}"? ระบบจะปิดรับสมัครและปลดล็อกแบบสำรวจให้ผู้เข้าร่วม`)) return
        try {
            setSubmitting(true)
            await activitiesAPI.markCompleted(id)
            alert("จบกิจกรรมเรียบร้อยแล้ว")
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "จบกิจกรรมไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูลกิจกรรม...</p>
                </Container>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบข้อมูลกิจกรรม"}</p>
                    <Button variant="outline" asChild>
                        <Link href="/organizer/manage">กลับไปหน้าจัดการกิจกรรม</Link>
                    </Button>
                </Container>
            </div>
        )
    }

    // กิจกรรมย่อยของงาน (มี eventId) แก้ผ่าน wizard ของงานแม่ — กิจกรรมเดี่ยวใช้ฟอร์มของตัวเอง
    const isEventActivity = event.eventId != null
    const editHref = isEventActivity
        ? `/organizer/manage/${event.eventId}/edit`
        : `/organizer/activities/${event.id}/edit`

    const cancelled = isCancelledByOrganizer(event.approvalStatus)
    const tag = categoryTag(event.categories)
    // สถานะบนปก — ยกเลิก > จบแล้ว > รออนุมัติ > เปิด/ปิดรับสมัคร
    const statusPill = cancelled
        ? { dot: "bg-red-500", label: "กิจกรรมถูกยกเลิก" }
        : event.status === "completed"
          ? { dot: "bg-slate-400", label: "จบแล้ว" }
          : event.approvalStatus === "pending_approval"
            ? { dot: "bg-amber", label: "รออนุมัติ" }
            : event.status === "open"
              ? { dot: "bg-emerald-500", label: "เปิดรับสมัคร" }
              : { dot: "bg-slate-400", label: "ปิดรับสมัคร" }

    return (
        <div className="bg-surface pb-16">
            <OrganizerActivityHero
                backHref="/organizer/manage"
                prompt={`~/organizer/activities/${event.id} $ manage`}
                imagePath={event.imageUrl}
                imageAlt={event.name}
                categories={event.categories}
                pills={
                    <>
                        <HeroCoverPill dot={statusPill.dot}>{statusPill.label}</HeroCoverPill>
                        {tag && <HeroCoverPill>{tag}</HeroCoverPill>}
                    </>
                }
                byline="จัดโดยคุณ"
                title={event.name}
                description={event.description}
                meta={[
                    { icon: Calendar, label: `${formatEventDate(event.date)} · ${event.startTime}–${event.endTime} น.` },
                    { icon: MapPin, label: event.location || "-" },
                ]}
                actions={
                    <>
                        {/* กิจกรรมย่อยของงานต้องแก้ผ่าน wizard ของงานแม่ (/organizer/manage/[eventId]/edit)
                            เพราะข้อมูลอย่างแบบสำรวจ/วันปิดรับสมัคร/กลุ่มเป้าหมายอยู่ระดับงาน แก้ผ่านฟอร์มกิจกรรมเดี่ยวไม่ได้
                            — ส่ง Event id ไม่ใช่ Activity id เข้า route นี้ ส่วนกิจกรรมเดี่ยวยังใช้ route ของตัวเองตามเดิม */}
                        <Link href={editHref} className={HERO_PRIMARY_BUTTON}>
                            <Edit className="size-4" aria-hidden="true" /> แก้ไขกิจกรรม
                        </Link>
                        {!cancelled && event.status !== "completed" && (
                            <button type="button" onClick={handleMarkCompleted} disabled={submitting} className={HERO_OUTLINE_BUTTON}>
                                <CheckSquare className="size-4" aria-hidden="true" /> จบกิจกรรม
                            </button>
                        )}
                        <ShareMenu
                            url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/activities/${event.id}`}
                            title={event.name}
                            onCopied={() => alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")}
                            variant="ghost"
                            className={HERO_OUTLINE_BUTTON}
                            label="แชร์กิจกรรม"
                        />
                    </>
                }
                danger={
                    <button type="button" onClick={() => setIsCancelOpen(true)} disabled={cancelled} className={HERO_DANGER_BUTTON}>
                        <XCircle className="size-4" aria-hidden="true" /> {cancelled ? "ยกเลิกแล้ว" : "ยกเลิกกิจกรรม"}
                    </button>
                }
            />

            <Container>
                <ActivityParticipantManager
                    activity={event}
                    onRefetch={() => fetchEventDetails(id, true)}
                    scopeCode={referenceCode("ACT", event.id)}
                    showActivityImage={false}
                />

                <EventSurveyResults
                    id={event.id}
                    fetchResults={activitiesAPI.getSurveyResults}
                    editHref={editHref}
                    subjectLabel={isEventActivity ? "งาน" : "กิจกรรม"}
                    subjectName={event.name}
                    // แบบสำรวจของกิจกรรมย่อยเป็นของงานแม่ใบเดียวใช้ร่วมกัน ผลที่เห็นจึงรวมผู้ตอบจากทุกกิจกรรมย่อย
                    scopeNote={
                        isEventActivity
                            ? "กิจกรรมนี้เป็นกิจกรรมย่อยของงาน — แบบสำรวจเป็นใบเดียวของทั้งงาน ผลด้านล่างจึงรวมผู้ตอบจากทุกกิจกรรมย่อยในงานเดียวกัน"
                            : undefined
                    }
                />
            </Container>

            {/* Cancellation Dialog */}
            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-danger flex items-center gap-2">
                            ⚠️ ยืนยันการยกเลิกกิจกรรม
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-warning-bg rounded-lg border border-border text-sm text-warning">
                            <strong>หมายเหตุ:</strong> กิจกรรมจะถูกยกเลิกทันที ผู้เข้าร่วมที่ลงทะเบียนไว้แล้วจะได้รับผลกระทบและไม่สามารถย้อนกลับได้
                        </div>
                        <div className="space-y-2">
                            <Label>เหตุผลการยกเลิก <span className="text-danger">*</span></Label>
                            <Input
                                placeholder="เช่น ติดภารกิจด่วน, จำนวนผู้สมัครไม่เพียงพอ..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)}>ยกเลิก</Button>
                        <Button
                            variant="destructive"
                            onClick={handleRequestCancel}
                            disabled={submitting || !cancelReason.trim()}
                        >
                            {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการยกเลิก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
