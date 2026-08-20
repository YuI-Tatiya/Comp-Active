"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { cn } from "@/lib/utils"

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
   ───────────────────────────────────────────────────────────────────────── */

interface EventCardBadgeProps {
    variant?: "solid" | "light"
    /** สีพื้นสำหรับ variant solid เช่น "bg-success/90" */
    className?: string
    children: React.ReactNode
}

export function EventCardBadge({
    variant = "solid",
    className,
    children,
}: EventCardBadgeProps) {
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
            {children}
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
    /** ป้ายมุมขวาบนของรูป — สถานะ (public/student) หรือสถานะอนุมัติ (organizer) */
    badgeRight?: React.ReactNode
    /** คำอธิบายใต้ชื่อ — ไม่ส่งมาก็ไม่แสดง (organizer ไม่ใช้) */
    description?: string | null
    /** แถวข้อมูล + แถบความคืบหน้า */
    children: React.ReactNode
    /** ปุ่มท้ายการ์ด — ปกติคือ 2 ปุ่มที่ห่อด้วย flex-1 */
    actions: React.ReactNode
}

/**
 * การ์ดกิจกรรม — ใช้ร่วมกันทั้ง 3 หน้ารายการ
 * `/events` · `/student/events` · `/organizer/manage`
 *
 * เดิมโครงนี้ถูกก๊อปไว้ 3 ที่ พอแก้ที่เดียวอีกสองหน้าเลยหลุดธีมกัน
 */
export function EventCard({
    activity,
    badgeLeft,
    badgeRight,
    description,
    children,
    actions,
}: EventCardProps) {
    return (
        <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="relative h-[200px] overflow-hidden bg-surface">
                {badgeLeft && <div className="absolute left-4 top-4 z-10">{badgeLeft}</div>}
                {badgeRight && <div className="absolute right-4 top-4 z-10">{badgeRight}</div>}
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

            <div className="flex flex-grow flex-col p-6">
                <h3
                    className={cn(
                        "line-clamp-2 text-xl font-bold leading-tight text-fg transition-colors group-hover:text-brand-600",
                        description === undefined ? "mb-6" : "mb-3"
                    )}
                >
                    {activity.name}
                </h3>

                {description !== undefined && (
                    <p className="mb-6 line-clamp-2 text-sm text-fg-muted">
                        {description || "ไม่ระบุรายละเอียด"}
                    </p>
                )}

                <div className="mt-auto space-y-2">{children}</div>

                <div className="mt-6 flex gap-3">{actions}</div>
            </div>
        </div>
    )
}
