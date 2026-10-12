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
 * การ์ดกิจกรรมฝั่งผู้เข้าร่วม (ธีม Denim) — หน้าแรก public, /events และ /student/events ใช้ใบเดียวกัน
 * ปกแบบเดียวกับฝั่งผู้จัด แต่มุมซ้ายล่างเป็นชื่อหมวดหมู่แทนรหัสงาน และท้ายการ์ดเป็นปุ่มชวนลงทะเบียน
 * ลิงก์คือการ์ดทั้งใบ (ปุ่มเป็นแค่ป้ายบอก ไม่ใช่ปุ่มซ้อนในลิงก์)
 *
 * สูงเท่ากันทุกใบทุกหน้า (ยึดหน้าแรก public เป็นแบบ) โดยไม่ต้องตายตัวความสูงรวม — ทุกช่องข้างในมีขนาดคงที่:
 * ช่องข้อความสูงเท่าชื่อ 1 บรรทัด + คำอธิบาย 1 บรรทัด (ชื่อที่ยาว 2 บรรทัดใช้ที่เท่ากันพอดี คำอธิบายจึงล้นกรอบ
 * และถูกซ่อน — ชื่อสำคัญกว่า) และเว้นที่แถวช่วงรับสมัครไว้เสมอแม้ไม่มี เดิมการ์ดสูงตามเนื้อหา แถวที่มีชื่อยาว
 * ใบเดียวยืดทั้งแถว การ์ดใบเดียวกันจึงสูงไม่เท่ากันในแต่ละหน้า
 * className ใช้กำหนดความกว้างช่องจากภายนอก (ดู ACTIVITY_GRID_COLUMN)
 */
export function PublicActivityCard({ item, className }: { item: FeaturedCardItem; className?: string }) {
    const tag = categoryTag(item.categories)
    const registrationWindow = formatRegistrationWindow(item.registrationOpenAt, item.registrationCloseAt, { compact: true })
    const categoryNote = item.categories.map(categoryLabel).join(" · ")

    return (
        <Link
            href={item.href}
            className={cn(
                "group block h-full rounded-[22px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim",
                className
            )}
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
                    {/* ชื่อ 1 บรรทัด (1.25rem × 1.3) + ช่องห่าง 0.375rem + คำอธิบาย 1 บรรทัด (0.875rem × 1.55) ≈ 3.36rem
                        ชื่อ 2 บรรทัด (3.25rem) ก็พอดีช่องนี้ — คำอธิบายจะเริ่มเลยขอบล่างและถูก overflow ซ่อนทั้งบรรทัด */}
                    <div className="h-[3.375rem] overflow-hidden">
                        <h3 className="line-clamp-2 font-display text-xl font-bold leading-[1.3] text-denim-deep">{item.name}</h3>
                        {item.description && (
                            <p className="mt-1.5 line-clamp-1 text-sm leading-[1.55] text-denim-muted">{item.description}</p>
                        )}
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <CardRow icon={CalendarDays}>จัดกิจกรรม {formatCompactDateSpan(item.sortDate, item.endDate)}</CardRow>
                        {registrationWindow ? (
                            <CardRow icon={SquareCheckBig}>{registrationWindow}</CardRow>
                        ) : (
                            // กิจกรรมเดี่ยวไม่มีช่วงรับสมัครในสคีมา — เว้นที่เท่าหนึ่งแถวไว้ การ์ดทุกใบจึงสูงเท่ากันและแถววันที่ตรงกัน
                            <div aria-hidden="true" className="invisible">
                                <CardRow icon={SquareCheckBig}>&nbsp;</CardRow>
                            </div>
                        )}
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
