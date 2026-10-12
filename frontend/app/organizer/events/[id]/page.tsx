// frontend/app/organizer/events/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Calendar, CheckSquare, Edit, Loader2, MapPin, Users, XCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { ShareMenu } from "@/components/ui/share-menu"
import { eventsAPI, activitiesAPI, isCancelledByOrganizer, EventSummary } from "@/lib/api"
import { eventImagePathFor } from "@/lib/event-image"
import { programLabel } from "@/lib/programs"
import { ActivityParticipantManager } from "@/components/activity/activity-participant-manager"
import { EventSurveyResults } from "@/components/activity/event-survey-results"
import { DASHBOARD_CARD } from "@/components/organizer/activity-dashboard-sections"
import {
    HERO_DANGER_BUTTON,
    HERO_OUTLINE_BUTTON,
    HERO_PRIMARY_BUTTON,
    HeroCoverPill,
    OrganizerActivityHero,
} from "@/components/organizer/organizer-activity-hero"
import { cn } from "@/lib/utils"

type EventActivity = EventSummary["activities"][number]

/** รหัสกิจกรรมย่อยตามลำดับในงาน — SUB_01, SUB_02 ... */
const subCode = (index: number) => `SUB_${String(index + 1).padStart(2, "0")}`

/** ปุ่มสลับกิจกรรมย่อย (แถวบนสุดของการ์ดสถิติ) — จุดแดง = ถูกยกเลิก, จุดเทา = จบแล้ว */
function SubActivitySwitcher({
    activities,
    activeId,
    onChange,
}: {
    activities: EventActivity[]
    activeId: number | null
    onChange: (id: number) => void
}) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 font-code text-[11px] text-denim-accent" aria-hidden="true">
                {"// กิจกรรมย่อย"}
            </span>
            <div role="group" aria-label="เลือกกิจกรรมย่อย" className="flex gap-2">
                {activities.map((a, i) => {
                    const active = a.id === activeId
                    const cancelled = isCancelledByOrganizer(a.approvalStatus)
                    const completed = a.status === "completed"
                    return (
                        <button
                            key={a.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChange(a.id)}
                            // relative: ป้าย sr-only (position:absolute) ต้องยึดกับปุ่มนี้ — ไม่งั้นมันยึดการ์ดสถิตินอกแถวเลื่อน
                            // หลุดจากการตัดขอบของ overflow-x-auto แล้วถ่างหน้าบนมือถือให้เลื่อนแนวนอนได้
                            className={cn(
                                "relative inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border-[1.5px] px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim",
                                active
                                    ? "border-denim-deep bg-denim-deep text-white"
                                    : "border-denim-line bg-white text-denim-deep hover:border-denim-dash hover:bg-denim-paper"
                            )}
                        >
                            <span className={cn("font-code text-[11px]", active ? "text-amber" : "text-denim-muted")}>{subCode(i)}</span>
                            <span className="max-w-[16rem] truncate">{a.name}</span>
                            {(cancelled || completed) && (
                                <span
                                    className={cn("size-2 rounded-full", cancelled ? "bg-red-500" : "bg-slate-400")}
                                    title={cancelled ? "ถูกยกเลิก" : "จบแล้ว"}
                                >
                                    <span className="sr-only">{cancelled ? " (ถูกยกเลิก)" : " (จบแล้ว)"}</span>
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

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

    const activeIndex = event?.activities.findIndex((a) => a.id === activeActivityId) ?? -1
    const activeActivity: EventActivity | undefined = event?.activities[activeIndex]

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
                    <Loader2 className="mb-4 size-12 animate-spin text-denim" aria-hidden="true" />
                    <p className="text-lg font-medium text-denim-muted">กำลังโหลดข้อมูลงาน...</p>
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

    const activeCancelled = !!activeActivity && isCancelledByOrganizer(activeActivity.approvalStatus)
    const categories = Array.from(new Set(event.activities.flatMap((a) => a.categories)))

    return (
        <div className="bg-surface pb-16">
            {/* วันเวลา/สถานที่อิงกิจกรรมย่อยที่เลือกอยู่ (activeActivity) — ชื่อ/คำอธิบาย/รูปอิงระดับงาน
                สลับกิจกรรมย่อยแล้วส่วนนี้อัปเดตตาม เพราะงานหนึ่งมีได้หลายกิจกรรมย่อย วันเวลาจึงไม่ใช่ค่าเดียวของทั้งงาน
                ปุ่มจบ/ยกเลิกกิจกรรมทำกับกิจกรรมย่อยที่เลือกอยู่เช่นกัน */}
            <OrganizerActivityHero
                backHref="/organizer/manage"
                prompt={`~/organizer/events/${event.id} $ manage`}
                imagePath={eventImagePathFor(event, activeActivity)}
                imageAlt={event.name}
                categories={categories}
                pills={
                    <>
                        <HeroCoverPill dot={event.isPublic ? "bg-emerald-500" : "bg-slate-400"}>
                            {event.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}
                        </HeroCoverPill>
                        {event.activities.length > 1 && <HeroCoverPill>{event.activities.length} กิจกรรมย่อย</HeroCoverPill>}
                    </>
                }
                byline="จัดโดยคุณ"
                title={event.name}
                description={event.description}
                meta={
                    activeActivity
                        ? [
                              { icon: Calendar, label: `${formatEventDate(activeActivity.date)} · ${activeActivity.startTime}–${activeActivity.endTime} น.` },
                              { icon: MapPin, label: activeActivity.location || "-" },
                          ]
                        : []
                }
                actions={
                    <>
                        <Link href={`/organizer/manage/${event.id}/edit`} className={HERO_PRIMARY_BUTTON}>
                            <Edit className="size-4" aria-hidden="true" /> แก้ไขงาน
                        </Link>
                        {activeActivity && !activeCancelled && activeActivity.status !== "completed" && (
                            <button type="button" onClick={handleMarkCompleted} disabled={submitting} className={HERO_OUTLINE_BUTTON}>
                                <CheckSquare className="size-4" aria-hidden="true" /> จบกิจกรรม
                            </button>
                        )}
                        <ShareMenu
                            url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${event.id}`}
                            title={event.name}
                            onCopied={() => alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")}
                            variant="ghost"
                            className={HERO_OUTLINE_BUTTON}
                            label="แชร์งานนี้"
                        />
                    </>
                }
                danger={
                    activeActivity &&
                    !activeCancelled && (
                        <button type="button" onClick={() => setIsCancelOpen(true)} className={HERO_DANGER_BUTTON}>
                            <XCircle className="size-4" aria-hidden="true" /> ยกเลิกกิจกรรม
                        </button>
                    )
                }
            />

            <Container>
                {activeActivity && (
                    <ActivityParticipantManager
                        // key: สลับกิจกรรมย่อย = ตัวจัดการชุดใหม่ (แท็บ/ตัวกรอง/ผล BARS ไม่ค้างจากกิจกรรมก่อน)
                        key={activeActivity.id}
                        activity={activeActivity}
                        registrationOpenAt={event.registrationOpenAt}
                        registrationCloseAt={event.registrationCloseAt}
                        eventName={event.name}
                        onRefetch={() => fetchEventDetails(id, true)}
                        scopeCode={subCode(activeIndex)}
                        header={<SubActivitySwitcher activities={event.activities} activeId={activeActivityId} onChange={setActiveActivityId} />}
                        detailsExtra={
                            // กลุ่มเป้าหมายที่ตั้งไว้ตอนสร้าง — เดิมดูย้อนไม่ได้เลย ต้องเปิด wizard แก้ไขถึงจะเห็น
                            event.visibility === "restricted" && (
                                <div className={DASHBOARD_CARD}>
                                    <p className="font-code text-xs text-denim-accent" aria-hidden="true">
                                        {"// visibility"}
                                    </p>
                                    <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-denim-deep">
                                        <Users className="size-5 text-denim" aria-hidden="true" /> เห็นเฉพาะกลุ่มที่กำหนด
                                    </h2>
                                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                                        <div>
                                            <dt className="text-xs font-semibold text-denim-muted">สาขา</dt>
                                            <dd className="mt-0.5 text-denim-ink">
                                                {event.visibilityProgram?.length
                                                    ? event.visibilityProgram.map((p) => programLabel(p.programCode)).join(", ")
                                                    : "ทุกสาขา"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-semibold text-denim-muted">ชั้นปี</dt>
                                            <dd className="mt-0.5 text-denim-ink">
                                                {event.visibilityYears?.length ? event.visibilityYears.map((y) => `ปี ${y.year}`).join(", ") : "ทุกชั้นปี"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-semibold text-denim-muted">ตัวกรองรหัสนักศึกษา</dt>
                                            <dd className="mt-0.5 whitespace-pre-line break-words font-code text-xs text-denim-ink">
                                                {event.visibilityStudentIdFilter || "ไม่กำหนด"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            )
                        }
                    />
                )}

                {/* แบบสำรวจเป็นข้อมูลระดับงาน ไม่ผูกกับกิจกรรมย่อยตัวใดตัวหนึ่ง จึงอยู่นอกตัวจัดการกิจกรรมย่อย */}
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
