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
import { ShareMenu } from "@/components/ui/share-menu"
import { Users, ArrowLeft, Edit, CheckSquare, Loader2, XCircle, AlertTriangle } from "lucide-react"
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
            <Container className="space-y-4 py-6">
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
                    description={event.description}
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
                            <ShareMenu
                                url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${event.id}`}
                                title={event.name}
                                onCopied={() => alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")}
                                variant="outline"
                                size="sm"
                                label="แชร์งานนี้"
                            />
                            {activeActivity && !isCancelledByOrganizer(activeActivity.approvalStatus) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-danger-fg hover:border-danger/40 hover:bg-danger-bg hover:text-danger-fg"
                                    onClick={() => setIsCancelOpen(true)}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> ยกเลิกกิจกรรม
                                </Button>
                            )}
                        </>
                    }
                />

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
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger" aria-hidden="true">
                                <AlertTriangle className="size-5" />
                            </span>
                            <div>
                                <DialogTitle className="text-fg">ยกเลิกกิจกรรม &quot;{activeActivity?.name}&quot;?</DialogTitle>
                                <p className="mt-1 text-sm text-fg-muted">
                                    การยกเลิกมีผลทันทีและย้อนกลับไม่ได้ ระบบจะแจ้งเหตุผลทางอีเมลไปยังผู้ที่ลงทะเบียนไว้
                                </p>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="cancel-reason">
                            เหตุผลการยกเลิก <span className="text-danger">*</span>
                        </Label>
                        <Input
                            id="cancel-reason"
                            placeholder="เช่น ติดภารกิจด่วน, จำนวนผู้สมัครไม่เพียงพอ..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={submitting}>
                            ไม่ยกเลิก
                        </Button>
                        <Button variant="destructive" onClick={handleRequestCancel} disabled={submitting || !cancelReason.trim()}>
                            {submitting ? "กำลังยกเลิก..." : "ยืนยันยกเลิกกิจกรรม"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
