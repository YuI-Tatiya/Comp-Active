"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { EventsFilterSidebar, activePanelFilterCount } from "@/components/ui/events-filter-sidebar"
import { HorizontalScrollSection } from "@/components/ui/horizontal-scroll-section"
import { PublicActivityCard } from "@/components/denim/public-activity-card"
import { ActivityListRow, ActivityListRowSkeleton } from "@/components/denim/activity-list-row"
import { ACTIVITY_GRID, ACTIVITY_GRID_COLUMN, ActivityCardSkeleton, TerminalPrompt } from "@/components/denim/denim-ui"
import { eventsAPI, activitiesAPI, type EventSummary, type Activity } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import {
    INITIAL_FILTERS,
    buildFeaturedCards,
    facetCounts,
    filterAndSortItems,
    groupByCategory,
    type EventsFilterValues,
} from "@/lib/events-filter"
import { cn } from "@/lib/utils"

/* หน้ารายการกิจกรรมทั้งหมด (ธีม Denim Varsity) — ใช้ร่วมกันระหว่าง /student/events และ /events (ผู้เยี่ยมชม)
   ต่างกันแค่บรรทัดคำสั่ง คำอธิบาย และลิงก์ของการ์ด เดิมสองหน้านี้ก๊อปโค้ดเดียวกันไว้คนละไฟล์

   ผังหน้า (lg+) = กริด 3 คอลัมน์ ช่องห่าง 24px เท่ากริดการ์ดหน้าแรก: แผงตัวกรองกิน 1 คอลัมน์ การ์ดอยู่ 2 คอลัมน์ที่เหลือ
   การ์ดจึงกว้างเท่าการ์ดหน้าแรกพอดี ไม่ต้องตั้งความกว้างเอง และขอบขวาของแถวการ์ดตรงกับขอบหน้า (ไม่เหลือช่องว่าง) */

type ViewMode = "all" | "category"

interface EventsBrowserProps {
    /** บรรทัดคำสั่งเทอร์มินัลเหนือหัวข้อ เช่น "~/comp-active/student $ ls events/" */
    prompt: string
    subtitle: string
    /** ลิงก์ของการ์ด — ต้องเป็นค่าคงที่ระดับโมดูล (ใช้เป็น dependency ของ useMemo) */
    hrefs: { event: (id: string) => string; activity: (id: string) => string }
    /**
     * จอแคบ (< lg) มีแถบหัวของแอปบอกชื่อหน้าแล้ว (พอร์ทัลนักศึกษา — MobileAppBar) — ซ่อนแถบยีนส์ แล้วย้ายช่องค้นหา+ปุ่มตัวกรอง
     * มาเป็นแถวบนสุดของเนื้อหาแทน พร้อมป้ายมาสคอต "เปิดรับสมัครอยู่ N กิจกรรม" หน้า public (/events) ไม่มีแถบแบบนั้น จึงคงแถบยีนส์ไว้
     */
    appBarOnMobile?: boolean
}

function EventsHero({
    prompt,
    subtitle,
    search,
    onSearch,
    openCount,
    className,
}: {
    prompt: string
    subtitle: string
    search: string
    onSearch: (value: string) => void
    /** null = ยังโหลดไม่เสร็จ (ซ่อนบับเบิล ไม่ให้ขึ้น "0 กิจกรรม" หลอกๆ) */
    openCount: number | null
    className?: string
}) {
    return (
        <section className={cn("denim-weave relative overflow-hidden", className)}>
            <Container className="relative pb-10 pt-10 sm:pt-12 lg:pb-12">
                <div className="flex max-w-2xl flex-col gap-3 lg:max-w-[calc(100%-20rem)]">
                    <TerminalPrompt>{prompt}</TerminalPrompt>
                    <h1 className="font-display text-[34px] font-bold leading-[1.15] tracking-[-0.01em] text-white sm:text-[44px]">กิจกรรมทั้งหมด</h1>
                    <p className="max-w-2xl text-[15px] leading-relaxed text-denim-on sm:text-base">{subtitle}</p>
                    <form role="search" aria-label="ค้นหากิจกรรม" onSubmit={(e) => e.preventDefault()} className="mt-3 w-full max-w-xl">
                        <label htmlFor="events-search" className="sr-only">
                            ค้นหาชื่องานหรือกิจกรรม
                        </label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-denim-muted" aria-hidden="true" />
                            {/* วงโฟกัสอำพัน — อยู่บนพื้นยีนส์ (กรมท่าบนพื้นเข้มมองไม่เห็น) */}
                            <input
                                id="events-search"
                                type="search"
                                placeholder="ค้นหาชื่องานหรือกิจกรรม..."
                                value={search}
                                onChange={(e) => onSearch(e.target.value)}
                                className="h-[52px] w-full rounded-xl bg-white pl-12 pr-4 text-[15px] text-denim-deep shadow-[0_12px_30px_-14px_rgb(0_0_0/0.5)] placeholder:text-denim-muted/80 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber"
                            />
                        </div>
                    </form>
                </div>

                {/* มาสคอตถือแล็ปท็อปยืนบนแถบหมากรุก + บับเบิลบอกจำนวนที่เปิดรับสมัคร — จอ lg+ เท่านั้น (จอแคบกว่านี้ชนช่องค้นหา) */}
                <div className="absolute bottom-0 right-10 hidden lg:block xl:right-16">
                    <Image
                        src="/mascot-laptop.png"
                        alt=""
                        width={476}
                        height={1033}
                        sizes="110px"
                        priority
                        className="h-[220px] w-auto drop-shadow-[0_16px_24px_rgb(0_0_0/0.35)]"
                    />
                    {openCount !== null && (
                        <p className="absolute right-[86%] top-[6%] w-[190px] rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-snug text-denim-deep shadow-[0_14px_30px_-14px_rgb(0_0_0/0.5)] after:absolute after:-right-1.5 after:top-6 after:size-3 after:rotate-45 after:bg-white">
                            {openCount > 0 ? (
                                <>
                                    ตอนนี้มี{" "}
                                    <mark className="rounded bg-amber/35 px-1 text-denim-deep">{openCount} กิจกรรม</mark>{" "}
                                    {/* ไม่ให้ตัดกลางวลี ("เปิด / รับสมัครอยู่!") */}
                                    <span className="whitespace-nowrap">เปิดรับสมัครอยู่!</span>
                                </>
                            ) : (
                                "ตอนนี้ยังไม่มีกิจกรรมเปิดรับสมัคร แวะมาดูใหม่นะ!"
                            )}
                        </p>
                    )}
                </div>
            </Container>
            <div className="checker-strip h-3.5" aria-hidden="true" />
        </section>
    )
}

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { value: "all", label: "ทั้งหมด", icon: LayoutGrid },
    { value: "category", label: "ตามหมวดหมู่", icon: List },
]

/** ชิปหมวดหมู่เลื่อนแนวนอน (จอแคบ) — กดสลับเลือก/ไม่เลือกได้หลายหมวด ค่าเดียวกับช่องติ๊กหมวดหมู่ในแผงตัวกรอง */
function CategoryChips({ selected, onToggle }: { selected: string[]; onToggle: (value: string) => void }) {
    return (
        <div role="group" aria-label="กรองตามหมวดหมู่" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => {
                const active = selected.includes(c.value)
                return (
                    <button
                        key={c.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onToggle(c.value)}
                        className={cn(
                            "inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-denim",
                            active ? "border-denim-deep bg-denim-deep text-white" : "border-denim-line bg-white text-denim-deep hover:border-denim-dash"
                        )}
                    >
                        <span className={cn("size-2 rounded-full", c.dot, active && "ring-2 ring-white/70")} aria-hidden="true" />
                        {c.label}
                    </button>
                )
            })}
        </div>
    )
}

/** ป้ายยีนส์พร้อมมาสคอต "ตอนนี้มี N กิจกรรม เปิดรับสมัครอยู่" — จอแคบที่ไม่มีแถบยีนส์ (บับเบิลของมาสคอตในแถบอยู่แค่จอ lg+) */
function OpenNowBanner({ count }: { count: number }) {
    return (
        <p className="denim-weave relative flex min-h-[84px] items-center overflow-hidden rounded-[22px] py-3 pl-[92px] pr-4 text-[15px] font-semibold leading-snug text-white">
            <Image
                src="/mascot-laptop.png"
                alt=""
                width={476}
                height={1033}
                sizes="48px"
                className="pointer-events-none absolute -bottom-3 left-4 h-[104px] w-auto"
            />
            {count > 0 ? (
                <span>
                    ตอนนี้มี <span className="text-amber">{count} กิจกรรม</span> เปิดรับสมัครอยู่ รีบจองก่อนเต็ม!
                </span>
            ) : (
                <span>ตอนนี้ยังไม่มีกิจกรรมเปิดรับสมัคร แวะมาดูใหม่นะ!</span>
            )}
        </p>
    )
}

export function EventsBrowser({ prompt, subtitle, hrefs, appBarOnMobile = false }: EventsBrowserProps) {
    const [events, setEvents] = useState<EventSummary[]>([])
    const [standalone, setStandalone] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState<EventsFilterValues>(INITIAL_FILTERS)
    const [view, setView] = useState<ViewMode>("all")
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                // ดึงกิจกรรมเดี่ยว (eventId = null) มาด้วย ไม่งั้นกิจกรรมรุ่นเก่าจะหายไปจากหน้านี้
                const [eventData, activityData] = await Promise.all([
                    eventsAPI.getAllPublic(),
                    activitiesAPI.getAll().catch(() => [] as Activity[]),
                ])
                if (cancelled) return
                setEvents(Array.isArray(eventData) ? eventData : [])
                setStandalone(Array.isArray(activityData) ? activityData : [])
            } catch (err) {
                console.error(err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [])

    // งานหนึ่งงาน = การ์ดเดียว (ไม่ว่าจะมีกี่กิจกรรมย่อย) + กิจกรรมเดี่ยว — ตัวประกอบเดียวกับหน้าแรก
    const allItems = useMemo(() => buildFeaturedCards(events, standalone, hrefs), [events, standalone, hrefs])
    const filtered = useMemo(() => filterAndSortItems(allItems, filters), [allItems, filters])
    const grouped = useMemo(() => groupByCategory(filtered), [filtered])
    const counts = useMemo(() => facetCounts(allItems, filters), [allItems, filters])
    const openCount = loading ? null : allItems.filter((item) => item.status === "open").length
    const panelActive = activePanelFilterCount(filters)

    return (
        <>
            <EventsHero
                prompt={prompt}
                subtitle={subtitle}
                search={filters.search}
                onSearch={(search) => setFilters((prev) => ({ ...prev, search }))}
                openCount={openCount}
                className={appBarOnMobile ? "max-lg:hidden" : undefined}
            />

            <Container className={cn("py-10", appBarOnMobile && "max-lg:pt-4")}>
                {/* ── ส่วนบนของจอแคบ: ค้นหา+ตัวกรอง (เมื่อไม่มีแถบยีนส์) → ชิปหมวดหมู่ → ป้ายเปิดรับสมัคร ── */}
                <div className="mb-5 flex flex-col gap-3.5 lg:hidden">
                    {appBarOnMobile && (
                        <form role="search" aria-label="ค้นหากิจกรรม" onSubmit={(e) => e.preventDefault()} className="flex gap-2.5">
                            <label htmlFor="events-search-mobile" className="sr-only">
                                ค้นหาชื่องานหรือกิจกรรม
                            </label>
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-denim-muted" aria-hidden="true" />
                                <input
                                    id="events-search-mobile"
                                    type="search"
                                    placeholder="ค้นหาชื่องานหรือกิจกรรม..."
                                    value={filters.search}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                                    className="h-[52px] w-full rounded-2xl border border-denim-line bg-white pl-12 pr-4 text-[15px] text-denim-deep placeholder:text-denim-muted/80 focus-visible:border-denim focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen(true)}
                                aria-label={panelActive > 0 ? `ตัวกรอง (เลือกอยู่ ${panelActive})` : "ตัวกรอง"}
                                className="relative grid size-[52px] shrink-0 place-items-center rounded-2xl border border-denim-line bg-white text-denim-deep transition-colors hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"
                            >
                                <SlidersHorizontal className="size-5" aria-hidden="true" />
                                {panelActive > 0 && (
                                    <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-amber px-1 font-code text-[11px] font-bold leading-5 text-denim-deep" aria-hidden="true">
                                        {panelActive}
                                    </span>
                                )}
                            </button>
                        </form>
                    )}
                    <CategoryChips
                        selected={filters.categories}
                        onToggle={(value) =>
                            setFilters((prev) => ({
                                ...prev,
                                categories: prev.categories.includes(value)
                                    ? prev.categories.filter((c) => c !== value)
                                    : [...prev.categories, value],
                            }))
                        }
                    />
                    {appBarOnMobile && openCount !== null && <OpenNowBanner count={openCount} />}
                </div>

                {/* @container: ความกว้างการ์ดในแถวเลื่อน (ACTIVITY_GRID_COLUMN) คิดจากความกว้างเต็มของตัวห่อนี้ */}
                <div className="@container">
                    <div className="lg:grid lg:grid-cols-3 lg:gap-6">
                        <aside className="hidden lg:block" aria-label="ตัวกรองกิจกรรม">
                            <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[20px] border border-denim-line bg-white p-5">
                                <EventsFilterSidebar values={filters} onChange={setFilters} counts={counts} />
                            </div>
                        </aside>

                        <div className="min-w-0 lg:col-span-2">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <p className="font-code text-xs text-denim-muted max-lg:hidden" aria-live="polite">
                                    {loading ? "→ กำลังโหลด..." : `→ พบ ${filtered.length} รายการ`}
                                </p>
                                {/* จอแคบ: นับเป็น "6 กิจกรรม" ตัวหนา (แถวรายการ ไม่ใช่การ์ด) */}
                                <p className="text-[15px] text-denim-muted lg:hidden" aria-live="polite">
                                    {loading ? (
                                        "กำลังโหลด..."
                                    ) : (
                                        <>
                                            <strong className="font-display text-lg font-bold text-denim-deep">{filtered.length}</strong> กิจกรรม
                                        </>
                                    )}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMobileFiltersOpen(true)}
                                        className={cn(
                                            "inline-flex min-h-11 items-center gap-2 rounded-xl border border-denim-line bg-white px-3.5 text-sm font-semibold text-denim-deep transition-colors hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim lg:hidden",
                                            // มีปุ่มตัวกรองข้างช่องค้นหาด้านบนแล้ว
                                            appBarOnMobile && "hidden"
                                        )}
                                    >
                                        <SlidersHorizontal className="size-4" aria-hidden="true" />
                                        ตัวกรอง
                                        {panelActive > 0 && (
                                            <span className="rounded-full bg-amber px-1.5 font-code text-xs text-denim-deep">{panelActive}</span>
                                        )}
                                    </button>
                                    {/* จอแคบแสดงเป็นแถวรายการเสมอ (กรองหมวดหมู่ด้วยชิปด้านบนแทนมุมมอง "ตามหมวดหมู่") */}
                                    <div role="group" aria-label="รูปแบบการแสดงผล" className="inline-flex gap-1 rounded-xl border border-denim-line bg-white p-1 max-lg:hidden">
                                        {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => {
                                            const active = view === value
                                            return (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => setView(value)}
                                                    className={cn(
                                                        "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim",
                                                        active ? "bg-denim-deep text-white" : "text-denim-ink hover:bg-denim-paper hover:text-denim-deep"
                                                    )}
                                                >
                                                    <Icon className="size-4" aria-hidden="true" />
                                                    {label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div aria-busy="true">
                                    <span className="sr-only">กำลังโหลดกิจกรรม</span>
                                    <div className="flex flex-col gap-3 lg:hidden">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <ActivityListRowSkeleton key={i} />
                                        ))}
                                    </div>
                                    <div className={cn(ACTIVITY_GRID, "lg:grid-cols-2 max-lg:hidden")}>
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <ActivityCardSkeleton key={i} />
                                        ))}
                                    </div>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="rounded-[20px] border-2 border-dashed border-denim-field bg-white px-6 py-14 text-center">
                                    <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-denim-chip">
                                        <Search className="size-7 text-denim" aria-hidden="true" />
                                    </span>
                                    <h2 className="font-display text-xl font-bold text-denim-deep">ไม่พบกิจกรรมที่ค้นหา</h2>
                                    <p className="mx-auto mt-2 max-w-sm text-denim-muted">
                                        ลองใช้คำค้นหาอื่น เลือกตัวกรองอื่น หรือรองานใหม่เปิดรับสมัครเร็วๆ นี้
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setFilters(INITIAL_FILTERS)}
                                        className="mt-6 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-denim-field bg-white px-6 text-sm font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                                    >
                                        ล้างคำค้นหาและตัวกรองทั้งหมด
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* จอแคบ: แถวรายการ (ดู ActivityListRow) — ไม่ขึ้นกับมุมมองที่เลือก (ปุ่มเลือกมุมมองซ่อนบนจอแคบ) */}
                                    <ul className="flex flex-col gap-3 lg:hidden">
                                        {filtered.map((item) => (
                                            <li key={item.key}>
                                                <ActivityListRow item={item} />
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="max-lg:hidden">
                                        {view === "all" ? (
                                            // lg+ = 2 คอลัมน์ของผังหน้า 3 คอลัมน์ (กว้างเท่าการ์ดหน้าแรก)
                                            <div className={cn(ACTIVITY_GRID, "lg:grid-cols-2")}>
                                                {filtered.map((item) => (
                                                    <PublicActivityCard key={item.key} item={item} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-10">
                                                {grouped.map(({ category, items }) => (
                                                    <HorizontalScrollSection key={category.value} title={category.label} count={items.length}>
                                                        {items.map((item) => (
                                                            <PublicActivityCard key={item.key} item={item} className={cn("shrink-0 snap-start", ACTIVITY_GRID_COLUMN)} />
                                                        ))}
                                                    </HorizontalScrollSection>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Container>

            <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ตัวกรอง</DialogTitle>
                    </DialogHeader>
                    <DialogClose onClick={() => setMobileFiltersOpen(false)} />
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                        <EventsFilterSidebar values={filters} onChange={setFilters} counts={counts} heading={false} />
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileFiltersOpen(false)}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-denim-deep text-sm font-semibold text-white transition-colors hover:bg-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                    >
                        ดูผลลัพธ์ ({filtered.length})
                    </button>
                </DialogContent>
            </Dialog>
        </>
    )
}
