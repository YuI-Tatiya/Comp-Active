"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { WalkingCartoon } from "@/components/ui/walking-cartoon"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { EventsFilterSidebar } from "@/components/ui/events-filter-sidebar"
import { HorizontalScrollSection } from "@/components/ui/horizontal-scroll-section"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { EVENT_CARD_SLOT } from "@/components/ui/event-card-layout"
import { eventsAPI, activitiesAPI, EventSummary, Activity } from "@/lib/api"
import {
    INITIAL_FILTERS,
    activityFilterFields,
    filterAndSortItems,
    groupByCategory,
    type EventsFilterValues,
    type FilterableItem,
} from "@/lib/events-filter"
import { Loader2, Search, SlidersHorizontal } from "lucide-react"

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

/** หมวดหมู่ทั้งหมดที่กิจกรรมย่อยของงานนี้ระบุไว้ — ใช้ให้การ์ดงานโผล่ในทุกหมวดที่เกี่ยวข้อง ไม่ใช่แค่หมวดเดียว */
function eventCategories(ev: EventSummary): string[] {
    return Array.from(new Set(ev.activities.flatMap((a) => a.categories)))
}

/** วันจัดกิจกรรมย่อยที่เร็วที่สุดของงาน — ใช้เรียงลำดับ "ใกล้ถึงก่อน" */
function earliestDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
}

/** การ์ดข้อมูลรวมที่ใช้แสดงผล — งาน (หลายกิจกรรมย่อย) และกิจกรรมเดี่ยว normalize มาเป็นรูปแบบเดียวกัน */
interface CardItem extends FilterableItem {
    key: string
    imageUrl?: string | null
    description?: string | null
    href: string
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
                categories: eventCategories(ev),
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
            ...activityFilterFields(a),
            key: `activity-${a.id}`,
            imageUrl: a.imageUrl,
            description: a.description,
            href: `/student/activities/${a.id}`,
        }))

        return [...fromEvents, ...fromStandalone]
    }, [events, standalone])

    const filteredAndSorted = useMemo(() => filterAndSortItems(allItems, filters), [allItems, filters])

    const groupedByCategory = useMemo(() => groupByCategory(filteredAndSorted), [filteredAndSorted])

    const totalCount = filteredAndSorted.length

    return (
        // ไม่ใส่ min-h-screen / SiteHeader / SiteFooter — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <div className="border-b border-border bg-bg">
                <Container className="py-8">
                    <div className="max-w-2xl">
                        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">กิจกรรมทั้งหมด</h1>
                        <p className="text-fg-muted">เลือกงานที่สนใจ กดเข้าไปดูรายละเอียดเพื่อลงทะเบียนเข้าร่วม</p>
                    </div>
                    <WalkingCartoon className="-mb-8 mt-3" />
                </Container>
            </div>

            <Container className="py-12">
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
                                                className={`block shrink-0 snap-start ${EVENT_CARD_SLOT}`}
                                            >
                                                <EventCard
                                                    activity={{ name: item.name, imageUrl: item.imageUrl }}
                                                    description={item.description}
                                                    badgeLeft={
                                                        // ใช้หมวดของ "กลุ่มที่กำลังแสดงอยู่" ไม่ใช่หมวดเดียวของการ์ด —
                                                        // งานที่มีกิจกรรมย่อยหลายหมวดโผล่ซ้ำได้หลายกลุ่ม ป้ายต้องตรงกับกลุ่มนั้นๆ
                                                        <EventCardBadge variant="light">{category.label}</EventCardBadge>
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
