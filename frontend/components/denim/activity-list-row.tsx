"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { DateTile, RowPill } from "@/components/denim/denim-ui"
import { getCategory } from "@/lib/categories"
import { formatCompactDateSpan } from "@/lib/date-span"
import type { FeaturedCardItem } from "@/lib/events-filter"
import { cn } from "@/lib/utils"

/**
 * แถวกิจกรรมบนจอแคบ (< lg) ของหน้ารายการกิจกรรม (/events, /student/events) — ข้อมูลเดียวกับ PublicActivityCard
 * (FeaturedCardItem) แต่สูงแค่แถวเดียว เลื่อนดูได้ทีละหลายรายการ: แผ่นวันที่ | สถานะ · ชื่อ · หมวดหมู่ · ช่วงรับสมัคร | ลูกศร
 * จอกว้างยังใช้การ์ดใบใหญ่ตามเดิม (การ์ดกิจกรรมขนาดเดียวทุกหน้า — ดู PublicActivityCard)
 */
export function ActivityListRow({ item, className }: { item: FeaturedCardItem; className?: string }) {
    const closed = item.status !== "open"
    const category = getCategory(item.categories[0])
    const extra = item.categories.length - 1
    const when =
        item.registrationOpenAt && item.registrationCloseAt
            ? { code: "REG", label: "ช่วงรับสมัคร", value: formatCompactDateSpan(item.registrationOpenAt, item.registrationCloseAt) }
            : { code: "DATE", label: "วันจัดกิจกรรม", value: formatCompactDateSpan(item.sortDate, item.endDate) }

    return (
        <Link
            href={item.href}
            className={cn(
                "group flex items-center gap-3.5 rounded-[20px] border border-denim-line bg-white p-4 shadow-[0_10px_24px_-22px_rgb(18_34_61/0.6)] transition-colors hover:border-denim-dash focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim",
                className
            )}
        >
            <DateTile date={item.sortDate} categories={item.categories} muted={closed} className="self-start" />
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap gap-1.5">
                    <RowPill tone={closed ? "grey" : "amber"}>{closed ? "ปิดรับสมัคร" : "กำลังเปิด"}</RowPill>
                    {item.hasCert && <RowPill tone="green">ใบจิตอาสา</RowPill>}
                </span>
                <span className="mt-1.5 line-clamp-2 font-display text-[17px] font-bold leading-snug text-denim-deep">{item.name}</span>
                {category && (
                    <span className="mt-1 flex items-center gap-1.5 text-[13px] text-denim-ink">
                        <span className={cn("size-2 shrink-0 rounded-full", category.dot)} aria-hidden="true" />
                        {category.label}
                        {extra > 0 && <span className="text-denim-muted">+{extra}</span>}
                    </span>
                )}
                <span className="mt-1 block font-code text-[11px] text-denim-muted">
                    <span aria-hidden="true">{when.code} </span>
                    <span className="sr-only">{when.label} </span>
                    {when.value}
                </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-denim-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
    )
}

export function ActivityListRowSkeleton() {
    return (
        <div className="flex items-center gap-3.5 rounded-[20px] border border-denim-line bg-white p-4" aria-hidden="true">
            <div className="h-[66px] w-[60px] animate-pulse rounded-2xl bg-denim-chip" />
            <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-16 animate-pulse rounded-full bg-denim-paper" />
                <div className="h-5 w-3/4 animate-pulse rounded-md bg-denim-chip" />
                <div className="h-3 w-1/2 animate-pulse rounded-md bg-denim-paper" />
            </div>
        </div>
    )
}
