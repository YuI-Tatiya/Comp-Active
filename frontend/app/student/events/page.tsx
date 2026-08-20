"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { FilterBar, type FilterSpec } from "@/components/ui/filter-bar"
import {
    EventCard,
    EventCardBadge,
    EventCardRow,
    formatEventDate,
} from "@/components/ui/event-card"
import { eventsAPI, activitiesAPI, capacityLabel, EventSummary, Activity } from "@/lib/api"
import { CATEGORIES, categoryLabel } from "@/lib/categories"
import { Calendar, MapPin, Users, Loader2, Search, Layers, Award } from "lucide-react"

function nearestUpcomingActivity(ev: EventSummary) {
    return [...ev.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

function eventRegisteredCount(ev: EventSummary): number {
    return ev.activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
}

function eventCapacity(ev: EventSummary): number | null {
    if (ev.activities.some((a) => a.capacity == null)) return null
    return ev.activities.reduce((sum, a) => sum + (a.capacity ?? 0), 0)
}

/** ที่นั่งคงเหลือรวมของงาน — null = ไม่จำกัด ใช้เรียงลำดับ "ที่นั่งเหลือมาก" */
function seatsLeft(ev: EventSummary): number | null {
    const cap = eventCapacity(ev)
    if (cap == null) return null
    return Math.max(cap - eventRegisteredCount(ev), 0)
}

function isOpen(ev: EventSummary): boolean {
    return ev.activities.some((a) => a.status === "open")
}

function hasVolunteerCert(ev: EventSummary): boolean {
    return ev.activities.some((a) => !!a.volunteerRole)
}

/** วันจัดกิจกรรมย่อยที่เร็วที่สุดของงาน — ใช้กรองช่วงเวลาและเรียงลำดับ */
function earliestDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
}

function withinRange(ev: EventSummary, range: string): boolean {
    if (!range) return true
    const start = earliestDate(ev)
    if (!Number.isFinite(start)) return false
    const now = Date.now()
    const days = range === "week" ? 7 : 30
    return start >= now - 86_400_000 && start <= now + days * 86_400_000
}

const FILTERS: FilterSpec[] = [
    {
        key: "category",
        label: "หมวดหมู่",
        options: [{ value: "", label: "ทุกหมวดหมู่" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))],
    },
    {
        key: "status",
        label: "สถานะรับสมัคร",
        options: [
            { value: "", label: "ทั้งหมด" },
            { value: "open", label: "เปิดรับสมัคร" },
            { value: "closed", label: "ปิดแล้ว" },
        ],
    },
    {
        key: "range",
        label: "ช่วงเวลา",
        options: [
            { value: "", label: "ทุกช่วงเวลา" },
            { value: "week", label: "ภายใน 7 วัน" },
            { value: "month", label: "ภายใน 30 วัน" },
        ],
    },
    {
        key: "cert",
        label: "ใบจิตอาสา",
        options: [
            { value: "", label: "ทั้งหมด" },
            { value: "yes", label: "มีใบรับรอง" },
        ],
    },
    {
        key: "sort",
        label: "เรียงลำดับ",
        neutralValue: "soon",
        options: [
            { value: "soon", label: "ใกล้ถึงก่อน" },
            { value: "newest", label: "เพิ่มล่าสุด" },
            { value: "seats", label: "ที่นั่งเหลือมาก" },
        ],
    },
]

const INITIAL_VALUES: Record<string, string> = { category: "", status: "", range: "", cert: "", sort: "soon" }

/** หน้ารายการงานฝั่งนักศึกษา — 1 การ์ดต่อ 1 งาน แม้งานนั้นจะมีหลายกิจกรรมย่อยก็ตาม */
export default function StudentEventsPage() {
    const [events, setEvents] = useState<EventSummary[]>([])
    const [standalone, setStandalone] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [values, setValues] = useState<Record<string, string>>(INITIAL_VALUES)

    useEffect(() => {
        loadEvents()
    }, [])

    async function loadEvents() {
        try {
            setLoading(true)
            // ดึงกิจกรรมเดี่ยว (eventId = null) มาด้วย ไม่งั้นกิจกรรมรุ่นเก่าจะหายไปจากสายตานักศึกษา
            const [eventData, activityData] = await Promise.all([
                eventsAPI.getAllPublic(),
                activitiesAPI.getAll().catch(() => [] as Activity[]),
            ])
            setEvents(Array.isArray(eventData) ? eventData : [])
            setStandalone(Array.isArray(activityData) ? activityData.filter((a) => !a.eventId) : [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    function setFilter(key: string, value: string) {
        setValues((prev) => ({ ...prev, [key]: value }))
    }

    function resetFilters() {
        setSearchQuery("")
        setValues(INITIAL_VALUES)
    }

    const filteredEvents = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        const list = events.filter((ev) => {
            const matchesSearch =
                !q ||
                ev.name.toLowerCase().includes(q) ||
                ev.activities.some((a) => a.name.toLowerCase().includes(q))
            const matchesCategory = !values.category || ev.activities.some((a) => a.category === values.category)
            const matchesStatus = !values.status || (values.status === "open" ? isOpen(ev) : !isOpen(ev))
            const matchesCert = values.cert !== "yes" || hasVolunteerCert(ev)
            return matchesSearch && matchesCategory && matchesStatus && matchesCert && withinRange(ev, values.range)
        })

        return [...list].sort((a, b) => {
            if (values.sort === "newest") {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            }
            if (values.sort === "seats") {
                const sa = seatsLeft(a)
                const sb = seatsLeft(b)
                // งานที่ไม่จำกัดจำนวนถือว่าที่นั่งเหลือมากที่สุดเสมอ
                return (sb ?? Number.MAX_SAFE_INTEGER) - (sa ?? Number.MAX_SAFE_INTEGER)
            }
            return earliestDate(a) - earliestDate(b)
        })
    }, [events, searchQuery, values])

    const filteredStandalone = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return standalone.filter((a) => {
            const matchesSearch = !q || a.name.toLowerCase().includes(q)
            const matchesCategory = !values.category || a.category === values.category
            const matchesStatus = !values.status || (values.status === "open" ? a.status === "open" : a.status !== "open")
            const matchesCert = values.cert !== "yes" || !!a.volunteerRole
            return matchesSearch && matchesCategory && matchesStatus && matchesCert
        })
    }, [standalone, searchQuery, values])

    const totalCount = filteredEvents.length + filteredStandalone.length

    return (
        // ไม่ใส่ min-h-screen / SiteHeader / SiteFooter — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-fg mb-2">กิจกรรมทั้งหมด</h1>
                    <p className="text-fg-muted">เลือกงานที่สนใจและลงทะเบียนเข้าร่วมได้ทันที</p>
                </div>

                <FilterBar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="ค้นหาชื่องานหรือกิจกรรม..."
                    filters={FILTERS}
                    values={values}
                    onFilterChange={setFilter}
                    onReset={resetFilters}
                    resultCount={loading ? undefined : totalCount}
                    resultUnit="รายการ"
                />

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมล่าสุด...</p>
                    </div>
                ) : totalCount > 0 ? (
                    <div className="space-y-12">
                        {filteredEvents.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredEvents.map((ev) => {
                                    const fa = nearestUpcomingActivity(ev)
                                    const capacity = eventCapacity(ev)
                                    const open = isOpen(ev)
                                    return (
                                        <EventCard
                                            key={ev.id}
                                            activity={{ name: ev.name, imageUrl: ev.imageUrl ?? fa?.imageUrl }}
                                            description={ev.description}
                                            badgeLeft={
                                                ev.activities.length > 1 ? (
                                                    <EventCardBadge variant="light">
                                                        <Layers className="mr-1 inline size-3" aria-hidden="true" />
                                                        {ev.activities.length} กิจกรรมย่อย
                                                    </EventCardBadge>
                                                ) : fa?.category ? (
                                                    <EventCardBadge variant="light">{categoryLabel(fa.category)}</EventCardBadge>
                                                ) : undefined
                                            }
                                            badgeRight={
                                                <EventCardBadge className={open ? "bg-success/90" : "bg-fg-subtle/90"}>
                                                    {open ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                                </EventCardBadge>
                                            }
                                            actions={
                                                <>
                                                    <Link href={`/student/events/${ev.id}`} className="flex-1">
                                                        <Button variant="outline" className="w-full font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                    </Link>
                                                    <Link href={`/student/events/${ev.id}`} className="flex-1">
                                                        <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ลงทะเบียน</Button>
                                                    </Link>
                                                </>
                                            }
                                        >
                                            {fa && (
                                                <EventCardRow icon={Calendar} tone="brand">
                                                    {formatEventDate(fa.date)} • {fa.startTime}
                                                </EventCardRow>
                                            )}
                                            {fa && (
                                                <EventCardRow icon={MapPin} tone="danger">
                                                    <span className="truncate">{fa.location}</span>
                                                </EventCardRow>
                                            )}
                                            <EventCardRow icon={Users} tone="success">
                                                {eventRegisteredCount(ev)} ผู้เข้าร่วม ({capacityLabel(capacity)})
                                            </EventCardRow>
                                            {hasVolunteerCert(ev) && (
                                                <EventCardRow icon={Award} tone="brand">
                                                    มีใบรับรองจิตอาสา
                                                </EventCardRow>
                                            )}
                                        </EventCard>
                                    )
                                })}
                            </div>
                        )}

                        {filteredStandalone.length > 0 && (
                            <div>
                                <h2 className="mb-4 text-lg font-bold text-fg">กิจกรรมเดี่ยว (ไม่ผูกกับงาน)</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredStandalone.map((a) => (
                                        <EventCard
                                            key={`activity-${a.id}`}
                                            activity={a}
                                            description={a.description}
                                            badgeLeft={<EventCardBadge variant="light">{categoryLabel(a.category)}</EventCardBadge>}
                                            badgeRight={
                                                <EventCardBadge className={a.status === "open" ? "bg-success/90" : "bg-fg-subtle/90"}>
                                                    {a.status === "open" ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                                </EventCardBadge>
                                            }
                                            actions={
                                                <Link href={`/student/activities/${a.id}`} className="flex-1">
                                                    <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                </Link>
                                            }
                                        >
                                            <EventCardRow icon={Calendar} tone="brand">
                                                {formatEventDate(a.date)} • {a.startTime}
                                            </EventCardRow>
                                            <EventCardRow icon={MapPin} tone="danger">
                                                <span className="truncate">{a.location}</span>
                                            </EventCardRow>
                                            <EventCardRow icon={Users} tone="success">
                                                {a.registeredCount ?? 0} ผู้เข้าร่วม ({capacityLabel(a.capacity)})
                                            </EventCardRow>
                                        </EventCard>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm mt-8">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-fg-subtle" />
                        </div>
                        <h3 className="text-xl font-bold text-fg mb-2">ไม่พบกิจกรรมที่ค้นหา</h3>
                        <p className="text-fg-muted">ลองใช้คำค้นหาอื่น เลือกตัวกรองอื่น หรือรองานใหม่เปิดรับสมัครเร็วๆ นี้</p>
                        <Button variant="outline" className="mt-6 rounded-full px-8" onClick={resetFilters}>
                            ล้างตัวกรอง
                        </Button>
                    </div>
                )}
            </Container>
        </div>
    )
}
