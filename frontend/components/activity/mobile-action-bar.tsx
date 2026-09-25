"use client"

import { Button } from "@/components/ui/button"
import type { ActionView } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

interface MobileActionBarProps {
    view: ActionView
    sessionName?: string | null
    /** บรรทัดเล็กใต้ชื่อ: สถานะ หรือจำนวนที่นั่ง */
    statusLine: string
    onRegister: () => void
    /** สถานะอื่นที่ไม่ใช่ "สมัครได้": เลื่อนไปที่การ์ดสมัครเพื่อดูรายละเอียด/ยกเลิก */
    onOpenCard: () => void
}

/**
 * แถบสมัครติดขอบล่างบนมือถือ — ให้ปุ่มสมัครอยู่ในระยะนิ้วโป้งตลอด แสดงแค่ "ชื่อกิจกรรม + สถานะ + ปุ่ม"
 * (รายละเอียดอื่นอยู่ในการ์ดสมัครตามลำดับ scroll) ซ่อนบนจอ ≥ lg ที่การ์ดสมัคร sticky อยู่แล้ว
 */
export function MobileActionBar({ view, sessionName, statusLine, onRegister, onOpenCard }: MobileActionBarProps) {
    const canRegister = view.kind === "open" && view.primary && !view.primary.disabled

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                <div className="min-w-0 flex-1">
                    {sessionName && <div className="truncate text-sm font-bold text-fg">{sessionName}</div>}
                    <div className={cn("truncate text-xs", view.kind === "registered" ? "font-semibold text-success-fg" : "text-fg-muted")}>
                        {statusLine}
                    </div>
                </div>
                {canRegister ? (
                    <Button className="h-11 shrink-0 rounded-xl px-6 text-base font-bold" onClick={onRegister}>
                        {view.primary!.label}
                    </Button>
                ) : (
                    <Button variant="outline" className="h-11 shrink-0 rounded-xl px-5 font-semibold" onClick={onOpenCard}>
                        ดูสถานะ
                    </Button>
                )}
            </div>
        </div>
    )
}
