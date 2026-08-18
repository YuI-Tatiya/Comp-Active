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
import { activitiesAPI, Activity } from "@/lib/api"
import { Calendar, MapPin, Clock, Loader2, Search, Plus } from "lucide-react"

/** สถานะกิจกรรม — ตรงกับ ActivityStatus ใน backend/prisma/schema.prisma */
const STATUS_META: Record<string, { label: string; className: string }> = {
    open: { label: "เปิดรับสมัคร", className: "bg-success/90" },
    closed: { label: "ปิดรับสมัคร", className: "bg-fg-subtle/90" },
    draft: { label: "ฉบับร่าง", className: "bg-fg-subtle/90" },
    completed: { label: "เสร็จสิ้น", className: "bg-info/90" },
}

/** สถานะการอนุมัติ — ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma */
const APPROVAL_META: Record<string, { label: string; className: string }> = {
    approved: { label: "อนุมัติแล้ว", className: "bg-success/90" },
    pending_approval: { label: "รออนุมัติ", className: "bg-warning/90" },
    rejected: { label: "ยกเลิกแล้ว", className: "bg-danger/90" },
}

/** หน้าจัดการกิจกรรมของผู้จัด — การ์ดใช้ <EventCard> ร่วมกับหน้ารายการอื่น */
export default function OrganizerManagePage() {
    const [events, setEvents] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadEvents()
    }, [])

    async function loadEvents() {
        try {
            setLoading(true)
            const data = await activitiesAPI.getMy()
            setEvents(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error(err)
            setEvents([])
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = events.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-fg mb-2">จัดการกิจกรรม</h1>
                        <p className="text-fg-muted">แก้ไข ดูรายละเอียด และติดตามยอดผู้ลงทะเบียนของกิจกรรมที่คุณสร้าง</p>
                    </div>

                    <Button asChild size="lg" className="w-full md:w-auto font-bold rounded-xl">
                        <Link href="/organizer/create">
                            <Plus />
                            สร้างกิจกรรมใหม่
                        </Link>
                    </Button>
                </div>

                <div className="mb-10 w-full md:w-80">
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-fg-subtle" />
                        <Input
                            type="text"
                            placeholder="ค้นหากิจกรรม..."
                            className="pl-10 h-12 rounded-xl shadow-sm focus-visible:ring-brand-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* จำนวนผลลัพธ์ — ซ่อนตอนโหลดเพื่อไม่ให้เห็นเลข 0 วูบหนึ่ง */}
                {!loading && (
                    <p className="mb-4 text-sm text-fg-muted">
                        พบ <span className="font-semibold text-fg">{filteredEvents.length}</span> กิจกรรม
                    </p>
                )}

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมของคุณ...</p>
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredEvents.map((ev) => {
                            const st = STATUS_META[ev.status] ?? STATUS_META.open
                            const ap = APPROVAL_META[ev.approvalStatus] ?? APPROVAL_META.pending_approval

                            return (
                                <EventCard
                                    key={ev.id}
                                    activity={ev}
                                    badgeLeft={<EventCardBadge className={st.className}>{st.label}</EventCardBadge>}
                                    badgeRight={<EventCardBadge className={ap.className}>{ap.label}</EventCardBadge>}
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
                                    <EventCardRow icon={Calendar} tone="brand">
                                        {formatEventDate(ev.date)}
                                    </EventCardRow>
                                    <EventCardRow icon={Clock} tone="info">
                                        {ev.startTime} - {ev.endTime}
                                    </EventCardRow>
                                    <EventCardRow icon={MapPin} tone="danger">
                                        <span className="truncate">{ev.location}</span>
                                    </EventCardRow>

                                    {/* ยอดผู้ลงทะเบียน — ข้อมูลที่ผู้จัดต้องดูบ่อยที่สุด */}
                                    <EventCardProgress
                                        registered={ev.registeredCount ?? 0}
                                        capacity={ev.capacity}
                                    />
                                </EventCard>
                            )
                        })}
                    </div>
                ) : (
                    // แยก 2 กรณี — "ยังไม่เคยสร้าง" กับ "ค้นหาไม่เจอ" ต้องไม่ใช้ข้อความเดียวกัน
                    <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm mt-8">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            {events.length === 0
                                ? <Plus className="w-10 h-10 text-fg-subtle" />
                                : <Search className="w-10 h-10 text-fg-subtle" />}
                        </div>
                        {events.length === 0 ? (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ยังไม่มีกิจกรรม</h3>
                                <p className="text-fg-muted">เริ่มต้นด้วยการสร้างกิจกรรมแรกของคุณ</p>
                                <Button asChild className="mt-6 rounded-full px-8">
                                    <Link href="/organizer/create">สร้างกิจกรรมใหม่</Link>
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
