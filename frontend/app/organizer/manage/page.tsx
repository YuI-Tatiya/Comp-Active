"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Container } from "@/components/layout/container"
import {
    EventCard,
    EventCardBadge,
    EventCardProgress,
    EventCardRow,
    formatEventDate,
} from "@/components/ui/event-card"
import { eventsAPI, activitiesAPI, EventSummary, Activity } from "@/lib/api"
import { Calendar, MapPin, Clock, Loader2, Search, Plus, Layers } from "lucide-react"

/** สถานะการอนุมัติของกิจกรรมย่อย — ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma */
const APPROVAL_META: Record<string, { label: string; className: string }> = {
    approved: { label: "อนุมัติแล้ว", className: "bg-success/90" },
    pending_approval: { label: "รออนุมัติ", className: "bg-warning/90" },
    rejected: { label: "ยกเลิกแล้ว", className: "bg-danger/90" },
}

function eventRegisteredCount(ev: EventSummary): number {
    return ev.activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
}

function eventCapacity(ev: EventSummary): number | null {
    if (ev.activities.some((a) => a.capacity == null)) return null
    return ev.activities.reduce((sum, a) => sum + (a.capacity ?? 0), 0)
}

/** เรียงตามวันจัดกิจกรรมย่อยแรกที่ใกล้ที่สุด — ใช้แสดงในการ์ดของ Event */
function firstActivity(ev: EventSummary): Activity | undefined {
    return [...ev.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

/** หน้าจัดการกิจกรรมของผู้จัด — แสดงเป็น "งาน" (Event) พร้อมกิจกรรมย่อย, และกิจกรรมเดี่ยวรุ่นเก่าแยกไว้ด้านล่าง */
export default function OrganizerManagePage() {
    const [events, setEvents] = useState<EventSummary[]>([])
    const [standaloneActivities, setStandaloneActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const [eventData, activityData] = await Promise.all([eventsAPI.getMy(), activitiesAPI.getMy()])
            setEvents(Array.isArray(eventData) ? eventData : [])
            setStandaloneActivities(Array.isArray(activityData) ? activityData.filter((a) => !a.eventId) : [])
        } catch (err) {
            console.error(err)
            setEvents([])
            setStandaloneActivities([])
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = events.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const filteredStandalone = standaloneActivities.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalCount = filteredEvents.length + filteredStandalone.length

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-fg mb-2">จัดการกิจกรรม</h1>
                        <p className="text-fg-muted">แก้ไข ดูรายละเอียด และติดตามยอดผู้ลงทะเบียนของงานที่คุณสร้าง</p>
                    </div>

                    <Button asChild size="lg" className="w-full md:w-auto font-bold rounded-xl">
                        <Link href="/organizer/create">
                            <Plus />
                            สร้างงานใหม่
                        </Link>
                    </Button>
                </div>

                <div className="mb-10 w-full md:w-80">
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-fg-subtle" />
                        <Input
                            type="text"
                            placeholder="ค้นหางาน..."
                            className="pl-10 h-12 rounded-xl shadow-sm focus-visible:ring-brand-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {!loading && (
                    <p className="mb-4 text-sm text-fg-muted">
                        พบ <span className="font-semibold text-fg">{totalCount}</span> รายการ
                    </p>
                )}

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมของคุณ...</p>
                    </div>
                ) : totalCount > 0 ? (
                    <div className="space-y-12">
                        {filteredEvents.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredEvents.map((ev) => {
                                    const fa = firstActivity(ev)
                                    const capacity = eventCapacity(ev)
                                    return (
                                        <EventCard
                                            key={`event-${ev.id}`}
                                            activity={{ name: ev.name, imageUrl: ev.imageUrl ?? fa?.imageUrl }}
                                            badgeLeft={
                                                ev.activities.length > 1 ? (
                                                    <EventCardBadge variant="light">
                                                        <Layers className="mr-1 inline size-3" aria-hidden="true" />
                                                        {ev.activities.length} กิจกรรมย่อย
                                                    </EventCardBadge>
                                                ) : undefined
                                            }
                                            badgeRight={
                                                <EventCardBadge className={ev.isPublic ? "bg-success/90" : "bg-fg-subtle/90"}>
                                                    {ev.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}
                                                </EventCardBadge>
                                            }
                                            actions={
                                                <>
                                                    <Link href={`/organizer/manage/${ev.id}/edit`} className="flex-1">
                                                        <Button variant="outline" className="w-full font-bold rounded-xl h-11">แก้ไข</Button>
                                                    </Link>
                                                    <Link href={`/organizer/events/${ev.id}`} className="flex-1">
                                                        <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                    </Link>
                                                </>
                                            }
                                        >
                                            {fa && (
                                                <EventCardRow icon={Calendar} tone="brand">
                                                    {formatEventDate(fa.date)}
                                                </EventCardRow>
                                            )}
                                            {fa && (
                                                <EventCardRow icon={Clock} tone="info">
                                                    {fa.startTime} - {fa.endTime}
                                                </EventCardRow>
                                            )}
                                            <EventCardProgress registered={eventRegisteredCount(ev)} capacity={capacity} />
                                        </EventCard>
                                    )
                                })}
                            </div>
                        )}

                        {filteredStandalone.length > 0 && (
                            <div>
                                <h2 className="mb-4 text-lg font-bold text-fg">กิจกรรมเดี่ยว (ไม่ผูกกับงาน)</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredStandalone.map((ev) => {
                                        const ap = APPROVAL_META[ev.approvalStatus] ?? APPROVAL_META.pending_approval
                                        return (
                                            <EventCard
                                                key={`activity-${ev.id}`}
                                                activity={ev}
                                                badgeRight={<EventCardBadge className={ap.className}>{ap.label}</EventCardBadge>}
                                                actions={
                                                    <Link href={`/organizer/events/${ev.id}`} className="flex-1">
                                                        <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                    </Link>
                                                }
                                            >
                                                <EventCardRow icon={Calendar} tone="brand">
                                                    {formatEventDate(ev.date)}
                                                </EventCardRow>
                                                <EventCardRow icon={MapPin} tone="danger">
                                                    <span className="truncate">{ev.location}</span>
                                                </EventCardRow>
                                                <EventCardProgress registered={ev.registeredCount ?? 0} capacity={ev.capacity} />
                                            </EventCard>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm mt-8">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            {events.length === 0 && standaloneActivities.length === 0
                                ? <Plus className="w-10 h-10 text-fg-subtle" />
                                : <Search className="w-10 h-10 text-fg-subtle" />}
                        </div>
                        {events.length === 0 && standaloneActivities.length === 0 ? (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ยังไม่มีงาน</h3>
                                <p className="text-fg-muted">เริ่มต้นด้วยการสร้างงานแรกของคุณ</p>
                                <Button asChild className="mt-6 rounded-full px-8">
                                    <Link href="/organizer/create">สร้างงานใหม่</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ไม่พบกิจกรรมที่ค้นหา</h3>
                                <p className="text-fg-muted">ลองใช้คำค้นหาอื่น หรือล้างการค้นหาเพื่อดูกิจกรรมทั้งหมด</p>
                                <Button
                                    variant="outline"
                                    className="mt-6 rounded-full px-8"
                                    onClick={() => setSearchQuery("")}
                                >
                                    ล้างการค้นหา
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </Container>
        </div>
    )
}
