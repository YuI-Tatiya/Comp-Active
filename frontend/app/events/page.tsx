"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/ui/page-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { EventsFilterSidebar } from "@/components/ui/events-filter-sidebar"
import { HorizontalScrollSection } from "@/components/ui/horizontal-scroll-section"
import { PublicActivityCard } from "@/components/denim/public-activity-card"
import { ACTIVITY_GRID_COLUMN } from "@/components/denim/denim-ui"
import { eventsAPI, activitiesAPI, EventSummary, Activity } from "@/lib/api"
import {
    INITIAL_FILTERS,
    buildFeaturedCards,
    filterAndSortItems,
    groupByCategory,
    type EventsFilterValues,
} from "@/lib/events-filter"
import { cn } from "@/lib/utils"
import { CalendarDays, Compass, Loader2, Search, SlidersHorizontal, Users } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

/** หน้ารายการงานสาธารณะ — จัดกลุ่มตามหมวดหมู่ เลื่อนซ้าย-ขวาได้ในแต่ละแถว (คู่กับ /student/events) */
export default function EventsPage() {
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
            // ดึงกิจกรรมเดี่ยว (eventId = null) มาด้วย ไม่งั้นกิจกรรมรุ่นเก่าจะหายไปจากสายตาผู้เยี่ยมชม
            const [eventData, activityData] = await Promise.all([
                eventsAPI.getAllPublic(),
                activitiesAPI.getAll().catch(() => [] as Activity[]),
            ])
            setEvents(Array.isArray(eventData) ? eventData : [])
            setStandalone(Array.isArray(activityData) ? activityData : [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    function resetFilters() {
        setFilters(INITIAL_FILTERS)
    }

    // งานหนึ่งงาน = การ์ดเดียว (ไม่ว่าจะมีกี่กิจกรรมย่อย) + กิจกรรมเดี่ยว — ตัวประกอบเดียวกับหน้าแรก
    const allItems = useMemo(
        () =>
            buildFeaturedCards(events, standalone, {
                event: (id) => `/events/${id}`,
                activity: (id) => `/events/activities/${id}`,
            }),
        [events, standalone]
    )

    const filteredAndSorted = useMemo(() => filterAndSortItems(allItems, filters), [allItems, filters])

    const groupedByCategory = useMemo(() => groupByCategory(filteredAndSorted), [filteredAndSorted])

    const totalCount = filteredAndSorted.length

    return (
        <div className="min-h-screen bg-surface font-sans flex flex-col">
            <SiteHeader />

            {/* หัวเรื่องแบบเดียวกับ /student/events — ข้อความสำหรับผู้เยี่ยมชมที่ยังไม่ได้เข้าสู่ระบบ */}
            <PageHeader
                prompt="~/comp-active $ ls events/"
                title="กิจกรรมทั้งหมด"
                subtitle="สำรวจกิจกรรมของวิทยาลัยการคอมพิวเตอร์ได้โดยไม่ต้องเข้าสู่ระบบ หากต้องการลงทะเบียนเข้าร่วมและสะสมคะแนน Soft Skills กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษา"
                icons={[Compass, CalendarDays, Users]}
            />

            <Container className="py-12 flex-1">
                <Button
                    variant="outline"
                    className="mb-6 gap-2 rounded-full lg:hidden"
                    onClick={() => setMobileFiltersOpen(true)}
                >
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    ตัวกรอง
                </Button>

                {/* @container: ความกว้างการ์ด (ACTIVITY_GRID_COLUMN) คิดจากความกว้างเต็มของตัวห่อนี้ ให้เท่าคอลัมน์การ์ดหน้าแรก */}
                <div className="@container lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
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
                                            <PublicActivityCard
                                                key={item.key}
                                                item={item}
                                                className={cn("shrink-0 snap-start", ACTIVITY_GRID_COLUMN)}
                                            />
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

            <SiteFooter />
        </div>
    )
}
