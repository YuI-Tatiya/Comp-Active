// frontend/app/organizer/events/[id]/page.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Edit, CheckSquare, Loader2 } from "lucide-react"
import Link from "next/link"
import { eventsAPI, activitiesAPI, isUnlimitedCapacity, isCancelledByOrganizer, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { ActivityParticipantManager } from "@/components/activity/activity-participant-manager"
import { EventSurveyResults } from "@/components/activity/event-survey-results"
import { programLabel } from "@/lib/programs"

type EventActivity = EventSummary["activities"][number]

export default function OrganizerEventDetailsPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

    useEffect(() => {
        if (id) fetchEventDetails(id)
    }, [id])

    // silent=true ใช้ตอน refetch หลังทำ action (ยืนยัน/เช็คอิน/ยกเลิก ฯลฯ) — ไม่ toggle loading เพื่อไม่ให้ทั้งหน้าถูก unmount
    // จนเสีย state ของแท็บที่เลือกอยู่ (สำคัญมากสำหรับหน้าเช็คอิน ที่ organizer จะกดเช็คชื่อรัวๆ ต่อเนื่องหน้างาน)
    const fetchEventDetails = async (eventId: number, silent = false) => {
        try {
            if (!silent) setLoading(true)
            const data = await eventsAPI.getById(eventId)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            if (silent) return
            setLoading(false)
        }
    }

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)

    const handleShare = () => {
        if (!event) return
        const publicUrl = `${window.location.origin}/events/${event.id}`
        navigator.clipboard.writeText(publicUrl)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

    const handleRequestCancel = async () => {
        if (!activeActivity) return
        if (!cancelReason.trim()) {
            alert("กรุณาระบุเหตุผลในการยกเลิก")
            return
        }
        try {
            setSubmitting(true)
            await activitiesAPI.requestCancel(activeActivity.id, cancelReason)
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
        if (!activeActivity) return
        if (!confirm(`ยืนยันจบกิจกรรม "${activeActivity.name}"? ระบบจะปิดรับสมัครและปลดล็อกแบบสำรวจให้ผู้เข้าร่วม`)) return
        try {
            setSubmitting(true)
            await activitiesAPI.markCompleted(activeActivity.id)
            alert("จบกิจกรรมเรียบร้อยแล้ว")
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "จบกิจกรรมไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูลงาน...</p>
                </Container>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบข้อมูลงาน"}</p>
                    <Button variant="outline" asChild>
                        <Link href="/organizer/manage">กลับไปหน้าจัดการกิจกรรม</Link>
                    </Button>
                </Container>
            </div>
        )
    }

    return (
        <div className="bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6 flex justify-between items-center gap-4">
                    <Link href="/organizer/manage" className="inline-flex items-center text-sm text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับสู่หน้าจัดการ
                    </Link>
                    <div className="flex gap-2">
                        <Link href={`/organizer/manage/${event.id}/edit`}>
                            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> แก้ไขงาน</Button>
                        </Link>
                        {activeActivity && !isCancelledByOrganizer(activeActivity.approvalStatus) && activeActivity.status !== "completed" && (
                            <Button variant="outline" size="sm" onClick={handleMarkCompleted} disabled={submitting}>
                                <CheckSquare className="w-4 h-4 mr-2" /> จบกิจกรรม
                            </Button>
                        )}
                        {activeActivity && !isCancelledByOrganizer(activeActivity.approvalStatus) && (
                            <Button variant="destructive" size="sm" onClick={() => setIsCancelOpen(true)}>
                                ยกเลิกกิจกรรมนี้
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <div className="aspect-video max-h-[280px] w-full bg-surface-2 rounded-2xl overflow-hidden relative border border-border shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveEventImageUrl(event, activeActivity)} alt={event.name} className="size-full object-cover" />
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <Badge variant={event.isPublic ? "success" : "neutral"}>{event.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}</Badge>
                            {event.activities.length > 1 && <Badge variant="default">{event.activities.length} กิจกรรมย่อย</Badge>}
                        </div>
                    </div>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-fg">{event.name}</h1>
                    <p className="mt-2 text-fg-muted whitespace-pre-line">{event.description}</p>

                    {/* กลุ่มเป้าหมายที่ตั้งไว้ตอนสร้าง — เดิมดูย้อนไม่ได้เลย ต้องเปิด wizard แก้ไขถึงจะเห็น */}
                    {event.visibility === "restricted" && (
                        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                                <Users className="size-4 text-brand-600" aria-hidden="true" /> เห็นเฉพาะกลุ่มที่กำหนด
                            </div>
                            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                                <div>
                                    <dt className="text-xs text-fg-muted">สาขา</dt>
                                    <dd className="text-fg">
                                        {event.visibilityProgram?.length
                                            ? event.visibilityProgram.map((p) => programLabel(p.programCode)).join(", ")
                                            : "ทุกสาขา"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-fg-muted">ชั้นปี</dt>
                                    <dd className="text-fg">
                                        {event.visibilityYears?.length
                                            ? event.visibilityYears.map((y) => `ปี ${y.year}`).join(", ")
                                            : "ทุกชั้นปี"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-fg-muted">ตัวกรองรหัสนักศึกษา</dt>
                                    <dd className="whitespace-pre-line break-words font-mono text-xs text-fg">
                                        {event.visibilityStudentIdFilter || "ไม่กำหนด"}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>

                <Tabs value={activeActivityId ? String(activeActivityId) : undefined} onValueChange={(v) => setActiveActivityId(Number(v))}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface-2 p-1 mb-6">
                        {event.activities.map((a) => (
                            <TabsTrigger key={a.id} value={String(a.id)}>{a.name}</TabsTrigger>
                        ))}
                    </TabsList>

                    {event.activities.map((a) => {
                        const unlimited = isUnlimitedCapacity(a.capacity)
                        const capacity = a.capacity || 0
                        const registered = a.registrations?.length || 0
                        const fillPercent = !unlimited && capacity > 0 ? Math.round((registered / capacity) * 100) : 0
                        const seatsLeft = Math.max(capacity - registered, 0)
                        return (
                        <TabsContent key={a.id} value={String(a.id)}>
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <ActivityParticipantManager
                                        activity={a}
                                        registrationCloseAt={event.registrationCloseAt}
                                        eventName={event.name}
                                        onRefetch={() => fetchEventDetails(id, true)}
                                    />
                                </div>

                                <div className="space-y-6">
                                    <Card className="border-border shadow-xs overflow-hidden">
                                        <div className="p-6 space-y-6">
                                            <h3 className="font-semibold text-lg text-fg">ข้อมูลกิจกรรมย่อย</h3>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Calendar className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">วันที่</div><div className="font-medium text-fg">{formatEventDate(a.date)}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Clock className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">เวลา</div><div className="font-medium text-fg">{a.startTime} - {a.endTime}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><MapPin className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">สถานที่</div><div className="font-medium text-fg">{a.location}</div></div>
                                                </div>
                                                <div className="pt-4 border-t border-border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-fg"><Users className="w-4 h-4" aria-hidden="true" /> ผู้เข้าร่วม</div>
                                                        <span className="text-sm text-fg-muted tabular-nums">{unlimited ? `${registered} คน (ไม่จำกัด)` : `${registered}/${capacity} คน`}</span>
                                                    </div>
                                                    {!unlimited && (
                                                        <>
                                                            <Progress value={fillPercent} className="h-2" />
                                                            <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {seatsLeft} ที่นั่ง</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3 pt-2">
                                                <Button variant="outline" className="w-full" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" /> แชร์งานนี้</Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                        )
                    })}
                </Tabs>

                {/* แบบสำรวจเป็นข้อมูลระดับงาน ไม่ผูกกับกิจกรรมย่อยตัวใดตัวหนึ่ง จึงอยู่นอกแท็บ */}
                <EventSurveyResults
                    id={event.id}
                    fetchResults={eventsAPI.getSurveyResults}
                    editHref={`/organizer/manage/${event.id}/edit`}
                    subjectName={event.name}
                />
            </Container>

            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-danger flex items-center gap-2">⚠️ ยืนยันการยกเลิกกิจกรรม &quot;{activeActivity?.name}&quot;</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-warning-bg rounded-lg border border-border text-sm text-warning">
                            <strong>หมายเหตุ:</strong> กิจกรรมย่อยนี้จะถูกยกเลิกทันที ผู้เข้าร่วมที่ลงทะเบียนไว้แล้วจะได้รับผลกระทบและไม่สามารถย้อนกลับได้
                        </div>
                        <div className="space-y-2">
                            <Label>เหตุผลการยกเลิก <span className="text-danger">*</span></Label>
                            <Input placeholder="เช่น ติดภารกิจด่วน, จำนวนผู้สมัครไม่เพียงพอ..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)}>ยกเลิก</Button>
                        <Button variant="destructive" onClick={handleRequestCancel} disabled={submitting || !cancelReason.trim()}>
                            {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการยกเลิก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
