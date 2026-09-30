"use client"

import { useRef } from "react"
import { CalendarClock, CheckCircle2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { SessionTag } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

export interface SessionItem {
    id: number
    name: string
    tag: SessionTag
    /** "10 ม.ค. · 09:00–12:00 น." */
    schedule: string
    /** "เหลือ 12/40" */
    seats: string
}

const TAG_BADGE: Partial<Record<SessionTag, { label: string; className: string }>> = {
    attended: { label: "เข้าร่วมแล้ว", className: "bg-info-bg text-info" },
    registered: { label: "✓ ลงทะเบียนแล้ว", className: "bg-success-bg text-success-fg" },
    pending: { label: "รอยืนยัน", className: "bg-warning-bg text-warning" },
    low: { label: "เหลือน้อย", className: "bg-warning-bg text-warning" },
    full: { label: "เต็มแล้ว", className: "bg-surface-2 text-fg-muted" },
    closed: { label: "ปิดรับสมัคร", className: "bg-surface-2 text-fg-muted" },
}

interface SessionSelectorProps {
    sessions: SessionItem[]
    activeId: number | null
    onSelect: (id: number) => void
}

/**
 * เลือกกิจกรรมที่จะสมัคร — เห็นสถานะของทุกกิจกรรมโดยไม่ต้องกดเข้าไปดู (เต็ม/ปิด/สมัครแล้ว/รอยืนยัน)
 * เป็น radio group จริง: ลูกศรซ้าย-ขวา/ขึ้น-ลงเลื่อนได้ และกิจกรรมที่เต็ม/ปิดแล้วยังกดดูรายละเอียดได้
 * (จางลงแต่ไม่ถูกปิดใช้งาน เพราะนักศึกษาอาจแค่อยากดูว่าจัดเมื่อไหร่)
 */
export function SessionSelector({ sessions, activeId, onSelect }: SessionSelectorProps) {
    const refs = useRef<(HTMLButtonElement | null)[]>([])

    function move(from: number, delta: number) {
        const next = (from + delta + sessions.length) % sessions.length
        onSelect(sessions[next].id)
        refs.current[next]?.focus()
    }

    function onKeyDown(e: React.KeyboardEvent, index: number) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault()
            move(index, 1)
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault()
            move(index, -1)
        }
    }

    return (
        <div
            role="radiogroup"
            aria-label="เลือกกิจกรรมที่ต้องการสมัคร"
            className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
        >
            {sessions.map((s, index) => {
                const selected = s.id === activeId
                const badge = TAG_BADGE[s.tag]
                const dimmed = s.tag === "full" || s.tag === "closed"
                return (
                    <button
                        key={s.id}
                        ref={(el) => {
                            refs.current[index] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        // roving tabindex: ทั้งกลุ่มโฟกัสได้ที่ปุ่มที่เลือกอยู่ปุ่มเดียว
                        tabIndex={selected || (activeId === null && index === 0) ? 0 : -1}
                        onClick={() => onSelect(s.id)}
                        onKeyDown={(e) => onKeyDown(e, index)}
                        className={cn(
                            "relative flex min-w-[220px] max-w-[300px] flex-1 shrink-0 snap-start flex-col gap-2 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                            selected
                                ? "border-2 border-brand-600 bg-brand-50 shadow-sm"
                                : "border-border bg-bg hover:border-brand-300",
                            dimmed && !selected && "opacity-70"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2 text-sm font-bold text-fg">{s.name}</span>
                            {selected && <CheckCircle2 className="size-5 shrink-0 text-brand-600" aria-hidden="true" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                            <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{s.schedule}</span>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                                <Users className="size-3.5 shrink-0" aria-hidden="true" /> {s.seats}
                            </span>
                            {badge && <Badge className={cn("shrink-0", badge.className)}>{badge.label}</Badge>}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
