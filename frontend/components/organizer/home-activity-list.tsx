"use client"

import Link from "next/link"
import { ArrowRight, CalendarDays, SquareCheckBig, X } from "lucide-react"
import { categoryLabel } from "@/lib/categories"
import { CardCover, CardRow, CoverPill, CoverStatusPill, CoverTag, categoryTag } from "@/components/denim/denim-ui"

/* ชิ้นส่วนรายการกิจกรรมของหน้าหลักผู้จัด (ธีม Denim Varsity) — บรรทัดผลลัพธ์, การ์ด
   ส่วนที่ใช้ร่วมกับหน้าอื่น (แท็บสถานะ, แผงตัวกรอง, ปกการ์ด, ช่องสร้างใหม่, กริด) อยู่ที่ denim-ui.tsx
   ตรรกะการกรอง/เรียงอยู่ที่หน้า (app/organizer/page.tsx) ไฟล์นี้วาดอย่างเดียว */

export type ActivityStatus = "open" | "closed" | "cancelled"

/** บรรทัด "→ พบ N รายการ" ใต้แผงตัวกรอง + ปุ่มล้างเมื่อมีตัวกรองทำงานอยู่ */
export function ResultLine({
    count,
    activeFilters,
    onReset,
}: {
    count: number | undefined
    activeFilters: number
    onReset: () => void
}) {
    return (
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-3">
            <p className="font-code text-[13px] text-denim-muted" aria-live="polite">
                {count === undefined ? (
                    "→ กำลังโหลด..."
                ) : (
                    <>
                        → พบ <strong className="font-semibold text-denim-deep">{count}</strong> รายการ
                    </>
                )}
            </p>
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
        </div>
    )
}

/* ── การ์ดกิจกรรม ────────────────────────────────────────────────────────── */

export interface ActivityCardData {
    href: string
    name: string
    description?: string | null
    categories: string[]
    status: ActivityStatus
    /** รหัสอ้างอิงบนปก เช่น EVT-0118 */
    code: string
    /** วันจัดวันแรก (epoch ms) — ใช้เป็นวันที่ตัวใหญ่บนปก */
    dateMs: number
    /** ข้อความแถว "จัดกิจกรรม …" (ช่วงวันที่ของทั้งงาน) */
    dateLabel: string
    registrationWindow: string | null
    /** ของตัวเอง = "จัดการ" · ของผู้จัดคนอื่น = "ดูรายละเอียด" */
    actionLabel: string
    /**
     * งานที่ปิดการเผยแพร่ — backend ส่งมาให้เฉพาะเจ้าของ (และแอดมิน) จึงต้องบอกให้ชัดว่านักศึกษาไม่เห็นใบนี้
     * ป้ายแทนแท็กหมวดหมู่มุมซ้ายบน (หมวดหมู่ยังอยู่ที่ท้ายการ์ด) — การ์ดสูงตายตัว เพิ่มแถวใหม่ไม่ได้
     */
    unpublished?: boolean
    /** path รูปที่ผู้จัดแนบ — ไม่มี = ปกลายของธีม (ดู CardCover) */
    imageUrl?: string | null
}

export function ActivityCard({ item }: { item: ActivityCardData }) {
    const tag = categoryTag(item.categories)
    const categoryNote = item.categories.map(categoryLabel).join(" · ") || "ไม่ระบุหมวดหมู่"

    return (
        <Link
            href={item.href}
            className="group block h-full rounded-[22px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
        >
            <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-denim-line bg-white transition-[transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-18px_rgb(18_34_61_/_0.45)]">
                <CardCover
                    tone={item.status === "open" ? "open" : "closed"}
                    categories={item.categories}
                    imageUrl={item.imageUrl}
                    code={item.code}
                    dateMs={item.dateMs}
                    topLeft={
                        item.unpublished ? (
                            <CoverPill dotClassName="bg-denim-muted">ไม่เผยแพร่</CoverPill>
                        ) : tag ? (
                            <CoverTag>{tag}</CoverTag>
                        ) : undefined
                    }
                    topRight={<CoverStatusPill status={item.status} />}
                />

                <div className="flex flex-1 flex-col gap-3.5 p-5">
                    <div className="flex flex-col gap-1.5">
                        <h3 className="line-clamp-2 font-display text-xl font-bold leading-[1.3] text-denim-deep">{item.name}</h3>
                        {item.description && (
                            <p className="line-clamp-2 text-sm leading-[1.55] text-denim-muted">{item.description}</p>
                        )}
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <CardRow icon={CalendarDays}>จัดกิจกรรม {item.dateLabel}</CardRow>
                        {/* กิจกรรมเดี่ยวไม่มีช่วงรับสมัครในสคีมา (ไม่มีฟิลด์นี้เลย) — ซ่อนแถวนี้แทนที่จะโชว์ค่าว่าง */}
                        {item.registrationWindow && <CardRow icon={SquareCheckBig}>{item.registrationWindow}</CardRow>}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-denim-chip pt-3">
                        <span className="min-w-0 truncate text-[13px] text-denim-muted">{categoryNote}</span>
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-denim transition-colors group-hover:text-denim-deep">
                            {item.actionLabel}
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                    </div>
                </div>
            </article>
        </Link>
    )
}
