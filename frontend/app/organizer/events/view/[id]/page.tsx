"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
<<<<<<< HEAD
import type { LucideIcon } from "lucide-react"
=======
import Link from "next/link"
import { AlertTriangle, EyeOff, Loader2 } from "lucide-react"
>>>>>>> organize
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Container } from "@/components/layout/container"
<<<<<<< HEAD
import { formatEventDate } from "@/components/ui/event-card"
import { cn } from "@/lib/utils"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, AlertTriangle, Loader2, CalendarClock } from "lucide-react"
import Link from "next/link"
import { eventsAPI, isUnlimitedCapacity, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

type EventActivity = EventSummary["activities"][number]

const QUICK_FACT_TONES = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
} as const

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

/** การ์ดข้อมูลย่อยขนาดเท่ากัน 4 ช่อง — วันที่/เวลา/สถานที่/ที่นั่งเหลือ */
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
            <div className="mt-0.5 truncate text-sm font-semibold text-fg" title={typeof value === "string" ? value : undefined}>
                {value}
            </div>
        </div>
    )
}

=======
import { referenceCode } from "@/components/denim/denim-ui"
import { ActivityRegistrationView } from "@/components/activity/activity-registration-view"
import { eventsAPI, EventSummary } from "@/lib/api"
import { eventImagePathFor } from "@/lib/event-image"

type EventActivity = EventSummary["activities"][number]

>>>>>>> organize
/**
 * มุมมอง "ดูอย่างเดียว" ของงาน (Event) สำหรับผู้จัด — ใช้ ActivityRegistrationView ชุดเดียวกับหน้ารายละเอียดงาน
 * ฝั่งนักศึกษา (/student/events/:id) ในโหมด preview: แถบท้ายการ์ดเป็นจำนวนผู้ลงทะเบียนแทนปุ่มสมัคร
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

<<<<<<< HEAD
    const capacity = activeActivity?.capacity ?? null
    const registeredCount = activeActivity?.registeredCount ?? 0
    const unlimited = isUnlimitedCapacity(capacity)
    const seatsRemaining = !unlimited && capacity ? Math.max(capacity - registeredCount, 0) : null
    const percent = !unlimited && capacity ? Math.min((registeredCount / capacity) * 100, 100) : 0
    const urgency: "success" | "warning" | "danger" = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "success"
    const urgencyBar = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[urgency]
    const urgencyText = { success: "text-fg-subtle", warning: "text-warning", danger: "text-danger" }[urgency]

    return (
        <div className="bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6">
                    <Link href="/organizer" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Link>
                </div>

                {/* Hero — รูปปก 16:9 แท้ ไม่มี max-h มาบังคับทับสัดส่วนที่ครอปไว้ตอนอัปโหลด */}
                <div className="relative mb-3 overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-sm">
                    <div className="aspect-video w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={resolveEventImageUrl(event, activeActivity)}
                            alt={event.name}
                            className="size-full object-cover"
                        />
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                    />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        {event.activities.length > 1 && (
                            <Badge className="bg-brand-600 text-white">{event.activities.length} กิจกรรมย่อย</Badge>
                        )}
                    </div>
                    {activeActivity && (
                        <div className="absolute right-4 top-4">
                            <Badge className={activeActivity.status === "open" ? "bg-success text-white" : "bg-fg-subtle text-white"}>
                                {activeActivity.status === "open" ? "กำลังเปิดรับสมัคร" : "ปิดรับสมัคร"}
                            </Badge>
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                        <h1 className="text-2xl font-black text-white drop-shadow-sm sm:text-3xl md:text-4xl">{event.name}</h1>
                        {activeActivity?.organizer?.name && (
                            <p className="mt-1 text-sm text-white/85">จัดโดย {activeActivity.organizer.name}</p>
                        )}
                    </div>
                </div>

                {event.description && (
                    <p className="mb-8 max-w-3xl whitespace-pre-line leading-relaxed text-fg-muted">{event.description}</p>
                )}

                {/* ตัวเลือกกิจกรรมย่อย — pill ระดับเดียว ไม่ซ้อน tab อีกชั้น */}
                {event.activities.length > 1 && (
                    <div className="mb-8 flex flex-wrap gap-2">
                        {event.activities.map((a) => {
                            const active = a.id === activeActivityId
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setActiveActivityId(a.id)}
                                    className={cn(
                                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                                        active
                                            ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                                            : "border-border bg-bg text-fg-muted hover:border-brand-300 hover:text-fg"
                                    )}
                                >
                                    {a.name}
                                </button>
                            )
                        })}
                    </div>
                )}

                {activeActivity && (
                    <div className="grid gap-8 lg:grid-cols-3">
                        <div className="space-y-8 lg:col-span-2">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <QuickFact icon={Calendar} label="วันที่" value={formatEventDate(activeActivity.date)} />
                                <QuickFact icon={Clock} label="เวลา" value={`${activeActivity.startTime} - ${activeActivity.endTime}`} />
                                <QuickFact icon={MapPin} label="สถานที่" value={activeActivity.location} tone="success" />
                                <QuickFact
                                    icon={Users}
                                    label="ที่นั่งเหลือ"
                                    value={unlimited ? "ไม่จำกัด" : `${seatsRemaining} ที่นั่ง`}
                                    tone={unlimited ? "brand" : urgency}
                                />
                            </div>

                            <ActivityAboutPanel activity={activeActivity} showActivityImage />
                            <ActivityRewardsPanel activity={activeActivity} />
                            <ActivityRegistrationPanel activity={activeActivity} registrationCloseAt={event.registrationCloseAt} />
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

                                        {event.registrationCloseAt && (
                                            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-fg-muted">
                                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                                ปิดรับสมัคร {formatDateTime(event.registrationCloseAt)}
                                            </div>
                                        )}

                                        <Button variant="outline" className="w-full rounded-xl" onClick={handleShare}>
                                            <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> แชร์งานนี้
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </Container>
        </div>
=======
    return (
        <ActivityRegistrationView
            mode="preview"
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
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${event.id}`}
            onShareCopied={() => alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")}
            backHref="/organizer"
            showActivityImage
            notice={
                // backend ส่งงานที่ไม่เผยแพร่มาให้เฉพาะเจ้าของ (และแอดมิน) — บอกให้ชัดว่านี่คือการดูตัวอย่าง ไม่ใช่สิ่งที่นักศึกษาเห็น
                event.isPublic === false ? (
                    <div
                        role="note"
                        className="flex items-start gap-3 rounded-xl border border-amber/40 bg-denim-deep/70 px-4 py-3 text-sm leading-relaxed text-denim-on backdrop-blur-sm"
                    >
                        <EyeOff className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
                        <p>
                            <strong className="font-semibold text-white">งานนี้ยังไม่เผยแพร่</strong> — นักศึกษาและบุคคลทั่วไปจะไม่เห็นหน้านี้
                            และลงทะเบียนไม่ได้ (ลิงก์แชร์จะยังเปิดไม่ได้) คุณเห็นได้เพราะเป็นเจ้าของงาน · เปิดเผยแพร่ได้ที่{" "}
                            <Link href="/organizer/manage" className="font-semibold text-amber underline underline-offset-2">
                                หน้าจัดการกิจกรรม
                            </Link>
                        </p>
                    </div>
                ) : undefined
            }
        />
>>>>>>> organize
    )
}
