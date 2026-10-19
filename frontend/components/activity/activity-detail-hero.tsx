"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ChevronLeft, MapPin, Maximize2 } from "lucide-react"
import { ImageLightbox } from "@/components/ui/image-lightbox"
import { InfoTile } from "@/components/activity/activity-detail-sections"
import { SessionSelector, type SessionItem } from "@/components/activity/session-selector"
import { PHOTO_SCRIM, PHOTO_TEXT_SHADOW, TerminalPrompt, coverPattern, useUploadImage, type CoverTone } from "@/components/denim/denim-ui"
import { categoryLabel, getCategory } from "@/lib/categories"
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
        // จอแคบใช้ MobileDetailCover (ปกเต็มจอด้านบน) แทน
        <div
            className={cn(
                "relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-2xl p-5 max-lg:hidden lg:h-full",
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

/**
 * ปกเต็มจอของหน้ารายละเอียดบนจอแคบ (< lg) — แทนแถบยีนส์ + ปกในการ์ดของจอกว้าง: ปุ่มกลับวงกลม · ป้ายสถานะ ·
 * บรรทัดคำสั่ง + รหัสงานตัวใหญ่ · มาสคอต (เฉพาะตอนไม่มีรูป) การ์ดหัวเรื่องเลื่อนขึ้นมาทับขอบล่างเป็นแผ่นมุมมน
 */
export function MobileDetailCover({
    backHref,
    imagePath,
    tone,
    categories,
    statusLabel,
    statusTone,
    code,
    date,
    title,
}: DetailCoverProps & { backHref: string }) {
    const image = useUploadImage(imagePath)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const pill = STATUS_PILL[statusTone]

    return (
        <section className={cn("relative overflow-hidden pb-14 lg:hidden", coverPattern(tone, categories))}>
            {image.show ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลดเสิร์ฟจาก backend (/uploads) */}
                    <img src={image.src!} alt="" decoding="async" onError={image.onError} className="absolute inset-0 size-full object-cover" />
                    <div className={PHOTO_SCRIM} aria-hidden="true" />
                </>
            ) : (
                <Image
                    src="/mascot-laptop.png"
                    alt=""
                    width={476}
                    height={1033}
                    sizes="80px"
                    priority
                    className="pointer-events-none absolute bottom-8 right-3 h-[150px] w-auto drop-shadow-[0_14px_20px_rgb(0_0_0/0.35)]"
                />
            )}

            <div className="relative flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
                <Link
                    href={backHref}
                    aria-label="กลับ"
                    className="grid size-11 place-items-center rounded-full bg-white text-denim-deep shadow-[0_8px_18px_-8px_rgb(0_0_0/0.45)] transition-transform active:scale-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                    <ChevronLeft className="size-5" strokeWidth={2.6} aria-hidden="true" />
                </Link>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold", pill.pill)}>
                    <span className={cn("size-[7px] rounded-full", pill.dot)} aria-hidden="true" />
                    {statusLabel}
                </span>
            </div>

            <div className={cn("relative max-w-[70%] px-4 pt-10 sm:px-6", image.show && PHOTO_TEXT_SHADOW)}>
                <TerminalPrompt>~/events $ open</TerminalPrompt>
                <p className="mt-1 font-code text-[38px] font-bold leading-none tracking-[-0.02em] text-white">{code}</p>
                {date && (
                    <p className="mt-2 font-code text-xs text-white/80">
                        {date.weekday} {date.day} {date.monthYear}
                    </p>
                )}
            </div>

            {image.show && (
                <>
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        aria-label="ดูภาพขนาดใหญ่"
                        className="absolute bottom-10 right-4 grid size-10 place-items-center rounded-full bg-denim-deep/70 text-white backdrop-blur-sm focus-visible:outline-white"
                    >
                        <Maximize2 className="size-4" aria-hidden="true" />
                    </button>
                    <ImageLightbox src={image.src!} alt={title} open={lightboxOpen} onOpenChange={setLightboxOpen} />
                </>
            )}
        </section>
    )
}

/** แถว WHEN / WHERE / SEATS บนจอแคบ — การ์ดขาวแถวคั่นเส้นประ (จอกว้างเป็นไทล์ 2 ช่องข้างปก) */
function MobileInfoRows({ rows }: { rows: { label: string; lines: string[] }[] }) {
    return (
        <dl className="divide-y divide-dashed divide-denim-line rounded-[20px] border border-denim-line bg-white px-4 lg:hidden">
            {rows.map((r) => (
                <div key={r.label} className="flex gap-4 py-3.5">
                    <dt className="w-14 shrink-0 pt-0.5 font-code text-[11px] font-semibold tracking-[0.06em] text-amber-ink">{r.label}</dt>
                    <dd className="min-w-0 text-[15px] leading-snug text-denim-deep">
                        {r.lines.map((line, i) => (
                            <span key={i} className={cn("block", i > 0 && "text-denim-muted")}>
                                {line}
                            </span>
                        ))}
                    </dd>
                </div>
            ))}
        </dl>
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
    /** ที่นั่งของรอบที่เลือก เช่น "ไม่จำกัดจำนวน" / "เหลือ 12 จาก 40 ที่" — แถว SEATS บนจอแคบ */
    seatsLabel?: string
    /** เฉพาะงานที่มีหลายรอบ — การ์ดเลือกรอบ + ตัวนับ "1 / 3" */
    rounds?: { sessions: SessionItem[]; activeId: number | null; activeIndex: number; onSelect: (id: number) => void } | null
    /** แถบกรมท่าท้ายการ์ด — แถบสมัคร (นักศึกษา/บุคคลทั่วไป) หรือแถบผู้เข้าร่วม (มุมมองผู้จัด) */
    footer: React.ReactNode
}

/**
 * การ์ดหัวเรื่องของหน้ารายละเอียดกิจกรรม (ธีม Denim) — ซ้ายเป็นปกใหญ่ ขวาเป็นหมวดหมู่/ผู้จัด ชื่อ วันเวลา-สถานที่
 * และการ์ดเลือกรอบ ท้ายการ์ดเป็นแถบกรมท่าที่ผู้เรียกส่งมา (footer)
 */
export function ActivityDetailHero({
    id,
    cover,
    title,
    categories,
    organizerName,
    schedule,
    location,
    seatsLabel,
    rounds,
    footer,
}: ActivityDetailHeroProps) {
    return (
        // จอแคบ: แผ่นมุมมนบนชนขอบจอ (ยกเลิก padding ของ Container) ซ้อนขอบล่างของ MobileDetailCover — พื้นเดียวกับหน้า
        // ไม่มีกรอบ/เงา ส่วนข้อมูลข้างในเป็นการ์ดขาวแยกชิ้น · จอกว้าง: การ์ดขาวปก+ข้อมูลตามเดิม
        // relative: ปกเป็น relative (มาก่อนใน DOM) — ถ้าแผ่นนี้ไม่ positioned ปกจะวาดทับขอบบนของแผ่น
        <article
            id={id}
            className="relative scroll-mt-4 overflow-hidden rounded-t-[28px] bg-surface max-sm:-mx-4 sm:max-lg:-mx-6 lg:rounded-[26px] lg:border lg:border-denim-line lg:bg-white lg:shadow-[0_28px_60px_-34px_rgb(18_34_61/0.55)]"
        >
            <div className="grid gap-5 p-4 pt-6 sm:p-5 sm:pt-7 lg:grid-cols-2 lg:gap-7 lg:p-6 lg:pt-6">
                <DetailCover {...cover} categories={categories} title={title} />

                <div className="flex min-w-0 flex-col gap-4 lg:py-1">
                    {(categories.length > 0 || organizerName) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {categories.map((c) => (
                                // จอแคบ: ชิปขาวมีจุดสีหมวดหมู่ (บนพื้นเทาอ่อนของแผ่น) · จอกว้าง: ป้ายกรมท่าอ่อนตามเดิม
                                <span
                                    key={c}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-denim-line bg-white px-3 py-1 text-xs font-semibold text-denim-deep lg:rounded-md lg:border-0 lg:bg-denim-chip lg:px-2.5 lg:text-denim"
                                >
                                    <span className={cn("size-2 rounded-full lg:hidden", getCategory(c)?.dot ?? "bg-denim")} aria-hidden="true" />
                                    {categoryLabel(c)}
                                </span>
                            ))}
                            {organizerName && (
                                <span className="text-xs text-denim-muted max-lg:hidden">
                                    จัดโดย <strong className="font-semibold text-denim-deep">{organizerName}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {/* pt-1 + leading 1.25 กันสระ/วรรณยุกต์ไทยบรรทัดแรกโดนตัด (leading-tight แน่นเกินไปสำหรับฟอนต์ไทย) */}
                    <h1 className="pt-1 font-display text-[28px] font-bold leading-[1.25] text-denim-deep sm:text-4xl">{title}</h1>
                    {organizerName && (
                        <p className="-mt-2 text-sm text-denim-muted lg:hidden">
                            จัดโดย <strong className="font-semibold text-denim-deep">{organizerName}</strong>
                        </p>
                    )}

                    <div className="grid gap-3 max-lg:hidden sm:grid-cols-2">
                        <InfoTile
                            icon={CalendarDays}
                            label="WHEN"
                            value={`${schedule.dateLabel}${schedule.timeLabel ? ` · ${schedule.timeLabel}` : ""}`}
                        />
                        <InfoTile icon={MapPin} label="WHERE" value={location || "-"} />
                    </div>
                    <MobileInfoRows
                        rows={[
                            { label: "WHEN", lines: [schedule.dateLabel, ...(schedule.timeLabel ? [schedule.timeLabel] : [])] },
                            { label: "WHERE", lines: [location || "-"] },
                            ...(seatsLabel ? [{ label: "SEATS", lines: [seatsLabel] }] : []),
                        ]}
                    />

                    {rounds && (
                        <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-display text-xl font-bold text-denim-deep lg:font-sans lg:text-sm lg:font-semibold">เลือกรอบกิจกรรม</p>
                                <p className="font-code text-xs text-denim-muted" aria-label={`รอบที่ ${rounds.activeIndex + 1} จาก ${rounds.sessions.length}`}>
                                    {rounds.activeIndex + 1} / {rounds.sessions.length}
                                </p>
                            </div>
                            <SessionSelector sessions={rounds.sessions} activeId={rounds.activeId} onSelect={rounds.onSelect} />
                        </div>
                    )}
                </div>
            </div>

            {/* จอแคบ: แถบกรมท่าเป็นการ์ดมุมมนในแผ่น (ไม่ชนขอบจอ) · จอกว้าง: แถบท้ายการ์ดเต็มความกว้างตามเดิม */}
            <div className="mx-4 mb-2 overflow-hidden rounded-2xl sm:mx-5 lg:m-0 lg:rounded-none">{footer}</div>
        </article>
    )
}
