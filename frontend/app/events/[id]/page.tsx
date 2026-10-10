"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Toast } from "@/components/ui/toast"
import { Container } from "@/components/layout/container"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { formatEventDate } from "@/components/ui/event-card"
import { cn } from "@/lib/utils"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, AlertTriangle, Loader2, CalendarClock, Layers } from "lucide-react"
import Link from "next/link"
import { eventsAPI, isUnlimitedCapacity, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

type EventActivity = EventSummary["activities"][number]

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

const QUICK_FACT_TONES = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
} as const

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
            <div
                className="mt-0.5 truncate text-sm font-semibold text-fg"
                title={typeof value === "string" ? value : undefined}
            >
                {value}
            </div>
        </div>
    )
}

/** หน้ารายละเอียดงานสำหรับผู้เยี่ยมชมทั่วไป (ไม่ต้องล็อกอิน) — คู่กับ /student/events/[id] */
export default function PublicEventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/events/${event?.id}`)
        showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")
    }

    const handleRegisterClick = () => {
        alert("กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียน")
        router.push("/auth")
    }

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
            <div className="min-h-screen bg-surface flex flex-col">
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center justify-center">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดงาน...</p>
                </div>
                <SiteFooter />
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center justify-center p-4">
                    <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-border">
                        <AlertTriangle className="mx-auto mb-4 size-12 text-danger" aria-hidden="true" />
                        <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบงาน</h2>
                        <p className="text-fg-muted mb-6">{error || "งานนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                        <Button onClick={() => router.push("/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                    </div>
                </div>
                <SiteFooter />
            </div>
        )
    }

    const capacity = activeActivity?.capacity ?? null
    const registeredCount = activeActivity?.registeredCount ?? 0
    const unlimited = isUnlimitedCapacity(capacity)
    const seatsRemaining = !unlimited && capacity ? Math.max(capacity - registeredCount, 0) : null
    const percent = !unlimited && capacity ? Math.min((registeredCount / capacity) * 100, 100) : 0
    const urgency: "success" | "warning" | "danger" = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "success"
    const urgencyBar = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[urgency]
    const urgencyText = { success: "text-fg-subtle", warning: "text-warning", danger: "text-danger" }[urgency]

    return (
        <div className="min-h-screen bg-surface font-sans flex flex-col">
            <SiteHeader />

            <Container className="py-8 flex-1 pb-12">
                <div className="mb-6">
                    <Link href="/events" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
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
                            {/* ชื่อกิจกรรมย่อยที่กำลังดูอยู่ — ต้องแสดงเสมอ ไม่ผูกกับจำนวนกิจกรรมย่อย
                                เดิมชื่อโผล่แค่ในปุ่ม pill ด้านบนซึ่งซ่อนเมื่อมีกิจกรรมย่อยตัวเดียว
                                ทำให้งานที่มีกิจกรรมย่อยตัวเดียวไม่แสดงชื่อกิจกรรมย่อยที่ไหนเลย */}
                            <div>
                                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                                    <Layers className="size-3.5" aria-hidden="true" />
                                    กิจกรรมย่อย
                                </span>
                                <h2 className="text-xl font-bold text-fg sm:text-2xl">{activeActivity.name}</h2>
                            </div>

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
                            <ActivityRegistrationPanel
                                activity={activeActivity}
                                registrationOpenAt={event.registrationOpenAt}
                                registrationCloseAt={event.registrationCloseAt}
                            />
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

                                        {event.registrationOpenAt && (
                                            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-fg-muted">
                                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                                เปิดรับสมัคร {formatDateTime(event.registrationOpenAt)}
                                            </div>
                                        )}

                                        {event.registrationCloseAt && (
                                            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-fg-muted">
                                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                                ปิดรับสมัคร {formatDateTime(event.registrationCloseAt)}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {activeActivity.status !== "open" && (
                                                <div className="flex justify-center">
                                                    <Badge variant="neutral">ปิดรับสมัคร</Badge>
                                                </div>
                                            )}
                                            <Button
                                                className="h-11 w-full rounded-xl text-base font-semibold"
                                                onClick={handleRegisterClick}
                                                disabled={activeActivity.status !== "open"}
                                            >
                                                ลงทะเบียนเข้าร่วม
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-xl"
                                                onClick={handleShare}
                                            >
                                                <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> แชร์งานนี้
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </Container>

            <Toast open={toast.open} message={toast.message} description={toast.description} />

            <SiteFooter />
        </div>
    )
}
