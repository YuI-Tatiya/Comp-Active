"use client"

import { useState } from "react"
import { CalendarDays, MapPin, Maximize2 } from "lucide-react"
import { ImageLightbox } from "@/components/ui/image-lightbox"
import { InfoTile } from "@/components/activity/activity-detail-sections"
import { SessionSelector, type SessionItem } from "@/components/activity/session-selector"
import { PHOTO_SCRIM, PHOTO_TEXT_SHADOW, coverPattern, useUploadImage, type CoverTone } from "@/components/denim/denim-ui"
import { categoryLabel } from "@/lib/categories"
import type { ScheduleLabel } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

export type DetailStatusTone = "open" | "success" | "warning" | "info" | "neutral"

/** ป้ายสถานะมุมซ้ายบนของปก — เปิดรับเป็นอำพัน (เหมือนการ์ด) สถานะของฉันใช้สีตามความหมาย ปิด/เต็มเป็นแคปซูลเข้มโปร่ง */
const STATUS_PILL: Record<DetailStatusTone, { pill: string; dot: string }> = {
    open: { pill: "bg-amber text-denim-deep", dot: "bg-denim-deep" },
    success: { pill: "bg-emerald-600 text-white", dot: "bg-white" },
    warning: { pill: "bg-white text-denim-deep", dot: "bg-amber" },
    info: { pill: "bg-white text-denim-deep", dot: "bg-sky-500" },
    neutral: { pill: "border border-white/35 bg-denim-deep/60 text-white", dot: "bg-[#c3ccd9]" },
}

interface DetailCoverProps {
    /** path รูปที่ผู้จัดแนบ — ไม่มี/โหลดไม่ขึ้น = ลายปกของธีม (กติกาเดียวกับปกการ์ด) */
    imagePath?: string | null
    tone: CoverTone
    categories: string[]
    statusLabel: string
    statusTone: DetailStatusTone
    /** รหัสอ้างอิงมุมขวาบน เช่น EVT-0118 */
    code: string
    date: { day: string; monthYear: string; weekday: string } | null
    /** alt ของรูปตอนเปิดดูขนาดใหญ่ */
    title: string
}

/** ปกใหญ่ของการ์ดหัวเรื่อง — สูงเต็มคอลัมน์บนจอกว้าง (ยืดตามเนื้อหาด้านขวา) */
function DetailCover({ imagePath, tone, categories, statusLabel, statusTone, code, date, title }: DetailCoverProps) {
    const image = useUploadImage(imagePath)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const pill = STATUS_PILL[statusTone]

    return (
        <div
            className={cn(
                "relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl p-4 sm:min-h-[320px] sm:p-5 md:h-full md:min-h-[360px]",
                coverPattern(tone, categories)
            )}
        >
            {image.show && (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลดเสิร์ฟจาก backend (/uploads) */}
                    <img src={image.src!} alt="" decoding="async" onError={image.onError} className="absolute inset-0 size-full object-cover" />
                    <div className={PHOTO_SCRIM} aria-hidden="true" />
                </>
            )}

            <div className="relative flex items-start justify-between gap-3">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-xs font-semibold", pill.pill)}>
                    <span className={cn("size-[7px] rounded-full", pill.dot)} aria-hidden="true" />
                    {statusLabel}
                </span>
                <span className={cn("pt-1 font-code text-[11px] text-white/75", image.show && PHOTO_TEXT_SHADOW)}>{code}</span>
            </div>

            <div className={cn("relative flex items-end justify-between gap-3", image.show && PHOTO_TEXT_SHADOW)}>
                {date ? (
                    <p className="font-display font-bold leading-none text-white">
                        <span className="block text-6xl sm:text-7xl">{date.day}</span>
                        <span className="mt-2 block text-sm font-semibold tracking-[0.04em] text-white/85">
                            {date.monthYear} · {date.weekday}
                        </span>
                    </p>
                ) : (
                    <span />
                )}
                {image.show && (
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        aria-label="ดูภาพขนาดใหญ่"
                        className="grid size-9 shrink-0 place-items-center rounded-lg bg-denim-deep/70 text-white backdrop-blur-sm transition-colors hover:bg-denim-deep/90 focus-visible:outline-white"
                    >
                        <Maximize2 className="size-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            {image.show && <ImageLightbox src={image.src!} alt={title} open={lightboxOpen} onOpenChange={setLightboxOpen} />}
        </div>
    )
}

interface ActivityDetailHeroProps {
    id?: string
    cover: Omit<DetailCoverProps, "title" | "categories">
    title: string
    categories: string[]
    organizerName?: string | null
    schedule: ScheduleLabel
    location: string
    /** เฉพาะงานที่มีหลายรอบ — การ์ดเลือกรอบ + ตัวนับ "1 / 3" */
    rounds?: { sessions: SessionItem[]; activeId: number | null; activeIndex: number; onSelect: (id: number) => void } | null
    /** แถบกรมท่าท้ายการ์ด — แถบสมัคร (นักศึกษา/บุคคลทั่วไป) หรือแถบผู้เข้าร่วม (มุมมองผู้จัด) */
    footer: React.ReactNode
}

/**
 * การ์ดหัวเรื่องของหน้ารายละเอียดกิจกรรม (ธีม Denim) — ซ้ายเป็นปกใหญ่ ขวาเป็นหมวดหมู่/ผู้จัด ชื่อ วันเวลา-สถานที่
 * และการ์ดเลือกรอบ ท้ายการ์ดเป็นแถบกรมท่าที่ผู้เรียกส่งมา (footer)
 */
export function ActivityDetailHero({ id, cover, title, categories, organizerName, schedule, location, rounds, footer }: ActivityDetailHeroProps) {
    return (
        <article
            id={id}
            className="overflow-hidden rounded-[26px] border border-denim-line bg-white shadow-[0_28px_60px_-34px_rgb(18_34_61/0.55)]"
        >
            <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-2 md:gap-7 lg:p-6">
                <DetailCover {...cover} categories={categories} title={title} />

                <div className="flex min-w-0 flex-col gap-4 md:py-1">
                    {(categories.length > 0 || organizerName) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {categories.map((c) => (
                                <span key={c} className="rounded-md bg-denim-chip px-2.5 py-1 text-xs font-semibold text-denim">
                                    {categoryLabel(c)}
                                </span>
                            ))}
                            {organizerName && (
                                <span className="text-xs text-denim-muted">
                                    จัดโดย <strong className="font-semibold text-denim-deep">{organizerName}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {/* pt-1 + leading 1.25 กันสระ/วรรณยุกต์ไทยบรรทัดแรกโดนตัด (leading-tight แน่นเกินไปสำหรับฟอนต์ไทย) */}
                    <h1 className="pt-1 font-display text-3xl font-bold leading-[1.25] text-denim-deep sm:text-4xl">{title}</h1>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <InfoTile
                            icon={CalendarDays}
                            label="WHEN"
                            value={`${schedule.dateLabel}${schedule.timeLabel ? ` · ${schedule.timeLabel}` : ""}`}
                        />
                        <InfoTile icon={MapPin} label="WHERE" value={location || "-"} />
                    </div>

                    {rounds && (
                        <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-denim-deep">เลือกรอบกิจกรรม</p>
                                <p className="font-code text-xs text-denim-muted" aria-label={`รอบที่ ${rounds.activeIndex + 1} จาก ${rounds.sessions.length}`}>
                                    {rounds.activeIndex + 1} / {rounds.sessions.length}
                                </p>
                            </div>
                            <SessionSelector sessions={rounds.sessions} activeId={rounds.activeId} onSelect={rounds.onSelect} />
                        </div>
                    )}
                </div>
            </div>

            {footer}
        </article>
    )
}
