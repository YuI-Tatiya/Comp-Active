"use client"

import Image from "next/image"
import Link from "next/link"
import { ChartColumn, Infinity as InfinityIcon, MapPin, X } from "lucide-react"
import { categoryLabel } from "@/lib/categories"
import { cn } from "@/lib/utils"
import { DenimHero, TerminalPrompt } from "@/components/denim/denim-ui"

/* ชิ้นส่วนแดชบอร์ดผู้จัด (/organizer/dashboard) ธีม Denim Varsity — ข้อมูล/ตัวกรอง/การนับอยู่ที่หน้า ไฟล์นี้วาดอย่างเดียว */

/**
 * แถบหัวหน้า — หัวข้อ + มาสคอต (จอ lg+) การ์ดสถิติที่วางต่อท้ายดึงขึ้นมาทับขอบล่าง (-mt-16)
 * เท้ามาสคอตจึงหลบอยู่หลังการ์ดใบสุดท้ายพอดีตามดีไซน์ — pb-24 ของคอลัมน์ข้อความเผื่อที่ให้การ์ดแล้ว
 */
export function DashboardHero() {
    return (
        <DenimHero className="flex flex-wrap items-end justify-between gap-6 sm:pt-10">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 pb-24">
                <TerminalPrompt>~/comp-active/organizer $ top --events</TerminalPrompt>
                <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-[-0.015em] text-white sm:text-5xl lg:text-[56px]">
                    แดชบอร์ดผู้จัดงาน
                </h1>
                <p className="max-w-[560px] text-base leading-relaxed text-denim-on sm:text-lg">
                    ติดตามประสิทธิภาพกิจกรรมและจัดการความคืบหน้าของนักศึกษา
                </p>
            </div>
            <Image
                src="/mascot-wave.png"
                alt=""
                width={421}
                height={900}
                sizes="112px"
                priority
                className="mascot-bob -mb-2 hidden h-[240px] w-auto shrink-0 drop-shadow-[0_16px_24px_rgb(0_0_0_/_0.35)] lg:block"
            />
        </DenimHero>
    )
}

/* ── ตาราง ─────────────────────────────────────────────────────────────────── */

const COLUMNS: { label: string; className?: string }[] = [
    // คอลัมน์ชื่อไม่ให้ถูกบีบ — จอแคบตารางเลื่อนแนวนอนอยู่แล้ว ชื่อที่ตัดคำทีละคำอ่านยากกว่าเลื่อนเพิ่มอีกนิด
    { label: "กิจกรรม", className: "min-w-[240px]" },
    { label: "วัน - เวลา" },
    { label: "ผู้เข้าร่วม" },
    { label: "สถานะ" },
    { label: "การจัดการ", className: "text-right" },
]

/** ตัวกล่องตาราง — หัวข้อแบบคอมเมนต์โค้ด + จำนวนที่พบ (+ ปุ่มล้างตัวกรองเมื่อมีตัวกรองทำงาน) แล้วตามด้วยเนื้อหา */
export function ActivityTableCard({
    count,
    activeFilters,
    onReset,
    children,
}: {
    /** undefined = ยังโหลดอยู่ */
    count: number | undefined
    activeFilters: number
    onReset: () => void
    children: React.ReactNode
}) {
    return (
        <section
            aria-labelledby="dashboard-table-heading"
            className="overflow-hidden rounded-[22px] border border-denim-line bg-white"
        >
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-4 pt-5 sm:px-6">
                <div className="flex flex-col gap-1">
                    <span className="font-code text-xs text-denim-accent" aria-hidden="true">
                        {"// my_events.table"}
                    </span>
                    <h2 id="dashboard-table-heading" className="font-display text-2xl font-bold text-denim-deep">
                        กิจกรรมของคุณ
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                    <p className="font-code text-[13px] text-denim-muted" aria-live="polite">
                        {count === undefined ? (
                            "→ กำลังโหลด..."
                        ) : (
                            <>
                                → พบ <strong className="font-semibold text-denim-deep">{count}</strong> กิจกรรม
                            </>
                        )}
                    </p>
                </div>
            </div>
            {children}
        </section>
    )
}

/** ตารางจริง — กว้างขั้นต่ำ 880px แล้วเลื่อนแนวนอนในกล่องเองบนจอแคบ (คอลัมน์บีบกว่านี้แล้วอ่านไม่ออก) */
export function ActivityTable({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                    <tr className="denim-weave-deep">
                        {COLUMNS.map((c, i) => (
                            <th
                                key={c.label}
                                scope="col"
                                className={cn(
                                    "px-5 py-3.5 font-code text-[11px] font-normal tracking-[0.08em] text-denim-on-soft first:pl-6 last:pr-6",
                                    i > 0 && "border-l border-white/10",
                                    c.className
                                )}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-denim-line">{children}</tbody>
            </table>
        </div>
    )
}

export interface ActivityRowData {
    id: number
    name: string
    categories: string[]
    location: string
    /** ตัวเลขวัน + เดือนในบล็อกวันที่ (ตามเวลาไทย) */
    day: string
    month: string
    dateLabel: string
    timeLabel: string
    /** กิจกรรมจบแล้ว = บล็อกวันที่สีเทา แยกจากงานที่ยังมาไม่ถึง */
    ended: boolean
    registered: number
    /** null = ไม่จำกัดจำนวน */
    capacity: number | null
    approval: { label: string; className: string; dotClassName: string }
    statusText: string
    pendingConfirm: number
    pendingEval: number
    href: string
}

const CELL = "border-l border-denim-line/70 px-5 py-4 align-middle"

export function ActivityTableRow({ row }: { row: ActivityRowData }) {
    const percent = row.capacity ? Math.round((row.registered / row.capacity) * 100) : 0

    return (
        <tr className="transition-colors even:bg-denim-paper/45 hover:bg-denim-paper">
            <td className="py-4 pl-6 pr-5 align-middle">
                <div className="font-display text-[15px] font-bold text-denim-deep">{row.name}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-denim-muted">
                    {row.categories.map((c) => (
                        <span key={c} className="rounded-full bg-denim-chip px-2 py-0.5 font-medium text-denim">
                            {categoryLabel(c)}
                        </span>
                    ))}
                    {row.location && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{row.location}</span>
                        </span>
                    )}
                </div>
            </td>

            <td className={CELL}>
                <div className="flex items-center gap-3">
                    <div
                        aria-hidden="true"
                        className={cn(
                            "flex h-[52px] w-12 shrink-0 flex-col items-center justify-center rounded-[10px] text-white",
                            row.ended ? "cover-closed" : "denim-weave"
                        )}
                    >
                        <span className="font-display text-xl font-bold leading-none">{row.day}</span>
                        <span className="mt-0.5 text-[10px] leading-none text-white/80">{row.month}</span>
                    </div>
                    <div className="min-w-0">
                        <div className="whitespace-nowrap text-sm font-semibold text-denim-deep">{row.dateLabel}</div>
                        {row.timeLabel && (
                            <div className="mt-0.5 whitespace-nowrap font-code text-xs text-denim-muted">{row.timeLabel}</div>
                        )}
                    </div>
                </div>
            </td>

            <td className={cn(CELL, "min-w-[180px]")}>
                {row.capacity == null ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-denim-deep tabular-nums">{row.registered} คน</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-denim-paper px-2 py-0.5 text-xs text-denim-muted">
                            <InfinityIcon className="size-3.5" aria-hidden="true" />
                            ไม่จำกัด
                        </span>
                    </div>
                ) : (
                    <div>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm tabular-nums">
                            <span className="font-semibold text-denim-deep">
                                {row.registered} / {row.capacity} คน
                            </span>
                            <span className="text-xs font-semibold text-denim-accent">{percent}%</span>
                        </div>
                        <div
                            className="h-1.5 w-full overflow-hidden rounded-full bg-denim-chip"
                            role="progressbar"
                            aria-label={`ลงทะเบียนแล้ว ${percent}%`}
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div
                                className={cn("h-full rounded-full", percent >= 100 ? "bg-amber" : "bg-denim")}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </td>

            <td className={CELL}>
                <span
                    className={cn(
                        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        row.approval.className
                    )}
                >
                    <span className={cn("size-1.5 rounded-full", row.approval.dotClassName)} aria-hidden="true" />
                    {row.approval.label}
                </span>
                <div className="mt-1 text-xs text-denim-muted">{row.statusText}</div>
                {/* งานค้างของแถวนี้ — ตัวเลขเดียวกับการ์ด "รอยืนยันผู้สมัคร"/"รอประเมินทักษะ" ด้านบน แต่ชี้ว่าอยู่กิจกรรมไหน */}
                {row.pendingConfirm > 0 && (
                    <div className="mt-1 text-xs font-semibold text-amber-ink">รอยืนยัน {row.pendingConfirm} คน</div>
                )}
                {row.pendingEval > 0 && (
                    <div className="mt-1 text-xs font-semibold text-amber-ink">รอประเมิน {row.pendingEval} คน</div>
                )}
            </td>

            <td className={cn(CELL, "pr-6 text-right")}>
                <Link
                    href={row.href}
                    className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border-[1.5px] border-denim-field bg-white px-4 text-sm font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"
                >
                    <ChartColumn className="size-4" aria-hidden="true" />
                    ดู dashboard
                </Link>
            </td>
        </tr>
    )
}

/** แถวโครงระหว่างโหลด — หัวตารางจริงแสดงไปก่อน ให้ตารางไม่กระโดดตอนข้อมูลมา */
export function ActivityTableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                    <td className="py-4 pl-6 pr-5">
                        <div className="h-4 w-48 animate-pulse rounded bg-denim-chip" />
                        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-denim-paper" />
                    </td>
                    <td className={CELL}>
                        <div className="flex items-center gap-3">
                            <div className="h-[52px] w-12 animate-pulse rounded-[10px] bg-denim-chip" />
                            <div className="h-4 w-24 animate-pulse rounded bg-denim-paper" />
                        </div>
                    </td>
                    <td className={CELL}>
                        <div className="h-4 w-28 animate-pulse rounded bg-denim-paper" />
                    </td>
                    <td className={CELL}>
                        <div className="h-5 w-20 animate-pulse rounded-full bg-denim-chip" />
                    </td>
                    <td className={cn(CELL, "pr-6")}>
                        <div className="ml-auto h-10 w-32 animate-pulse rounded-xl bg-denim-paper" />
                    </td>
                </tr>
            ))}
        </>
    )
}
