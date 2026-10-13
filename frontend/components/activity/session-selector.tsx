"use client"

import { useRef } from "react"
import { Check } from "lucide-react"
import { roundLabel, type SessionTag } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

export interface SessionItem {
    id: number
    name: string
    tag: SessionTag
    /** "10 ม.ค. · 09:00–12:00 น." */
    schedule: string
    /** "ไม่จำกัด" / "เหลือ 12/40" / "เต็มแล้ว" (seatInfo().shortLabel) */
    seats: string
}

/** ป้ายสถานะบนการ์ดรอบ — คู่สีสำหรับพื้นขาว (light) และการ์ดที่ถูกเลือกซึ่งเป็นพื้นกรมท่า (dark) */
const TAG_BADGE: Partial<Record<SessionTag, { label: string; light: string; dark: string }>> = {
    attended: { label: "เข้าร่วมแล้ว", light: "bg-sky-50 text-sky-800", dark: "bg-sky-300/20 text-sky-100" },
    registered: { label: "✓ ลงทะเบียนแล้ว", light: "bg-emerald-50 text-emerald-800", dark: "bg-emerald-300/20 text-emerald-100" },
    pending: { label: "รอยืนยัน", light: "bg-amber/15 text-amber-ink", dark: "bg-amber/25 text-amber" },
    low: { label: "เหลือน้อย", light: "bg-amber/15 text-amber-ink", dark: "bg-amber/25 text-amber" },
    full: { label: "เต็มแล้ว", light: "bg-denim-chip text-denim-muted", dark: "bg-white/15 text-denim-on" },
    closed: { label: "ปิดรับสมัคร", light: "bg-denim-chip text-denim-muted", dark: "bg-white/15 text-denim-on" },
}

interface SessionSelectorProps {
    sessions: SessionItem[]
    activeId: number | null
    onSelect: (id: number) => void
}

/**
 * เลือกรอบที่จะสมัคร (การ์ด ROUND_01, ROUND_02, … เรียงตามที่ผู้จัดสร้าง) — เห็นสถานะของทุกรอบโดยไม่ต้องกดเข้าไปดู
 * (เต็ม/ปิด/สมัครแล้ว/รอยืนยัน) เป็น radio group จริง: ลูกศรซ้าย-ขวา/ขึ้น-ลงเลื่อนได้ และรอบที่เต็ม/ปิดแล้วยังกดดู
 * รายละเอียดได้ (จางลงแต่ไม่ถูกปิดใช้งาน เพราะนักศึกษาอาจแค่อยากดูว่าจัดเมื่อไหร่)
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
        <div role="radiogroup" aria-label="เลือกรอบกิจกรรมที่ต้องการสมัคร" className="grid gap-3 sm:grid-cols-2">
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
                            "relative flex min-h-[7.5rem] flex-col gap-1.5 rounded-2xl border-[1.5px] p-4 text-left transition-[background-color,border-color,box-shadow] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim",
                            selected
                                ? "border-denim-deep bg-denim-deep text-white shadow-[0_12px_28px_-16px_rgb(18_34_61/0.8)]"
                                : "border-denim-line bg-white text-denim-deep hover:border-denim-dash",
                            dimmed && !selected && "opacity-70"
                        )}
                    >
                        <span className={cn("font-code text-[11px] font-semibold tracking-[0.06em]", selected ? "text-amber" : "text-denim-accent")}>
                            {roundLabel(index)}
                        </span>
                        {selected && (
                            <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-amber text-denim-deep" aria-hidden="true">
                                <Check className="size-3.5" strokeWidth={3} />
                            </span>
                        )}
                        <span className="line-clamp-2 pr-7 text-sm font-semibold leading-snug">{s.name}</span>
                        <span className={cn("text-xs", selected ? "text-denim-on" : "text-denim-muted")}>{s.schedule}</span>
                        <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                            <span className={cn("text-xs", selected ? "text-denim-on" : "text-denim-muted")}>ที่นั่ง{s.seats}</span>
                            {badge && (
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", selected ? badge.dark : badge.light)}>
                                    {badge.label}
                                </span>
                            )}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
