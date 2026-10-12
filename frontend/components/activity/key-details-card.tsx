"use client"

import type { LucideIcon } from "lucide-react"
import { Calendar, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { ScheduleLabel, SeatInfo } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

const SEAT_BAR = { ok: "bg-success", low: "bg-warning", full: "bg-danger" } as const
const SEAT_TEXT = { ok: "text-fg-muted", low: "text-warning", full: "text-danger-fg" } as const

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <dt className="text-xs text-fg-muted">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-fg">{children}</dd>
            </div>
        </div>
    )
}

interface KeyDetailsCardProps {
    schedule: ScheduleLabel
    location: string
    seat: SeatInfo
}

/**
 * วัน-เวลา · สถานที่ · ที่นั่งคงเหลือ — รวมไว้จุดเดียว และเป็นที่เดียวที่แสดงข้อมูลเหล่านี้
 * (เดิมที่นั่งซ้ำ 4 จุดทั่วหน้า) ส่วนวันปิดรับสมัครอยู่ที่การ์ดสมัครเท่านั้น
 */
export function KeyDetailsCard({ schedule, location, seat }: KeyDetailsCardProps) {
    return (
        <div className="rounded-2xl border border-border bg-bg p-5 shadow-xs sm:p-6">
            <dl className="space-y-5">
                <Row icon={Calendar} label="วัน-เวลา">
                    <span className="flex flex-wrap items-center gap-2">
                        {schedule.dateLabel}
                        {schedule.multiDay && <Badge variant="neutral">หลายวัน</Badge>}
                    </span>
                    {schedule.timeLabel && <span className="mt-0.5 block font-medium text-fg-muted">{schedule.timeLabel}</span>}
                </Row>

                <Row icon={MapPin} label="สถานที่">
                    {location || "-"}
                </Row>

                <Row icon={Users} label="ที่นั่งคงเหลือ">
                    <span className={cn(SEAT_TEXT[seat.level])}>{seat.label}</span>
                    {!seat.unlimited && (
                        <Progress
                            className="mt-2"
                            value={seat.registered}
                            max={seat.capacity}
                            indicatorClassName={SEAT_BAR[seat.level]}
                            aria-label={`ที่นั่งถูกใช้ไปแล้ว ${Math.round(seat.percent)} เปอร์เซ็นต์`}
                        />
                    )}
                </Row>
            </dl>
        </div>
    )
}
