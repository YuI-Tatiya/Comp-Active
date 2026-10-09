import type { ReactNode } from "react"
import { Calendar, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"

interface ActivityHeroCardProps {
    imageUrl: string
    imageAlt: string
    /** แถว badge มุมบนซ้ายของรูป (สถานะ/หมวดหมู่) — ความหมายต่างกันไปตามหน้า จึงรับมาเป็นตัวหน้าเพจเอง */
    badges?: ReactNode
    title: string
    /** บรรทัดหมวดหมู่ + ผู้จัด เช่น "วิชาการ & เทคโนโลยี · จัดโดยคุณ" */
    byline?: string
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
 * ที่ดูแยกส่วนกัน รายละเอียด (description) ไม่ได้อยู่ในการ์ดนี้ — หน้าเพจแสดงต่อท้ายด้านล่างเหมือนเดิม
 */
export function ActivityHeroCard({ imageUrl, imageAlt, badges, title, byline, date, startTime, endTime, location, actions }: ActivityHeroCardProps) {
    return (
        <Card className="overflow-hidden border-border shadow-xs">
            <div className="flex flex-col gap-4 p-4 md:flex-row">
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 md:w-80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={imageAlt} className="size-full object-cover" />
                    {badges && <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{badges}</div>}
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
    )
}
