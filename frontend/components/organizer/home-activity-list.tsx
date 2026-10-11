"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, CalendarDays, Plus, Search, SquareCheckBig, X } from "lucide-react"
import { Select } from "@/components/ui/select"
import type { FilterSpec } from "@/components/ui/filter-bar"
import { categoryLabel } from "@/lib/categories"
import { cn } from "@/lib/utils"

/* ชิ้นส่วนรายการกิจกรรมของหน้าหลักผู้จัด (ธีม Denim Varsity) — แท็บสถานะ, แผงตัวกรอง, การ์ด, ช่องสร้างใหม่
   ตรรกะการกรอง/เรียงอยู่ที่หน้า (app/organizer/page.tsx) ไฟล์นี้วาดอย่างเดียว */

export type ActivityStatus = "open" | "closed" | "cancelled"

/* ── แท็บสถานะ ───────────────────────────────────────────────────────────── */

interface StatusTabsProps {
    tabs: { value: string; label: string }[]
    value: string
    counts: Record<string, number>
    onChange: (value: string) => void
}

export function StatusTabs({ tabs, value, counts, onChange }: StatusTabsProps) {
    return (
        // จอแคบเลื่อนแนวนอนแทนการตัดขึ้นบรรทัดใหม่ — กรอบแคปซูลสองแถวดูเหมือนหน้าตาพัง
        <div className="-mx-1 max-w-full self-start overflow-x-auto px-1 py-1">
            <div
                role="group"
                aria-label="กรองตามสถานะกิจกรรม"
                className="inline-flex gap-1.5 rounded-full border border-denim-line bg-white p-1.5"
            >
                {tabs.map((tab) => {
                    const active = value === tab.value
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChange(tab.value)}
                            className={cn(
                                "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-[18px] text-[15px] transition-colors",
                                active
                                    ? "bg-denim font-semibold text-white"
                                    : "font-medium text-denim-ink hover:bg-denim-paper hover:text-denim-deep"
                            )}
                        >
                            {tab.label}
                            <span
                                className={cn(
                                    "rounded-full px-2 py-0.5 font-code text-xs tabular-nums",
                                    active ? "bg-amber font-semibold text-denim-deep" : "bg-denim-chip text-denim-ink"
                                )}
                            >
                                {counts[tab.value] ?? 0}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/* ── แผงค้นหา + ตัวกรอง ──────────────────────────────────────────────────── */

const FIELD =
    "min-h-11 h-11 rounded-xl border-[1.5px] border-denim-field bg-white text-sm text-denim-deep hover:border-denim-dash focus-visible:border-denim focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-amber"

interface FilterPanelProps {
    searchValue: string
    onSearchChange: (value: string) => void
    searchPlaceholder: string
    filters: FilterSpec[]
    values: Record<string, string>
    onFilterChange: (key: string, value: string) => void
}

export function FilterPanel({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    filters,
    values,
    onFilterChange,
}: FilterPanelProps) {
    return (
        <form
            role="search"
            aria-label="ตัวกรองกิจกรรม"
            onSubmit={(e) => e.preventDefault()}
            // มือถือ 2 คอลัมน์ตายตัว (auto-fit 170px เหลือคอลัมน์เดียว = ช่องเรียงลงมา 6 ช่องยาวเกินจอ)
            className="grid grid-cols-2 gap-3.5 rounded-[20px] border border-denim-line bg-white p-5 sm:grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))]"
        >
            <div className="col-span-2 flex min-w-0 flex-col gap-1.5">
                <label htmlFor="organizer-search" className="text-[13px] font-semibold text-denim-ink">
                    ค้นหา
                </label>
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-denim-muted"
                        aria-hidden="true"
                    />
                    <input
                        id="organizer-search"
                        type="search"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className={cn(FIELD, "w-full pl-[38px] pr-3 placeholder:text-denim-muted/80")}
                    />
                </div>
            </div>

            {filters.map((f) => (
                <div key={f.key} className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor={`organizer-filter-${f.key}`} className="text-[13px] font-semibold text-denim-ink">
                        {f.label}
                    </label>
                    <Select
                        id={`organizer-filter-${f.key}`}
                        className={FIELD}
                        value={values[f.key] ?? f.neutralValue ?? ""}
                        onChange={(e) => onFilterChange(f.key, e.target.value)}
                    >
                        {f.options.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </Select>
                </div>
            ))}
        </form>
    )
}

/** บรรทัด "→ พบ N รายการ" ใต้แผงตัวกรอง + ปุ่มล้างเมื่อมีตัวกรองทำงานอยู่ */
export function ResultLine({
    count,
    activeFilters,
    onReset,
}: {
    count: number | undefined
    activeFilters: number
    onReset: () => void
}) {
    return (
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-3">
            <p className="font-code text-[13px] text-denim-muted" aria-live="polite">
                {count === undefined ? (
                    "→ กำลังโหลด..."
                ) : (
                    <>
                        → พบ <strong className="font-semibold text-denim-deep">{count}</strong> รายการ
                    </>
                )}
            </p>
            {activeFilters > 0 && (
                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 rounded-full bg-denim-chip px-3 py-1 text-[13px] font-semibold text-denim transition-colors hover:bg-denim-line"
                >
                    <X className="size-3.5" aria-hidden="true" />
                    ล้างตัวกรอง ({activeFilters})
                </button>
            )}
        </div>
    )
}

/* ── การ์ดกิจกรรม ────────────────────────────────────────────────────────── */

/** ป้ายหมวดหมู่สั้นแบบแท็กโค้ด — ค่าเป็น value ที่ backend เก็บ (lib/categories.ts) */
const CATEGORY_TAGS: Record<string, string> = {
    Technology: "TECH",
    Academic: "ACAD",
    Competition: "COMP",
    Volunteer: "VOLUNTEER",
    Sports: "SPORT",
    "Art & Culture": "CULTURE",
}

function categoryTag(categories: string[]): string | null {
    if (categories.length === 0) return null
    const first = CATEGORY_TAGS[categories[0]] ?? categories[0].toUpperCase()
    return categories.length > 1 ? `#${first} +${categories.length - 1}` : `#${first}`
}

/** ลายปกตามหมวดหมู่แรก — ปิดรับ/ยกเลิกแล้วเป็นปกเทาเสมอ ให้แยกออกจากงานที่ยังเปิดได้ในพริบตา */
function coverClass(status: ActivityStatus, categories: string[]): string {
    if (status !== "open") return "cover-closed"
    switch (categories[0]) {
        case "Technology":
            return "cover-dots"
        case "Academic":
            return "cover-lines"
        case "Competition":
            return "cover-grid"
        default:
            return "denim-weave"
    }
}

const STATUS_PILL: Record<ActivityStatus, { label: string; pill: string; dot: string }> = {
    open: { label: "กำลังเปิด", pill: "bg-amber text-denim-deep", dot: "bg-denim-deep" },
    closed: { label: "ปิดรับสมัคร", pill: "border border-white/35 bg-denim-deep/55 text-white", dot: "bg-[#c3ccd9]" },
    cancelled: { label: "ยกเลิกแล้ว", pill: "border border-white/35 bg-denim-deep/55 text-white", dot: "bg-red-400" },
}

/** วันที่ตัวใหญ่บนปก — "18" + "ต.ค. 69" ตามเวลาไทย (เหมือน formatEventDate ของการ์ดอื่น) */
function coverDate(ms: number): { day: string; month: string } | null {
    if (!Number.isFinite(ms)) return null
    const d = new Date(ms)
    const day = new Intl.DateTimeFormat("th-TH", { day: "2-digit", timeZone: "Asia/Bangkok" }).format(d)
    const month = new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "Asia/Bangkok" }).format(d)
    return { day, month }
}

function CardRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 rounded-[10px] bg-denim-paper px-3 py-[9px] text-[13px] text-denim-ink">
            <Icon className="size-4 shrink-0 text-denim-accent" aria-hidden="true" />
            <span className="min-w-0 truncate">{children}</span>
        </div>
    )
}

export interface ActivityCardData {
    href: string
    name: string
    description?: string | null
    categories: string[]
    status: ActivityStatus
    /** รหัสอ้างอิงบนปก เช่น EVT-0118 */
    code: string
    /** วันจัดวันแรก (epoch ms) — ใช้เป็นวันที่ตัวใหญ่บนปก */
    dateMs: number
    /** ข้อความแถว "จัดกิจกรรม …" (ช่วงวันที่ของทั้งงาน) */
    dateLabel: string
    registrationWindow: string | null
    /** ของตัวเอง = "จัดการ" · ของผู้จัดคนอื่น = "ดูรายละเอียด" */
    actionLabel: string
}

export function ActivityCard({ item }: { item: ActivityCardData }) {
    const tag = categoryTag(item.categories)
    const pill = STATUS_PILL[item.status]
    const date = coverDate(item.dateMs)
    const categoryNote = item.categories.map(categoryLabel).join(" · ") || "ไม่ระบุหมวดหมู่"

    return (
        <Link
            href={item.href}
            className="group block h-full rounded-[22px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
            <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-denim-line bg-white transition-[transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-18px_rgb(18_34_61_/_0.45)]">
                <div className={cn("relative flex h-[150px] shrink-0 flex-col justify-between p-4", coverClass(item.status, item.categories))}>
                    <div className="flex items-start justify-between gap-2">
                        {tag ? (
                            <span className="rounded-lg bg-white/95 px-2.5 py-[5px] font-code text-xs font-semibold text-denim-deep">
                                {tag}
                            </span>
                        ) : (
                            <span />
                        )}
                        <span
                            className={cn(
                                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-semibold",
                                pill.pill
                            )}
                        >
                            <span className={cn("size-[7px] rounded-full", pill.dot)} aria-hidden="true" />
                            {pill.label}
                        </span>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                        <span className="font-code text-xs text-white/75">{item.code}</span>
                        {date && (
                            <span className="text-right font-display text-[44px] font-bold leading-[0.9] text-white/90">
                                {date.day}
                                <span className="block text-sm font-semibold tracking-[0.06em] text-white/75">{date.month}</span>
                            </span>
                        )}
                    </div>
                    <div className="absolute inset-x-4 bottom-0 border-t-2 border-dashed border-amber/60" aria-hidden="true" />
                </div>

                <div className="flex flex-1 flex-col gap-3.5 p-5">
                    <div className="flex flex-col gap-1.5">
                        <h3 className="line-clamp-2 font-display text-xl font-bold leading-[1.3] text-denim-deep">{item.name}</h3>
                        {item.description && (
                            <p className="line-clamp-2 text-sm leading-[1.55] text-denim-muted">{item.description}</p>
                        )}
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <CardRow icon={CalendarDays}>จัดกิจกรรม {item.dateLabel}</CardRow>
                        {/* กิจกรรมเดี่ยวไม่มีช่วงรับสมัครในสคีมา (ไม่มีฟิลด์นี้เลย) — ซ่อนแถวนี้แทนที่จะโชว์ค่าว่าง */}
                        {item.registrationWindow && <CardRow icon={SquareCheckBig}>{item.registrationWindow}</CardRow>}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-denim-chip pt-3">
                        <span className="min-w-0 truncate text-[13px] text-denim-muted">{categoryNote}</span>
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-denim transition-colors group-hover:text-denim-deep">
                            {item.actionLabel}
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                    </div>
                </div>
            </article>
        </Link>
    )
}

/** ช่องเส้นประท้ายกริด — ทางลัดไปสร้างกิจกรรม (ช่องเดียวที่เหลือเมื่อยังไม่มีกิจกรรมเลย) */
export function CreateActivityTile() {
    return (
        <Link
            href="/organizer/create"
            className="flex min-h-[300px] flex-col items-center justify-center gap-3.5 rounded-[22px] border-2 border-dashed border-denim-dash bg-white p-6 text-center text-denim transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
            <span className="denim-weave grid size-16 place-items-center rounded-[20px]">
                <Plus className="size-7 text-amber" strokeWidth={2.4} aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-bold">สร้างกิจกรรมใหม่</span>
            <span className="max-w-[220px] text-sm leading-normal text-denim-muted">
                เปิดรับสมัคร ออกใบรับรอง และติดตามผู้เข้าร่วมได้ในที่เดียว
            </span>
        </Link>
    )
}

export function ActivityCardSkeleton() {
    return (
        <div className="flex h-[380px] flex-col overflow-hidden rounded-[22px] border border-denim-line bg-white" aria-hidden="true">
            <div className="h-[150px] animate-pulse bg-denim-chip" />
            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="h-6 w-3/4 animate-pulse rounded-md bg-denim-chip" />
                <div className="h-4 w-full animate-pulse rounded-md bg-denim-paper" />
                <div className="mt-auto h-9 animate-pulse rounded-[10px] bg-denim-paper" />
                <div className="h-9 animate-pulse rounded-[10px] bg-denim-paper" />
            </div>
        </div>
    )
}

/** กริดการ์ด — คอลัมน์ยืดตามจอ (ขั้นต่ำ 300px) การ์ดในแถวเดียวกันสูงเท่ากัน */
export const ACTIVITY_GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6"
