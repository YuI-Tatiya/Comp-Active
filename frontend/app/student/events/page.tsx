"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { EventsFilterSidebar, type EventsFilterValues } from "@/components/ui/events-filter-sidebar"
import { HorizontalScrollSection } from "@/components/ui/horizontal-scroll-section"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { eventsAPI, activitiesAPI, EventSummary, Activity } from "@/lib/api"
import { CATEGORIES, categoryLabel } from "@/lib/categories"
import { Loader2, Search, SlidersHorizontal, Sparkles } from "lucide-react"

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

/** วันจัดกิจกรรมย่อยที่เร็วที่สุดของงาน — ใช้เรียงลำดับ "ใกล้ถึงก่อน" */
function earliestDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
}

/** การ์ดข้อมูลรวมที่ใช้แสดงผล — งาน (หลายกิจกรรมย่อย) และกิจกรรมเดี่ยว normalize มาเป็นรูปแบบเดียวกัน */
interface CardItem {
    key: string
    name: string
    imageUrl?: string | null
    description?: string | null
    category?: string
    status: "open" | "closed"
    href: string
    searchText: string
    sortDate: number
    createdAt: number
    seats: number | null
    hasCert: boolean
}

const INITIAL_FILTERS: EventsFilterValues = {
    search: "",
    categories: [],
    statuses: [],
    certOnly: false,
    range: "",
    sort: "soon",
}

/** true ถ้าวันที่จัดอยู่ในช่วงที่เลือก — "" = ไม่กรอง */
function withinRange(sortDate: number, range: string): boolean {
    if (!range) return true
    if (!Number.isFinite(sortDate)) return false
    const now = Date.now()
    const day = 86_400_000
    if (range === "today") return sortDate >= now - day && sortDate <= now + day
    const days = range === "week" ? 7 : 30
    return sortDate >= now - day && sortDate <= now + days * day
}

/** หน้ารายการงานฝั่งนักศึกษา — จัดกลุ่มตามหมวดหมู่ เลื่อนซ้าย-ขวาได้ในแต่ละแถว */
export default function StudentEventsPage() {
    const [events, setEvents] = useState<EventSummary[]>([])
    const [standalone, setStandalone] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState<EventsFilterValues>(INITIAL_FILTERS)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

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

    function resetFilters() {
        setFilters(INITIAL_FILTERS)
    }

    const allItems = useMemo<CardItem[]>(() => {
        const fromEvents = events.map((ev): CardItem => {
            const fa = nearestUpcomingActivity(ev)
            return {
                key: `event-${ev.id}`,
                name: ev.name,
                imageUrl: ev.imageUrl ?? fa?.imageUrl,
                description: ev.description,
                category: fa?.category,
                status: isOpen(ev) ? "open" : "closed",
                href: `/student/events/${ev.id}`,
                searchText: [ev.name, ...ev.activities.map((a) => a.name)].join(" ").toLowerCase(),
                sortDate: earliestDate(ev),
                createdAt: new Date(ev.createdAt).getTime(),
                seats: seatsLeft(ev),
                hasCert: hasVolunteerCert(ev),
            }
        })

        const fromStandalone = standalone.map((a): CardItem => ({
            key: `activity-${a.id}`,
            name: a.name,
            imageUrl: a.imageUrl,
            description: a.description,
            category: a.category,
            status: a.status === "open" ? "open" : "closed",
            href: `/student/activities/${a.id}`,
            searchText: a.name.toLowerCase(),
            sortDate: new Date(a.date).getTime(),
            createdAt: new Date(a.date).getTime(),
            seats: a.capacity == null ? null : Math.max(a.capacity - (a.registeredCount ?? 0), 0),
            hasCert: !!a.volunteerRole,
        }))

        return [...fromEvents, ...fromStandalone]
    }, [events, standalone])

    const filteredAndSorted = useMemo(() => {
        const q = filters.search.trim().toLowerCase()
        const list = allItems.filter((item) => {
            const matchesSearch = !q || item.searchText.includes(q)
            const matchesCategory = filters.categories.length === 0 || (!!item.category && filters.categories.includes(item.category))
            const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(item.status)
            const matchesCert = !filters.certOnly || item.hasCert
            const matchesRange = withinRange(item.sortDate, filters.range)
            return matchesSearch && matchesCategory && matchesStatus && matchesCert && matchesRange
        })

        return [...list].sort((a, b) => {
            if (filters.sort === "newest") return b.createdAt - a.createdAt
            if (filters.sort === "seats") return (b.seats ?? Number.MAX_SAFE_INTEGER) - (a.seats ?? Number.MAX_SAFE_INTEGER)
            if (filters.sort === "name") return a.name.localeCompare(b.name, "th")
            return a.sortDate - b.sortDate
        })
    }, [allItems, filters])

    const groupedByCategory = useMemo(
        () =>
            CATEGORIES.map((c) => ({
                category: c,
                items: filteredAndSorted.filter((item) => item.category === c.value),
            })).filter((g) => g.items.length > 0),
        [filteredAndSorted]
    )

    const totalCount = filteredAndSorted.length

    return (
        // ไม่ใส่ min-h-screen / SiteHeader / SiteFooter — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-10 shadow-lg sm:px-10">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-cat-volunteer/40 blur-3xl"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-cat-tech/40 blur-3xl"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute right-1/3 bottom-0 size-40 rounded-full bg-cat-art/30 blur-3xl"
                    />
                    <div className="relative z-10 max-w-2xl">
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                            <Sparkles className="size-3.5" aria-hidden="true" />
                            พัฒนา Soft Skills ไปกับทุกกิจกรรม
                        </span>
                        <h1 className="mb-2 text-3xl font-black text-white sm:text-4xl">กิจกรรมทั้งหมด</h1>
                        <p className="text-white/90">เลือกงานที่สนใจ กดเข้าไปดูรายละเอียดเพื่อลงทะเบียนเข้าร่วม</p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="mb-6 gap-2 rounded-full lg:hidden"
                    onClick={() => setMobileFiltersOpen(true)}
                >
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    ตัวกรอง
                </Button>

                <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24">
                            <EventsFilterSidebar
                                values={filters}
                                onChange={setFilters}
                                onReset={resetFilters}
                                resultCount={loading ? undefined : totalCount}
                            />
                        </div>
                    </aside>

                    <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>ตัวกรอง</DialogTitle>
                            </DialogHeader>
                            <DialogClose onClick={() => setMobileFiltersOpen(false)} />
                            <div className="max-h-[65vh] overflow-y-auto pr-1">
                                <EventsFilterSidebar
                                    values={filters}
                                    onChange={setFilters}
                                    onReset={resetFilters}
                                    resultCount={loading ? undefined : totalCount}
                                />
                            </div>
                            <Button className="w-full rounded-xl" onClick={() => setMobileFiltersOpen(false)}>
                                ดูผลลัพธ์ ({totalCount})
                            </Button>
                        </DialogContent>
                    </Dialog>

                    <div className="min-w-0">
                        {loading ? (
                            <div className="py-32 flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                                <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมล่าสุด...</p>
                            </div>
                        ) : totalCount > 0 ? (
                            <div className="space-y-12">
                                {groupedByCategory.map(({ category, items }) => (
                                    <HorizontalScrollSection key={category.value} title={category.label} count={items.length}>
                                        {items.map((item) => (
                                            <Link
                                                key={item.key}
                                                href={item.href}
                                                className="block w-72 shrink-0 snap-start"
                                            >
                                                <EventCard
                                                    activity={{ name: item.name, imageUrl: item.imageUrl }}
                                                    description={item.description}
                                                    badgeLeft={
                                                        <EventCardBadge variant="light">{categoryLabel(item.category)}</EventCardBadge>
                                                    }
                                                    badgeRight={
                                                        <EventCardBadge className={item.status === "open" ? "bg-success/90" : "bg-fg-subtle/90"}>
                                                            {item.status === "open" ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                                        </EventCardBadge>
                                                    }
                                                />
                                            </Link>
                                        ))}
                                    </HorizontalScrollSection>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm">
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
                    </div>
                </div>
            </Container>
        </div>
    )
}
