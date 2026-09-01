"use client"

import Link from "next/link"
import { Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { categoriesBadgeLabel, getCategory } from "@/lib/categories"
import { cn } from "@/lib/utils"

export interface UpcomingActivity {
    id: number
    name: string
    date: string
    startTime: string
    location: string
    categories?: string[]
}

const STATUS_META: Record<
    string,
    { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
    confirmed: { label: "ยืนยันแล้ว", variant: "success" },
    pending: { label: "รอยืนยัน", variant: "warning" },
    cancelled: { label: "ยกเลิก", variant: "danger" },
}

interface UpcomingItemProps {
    activity: UpcomingActivity
    /** RegistrationStatus จาก backend */
    status?: string
    href: string
}

/** แถวกิจกรรมที่กำลังจะถึง — บล็อกวันที่ซ้าย + รายละเอียดขวา */
export function UpcomingItem({ activity, status, href }: UpcomingItemProps) {
    const cat = getCategory(activity.categories?.[0])
    const d = new Date(activity.date)
    const valid = !Number.isNaN(d.getTime())
    const day = valid ? new Intl.DateTimeFormat("th-TH", { day: "numeric" }).format(d) : "—"
    const month = valid ? new Intl.DateTimeFormat("th-TH", { month: "short" }).format(d) : ""
    const meta = status ? STATUS_META[status] : undefined

    return (
        <Link
            href={href}
            className="flex items-stretch gap-4 rounded-lg border border-border bg-bg p-3 transition-colors hover:border-border-strong"
        >
            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-surface py-2">
                <span className="text-lg font-semibold leading-none text-fg tabular-nums">{day}</span>
                <span className="mt-0.5 text-xs text-fg-subtle">{month}</span>
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium text-fg">{activity.name}</h3>
                    {meta && <Badge variant={meta.variant}>{meta.label}</Badge>}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                    {cat && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className={cn("size-1.5 rounded-full", cat.dot)} aria-hidden="true" />
                            {categoriesBadgeLabel(activity.categories)}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {activity.startTime}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="line-clamp-1">{activity.location || "ไม่ระบุ"}</span>
                    </span>
                </div>
            </div>
        </Link>
    )
}
