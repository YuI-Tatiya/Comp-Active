// frontend/app/organizer/events/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Users, Share2, ArrowLeft, Edit, CheckSquare, Loader2 } from "lucide-react"
import Link from "next/link"
import { eventsAPI, activitiesAPI, isCancelledByOrganizer, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { ActivityParticipantManager } from "@/components/activity/activity-participant-manager"
import { ActivityHeroCard } from "@/components/activity/activity-hero-card"
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
            <Container className="space-y-6 py-8">
                <Link href="/organizer/manage" className="inline-flex items-center text-sm text-fg-muted transition-colors hover:text-fg">
                    <ArrowLeft className="w-4 h-4 mr-2" /> กลับสู่หน้าจัดการ
                </Link>

                {/* รูป/วันเวลา/สถานที่อิงกิจกรรมย่อยที่เลือกอยู่ในแท็บด้านล่าง (activeActivity) — ชื่อ/คำอธิบาย/รูปเริ่มต้นอิงระดับงาน
                    สลับแท็บแล้วส่วนนี้จะอัปเดตตาม เพราะงานหนึ่งมีได้หลายกิจกรรมย่อย วันเวลาจึงไม่ใช่ค่าเดียวของทั้งงาน */}
                <ActivityHeroCard
                    imageUrl={resolveEventImageUrl(event, activeActivity)}
                    imageAlt={event.name}
                    badges={
                        <>
                            <Badge variant={event.isPublic ? "success" : "neutral"}>{event.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}</Badge>
                            {event.activities.length > 1 && <Badge variant="default">{event.activities.length} กิจกรรมย่อย</Badge>}
                        </>
                    }
                    title={event.name}
                    byline="จัดโดยคุณ"
                    date={activeActivity ? formatEventDate(activeActivity.date) : "-"}
                    startTime={activeActivity?.startTime ?? "-"}
                    endTime={activeActivity?.endTime ?? "-"}
                    location={activeActivity?.location ?? "-"}
                    actions={
                        <>
                            <Link href={`/organizer/manage/${event.id}/edit`}>
                                <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> แก้ไขงาน</Button>
                            </Link>
                            {activeActivity && !isCancelledByOrganizer(activeActivity.approvalStatus) && activeActivity.status !== "completed" && (
                                <Button variant="outline" size="sm" onClick={handleMarkCompleted} disabled={submitting}>
                                    <CheckSquare className="w-4 h-4 mr-2" /> จบกิจกรรม
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" /> แชร์งานนี้</Button>
                            {activeActivity && !isCancelledByOrganizer(activeActivity.approvalStatus) && (
                                <Button variant="destructive" size="sm" onClick={() => setIsCancelOpen(true)}>
                                    ยกเลิกกิจกรรมนี้
                                </Button>
                            )}
                        </>
                    }
                />

                <p className="text-fg-muted whitespace-pre-line">{event.description}</p>

                {/* กลุ่มเป้าหมายที่ตั้งไว้ตอนสร้าง — เดิมดูย้อนไม่ได้เลย ต้องเปิด wizard แก้ไขถึงจะเห็น */}
                {event.visibility === "restricted" && (
                    <div className="rounded-xl border border-border bg-surface p-4">
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

                <Tabs value={activeActivityId ? String(activeActivityId) : undefined} onValueChange={(v) => setActiveActivityId(Number(v))}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface-2 p-1 mb-6">
                        {event.activities.map((a) => (
                            <TabsTrigger key={a.id} value={String(a.id)}>{a.name}</TabsTrigger>
                        ))}
                    </TabsList>

                    {event.activities.map((a) => (
                        <TabsContent key={a.id} value={String(a.id)}>
                            <ActivityParticipantManager
                                activity={a}
                                registrationOpenAt={event.registrationOpenAt}
                                registrationCloseAt={event.registrationCloseAt}
                                eventName={event.name}
                                onRefetch={() => fetchEventDetails(id, true)}
                            />
                        </TabsContent>
                    ))}
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
