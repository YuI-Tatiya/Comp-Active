"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Edit, CheckSquare, Loader2 } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, isUnlimitedCapacity, isCancelledByOrganizer, Activity, API_BASE_URL } from "@/lib/api"
import { ActivityParticipantManager, type RegistrationRow } from "@/components/activity/activity-participant-manager"
import { EventSurveyResults } from "@/components/activity/event-survey-results"
import { categoryLabel } from "@/lib/categories"

export default function OrganizerActivityDetailsPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [event, setEvent] = useState<Activity<RegistrationRow> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [submitting, setSubmitting] = useState(false)

    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

    const handleShare = () => {
        if (!event) return
        const publicUrl = `${window.location.origin}/events/activities/${event.id}`
        navigator.clipboard.writeText(publicUrl)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

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

    const unlimited = isUnlimitedCapacity(event.capacity)
    // กัน capacity = 0 ไม่ให้กลายเป็น NaN% หรือ Infinity%
    const capacity = event.capacity || 0
    const registered = event.registrations?.length || 0
    const fillPercent = !unlimited && capacity > 0 ? Math.round((registered / capacity) * 100) : 0
    const seatsLeft = Math.max(capacity - registered, 0)

    // กิจกรรมย่อยของงาน (มี eventId) แก้ผ่าน wizard ของงานแม่ — กิจกรรมเดี่ยวใช้ฟอร์มของตัวเอง
    const isEventActivity = event.eventId != null
    const editHref = isEventActivity
        ? `/organizer/manage/${event.eventId}/edit`
        : `/organizer/activities/${event.id}/edit`

    return (
        <div className="bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6 flex justify-between items-center gap-4">
                    <Link href="/organizer/manage" className="inline-flex items-center text-sm text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับสู่หน้าจัดการ
                    </Link>
                    <div className="flex gap-2">
                        {/* กิจกรรมย่อยของงานต้องแก้ผ่าน wizard ของงานแม่ (/organizer/manage/[eventId]/edit)
                            เพราะข้อมูลอย่างแบบสำรวจ/วันปิดรับสมัคร/กลุ่มเป้าหมายอยู่ระดับงาน แก้ผ่านฟอร์มกิจกรรมเดี่ยวไม่ได้
                            — ส่ง Event id ไม่ใช่ Activity id เข้า route นี้ ส่วนกิจกรรมเดี่ยวยังใช้ route ของตัวเองตามเดิม */}
                        <Link href={editHref}>
                            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> แก้ไขกิจกรรม</Button>
                        </Link>
                        {!isCancelledByOrganizer(event.approvalStatus) && event.status !== 'completed' && (
                            <Button variant="outline" size="sm" onClick={handleMarkCompleted} disabled={submitting}>
                                <CheckSquare className="w-4 h-4 mr-2" /> จบกิจกรรม
                            </Button>
                        )}
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsCancelOpen(true)}
                            disabled={isCancelledByOrganizer(event.approvalStatus)}
                        >
                            {isCancelledByOrganizer(event.approvalStatus) ? 'ยกเลิกแล้ว' : 'ยกเลิกกิจกรรม'}
                        </Button>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="aspect-video max-h-[280px] w-full bg-surface-2 rounded-2xl overflow-hidden relative border border-border shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={event.imageUrl ? `${API_BASE_URL}${event.imageUrl}` : "/activity-placeholder.svg"}
                            alt={event.name}
                            className="size-full object-cover"
                        />
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            {event.category && <Badge variant="default">{categoryLabel(event.category)}</Badge>}
                            <Badge variant={event.status === 'open' ? "success" : "neutral"}>
                                {event.status === 'open' ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                            </Badge>
                            {event.approvalStatus === 'pending_approval' && (
                                <Badge variant="warning">รออนุมัติ</Badge>
                            )}
                            {isCancelledByOrganizer(event.approvalStatus) && (
                                <Badge variant="danger">กิจกรรมถูกยกเลิก</Badge>
                            )}
                        </div>
                    </div>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-fg">{event.name}</h1>
                    <p className="mt-2 text-fg-muted whitespace-pre-line">{event.description || "ไม่มีรายละเอียด"}</p>
                    <div className="mt-2 flex items-center text-fg-muted gap-2">
                        <Users className="w-4 h-4 text-fg-subtle" aria-hidden="true" />
                        <span className="text-sm">จัดโดยคุณ</span>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <ActivityParticipantManager
                            activity={event}
                            onRefetch={() => fetchEventDetails(id, true)}
                        />
                    </div>

                    {/* Right Content */}
                    <div className="space-y-6">
                        <Card className="border-border shadow-xs overflow-hidden">
                            <div className="p-6 space-y-6">
                                <h3 className="font-semibold text-lg text-fg">ข้อมูลกิจกรรม</h3>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                            <Calendar className="w-5 h-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">วันที่</div>
                                            <div className="font-medium text-fg">{formatEventDate(event.date)}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                            <Clock className="w-5 h-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">เวลา</div>
                                            <div className="font-medium text-fg">{event.startTime} - {event.endTime}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                            <MapPin className="w-5 h-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">สถานที่</div>
                                            <div className="font-medium text-fg">{event.location}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-fg">
                                                <Users className="w-4 h-4" aria-hidden="true" /> ผู้เข้าร่วม
                                            </div>
                                            <span className="text-sm text-fg-muted tabular-nums">
                                                {unlimited ? `${registered} คน (ไม่จำกัด)` : `${registered}/${capacity} คน`}
                                            </span>
                                        </div>
                                        {!unlimited && (
                                            <>
                                                <Progress value={fillPercent} className="h-2" />
                                                <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {seatsLeft} ที่นั่ง</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Organizer View Actions */}
                                <div className="space-y-3 pt-2">
                                    <Button variant="outline" className="w-full" onClick={handleShare}>
                                        <Share2 className="w-4 h-4 mr-2" /> แชร์กิจกรรม
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

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
