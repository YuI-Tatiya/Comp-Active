"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Container } from "@/components/layout/container"
import { EventCard, EventCardBadge, EventCardRow, formatEventDate } from "@/components/ui/event-card"
import { EVENT_CARD_GRID } from "@/components/ui/event-card-layout"
import { eventsAPI, EventSummary } from "@/lib/api"
import { categoriesBadgeLabel } from "@/lib/categories"
import { resolveEventImageUrl } from "@/lib/event-image"
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react"

/**
 * หน้ารายละเอียด "งาน" (Event) แบบสาธารณะ — ไม่ผูกกับ role ใดโดยเฉพาะ
 * (ต่างจาก /student/events/:id ที่ล็อกไว้เฉพาะนักศึกษา และ /organizer/events/:id
 * ที่ล็อกไว้เฉพาะเจ้าของงาน/แอดมิน) ใช้เมื่อต้องพาใครก็ตามที่ล็อกอินอยู่ไปดูงาน
 * ที่อาจไม่ใช่ของตัวเอง เช่น การ์ดงานบนหน้าแรกของผู้จัด
 */
export default function PublicEventGroupPage() {
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            fetchEvent(Number(params.id))
        }
    }, [params.id])

    const fetchEvent = async (id: number) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getPublicById(id)
            setEvent(data)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                    <p className="text-fg-muted mt-4">กำลังโหลดรายละเอียดงาน...</p>
                </div>
                <SiteFooter theme="denim" />
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center justify-center p-4">
                    <div className="bg-bg p-8 rounded-[24px] shadow-sm border border-border max-w-md w-full text-center">
                        <div className="text-danger mb-4 text-5xl">⚠️</div>
                        <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบงาน</h2>
                        <p className="text-fg-muted mb-6">{error || "งานนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                        <Button onClick={() => router.push("/events")} className="w-full rounded-xl">
                            กลับไปหน้าค้นหากิจกรรม
                        </Button>
                    </div>
                </div>
                <SiteFooter theme="denim" />
            </div>
        )
    }

    const organizerName = event.activities[0]?.organizer?.name

    return (
        <div className="min-h-screen bg-surface font-sans flex flex-col">
            <SiteHeader />

            <Container className="py-8 flex-1">
                <div className="mb-6">
                    <Link
                        href="/events"
                        className="inline-flex items-center text-fg-muted hover:text-fg font-medium transition-colors bg-bg px-4 py-2 rounded-full shadow-sm border border-border"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปยังรายการกิจกรรม
                    </Link>
                </div>

                <div className="aspect-[21/9] w-full bg-fg rounded-[24px] overflow-hidden relative shadow-md mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={resolveEventImageUrl(event, event.activities[0])}
                        alt={event.name}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="bg-bg p-8 rounded-[24px] shadow-sm border border-border mb-10">
                    <h1 className="text-3xl font-black text-fg mb-2">{event.name}</h1>
                    {organizerName && (
                        <div className="flex items-center text-fg-muted gap-2 mb-6 font-medium">
                            <Users className="w-5 h-5 text-fg-subtle" />
                            <span>จัดโดย {organizerName}</span>
                        </div>
                    )}
                    <p className="text-fg-muted leading-relaxed whitespace-pre-line">{event.description}</p>
                </div>

                <h2 className="text-xl font-bold text-fg mb-5">กิจกรรมย่อย ({event.activities.length})</h2>

                <div className={EVENT_CARD_GRID}>
                    {event.activities.map((a) => (
                        <Link key={a.id} href={`/events/${a.id}`} className="block">
                            <EventCard
                                activity={a}
                                badgeLeft={<EventCardBadge variant="light">{categoriesBadgeLabel(a.categories)}</EventCardBadge>}
                                badgeRight={
                                    <EventCardBadge className={a.status === "open" ? "bg-success/90" : "bg-fg-subtle/90"}>
                                        {a.status === "open" ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                    </EventCardBadge>
                                }
                            >
                                <EventCardRow icon={Calendar} tone="brand">
                                    {formatEventDate(a.date)} • {a.startTime}
                                </EventCardRow>
                                <EventCardRow icon={MapPin} tone="danger">
                                    {a.location}
                                </EventCardRow>
                            </EventCard>
                        </Link>
                    ))}
                </div>
            </Container>

            <SiteFooter theme="denim" />
        </div>
    )
}
