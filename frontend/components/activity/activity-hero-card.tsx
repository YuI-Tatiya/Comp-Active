"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { Calendar, Maximize2, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ImageLightbox } from "@/components/ui/image-lightbox"

interface ActivityHeroCardProps {
    imageUrl: string
    imageAlt: string
    /** แถว badge มุมบนซ้ายของรูป (สถานะ/หมวดหมู่) — ความหมายต่างกันไปตามหน้า จึงรับมาเป็นตัวหน้าเพจเอง */
    badges?: ReactNode
    title: string
    /** บรรทัดหมวดหมู่ + ผู้จัด เช่น "วิชาการ & เทคโนโลยี · จัดโดยคุณ" */
    byline?: string
    /** คำอธิบายงาน/กิจกรรม — แสดงใต้รูปภาพในคอลัมน์เดียวกัน (ความกว้างเท่ารูป) ไม่ใช่พารากราฟลอยแยกใต้การ์ด */
    description?: string | null
    date: string
    startTime: string
    endTime: string
    location: string
    /** แถวปุ่มจัดการ — ต่างกันไปตามหน้า (event มี "จบกิจกรรม/ยกเลิก", activity มี "ตั้งค่า BARS" เฉพาะ Tier 3) */
    actions: ReactNode
}

/**
 * การ์ดหัวเรื่องกิจกรรม — รวมรูป/หมวดหมู่/ชื่อ/วันเวลาสถานที่/ปุ่มจัดการไว้ในการ์ดเดียว ใช้ร่วมกันทั้ง
 * /organizer/events/[id] และ /organizer/activities/[id] แทนรูปแบนเนอร์เต็มความกว้าง+หัวข้อลอยแบบเดิม
 * ที่ดูแยกส่วนกัน
 */
export function ActivityHeroCard({
    imageUrl,
    imageAlt,
    badges,
    title,
    byline,
    description,
    date,
    startTime,
    endTime,
    location,
    actions,
}: ActivityHeroCardProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)

    return (
        <>
            <Card className="overflow-hidden border-border shadow-xs">
                <div className="flex flex-col gap-4 p-4 md:flex-row">
                    <div className="flex w-full shrink-0 flex-col gap-3 md:w-80">
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-surface-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl} alt={imageAlt} className="size-full object-cover" />
                            {badges && <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{badges}</div>}
                            <button
                                type="button"
                                onClick={() => setLightboxOpen(true)}
                                aria-label="ดูภาพขนาดใหญ่"
                                className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                            >
                                <Maximize2 className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                        {description && (
                            <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">{description}</p>
                        )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                        {byline && <p className="text-sm font-medium text-brand-600">{byline}</p>}
                        {/* pt-1 pb-0.5 + leading-snug กันสระ/วรรณยุกต์ไทยโดนตัดขอบบน-ล่าง (leading-tight แน่นเกินไปสำหรับฟอนต์ไทย) */}
                        <h1 className="pb-0.5 pt-1 text-xl font-bold leading-snug text-fg md:text-2xl">{title}</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fg-muted">
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar className="size-4" aria-hidden="true" /> {date} ({startTime} - {endTime} น.)
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin className="size-4" aria-hidden="true" /> {location}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border p-4">{actions}</div>
            </Card>
            <ImageLightbox src={imageUrl} alt={imageAlt} open={lightboxOpen} onOpenChange={setLightboxOpen} />
        </>
    )
}
