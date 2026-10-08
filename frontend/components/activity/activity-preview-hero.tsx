"use client"

import { Calendar, Layers, MapPin, Share2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { categoryLabel } from "@/lib/categories"
import { cn } from "@/lib/utils"
import type { ScheduleLabel } from "@/lib/activity-view"

interface PreviewSession {
    id: number
    name: string
}

interface ActivityPreviewHeroProps {
    imageUrl: string
    title: string
    /** คำอธิบายงาน/กิจกรรม — แสดงใต้รูปภาพในคอลัมน์เดียวกัน (ความกว้างเท่ารูป) ไม่ใช่เต็มความกว้างการ์ด */
    description?: string | null
    categories: string[]
    organizerName?: string | null
    statusLabel: string
    statusOpen: boolean
    isProject: boolean
    sessions: PreviewSession[]
    activeId: number | null
    onSelectActivity: (id: number) => void
    schedule: ScheduleLabel
    location: string
    registeredCount: number
    capacity: number | null
    unlimited: boolean
    onShare: () => void
}

/**
 * การ์ดหัวเรื่อง "ดูอย่างเดียว" ของงาน/กิจกรรม — ใช้ตอนผู้จัดดูของที่ไม่ใช่ของตัวเอง
 * (/organizer/events/view/[id], /organizer/activities/view/[id]) ทั้งสองหน้านี้ตั้งใจให้หน้าตา
 * เหมือนหน้าลงทะเบียนฝั่งนักศึกษา (ActivityRegistrationHero) ทุกส่วนตามคอมเมนต์เดิมของหน้า
 * ต่างกันแค่ไม่มีการกระทำใดให้ทำ (ไม่ใช่ผู้ลงทะเบียน) — ไม่ใช้คอมโพเนนต์เดียวกันตรงๆ เพราะฝั่งนักศึกษา
 * ผูกกับ ActionView/สถานะการสมัครที่ซับซ้อนกว่านี้มาก ส่วนท้ายที่นี่จึงเป็นจำนวนผู้เข้าร่วม+แถบความ
 * คืบหน้า+ปุ่มแชร์แทนปุ่มสมัคร
 */
export function ActivityPreviewHero({
    imageUrl,
    title,
    description,
    categories,
    organizerName,
    statusLabel,
    statusOpen,
    isProject,
    sessions,
    activeId,
    onSelectActivity,
    schedule,
    location,
    registeredCount,
    capacity,
    unlimited,
    onShare,
}: ActivityPreviewHeroProps) {
    const byline = [categories.map((c) => categoryLabel(c)).join(", "), organizerName && `จัดโดย ${organizerName}`]
        .filter(Boolean)
        .join(" · ")
    const seatsRemaining = !unlimited && capacity ? Math.max(capacity - registeredCount, 0) : null
    const percent = !unlimited && capacity ? Math.min((registeredCount / capacity) * 100, 100) : 0
    const urgency: "ok" | "low" | "full" = percent >= 100 ? "full" : percent >= 80 ? "low" : "ok"
    const urgencyBar = { ok: "bg-success", low: "bg-warning", full: "bg-danger" }[urgency]
    const urgencyText = { ok: "text-fg-muted", low: "text-warning", full: "text-danger-fg" }[urgency]

    return (
        <Card className="overflow-hidden border-border shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-80">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt={title} className="size-full object-cover" />
                        <span
                            className={cn(
                                "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white",
                                statusOpen ? "bg-success" : "bg-black/70"
                            )}
                        >
                            {statusLabel}
                        </span>
                    </div>
                    {description && (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">{description}</p>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
                    {byline && <p className="text-sm font-medium text-brand-600">{byline}</p>}
                    <h1 className="text-2xl font-black leading-tight text-fg md:text-3xl">{title}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fg-muted">
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar className="size-4 shrink-0" aria-hidden="true" />
                            {schedule.dateLabel}
                            {schedule.timeLabel && ` (${schedule.timeLabel})`}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-4 shrink-0" aria-hidden="true" /> {location || "-"}
                        </span>
                    </div>

                    {isProject && (
                        <div className="space-y-2 pt-1">
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                                <Layers className="size-3.5 shrink-0" aria-hidden="true" /> กิจกรรมย่อย:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {sessions.map((s) => {
                                    const active = s.id === activeId
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => onSelectActivity(s.id)}
                                            className={cn(
                                                "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                                                active
                                                    ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                                                    : "border-border bg-bg text-fg-muted hover:border-brand-300 hover:text-fg"
                                            )}
                                        >
                                            {s.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-border p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-[220px] flex-1">
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 font-medium text-fg">
                                <Users className="size-4" aria-hidden="true" /> ผู้เข้าร่วม
                            </span>
                            <span className={cn("font-semibold", urgencyText)}>
                                {registeredCount}
                                {unlimited ? " คน (ไม่จำกัด)" : `/${capacity} คน`}
                            </span>
                        </div>
                        {!unlimited && capacity && (
                            <Progress value={registeredCount} max={capacity} indicatorClassName={urgencyBar} />
                        )}
                    </div>
                    <Button variant="outline" className="rounded-xl" onClick={onShare}>
                        <Share2 className="size-4" aria-hidden="true" /> แชร์
                    </Button>
                </div>
            </div>
        </Card>
    )
}
