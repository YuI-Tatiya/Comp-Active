"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EVENT_CARD_HEIGHT } from "./event-card-layout"

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop"

/** แปลงวันที่จาก API เป็นรูปแบบไทย — เดิมโค้ดนี้ถูกก๊อปไว้ 3 หน้า */
export function formatEventDate(dateString: string) {
    try {
        return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(new Date(dateString))
    } catch {
        return dateString
    }
}

/* ─────────────────────────────────────────────────────────────────────────
   ป้ายมุมรูป
   solid = พื้นสีทึบ ตัวอักษรขาว (สถานะ / สถานะอนุมัติ)
   light = พื้นขาว ตัวอักษรแบรนด์ (หมวดหมู่)
   glass = พื้นเข้มโปร่งแสง + เบลอหลัง ตัวอักษรขาว (สถานะ แบบ glassmorphism — ใช้ที่ /organizer/manage)
   ───────────────────────────────────────────────────────────────────────── */

interface EventCardBadgeProps {
    variant?: "solid" | "light" | "glass"
    /** สีพื้นสำหรับ variant solid/glass เช่น "bg-success/90" หรือ "bg-success/75" */
    className?: string
    /** จุดสีหน้าข้อความสำหรับ variant glass เช่น "bg-success" — ไม่ส่งมาก็ไม่มีจุด */
    dotClassName?: string
    children: React.ReactNode
}

export function EventCardBadge({
    variant = "solid",
    className,
    dotClassName,
    children,
}: EventCardBadgeProps) {
    if (variant === "glass") {
        return (
            <span
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-fg/60 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md",
                    className
                )}
            >
                {dotClassName && <span className={cn("size-1.5 shrink-0 rounded-full", dotClassName)} aria-hidden="true" />}
                {children}
            </span>
        )
    }

    return (
        <span
            className={cn(
                variant === "solid"
                    ? "rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md"
                    : "rounded-lg bg-bg/95 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-brand-700 shadow-sm",
                className
            )}
        >
            {children}
        </span>
    )
}

/* ─────────────────────────────────────────────────────────────────────────
   แถวข้อมูล (วันที่ / เวลา / สถานที่ / จำนวนที่นั่ง)
   ───────────────────────────────────────────────────────────────────────── */

const ROW_TONES = {
    brand: "text-brand-500",
    info: "text-info",
    danger: "text-danger",
    success: "text-success",
    muted: "text-fg-subtle",
} as const

interface EventCardRowProps {
    icon: LucideIcon
    tone?: keyof typeof ROW_TONES
    children: React.ReactNode
}

export function EventCardRow({ icon: Icon, tone = "muted", children }: EventCardRowProps) {
    return (
        <div className="flex items-center rounded-lg bg-surface px-3 py-2 text-sm font-medium text-fg-muted">
            <Icon className={cn("mr-3 size-4 shrink-0", ROW_TONES[tone])} aria-hidden="true" />
            {/* บรรทัดเดียวเสมอ — แถวที่ตัดขึ้นบรรทัดใหม่จะดันเกินความสูงการ์ดที่ตายตัว */}
            <span className="min-w-0 truncate">{children}</span>
        </div>
    )
}

/* ─────────────────────────────────────────────────────────────────────────
   แถบความคืบหน้าผู้ลงทะเบียน
   ───────────────────────────────────────────────────────────────────────── */

interface EventCardProgressProps {
    registered: number
    // null = ไม่จำกัดจำนวน
    capacity: number | null
    label?: string
}

export function EventCardProgress({
    registered,
    capacity,
    label = "ผู้ลงทะเบียน",
}: EventCardProgressProps) {
    const unlimited = capacity == null
    const percent = !unlimited && capacity > 0 ? Math.round((registered / capacity) * 100) : 0

    return (
        <div className="pt-2">
            <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-fg-muted">{label}</span>
                <span className="font-semibold tabular-nums text-fg">
                    {unlimited ? `${registered} (ไม่จำกัด)` : `${registered}/${capacity} (${percent}%)`}
                </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                    className={cn(
                        "h-full rounded-full transition-all",
                        percent >= 100 ? "bg-danger" : "bg-brand-600"
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────────────────────────────────
   ตัวการ์ด
   ───────────────────────────────────────────────────────────────────────── */

interface EventCardProps {
    /** ต้องมีอย่างน้อย name + imageUrl — รับได้ทั้ง Activity และ EventSummary */
    activity: { name: string; imageUrl?: string | null }
    /** ป้ายมุมซ้ายบนของรูป — หมวดหมู่ (public/student) หรือสถานะ (organizer) */
    badgeLeft?: React.ReactNode
    /** ป้ายมุมขวาบนของรูป — สถานะ (public/student) หรือปุ่มเมนู ⋮ (organizer) */
    badgeRight?: React.ReactNode
    /** คำอธิบายใต้ชื่อ — ไม่ส่งมาก็ไม่แสดง (organizer ไม่ใช้) */
    description?: string | null
    /** แถวข้อมูล + แถบความคืบหน้า — ไม่ส่งมาก็ไม่แสดง (การ์ดแบบย่อไม่มีแถวข้อมูล) */
    children?: React.ReactNode
    /** ปุ่มท้ายการ์ด — ปกติคือ 2 ปุ่มที่ห่อด้วย flex-1 — ไม่ส่งมาก็ไม่แสดง */
    actions?: React.ReactNode
    /** เพิ่ม class บนกรอบนอกสุด เช่น ทำการ์ดฉบับร่างให้จางลง (opacity) — ไม่ส่งมาก็ไม่กระทบของเดิม */
    className?: string
    /** การ์ดเล็ก มุมมนมาก — ใช้เฉพาะ /student/events (เล็กกว่ามาตรฐานทั้งเว็บ) ไม่ส่งมาก็ขนาดเดิม */
    compact?: boolean
}

/**
 * การ์ดกิจกรรม — ใช้ร่วมกันทุกหน้าที่แสดงรายการกิจกรรม
 *
 * ขนาดตายตัว ทุกการ์ดทั้งเว็บไซต์เท่ากันหมด: กว้างตามช่องที่ห่อ (`EVENT_CARD_SLOT` = 320px) สูง `EVENT_CARD_HEIGHT` (420px)
 * ชื่อ/คำอธิบายจึงถูกตัดที่ปลายบรรทัด ไม่ยืดการ์ด — ชื่อสำรองที่ไว้ 2 บรรทัดเสมอเพื่อให้เนื้อหาถัดไปเริ่มที่ระดับเดียวกัน
 *
 * ข้อจำกัดของส่วนท้าย (`children` แถวข้อมูล / `actions` ปุ่ม): การ์ดตัดส่วนที่เกินทิ้ง ไม่ดันขยาย แต่ก็ไม่เตือนด้วย —
 * ถ้าเนื้อหารวมเกินงบ บรรทัดสุดท้ายของคำอธิบาย (line-clamp) จะถูกบีบจนอ่านไม่ได้แทนที่จะล้นออกมาให้เห็นชัดๆ
 * งบที่เหลือตอนมีคำอธิบาย 2 บรรทัดอยู่ด้วย ≈ 105px และตอนไม่มีคำอธิบายราว 140px (แถวข้อมูลได้ไม่เกิน 2 แถว)
 * ถ้าจะใส่มากกว่านี้ให้เพิ่มความสูงที่ event-card-layout.ts ไม่ใช่ปล่อยให้ล้น/บีบ
 */
export function EventCard({
    activity,
    badgeLeft,
    badgeRight,
    description,
    children,
    actions,
    className,
    compact = false,
}: EventCardProps) {
    const hasFooter = Boolean(children) || Boolean(actions)

    return (
        <div
            className={cn(
                "group flex w-full flex-col overflow-hidden border border-border bg-bg transition-all duration-300 hover:-translate-y-1",
                compact ? "h-[340px] rounded-[28px] shadow-xs hover:shadow-md" : cn("rounded-2xl shadow-sm hover:shadow-xl", EVENT_CARD_HEIGHT),
                className
            )}
        >
            <div className={cn("relative shrink-0 overflow-hidden bg-surface", compact ? "h-36" : "h-44")}>
                {badgeLeft && <div className={cn("absolute z-10", compact ? "left-3 top-3" : "left-4 top-4")}>{badgeLeft}</div>}
                {badgeRight && <div className={cn("absolute z-10", compact ? "right-3 top-3" : "right-4 top-4")}>{badgeRight}</div>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={
                        activity.imageUrl
                            ? `${API_BASE_URL}${activity.imageUrl}`
                            : "/activity-placeholder.svg"
                    }
                    alt={activity.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                        ; (e.target as HTMLImageElement).src = FALLBACK_IMAGE
                    }}
                />
            </div>

            <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "p-4" : "p-5")}>
                {/* min-h-[2.5em] = 2 บรรทัดของ leading-tight — ชื่อบรรทัดเดียวก็จองที่ไว้เท่ากัน */}
                <h3 className={cn("line-clamp-2 min-h-[2.5em] font-bold leading-tight text-fg transition-colors group-hover:text-brand-600", compact ? "text-base" : "text-xl")}>
                    {activity.name}
                </h3>

                {description !== undefined && (
                    <p
                        className={cn(
                            "mt-2 overflow-hidden text-sm text-fg-muted",
                            hasFooter ? "line-clamp-2" : "line-clamp-3"
                        )}
                    >
                        {description || "ไม่ระบุรายละเอียด"}
                    </p>
                )}

                {hasFooter && (
                    <div className="mt-auto shrink-0 space-y-3 pt-3">
                        {children && <div className="space-y-2">{children}</div>}
                        {actions && <div className="flex gap-3">{actions}</div>}
                    </div>
                )}
            </div>
        </div>
    )
}
