"use client"

<<<<<<< HEAD
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/ui/page-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { EventsFilterSidebar } from "@/components/ui/events-filter-sidebar"
import { HorizontalScrollSection } from "@/components/ui/horizontal-scroll-section"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { eventsAPI, activitiesAPI, EventSummary, Activity } from "@/lib/api"
import {
    INITIAL_FILTERS,
    activityFilterFields,
    filterAndSortItems,
    groupByCategory,
    type EventsFilterValues,
    type FilterableItem,
} from "@/lib/events-filter"
import { Loader2, Search, SlidersHorizontal, Compass, CalendarDays, Users } from "lucide-react"
=======
import { EventsBrowser } from "@/components/events/events-browser"
>>>>>>> organize

// ค่าคงที่ระดับโมดูล — EventsBrowser ใช้เป็น dependency ของ useMemo ถ้าสร้างใหม่ทุก render การ์ดจะถูกประกอบใหม่ทุกครั้ง
const HREFS = {
    event: (id: number) => `/student/events/${id}`,
    activity: (id: number) => `/student/activities/${id}`,
}

/** หน้ารายการกิจกรรมฝั่งนักศึกษา — หน้าตา/ตัวกรองอยู่ใน EventsBrowser (ใช้ร่วมกับ /events) */
export default function StudentEventsPage() {
    return (
        // ไม่ใส่ min-h-screen / SiteHeader / SiteFooter — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <EventsBrowser
                prompt="~/comp-active/student $ ls events/"
                subtitle="เลือกงานที่สนใจ กดเข้าไปดูรายละเอียดเพื่อลงทะเบียนเข้าร่วม"
                hrefs={HREFS}
            />
<<<<<<< HEAD

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
                                                className="block w-64 max-w-full shrink-0 snap-start"
                                            >
                                                <EventCard
                                                    compact
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
=======
>>>>>>> organize
        </div>
    )
}
