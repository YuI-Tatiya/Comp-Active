"use client"

import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { API_BASE_URL, isUnlimitedCapacity, type Activity } from "@/lib/api"
import { cn } from "@/lib/utils"

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop"

const CATEGORY_LABELS: Record<string, string> = {
    Technology: "เทคโนโลยี",
    Academic: "วิชาการ",
    Competition: "การแข่งขัน",
    Volunteer: "อาสาสมัคร",
}

/** map ActivityStatus จาก schema.prisma → badge variant */
const STATUS_META: Record<string, { label: string; variant: "success" | "info" | "neutral" }> = {
    open: { label: "เปิดรับสมัคร", variant: "success" },
    closed: { label: "ปิดรับสมัคร", variant: "neutral" },
    completed: { label: "จบแล้ว", variant: "info" },
}

function formatDate(dateString: string) {
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

interface ActivityCardProps {
    activity: Activity
    /** ปลายทางเมื่อคลิก — เปลี่ยนได้สำหรับฝั่ง student (ค่าเริ่มต้น /events/[id]) */
    href?: string
    className?: string
}

export function ActivityCard({ activity, href, className }: ActivityCardProps) {
    const status = STATUS_META[activity.status] ?? STATUS_META.closed
    const unlimited = isUnlimitedCapacity(activity.capacity)
    const capacity = activity.capacity || 0
    const registered = activity.registeredCount || 0
    const ratio = !unlimited && capacity > 0 ? Math.min((registered / capacity) * 100, 100) : 0
    const isFull = !unlimited && capacity > 0 && registered >= capacity

    return (
        <Link
            href={href ?? `/events/${activity.id}`}
            className={cn(
                "group flex flex-col overflow-hidden rounded-xl border border-border bg-bg transition-colors hover:border-border-strong hover:shadow-sm",
                className
            )}
        >
            <div className="relative aspect-video overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={
                        activity.imageUrl
                            ? `${API_BASE_URL}${activity.imageUrl}`
                            : "/activity-placeholder.jpg"
                    }
                    alt={activity.name}
                    loading="lazy"
                    className="size-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE
                    }}
                />
            </div>

            <div className="flex flex-1 flex-col p-4">
                <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    {activity.category && (
                        <Badge variant="default">
                            {CATEGORY_LABELS[activity.category] ?? activity.category}
                        </Badge>
                    )}
                    <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-fg transition-colors group-hover:text-brand-600">
                    {activity.name}
                </h3>

                <dl className="mt-3 space-y-1.5 text-sm text-fg-muted">
                    <div className="flex items-center gap-2">
                        <Calendar className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                        <dt className="sr-only">วันที่</dt>
                        <dd>{formatDate(activity.date)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                        <dt className="sr-only">สถานที่</dt>
                        <dd className="line-clamp-1">{activity.location || "ไม่ระบุสถานที่"}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                        <dt className="sr-only">จำนวนผู้สมัคร</dt>
                        <dd>
                            {unlimited ? `${registered} ที่นั่ง (ไม่จำกัด)` : `${registered}/${capacity} ที่นั่ง`}
                        </dd>
                    </div>
                </dl>

                {!unlimited && capacity > 0 && (
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                isFull ? "bg-danger" : "bg-brand-600"
                            )}
                            style={{ width: `${ratio}%` }}
                        />
                    </div>
                )}
            </div>
        </Link>
    )
}
