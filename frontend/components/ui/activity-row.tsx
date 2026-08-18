"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getCategory } from "@/lib/categories"
import { isUnlimitedCapacity, type Activity } from "@/lib/api"
import { cn } from "@/lib/utils"

/** map ApprovalStatus จาก schema.prisma */
const APPROVAL_META: Record<
    string,
    { label: string; variant: "success" | "warning" | "danger" | "info" }
> = {
    approved: { label: "อนุมัติแล้ว", variant: "success" },
    pending_approval: { label: "รออนุมัติ", variant: "warning" },
    rejected: { label: "ถูกปฏิเสธ", variant: "danger" },
    pending_cancel: { label: "รอยกเลิก", variant: "info" },
}

function formatDate(dateString: string) {
    try {
        return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            year: "2-digit",
        }).format(new Date(dateString))
    } catch {
        return dateString
    }
}

interface ActivityRowProps {
    activity: Activity
    href: string
}

/** แถวกิจกรรมฝั่งผู้จัด — ชื่อ + วันที่ + แถบที่นั่ง + สถานะอนุมัติ */
export function ActivityRow({ activity, href }: ActivityRowProps) {
    const cat = getCategory(activity.category)
    const unlimited = isUnlimitedCapacity(activity.capacity)
    const capacity = activity.capacity || 0
    const registered = activity.registeredCount || 0
    const ratio = !unlimited && capacity > 0 ? Math.min((registered / capacity) * 100, 100) : 0
    const isFull = !unlimited && capacity > 0 && registered >= capacity
    const approval = APPROVAL_META[activity.approvalStatus]

    return (
        <Link
            href={href}
            className="group flex items-center gap-4 rounded-lg border border-border bg-bg p-3 transition-colors hover:border-border-strong"
        >
            {cat && (
                <span
                    className={cn("h-10 w-1 shrink-0 rounded-full", cat.dot)}
                    aria-hidden="true"
                />
            )}

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium text-fg">{activity.name}</h3>
                    {approval && <Badge variant={approval.variant}>{approval.label}</Badge>}
                </div>

                <div className="mt-2 flex items-center gap-3">
                    <span className="shrink-0 text-xs text-fg-muted tabular-nums">
                        {formatDate(activity.date)}
                    </span>
                    <div className="h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-surface-2">
                        <div
                            className={cn(
                                "h-full rounded-full",
                                isFull ? "bg-danger" : "bg-brand-600"
                            )}
                            style={{ width: `${ratio}%` }}
                        />
                    </div>
                    <span className="shrink-0 text-xs text-fg-muted tabular-nums">
                        {unlimited ? `${registered} (ไม่จำกัด)` : `${registered}/${capacity}`}
                    </span>
                </div>
            </div>

            <ChevronRight
                className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-brand-600"
                aria-hidden="true"
            />
        </Link>
    )
}
