"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ArrowLeft, AlertTriangle, Loader2, CalendarClock } from "lucide-react"
import Link from "next/link"
import { eventsAPI, isUnlimitedCapacity, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { formatActivitySchedule } from "@/lib/activity-view"
import { ActivityPreviewHero } from "@/components/activity/activity-preview-hero"
import {
    ActivityAboutPanel,
    ActivityAgendaPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
    PANEL_CLASS,
    type AgendaSession,
} from "@/components/activity/activity-info-panels"

type EventActivity = EventSummary["activities"][number]

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * มุมมอง "ดูอย่างเดียว" ของงาน (Event) สำหรับผู้จัด — หน้าตาเหมือนหน้ารายละเอียดงานฝั่งนักศึกษา
 * (/student/events/:id) ทุกส่วน ต่างกันแค่ไม่มีปุ่ม/ฟอร์มลงทะเบียนเข้าร่วม เพราะผู้จัดไม่ใช่ผู้ลงทะเบียน
 * ใช้ตอนกดดูงานที่ไม่ใช่ของตัวเอง (เช่นจากฟีดกิจกรรมทั้งหมดในหน้าแรก) — อยู่ใน layout ของผู้จัดเอง
 * (AppHeader/RoleGuard ยังคุมอยู่) ต่างจาก /organizer/events/:id ที่เป็นหน้าจัดการเต็มรูปแบบและ
 * ล็อกไว้เฉพาะเจ้าของงาน
 */
export default function OrganizerEventViewPage() {
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(Number(params.id))
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

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)

    const handleShare = () => {
        if (!event) return
        navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

    if (loading) {
        return (
            <div className="bg-surface flex items-center justify-center">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดงาน...</p>
                </Container>
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
                    <Button onClick={() => router.push("/organizer")} className="w-full">กลับไปหน้าแรก</Button>
                </div>
            </div>
        )
    }

    const capacity = activeActivity?.capacity ?? null
    const registeredCount = activeActivity?.registeredCount ?? 0
    const unlimited = isUnlimitedCapacity(capacity)
    // กำหนดการกิจกรรมย่อย — เฉพาะงานที่มีหลายกิจกรรมย่อย ดู ActivityAgendaPanel
    const agendaSessions: AgendaSession[] = event.activities.map((a) => ({
        id: a.id,
        name: a.name,
        schedule: formatActivitySchedule(a),
    }))

    return (
        <div className="bg-surface pb-12">
            <Container className="space-y-4 py-6">
                <div>
                    <Link href="/organizer" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Link>
                </div>

                {activeActivity && (
                    <ActivityPreviewHero
                        imageUrl={resolveEventImageUrl(event, activeActivity)}
                        title={event.name}
                        description={event.description}
                        categories={activeActivity.categories ?? []}
                        organizerName={activeActivity.organizer?.name}
                        statusLabel={activeActivity.status === "open" ? "กำลังเปิดรับสมัคร" : "ปิดรับสมัคร"}
                        statusOpen={activeActivity.status === "open"}
                        isProject={event.activities.length > 1}
                        sessions={event.activities.map((a) => ({ id: a.id, name: a.name }))}
                        activeId={activeActivityId}
                        onSelectActivity={setActiveActivityId}
                        schedule={formatActivitySchedule(activeActivity)}
                        location={activeActivity.location}
                        registeredCount={registeredCount}
                        capacity={capacity}
                        unlimited={unlimited}
                        onShare={handleShare}
                    />
                )}

                {(event.registrationOpenAt || event.registrationCloseAt) && (
                    <div className="flex flex-wrap gap-3">
                        {event.registrationOpenAt && (
                            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-xs text-fg-muted">
                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                เปิดรับสมัคร {formatDateTime(event.registrationOpenAt)}
                            </div>
                        )}
                        {event.registrationCloseAt && (
                            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-xs text-fg-muted">
                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                ปิดรับสมัคร {formatDateTime(event.registrationCloseAt)}
                            </div>
                        )}
                    </div>
                )}

                {/* 2 คอลัมน์เหมือนหน้าลงทะเบียนนักศึกษา — ซ้ายรวมรายละเอียด+กำหนดการ+การลงทะเบียนเป็นการ์ดเดียว
                    (เดิมแยกเป็นการ์ดละอัน เรียง 1 คอลัมน์ยาวดิ่งลงมา ทำให้ต้องเลื่อนดูมากเกินจำเป็น) */}
                {activeActivity && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
                        <div className={PANEL_CLASS}>
                            <ActivityAboutPanel activity={activeActivity} showActivityImage hideMeta bare />
                            {agendaSessions.length > 1 && (
                                <>
                                    <hr className="border-border" />
                                    <ActivityAgendaPanel sessions={agendaSessions} />
                                </>
                            )}
                            <hr className="border-border" />
                            <ActivityRegistrationPanel
                                activity={activeActivity}
                                registrationOpenAt={event.registrationOpenAt}
                                registrationCloseAt={event.registrationCloseAt}
                                bare
                            />
                        </div>
                        <div className={PANEL_CLASS}>
                            <ActivityRewardsPanel activity={activeActivity} />
                        </div>
                    </div>
                )}
            </Container>
        </div>
    )
}
