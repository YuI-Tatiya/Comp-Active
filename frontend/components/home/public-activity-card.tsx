"use client"

import Link from "next/link"
import { ArrowRight, CalendarDays, SquareCheckBig } from "lucide-react"
import { CardCover, CardRow, CoverStatusPill, CoverTag, categoryTag } from "@/components/denim/denim-ui"
import { formatRegistrationWindow } from "@/components/ui/event-card"
import { categoryLabel } from "@/lib/categories"
import { formatCompactDateSpan } from "@/lib/date-span"
import type { FeaturedCardItem } from "@/lib/events-filter"
import { cn } from "@/lib/utils"

/**
 * การ์ดกิจกรรมหน้าแรก (ธีม Denim) — ปกแบบเดียวกับฝั่งผู้จัด แต่มุมซ้ายล่างเป็นชื่อหมวดหมู่แทนรหัสงาน
 * และท้ายการ์ดเป็นปุ่มชวนลงทะเบียน ลิงก์คือการ์ดทั้งใบ (ปุ่มเป็นแค่ป้ายบอก ไม่ใช่ปุ่มซ้อนในลิงก์)
 */
export function PublicActivityCard({ item }: { item: FeaturedCardItem }) {
    const tag = categoryTag(item.categories)
    const registrationWindow = formatRegistrationWindow(item.registrationOpenAt, item.registrationCloseAt, { compact: true })
    const categoryNote = item.categories.map(categoryLabel).join(" · ")

    return (
        <Link
            href={item.href}
            className="group block h-full rounded-[22px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
        >
            <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-denim-line bg-white transition-[transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-18px_rgb(18_34_61_/_0.45)]">
                <CardCover
                    tone={item.status}
                    categories={item.categories}
                    dateMs={item.sortDate}
                    topLeft={tag ? <CoverTag>{tag}</CoverTag> : undefined}
                    topRight={<CoverStatusPill status={item.status} />}
                    bottomLeft={<span className="min-w-0 truncate text-xs font-semibold text-white/90">{categoryNote}</span>}
                />

                <div className="flex flex-1 flex-col gap-3.5 p-5">
                    <div className="flex flex-col gap-1.5">
                        <h3 className="line-clamp-2 font-display text-xl font-bold leading-[1.3] text-denim-deep">{item.name}</h3>
                        {item.description && (
                            <p className="line-clamp-2 text-sm leading-[1.55] text-denim-muted">{item.description}</p>
                        )}
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <CardRow icon={CalendarDays}>จัดกิจกรรม {formatCompactDateSpan(item.sortDate, item.endDate)}</CardRow>
                        {/* กิจกรรมเดี่ยวไม่มีช่วงรับสมัครในสคีมา (ไม่มีฟิลด์นี้เลย) — ซ่อนแถวนี้แทนที่จะโชว์ค่าว่าง */}
                        {registrationWindow && <CardRow icon={SquareCheckBig}>{registrationWindow}</CardRow>}
                    </div>
                    <span
                        className={cn(
                            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
                            item.status === "open"
                                ? "bg-denim text-white group-hover:bg-denim-deep"
                                : "border-[1.5px] border-denim-field bg-white text-denim-deep group-hover:bg-denim-paper"
                        )}
                    >
                        {item.status === "open" ? "ลงทะเบียนเข้าร่วม" : "ดูรายละเอียด"}
                        <ArrowRight
                            className={cn(
                                "size-4 transition-transform group-hover:translate-x-0.5",
                                item.status === "open" ? "text-amber" : "text-denim"
                            )}
                            aria-hidden="true"
                        />
                    </span>
                </div>
            </article>
        </Link>
    )
}
