"use client"

import { AMBER_BUTTON } from "@/components/denim/denim-ui"
import { useClaimBottomSlot } from "@/components/layout/bottom-nav"
import type { ActionView } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

interface MobileActionBarProps {
    view: ActionView
    sessionName?: string | null
    /** บรรทัดเล็กใต้ชื่อ: สถานะ หรือจำนวนที่นั่ง */
    statusLine: string
    onRegister: () => void
    /** สถานะอื่นที่ไม่ใช่ "สมัครได้": เลื่อนไปที่การ์ดหัวเรื่องเพื่อดูรายละเอียด/ยกเลิก */
    onOpenCard: () => void
}

/**
 * แถบสมัครติดขอบล่างบนมือถือ (กรมท่า + ปุ่มอำพัน ชุดเดียวกับแถบท้ายการ์ดหัวเรื่อง) — ให้ปุ่มสมัครอยู่ในระยะนิ้วโป้งตลอด
 * แสดงแค่ "ชื่อรอบ + สถานะ + ปุ่ม" ซ่อนบนจอ ≥ lg ที่แถบท้ายการ์ดอยู่ในจอแรกอยู่แล้ว
 */
export function MobileActionBar({ view, sessionName, statusLine, onRegister, onOpenCard }: MobileActionBarProps) {
    const canRegister = view.kind === "open" && view.primary && !view.primary.disabled
    // ติดขอบล่างจอเหมือนกับ BottomNav ของ student layout (/student/activities/[id] มีทั้งคู่) — จองพื้นที่
    // ล่างจอไว้ก่อน ให้ BottomNav ซ่อนตัวเองแทนที่จะทับกัน ปุ่มลงทะเบียนสำคัญกว่าแท็บเมนูตรงหน้านี้
    useClaimBottomSlot(true)

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-denim-deep/95 text-white backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                <div className="min-w-0 flex-1">
                    {sessionName && <div className="truncate text-sm font-bold">{sessionName}</div>}
                    <div className={cn("truncate text-xs", view.kind === "registered" ? "font-semibold text-emerald-300" : "text-denim-on")}>
                        {statusLine}
                    </div>
                </div>
                {canRegister ? (
                    <button
                        type="button"
                        onClick={onRegister}
                        className={cn(AMBER_BUTTON, "min-h-11 shrink-0 px-5 text-[15px] shadow-[0_3px_0_var(--color-amber-deep)]")}
                    >
                        {view.primary!.label}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenCard}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-xl border-[1.5px] border-white/35 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-white"
                    >
                        ดูสถานะ
                    </button>
                )}
            </div>
        </div>
    )
}
