"use client"

import { forwardRef, useState } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Eye, EyeOff, Lock, Plus, Search } from "lucide-react"
import { Container } from "@/components/layout/container"
import { Input, type InputProps } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { FilterSpec } from "@/components/ui/filter-bar"
import { cn } from "@/lib/utils"
import { resolveUploadUrl } from "@/lib/api"
import { getCategory } from "@/lib/categories"

/* ชิ้นส่วนธีม Denim Varsity ที่ใช้ร่วมกันหลายหน้า — พอร์ทัลผู้จัด (หน้าหลัก /organizer, จัดการ /organizer/manage,
   แดชบอร์ด /organizer/dashboard) และหน้าแรกฝั่ง public (/)
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

/** ปุ่มรองเส้นขอบขาวบนพื้นยีนส์ — คู่กับ AMBER_BUTTON ในแถบหัวหน้า */
export const OUTLINE_ON_DENIM_BUTTON =
    "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-white/45 px-[22px] text-base font-medium text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-white"

/* ── หัวข้อส่วน / ปุ่มกลม ─────────────────────────────────────────────────── */

/**
 * หัวข้อส่วนแบบคอมเมนต์โค้ดนำหน้า ("// news.latest()") + h2 + คำอธิบาย (ถ้ามี) + ช่องขวาสำหรับลิงก์/ปุ่มเลื่อน
 * tone="dark" สำหรับส่วนที่พื้นยีนส์เข้ม (คอมเมนต์เป็นอำพัน หัวข้อขาว)
 */
export function DenimSectionHeading({
    id,
    comment,
    title,
    description,
    action,
    tone = "light",
    size = "page",
}: {
    id: string
    comment: string
    title: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    tone?: "light" | "dark"
    /** page = หัวข้อส่วนของหน้า (ตัวใหญ่) · card = หัวการ์ดข้อมูล เช่นการ์ดในแดชบอร์ดของกิจกรรม */
    size?: "page" | "card"
}) {
    const dark = tone === "dark"
    const card = size === "card"
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className={cn("flex min-w-0 flex-col", card ? "gap-1" : "gap-1.5")}>
                <span
                    className={cn("font-code", card ? "text-xs" : "text-[13px]", dark ? "text-amber" : "text-denim-accent")}
                    aria-hidden="true"
                >
                    {`// ${comment}`}
                </span>
                <h2
                    id={id}
                    className={cn(
                        "font-display font-bold leading-tight",
                        card ? "text-2xl" : "text-[30px] sm:text-[34px]",
                        dark ? "text-white" : "text-denim-deep"
                    )}
                >
                    {title}
                </h2>
                {description && (
                    <p className={cn(card ? "text-sm" : "text-[15px]", dark ? "text-denim-on" : "text-denim-muted")}>{description}</p>
                )}
            </div>
            {action}
        </div>
    )
}

/** แผงเนื้อหาพื้นขาวขอบมน (หน้าหลักและโปรไฟล์นักศึกษา) — labelledBy = id ของหัวข้อในแผง */
export function DenimPanel({
    labelledBy,
    className,
    children,
}: {
    labelledBy: string
    className?: string
    children: React.ReactNode
}) {
    return (
        <section
            aria-labelledby={labelledBy}
            className={cn(
                "rounded-[24px] border border-denim-line bg-white p-5 shadow-[0_14px_34px_-28px_rgb(18_34_61/0.45)] sm:p-7",
                className
            )}
        >
            {children}
        </section>
    )
}

/* ── แถบหัวโปรไฟล์ (ผู้จัด/นักศึกษา) ───────────────────────────────────────── */

/** ตัวอักษรบนอวตาร — ข้ามสระหน้า (เ แ โ ใ ไ) ไม่งั้นชื่ออย่าง "เกศินี" ได้ "เ" ลอยอยู่ตัวเดียว */
export function nameInitial(name: string): string {
    const trimmed = name.trim().replace(/^[เแโใไ]/, "")
    return (trimmed.charAt(0) || "?").toUpperCase()
}

/**
 * อวตารป้ายปักสีอำพัน (มุมมน + ขอบเงาด้านล่าง) — ใช้บนแถบหัวโปรไฟล์ผู้จัด/นักศึกษา
 * framed = มีกรอบเส้นประในตัวรอบตัวอักษรด้วย (หน้าโปรไฟล์นักศึกษา, ขนาดใหญ่กว่า) — ไม่ใส่ = แผ่นเรียบ (หน้าตั้งค่าผู้จัด)
 */
export function AmberAvatarPatch({
    initial,
    framed = false,
    className,
}: {
    initial: string
    framed?: boolean
    className?: string
}) {
    return (
        <span
            className={cn(
                "grid shrink-0 place-items-center rounded-[22px] bg-amber shadow-[0_5px_0_var(--color-amber-deep)]",
                framed ? "size-20 p-1.5 sm:size-[104px]" : "size-20 font-display text-4xl font-bold text-denim-deep sm:text-5xl",
                className
            )}
        >
            {framed ? (
                <span className="grid size-full place-items-center rounded-[16px] border-2 border-dashed border-denim-deep/30 font-display text-4xl font-bold text-denim-deep sm:text-5xl">
                    {initial}
                </span>
            ) : (
                initial
            )}
        </span>
    )
}

/** ชิปข้อมูลบนพื้นยีนส์ — ป้ายโค้ด (id/mail/...) + ค่า เช่นแถบหัวโปรไฟล์ */
export function DenimInfoChip({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 font-code text-xs">
            <span className="text-amber">{label}</span>
            <span className="min-w-0 truncate text-white">{value}</span>
        </span>
    )
}

/** ปุ่มกลมขาวมีลูกศร — เลื่อนสไลด์/หน้าถัดไป */
export function RoundIconButton({
    label,
    icon: Icon,
    onClick,
}: {
    label: string
    icon: LucideIcon
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="grid size-11 place-items-center rounded-full border-[1.5px] border-denim-line bg-white text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"
        >
            <Icon className="size-5" aria-hidden="true" />
        </button>
    )
}

/* ── การ์ดสถิติใต้แถบหัวหน้า ────────────────────────────────────────────────── */

export interface OrganizerStat {
    /** ป้ายตัวพิมพ์ใหญ่แบบโค้ด เช่น ALL_EVENTS */
    code: string
    label: string
    /** ReactNode เผื่อหน่วยตัวเล็กต่อท้ายตัวเลข เช่น "12 ชม." */
    value: React.ReactNode
    icon: LucideIcon
    /** การ์ดเด่น (พื้นยีนส์) — ดีไซน์ใช้กับ "กำลังเปิดรับสมัคร" ใบเดียว */
    highlight?: boolean
    /** ขอบอำพันเรียกความสนใจ — ใช้กับ "รออนุมัติ" เมื่อมีคำขอค้าง */
    attention?: boolean
    /** บรรทัดอธิบายจางๆ ใต้ป้าย (แดชบอร์ด) — มีแล้วป้ายกลายเป็นตัวหนาตามดีไซน์ */
    caption?: string
    /** 0-100 — แสดงวงแหวนความคืบหน้าแทนไอคอน (เช่น อัตราการเข้าร่วม) */
    progress?: number
}

/** วงแหวนความคืบหน้าบนการ์ดสถิติ — ส่วนที่เติมเป็นอำพัน */
function ProgressRing({ value, onDark }: { value: number; onDark: boolean }) {
    const r = 22
    const circumference = 2 * Math.PI * r
    const v = Math.max(0, Math.min(100, value))
    return (
        <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90 sm:size-16" aria-hidden="true">
            <circle cx="28" cy="28" r={r} fill="none" strokeWidth="7" className={onDark ? "stroke-white/15" : "stroke-denim-chip"} />
            <circle
                cx="28"
                cy="28"
                r={r}
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                className="stroke-amber transition-[stroke-dashoffset] duration-700"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - v / 100)}
            />
        </svg>
    )
}

export function OrganizerStatCards({
    stats,
    strongLabels = false,
    className,
}: {
    stats: OrganizerStat[]
    /** ป้ายตัวหนาทุกใบ แม้ไม่มี caption (แดชบอร์ดของกิจกรรม) — ปกติตัวหนาเฉพาะใบที่มี caption */
    strongLabels?: boolean
    className?: string
}) {
    return (
        <section aria-label="สรุปภาพรวม" className={cn("relative z-[1] -mt-16", className)}>
            <Container>
                {/* มือถือ 2x2 แทนเรียงเดี่ยว 4 ใบ (ใบละ ~170px = กินจอไปเกือบ 700px ก่อนถึงรายการกิจกรรม) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <DenimStatCard
                            key={stat.code}
                            stat={stat}
                            strongLabel={strongLabels}
                            // ใบเด่น (พื้นยีนส์) ทับขอบล่างของแถบหัวหน้าที่เป็นยีนส์เหมือนกัน — ขอบขาวตัดไม่ให้ครึ่งบนกลืนไปกับพื้น
                            className={stat.highlight ? "border-2 border-white" : undefined}
                        />
                    ))}
                </div>
            </Container>
        </section>
    )
}

/** การ์ดสถิติหนึ่งใบ — OrganizerStatCards จัดกริด 4 ใบทับแถบหัวหน้า หน้าอื่นจัดกริดเองได้ (เช่นโปรไฟล์ 3 ใบ) */
export function DenimStatCard({
    stat: { label, value, icon: Icon, highlight, attention, caption, progress, code },
    strongLabel: strong = false,
    className,
}: {
    stat: OrganizerStat
    strongLabel?: boolean
    className?: string
}) {
    return (
        <div
            className={cn(
                "relative flex min-w-0 flex-col gap-2.5 rounded-[20px] px-4 py-4 sm:px-6 sm:py-[22px]",
                // เว้นที่ขวาให้วงแหวน ข้อความไม่วิ่งลอดใต้วงแหวนบนการ์ดแคบ (มือถือ 2 คอลัมน์)
                progress !== undefined && "pr-[4.75rem] sm:pr-24",
                highlight
                    ? "denim-weave text-white shadow-[0_14px_34px_-20px_rgb(18_34_61_/_0.6)]"
                    : "border bg-white shadow-[0_14px_34px_-20px_rgb(18_34_61_/_0.5)]",
                !highlight && (attention ? "border-amber ring-2 ring-amber/30" : "border-denim-line"),
                className
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
                {progress === undefined && (
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
                )}
            </div>
            <div
                className={cn(
                    "font-display text-[36px] font-bold leading-none tabular-nums sm:text-[44px]",
                    highlight ? "text-white" : "text-denim-deep"
                )}
            >
                {value}
            </div>
            {progress !== undefined && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-6">
                    <ProgressRing value={progress} onDark={!!highlight} />
                </span>
            )}
            <div>
                <div
                    className={cn(
                        "text-sm",
                        (caption || strong) && "font-semibold",
                        highlight
                            ? caption || strong
                                ? "text-white"
                                : "text-denim-on"
                            : caption || strong
                              ? "text-denim-deep"
                              : "text-denim-ink"
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

/* ── ฟอร์มสูง 48px (หน้า auth, ตั้งค่าบัญชี) ──────────────────────────────────── */

/** ช่องกรอกสูง 48px ของฟอร์ม — หน้า auth และหน้าตั้งค่าบัญชี (ผู้จัด/นักศึกษา) ใช้ร่วมกัน */
export const DENIM_FORM_INPUT =
    "h-12 rounded-xl border-[1.5px] border-denim-field bg-white px-4 text-[15px] text-denim-deep placeholder:text-denim-muted/70 hover:border-denim-dash focus:border-denim focus:outline-none focus-visible:ring-2 focus-visible:ring-denim/20 aria-[invalid=true]:border-red-500"

/** ช่องกรอกที่มีไอคอนนำหน้า (สูง 48px) */
export const DenimIconInput = forwardRef<HTMLInputElement, InputProps & { icon: LucideIcon }>(function DenimIconInput(
    { icon: Icon, className, ...props },
    ref
) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-denim-muted" aria-hidden="true" />
            <Input ref={ref} className={cn(DENIM_FORM_INPUT, "pl-11", className)} {...props} />
        </div>
    )
})

/** ช่องรหัสผ่าน (สูง 48px) + ปุ่มแสดง/ซ่อน (ไอคอนตาด้านขวา) */
export const DenimPasswordInput = forwardRef<HTMLInputElement, InputProps>(function DenimPasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false)
    return (
        <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-denim-muted" aria-hidden="true" />
            <Input ref={ref} type={visible ? "text" : "password"} className={cn(DENIM_FORM_INPUT, "pl-11 pr-12", className)} {...props} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-pressed={visible}
                className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-denim-muted transition-colors hover:bg-denim-paper hover:text-denim-deep"
            >
                {visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
            </button>
        </div>
    )
})

/* ── แผงค้นหา + ตัวกรอง ──────────────────────────────────────────────────── */

/** ช่องกรอก/เลือกบนพื้นขาวของธีม — แผงตัวกรองและตัวกรองในหน้าโปรไฟล์ใช้ร่วมกัน */
export const DENIM_FIELD =
    "min-h-11 h-11 rounded-xl border-[1.5px] border-denim-field bg-white text-sm text-denim-deep hover:border-denim-dash focus-visible:border-denim focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"

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
                        className={cn(DENIM_FIELD, "w-full pl-[38px] pr-3 placeholder:text-denim-muted/80")}
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
                        className={DENIM_FIELD}
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

/** ลายปกตามสถานะ/หมวดหมู่ — ใช้ทั้งปกการ์ดและปกใหญ่หน้ารายละเอียด */
export function coverPattern(tone: CoverTone, categories: string[]): string {
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

/* ── แผ่นวันที่ของรายการแบบแถว (มือถือ) ───────────────────────────────────── */

/** "16" + "ต.ค." ตามเวลาไทย — null = ไม่มีวันที่/วันที่ใช้ไม่ได้ */
export function tileDate(value: number | string | null | undefined): { day: string; month: string } | null {
    if (value === null || value === undefined) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return {
        day: new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "Asia/Bangkok" }).format(d),
        month: new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "Asia/Bangkok" }).format(d),
    }
}

/**
 * แผ่นวันที่สี่เหลี่ยมกรมท่า ("16" + "ต.ค.") หัวแถวรายการบนมือถือ — การ์ดกำลังจะถึง, แถวกิจกรรม, การ์ดกิจกรรมของฉัน
 * แถบสีล่างบอกหมวดหมู่ (สูงสุด 3 สี) เหมือนจุดสีของหมวดหมู่ที่อื่น · muted = ปิดรับ/จบ/ยกเลิก (เทา แยกออกในพริบตา)
 */
export function DateTile({
    date,
    categories = [],
    muted = false,
    className,
}: {
    date: number | string | null | undefined
    categories?: string[]
    muted?: boolean
    className?: string
}) {
    const parts = tileDate(date)
    const stripes = categories.map((c) => getCategory(c)?.dot).filter((dot): dot is string => !!dot).slice(0, 3)
    return (
        <span
            className={cn(
                "relative flex h-[66px] w-[60px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl text-white",
                muted ? "bg-denim-closed" : "bg-denim-deep",
                className
            )}
        >
            <span className="font-display text-[26px] font-bold leading-none tabular-nums">{parts?.day ?? "–"}</span>
            <span className="mt-1 text-[11px] font-semibold text-white/75">{parts?.month}</span>
            {stripes.length > 0 && (
                <span className={cn("absolute inset-x-0 bottom-0 flex h-[5px]", muted && "opacity-50")} aria-hidden="true">
                    {stripes.map((dot, i) => (
                        <span key={i} className={cn("flex-1", dot)} />
                    ))}
                </span>
            )}
        </span>
    )
}

/** ป้ายสถานะเล็กบนแถวรายการ (กำลังเปิด/ปิดรับ/รอยืนยัน ...) — tone คุมคู่สีพื้น/ตัวอักษร */
export const ROW_PILL_TONE = {
    amber: "bg-amber/20 text-amber-ink",
    green: "bg-emerald-50 text-emerald-700",
    denim: "bg-denim-chip text-denim-deep",
    grey: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-700",
} as const

export function RowPill({ tone, children }: { tone: keyof typeof ROW_PILL_TONE; children: React.ReactNode }) {
    return <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", ROW_PILL_TONE[tone])}>{children}</span>
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

/**
 * รูปที่ผู้จัดอัปโหลด (path เช่น /uploads/activities/x.jpg) → src เต็ม + ควรแสดงไหม
 * โหลดไม่ขึ้น → show = false ให้ปกกลับไปใช้ลายของธีม จำ src ที่เสียไว้ (ไม่ใช่แค่ true/false) ถ้าเปลี่ยนรูปภายหลังจะลองใหม่เอง
 */
export function useUploadImage(path: string | null | undefined) {
    const src = resolveUploadUrl(path)
    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    return { src, show: src !== null && src !== failedSrc, onError: () => setFailedSrc(src) }
}

/**
 * ไล่เฉดสีกรมท่าทับรูปปก: บนเข้มพอให้ป้ายอ่านออก กลางจางให้เห็นรูป แล้วเข้มขึ้นตั้งแต่ครึ่งล่างที่วันที่ตัวใหญ่วางอยู่
 * (ทดสอบกับรูปขาวจัดแล้ว — จางกว่านี้ตัวเลขกลืนไปกับรูป)
 */
export const PHOTO_SCRIM =
    "absolute inset-0 bg-[linear-gradient(to_bottom,rgb(18_34_61/0.5)_0%,rgb(18_34_61/0.12)_30%,rgb(18_34_61/0.5)_58%,rgb(18_34_61/0.88)_100%)]"

/** เงาจางๆ ให้ข้อความที่วางบนรูปตรงๆ (ไม่มีพื้นของตัวเอง) อ่านออกตอนรูปสว่าง */
export const PHOTO_TEXT_SHADOW = "[text-shadow:0_1px_10px_rgb(18_34_61/0.65)]"

interface CardCoverProps {
    tone: CoverTone
    categories: string[]
    /** รหัสอ้างอิงมุมซ้ายล่าง (ฝั่งผู้จัด) — หน้า public ใช้ bottomLeft แทน */
    code?: string
    /** แทนรหัสมุมซ้ายล่าง เช่น ชื่อหมวดหมู่บนการ์ดหน้าแรก */
    bottomLeft?: React.ReactNode
    /** วันจัดวันแรก (epoch ms) — ไม่ส่ง/ใช้ไม่ได้ = ไม่แสดงวันที่ตัวใหญ่ */
    dateMs?: number
    topLeft?: React.ReactNode
    topRight?: React.ReactNode
    /** แทนที่วันที่ตัวใหญ่มุมขวาล่าง เช่น ไอคอนของฉบับร่างที่ยังไม่มีวันจัด */
    bottomRight?: React.ReactNode
    /**
     * path รูปที่ผู้จัดแนบ (เช่น /uploads/activities/x.jpg) — มีรูปใช้รูปเป็นปก ไม่มีหรือโหลดไม่ขึ้นใช้ลายของธีม (tone)
     * ป้าย/วันที่ยังวางทับตำแหน่งเดิมทั้งสองแบบ
     */
    imageUrl?: string | null
}

export function CardCover({
    tone,
    categories,
    code,
    bottomLeft,
    dateMs,
    topLeft,
    topRight,
    bottomRight,
    imageUrl,
}: CardCoverProps) {
    const date = dateMs === undefined ? null : coverDate(dateMs)
    const image = useUploadImage(imageUrl)
    const showImage = image.show
    return (
        // ลายของธีมอยู่ใต้รูปเสมอ — ระหว่างรูปกำลังโหลด (หรือถ้าโหลดไม่ขึ้น) ปกจึงไม่เป็นช่องว่าง
        <div className={cn("relative flex h-[150px] shrink-0 flex-col justify-between overflow-hidden p-4", coverPattern(tone, categories))}>
            {showImage && (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลดเสิร์ฟจาก backend (/uploads) ไม่ได้ผ่านตัวย่อรูปของ Next */}
                    <img
                        src={image.src!}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={image.onError}
                        className="absolute inset-0 size-full object-cover"
                    />
                    <div className={PHOTO_SCRIM} aria-hidden="true" />
                </>
            )}
            <div className="relative flex items-start justify-between gap-2">
                {topLeft ?? <span />}
                {topRight}
            </div>
            {/* ข้อความแถวล่างวางบนรูปตรงๆ (ไม่มีพื้นของตัวเอง) — เงาจางๆ ช่วยตอนรูปสว่าง */}
            <div
                className={cn(
                    "relative flex items-end justify-between gap-3",
                    showImage && PHOTO_TEXT_SHADOW
                )}
            >
                {bottomLeft ?? <span className="font-code text-xs text-white/75">{code}</span>}
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
                // outline มีพื้นกรมท่าโปร่งรองไว้ — บนลายปกแทบไม่ต่าง แต่บนรูปที่ผู้จัดแนบ (อาจสว่าง) ตัวหนังสือขาวยังอ่านออก
                variant === "solid" ? "bg-white/95 text-denim-deep" : "border border-white/45 bg-denim-deep/40 text-white"
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

/** สถานะบนปกการ์ด (มุมขวาบน) — เปิดเป็นอำพัน, ปิด/ยกเลิกเป็นแคปซูลเข้มโปร่ง */
const STATUS_PILL: Record<"open" | "closed" | "cancelled", { label: string; pill: string; dot: string }> = {
    open: { label: "กำลังเปิด", pill: "bg-amber text-denim-deep", dot: "bg-denim-deep" },
    closed: { label: "ปิดรับสมัคร", pill: "border border-white/35 bg-denim-deep/55 text-white", dot: "bg-[#c3ccd9]" },
    cancelled: { label: "ยกเลิกแล้ว", pill: "border border-white/35 bg-denim-deep/55 text-white", dot: "bg-red-400" },
}

export function CoverStatusPill({ status }: { status: "open" | "closed" | "cancelled" }) {
    const pill = STATUS_PILL[status]
    return (
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-semibold", pill.pill)}>
            <span className={cn("size-[7px] rounded-full", pill.dot)} aria-hidden="true" />
            {pill.label}
        </span>
    )
}

/** แถวข้อมูลบนการ์ด (วันจัด / ช่วงรับสมัคร) — บรรทัดเดียว ตัดท้ายเมื่อยาวเกิน */
export function CardRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 rounded-[10px] bg-denim-paper px-3 py-[9px] text-[13px] text-denim-ink">
            <Icon className="size-4 shrink-0 text-denim-accent" aria-hidden="true" />
            <span className="min-w-0 truncate">{children}</span>
        </div>
    )
}

/* ── กริด / ช่องสร้างใหม่ / โครงระหว่างโหลด ─────────────────────────────────── */

/**
 * กริดการ์ด — คอลัมน์ยืดตามจอ (ขั้นต่ำ 300px ห่าง 24px) การ์ดในแถวเดียวกันสูงเท่ากัน
 * แก้ค่าขั้นต่ำ/ช่องห่างที่นี่ ต้องแก้ ACTIVITY_GRID_COLUMN ด้านล่างให้ตรงกันด้วย
 */
export const ACTIVITY_GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6"

/**
 * ความกว้างการ์ดในแถวเลื่อนแนวนอน (/events, /student/events) = ความกว้างคอลัมน์ของ ACTIVITY_GRID ในหน้าแรกพอดี
 * ทุกขนาดจอ — การ์ดทุกหน้าจึงเท่ากัน คิดจากความกว้างเนื้อหาของหน้า (100cqw) ไม่ใช่ความกว้างแถว เพราะแถวในหน้ารายการ
 * แคบกว่า (มีแถบตัวกรองด้านซ้าย) → ตัวห่อเต็มความกว้าง Container ของหน้าต้องใส่คลาส @container
 *
 * สูตรเดียวกับ auto-fill ของกริด: 2 คอลัมน์เมื่อกว้าง ≥ 624px (2×300 + 24), 3 คอลัมน์เมื่อ ≥ 948px (3×300 + 2×24)
 * (Container กว้างสุด 1216px จึงไม่ถึง 4 คอลัมน์)
 */
export const ACTIVITY_GRID_COLUMN =
    "w-[100cqw] @min-[624px]:w-[calc((100cqw-1.5rem)/2)] @min-[948px]:w-[calc((100cqw-3rem)/3)]"

/** ช่องเส้นประท้ายกริดการ์ด — ทางลัดไปหน้าอื่น (สร้างกิจกรรมฝั่งผู้จัด / สำรวจกิจกรรมฝั่งนักศึกษา) */
export function DashedLinkTile({
    href,
    icon: Icon,
    title,
    description,
}: {
    href: string
    icon: LucideIcon
    title: string
    description: string
}) {
    return (
        <Link
            href={href}
            className="flex min-h-[300px] flex-col items-center justify-center gap-3.5 rounded-[22px] border-2 border-dashed border-denim-dash bg-white p-6 text-center text-denim transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
        >
            <span className="denim-weave grid size-16 place-items-center rounded-[20px]">
                <Icon className="size-7 text-amber" strokeWidth={2.4} aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-bold">{title}</span>
            <span className="max-w-[220px] text-sm leading-normal text-denim-muted">{description}</span>
        </Link>
    )
}

/** ช่องสร้างกิจกรรมท้ายกริดของผู้จัด (ช่องเดียวที่เหลือเมื่อยังไม่มีกิจกรรมเลย) */
export function CreateActivityTile() {
    return (
        <DashedLinkTile
            href="/organizer/create"
            icon={Plus}
            title="สร้างกิจกรรมใหม่"
            description="เปิดรับสมัคร ออกใบรับรอง และติดตามผู้เข้าร่วมได้ในที่เดียว"
        />
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
