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
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, isUnlimitedCapacity, Activity } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { categoryLabel } from "@/lib/categories"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

const QUICK_FACT_TONES = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
} as const

/** การ์ดข้อมูลย่อยขนาดเท่ากัน 4 ช่อง — เหมือนกับหน้า /student/activities/[id] เพื่อให้ประสบการณ์สอดคล้องกัน */
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

/** หน้ารายละเอียดกิจกรรมเดี่ยวสำหรับผู้เยี่ยมชมทั่วไป (ไม่ต้องล็อกอิน) — คู่กับ /student/activities/[id] */
export default function PublicActivityDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(Number(params.id))
        }
    }, [params.id])

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

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(id)
            setEvent(data)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/events/activities/${event?.id}`)
        showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")
    }

    const handleRegisterClick = () => {
        alert("กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียน")
        router.push("/auth")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center justify-center">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดกิจกรรม...</p>
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
                        <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบกิจกรรม</h2>
                        <p className="text-fg-muted mb-6">{error || "กิจกรรมนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                        <Button onClick={() => router.push("/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                    </div>
                </div>
                <SiteFooter />
            </div>
        )
    }

    const capacity = event.capacity
    const registeredCount = event.registeredCount ?? 0
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

                {/* Hero — รูปปก 16:9 เต็มความกว้าง สไตล์เดียวกับ /student/activities/[id] */}
                <div className="relative mb-3 overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-sm">
                    <div className="aspect-video w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={resolveEventImageUrl(event)}
                            alt={event.name}
                            className="size-full object-cover"
                        />
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                    />
                    <div className="absolute left-4 top-4">
                        <Badge className="bg-brand-600 text-white">{categoryLabel(event.category)}</Badge>
                    </div>
                    <div className="absolute right-4 top-4">
                        <Badge className={event.status === "open" ? "bg-success text-white" : "bg-fg-subtle text-white"}>
                            {event.status === "open" ? "กำลังเปิดรับสมัคร" : "ปิดรับสมัคร"}
                        </Badge>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                        <h1 className="text-2xl font-black text-white drop-shadow-sm sm:text-3xl md:text-4xl">{event.name}</h1>
                        {event.organizer?.name && (
                            <p className="mt-1 text-sm text-white/85">จัดโดย {event.organizer.name}</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="space-y-8 lg:col-span-2">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <QuickFact icon={Calendar} label="วันที่" value={formatEventDate(event.date)} />
                            <QuickFact icon={Clock} label="เวลา" value={`${event.startTime} - ${event.endTime}`} />
                            <QuickFact icon={MapPin} label="สถานที่" value={event.location} tone="success" />
                            <QuickFact
                                icon={Users}
                                label="ที่นั่งเหลือ"
                                value={unlimited ? "ไม่จำกัด" : `${seatsRemaining} ที่นั่ง`}
                                tone={unlimited ? "brand" : urgency}
                            />
                        </div>

                        <ActivityAboutPanel activity={event} />
                        <ActivityRewardsPanel activity={event} />
                        <ActivityRegistrationPanel activity={event} />
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

                                    <div className="space-y-3">
                                        {event.status !== "open" && (
                                            <div className="flex justify-center">
                                                <Badge variant="neutral">ปิดรับสมัคร</Badge>
                                            </div>
                                        )}
                                        <Button
                                            className="h-11 w-full rounded-xl text-base font-semibold"
                                            onClick={handleRegisterClick}
                                            disabled={event.status !== "open"}
                                        >
                                            ลงทะเบียนเข้าร่วม
                                        </Button>
                                        <Button variant="outline" className="w-full rounded-xl" onClick={handleShare}>
                                            <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> แชร์กิจกรรม
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </Container>

            <Toast open={toast.open} message={toast.message} description={toast.description} />

            <SiteFooter />
        </div>
    )
}
