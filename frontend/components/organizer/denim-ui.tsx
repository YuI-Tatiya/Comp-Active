"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Plus, Search } from "lucide-react"
import { Container } from "@/components/layout/container"
import { Select } from "@/components/ui/select"
import type { FilterSpec } from "@/components/ui/filter-bar"
import { cn } from "@/lib/utils"

/* ชิ้นส่วนธีม Denim Varsity ที่ใช้ร่วมกันหลายหน้าในพอร์ทัลผู้จัด — หน้าหลัก (/organizer), จัดการกิจกรรม (/organizer/manage)
   และแดชบอร์ด (/organizer/dashboard)
   แต่ละหน้าจัดวางเนื้อหาของตัวเอง ไฟล์นี้มีแค่ส่วนที่หน้าตาต้องเหมือนกันทุกหน้า */

/* ── แถบหัวหน้า ──────────────────────────────────────────────────────────── */

/**
 * พื้นยีนส์ + กรอบเส้นประอำพัน (มุมบนโค้ง ไม่มีขอบล่าง) + แถบหมากรุกปิดท้าย — เนื้อหาในกรอบจัดวางเองผ่าน className
 * ส่วนที่วางต่อท้ายแล้วดึงขึ้นมาทับขอบล่าง (การ์ดสถิติ/แท็บสถานะ) ต้องเผื่อที่ไว้ด้วย padding ล่างของกรอบเอง
 */
export function DenimHero({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <section className="denim-weave relative overflow-hidden">
            <Container className="pt-6 sm:pt-8">
                <div
                    className={cn(
                        "rounded-t-[28px] border-2 border-b-0 border-dashed border-amber/55 px-4 pt-10 sm:px-10 sm:pt-12",
                        className
                    )}
                >
                    {children}
                </div>
            </Container>
            <div className="checker-strip h-3.5" aria-hidden="true" />
        </section>
    )
}

/**
 * บรรทัดคำสั่งเทอร์มินัลเหนือหัวข้อ + เคอร์เซอร์กะพริบ — มือถือย่อเหลือ text-xs ให้คำสั่งยาวๆ (หน้าจัดการ) พอดีบรรทัด
 * เคอร์เซอร์ผูกติดกับคำสุดท้ายเสมอ ไม่งั้นจอแคบมันหล่นไปขึ้นบรรทัดใหม่อยู่ตัวเดียว
 */
export function TerminalPrompt({ children }: { children: string }) {
    const cut = children.lastIndexOf(" ") + 1
    return (
        <p className="font-code text-xs text-denim-on-muted sm:text-sm">
            {children.slice(0, cut)}
            <span className="whitespace-nowrap">
                {children.slice(cut)}
                <span className="term-cursor" aria-hidden="true" />
            </span>
        </p>
    )
}

/** ปุ่มหลักสีอำพันมีเงาแข็งด้านล่าง (ปุ่มกดได้แบบนูน) — "สร้างกิจกรรมใหม่" ในแถบหัวหน้าทุกหน้า */
export const AMBER_BUTTON =
    "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[14px] bg-amber px-6 text-base font-semibold text-denim-deep shadow-[0_4px_0_var(--color-amber-deep)] transition-[transform,box-shadow] hover:-translate-y-px active:translate-y-0.5 active:shadow-[0_2px_0_var(--color-amber-deep)] focus-visible:outline-white"

/* ── การ์ดสถิติใต้แถบหัวหน้า ────────────────────────────────────────────────── */

export interface OrganizerStat {
    /** ป้ายตัวพิมพ์ใหญ่แบบโค้ด เช่น ALL_EVENTS */
    code: string
    label: string
    value: string | number
    icon: LucideIcon
    /** การ์ดเด่น (พื้นยีนส์) — ดีไซน์ใช้กับ "กำลังเปิดรับสมัคร" ใบเดียว */
    highlight?: boolean
    /** ขอบอำพันเรียกความสนใจ — ใช้กับ "รออนุมัติ" เมื่อมีคำขอค้าง */
    attention?: boolean
    /** บรรทัดอธิบายจางๆ ใต้ป้าย (แดชบอร์ด) — มีแล้วป้ายกลายเป็นตัวหนาตามดีไซน์ */
    caption?: string
}

export function OrganizerStatCards({ stats }: { stats: OrganizerStat[] }) {
    return (
        <section aria-label="สรุปภาพรวม" className="relative z-[1] -mt-16">
            <Container>
                {/* มือถือ 2x2 แทนเรียงเดี่ยว 4 ใบ (ใบละ ~170px = กินจอไปเกือบ 700px ก่อนถึงรายการกิจกรรม) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {stats.map(({ code, label, value, icon: Icon, highlight, attention, caption }) => (
                        <div
                            key={code}
                            className={cn(
                                "flex min-w-0 flex-col gap-2.5 rounded-[20px] px-4 py-4 sm:px-6 sm:py-[22px]",
                                highlight
                                    ? "denim-weave text-white shadow-[0_14px_34px_-20px_rgb(18_34_61_/_0.6)]"
                                    : "border bg-white shadow-[0_14px_34px_-20px_rgb(18_34_61_/_0.5)]",
                                !highlight && (attention ? "border-amber ring-2 ring-amber/30" : "border-denim-line")
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className={cn(
                                        "min-w-0 truncate font-code text-[11px] tracking-[0.04em] sm:text-xs",
                                        highlight ? "text-denim-on-soft" : "text-denim-muted"
                                    )}
                                >
                                    {code}
                                </span>
                                <span
                                    className={cn(
                                        "grid size-9 shrink-0 place-items-center rounded-xl sm:size-10",
                                        highlight || attention ? "bg-amber" : "bg-denim-chip"
                                    )}
                                >
                                    <Icon
                                        className={cn("size-5", highlight || attention ? "text-denim-deep" : "text-denim")}
                                        strokeWidth={highlight ? 2.2 : 2}
                                        aria-hidden="true"
                                    />
                                </span>
                            </div>
                            <div
                                className={cn(
                                    "font-display text-[36px] font-bold leading-none tabular-nums sm:text-[44px]",
                                    highlight ? "text-white" : "text-denim-deep"
                                )}
                            >
                                {value}
                            </div>
                            <div>
                                <div
                                    className={cn(
                                        "text-sm",
                                        caption && "font-semibold",
                                        highlight ? (caption ? "text-white" : "text-denim-on") : caption ? "text-denim-deep" : "text-denim-ink"
                                    )}
                                >
                                    {label}
                                </div>
                                {caption && (
                                    <div className={cn("mt-0.5 text-xs", highlight ? "text-denim-on-soft" : "text-denim-muted")}>
                                        {caption}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    )
}

/* ── แท็บสถานะ ───────────────────────────────────────────────────────────── */

interface StatusTabsProps {
    tabs: { value: string; label: string }[]
    value: string
    counts: Record<string, number>
    onChange: (value: string) => void
    /** เพิ่ม class ที่กรอบแคปซูล เช่น เงาตอนวางลอยทับแถบหัวหน้า (หน้าจัดการกิจกรรม) */
    className?: string
}

export function StatusTabs({ tabs, value, counts, onChange, className }: StatusTabsProps) {
    return (
        // จอแคบเลื่อนแนวนอนแทนการตัดขึ้นบรรทัดใหม่ — กรอบแคปซูลสองแถวดูเหมือนหน้าตาพัง
        // sm+ แท็บพอดีบรรทัดเดียวแล้ว จึงปล่อย overflow ให้เงาของกรอบไม่ถูกตัด
        <div className="-mx-1 max-w-full overflow-x-auto px-1 py-1 sm:overflow-visible">
            <div
                role="group"
                aria-label="กรองตามสถานะกิจกรรม"
                className={cn("inline-flex gap-1.5 rounded-full border border-denim-line bg-white p-1.5", className)}
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

/* ── ปกการ์ด ─────────────────────────────────────────────────────────────── */

/** open = ลายตามหมวดหมู่ · closed = ปกเทา (ปิดรับ/จบ/ยกเลิก แยกจากงานที่ยังเปิดได้ในพริบตา) · draft = ลายพิมพ์เขียว */
export type CoverTone = "open" | "closed" | "draft"

/** ป้ายหมวดหมู่สั้นแบบแท็กโค้ด — key เป็น value ที่ backend เก็บ (lib/categories.ts) */
const CATEGORY_TAGS: Record<string, string> = {
    Technology: "TECH",
    Academic: "ACAD",
    Competition: "COMP",
    Volunteer: "VOLUNTEER",
    Sports: "SPORT",
    "Art & Culture": "CULTURE",
}

export function categoryTag(categories: string[]): string | null {
    if (categories.length === 0) return null
    const first = CATEGORY_TAGS[categories[0]] ?? categories[0].toUpperCase()
    return categories.length > 1 ? `#${first} +${categories.length - 1}` : `#${first}`
}

function coverPattern(tone: CoverTone, categories: string[]): string {
    if (tone === "draft") return "cover-draft"
    if (tone === "closed") return "cover-closed"
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

/** วันที่ตัวใหญ่บนปก — "18" + "ต.ค. 69" ตามเวลาไทย (เหมือน formatEventDate ของการ์ดอื่น) */
function coverDate(ms: number): { day: string; month: string } | null {
    if (!Number.isFinite(ms)) return null
    const d = new Date(ms)
    const day = new Intl.DateTimeFormat("th-TH", { day: "2-digit", timeZone: "Asia/Bangkok" }).format(d)
    const month = new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "Asia/Bangkok" }).format(d)
    return { day, month }
}

/** รหัสอ้างอิงบนปก — EVT- = งาน, ACT- = กิจกรรมเดี่ยว (id คนละตารางกัน จึงต้องแยก prefix) */
export function referenceCode(prefix: "EVT" | "ACT", id: number): string {
    return `${prefix}-${String(id).padStart(4, "0")}`
}

interface CardCoverProps {
    tone: CoverTone
    categories: string[]
    code: string
    /** วันจัดวันแรก (epoch ms) — ไม่ส่ง/ใช้ไม่ได้ = ไม่แสดงวันที่ตัวใหญ่ */
    dateMs?: number
    topLeft?: React.ReactNode
    topRight?: React.ReactNode
    /** แทนที่วันที่ตัวใหญ่มุมขวาล่าง เช่น ไอคอนของฉบับร่างที่ยังไม่มีวันจัด */
    bottomRight?: React.ReactNode
}

export function CardCover({ tone, categories, code, dateMs, topLeft, topRight, bottomRight }: CardCoverProps) {
    const date = dateMs === undefined ? null : coverDate(dateMs)
    return (
        <div className={cn("relative flex h-[150px] shrink-0 flex-col justify-between p-4", coverPattern(tone, categories))}>
            <div className="flex items-start justify-between gap-2">
                {topLeft ?? <span />}
                {topRight}
            </div>
            <div className="flex items-end justify-between gap-3">
                <span className="font-code text-xs text-white/75">{code}</span>
                {bottomRight ??
                    (date && (
                        <span className="text-right font-display text-[44px] font-bold leading-[0.9] text-white/90">
                            {date.day}
                            <span className="block text-sm font-semibold tracking-[0.06em] text-white/75">{date.month}</span>
                        </span>
                    ))}
            </div>
            <div className="absolute inset-x-4 bottom-0 border-t-2 border-dashed border-amber/60" aria-hidden="true" />
        </div>
    )
}

/** แท็กหมวดหมู่บนปก — solid = ชิปขาว (หน้าหลัก), outline = เส้นขอบขาวโปร่ง (หน้าจัดการ ที่มุมซ้ายเป็นป้ายสถานะขาวอยู่แล้ว) */
export function CoverTag({ variant = "solid", children }: { variant?: "solid" | "outline"; children: React.ReactNode }) {
    return (
        <span
            className={cn(
                "shrink-0 rounded-lg px-2.5 py-[5px] font-code text-xs font-semibold",
                variant === "solid" ? "bg-white/95 text-denim-deep" : "border border-white/45 text-white"
            )}
        >
            {children}
        </span>
    )
}

/** ป้ายขาวมีจุดสีบนปก — สถานะเผยแพร่/อนุมัติของรายการนั้น */
export function CoverPill({ dotClassName, children }: { dotClassName: string; children: React.ReactNode }) {
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-[5px] text-xs font-semibold text-denim-deep">
            <span className={cn("size-[7px] rounded-full", dotClassName)} aria-hidden="true" />
            {children}
        </span>
    )
}

/* ── กริด / ช่องสร้างใหม่ / โครงระหว่างโหลด ─────────────────────────────────── */

/** กริดการ์ด — คอลัมน์ยืดตามจอ (ขั้นต่ำ 300px) การ์ดในแถวเดียวกันสูงเท่ากัน */
export const ACTIVITY_GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6"

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
