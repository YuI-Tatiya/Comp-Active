"use client"

import { AMBER_BUTTON } from "@/components/denim/denim-ui"
import { useClaimBottomSlot } from "@/components/layout/bottom-nav"
import type { ActionView } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

interface MobileActionBarProps {
    view: ActionView
    /** ชื่อรอบ/กิจกรรมที่กำลังจะสมัคร (บรรทัดหนา) */
    sessionName: string
    /** บรรทัดโค้ดเหนือชื่อตอนเปิดรับสมัคร เช่น "ROUND_01 · 25 ต.ค. · 09:30–16:00 น." */
    meta: string
    /** สถานะอื่นที่ไม่ใช่ "สมัครได้" (สมัครแล้ว/รอยืนยัน/เต็ม/ปิด) — แสดงแทนบรรทัดโค้ด */
    statusLine: string
    onRegister: () => void
    /** สถานะอื่นที่ไม่ใช่ "สมัครได้": เลื่อนไปที่การ์ดหัวเรื่องเพื่อดูรายละเอียด/ยกเลิก */
    onOpenCard: () => void
}

/** สีของบรรทัดสถานะตามความหมาย — ข้อความบนพื้นขาว */
const STATUS_TONE: Partial<Record<ActionView["kind"], string>> = {
    registered: "font-semibold text-emerald-700",
    attended: "font-semibold text-sky-800",
    pending: "font-semibold text-amber-ink",
}

/**
 * แถบสมัครติดขอบล่างบนมือถือ (พื้นขาว + ปุ่มอำพัน) — ให้ปุ่มสมัครอยู่ในระยะนิ้วโป้งตลอด
 * แสดงแค่ "รอบ/สถานะ + ชื่อ + ปุ่ม" ซ่อนบนจอ ≥ lg ที่แถบท้ายการ์ดหัวเรื่องอยู่ในจอแรกอยู่แล้ว
 */
export function MobileActionBar({ view, sessionName, meta, statusLine, onRegister, onOpenCard }: MobileActionBarProps) {
    const canRegister = view.kind === "open" && view.primary && !view.primary.disabled
    // ติดขอบล่างจอเหมือนกับ BottomNav ของ student layout (/student/activities/[id] มีทั้งคู่) — จองพื้นที่
    // ล่างจอไว้ก่อน ให้ BottomNav ซ่อนตัวเองแทนที่จะทับกัน ปุ่มลงทะเบียนสำคัญกว่าแท็บเมนูตรงหน้านี้
    useClaimBottomSlot(true)

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-denim-line bg-white/95 text-denim-deep shadow-[0_-12px_30px_-20px_rgb(18_34_61/0.45)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                <div className="min-w-0 flex-1" aria-live="polite">
                    {canRegister ? (
                        <p className="truncate font-code text-[11px] text-denim-accent">{meta}</p>
                    ) : (
                        <p className={cn("truncate text-xs text-denim-muted", STATUS_TONE[view.kind])}>{statusLine}</p>
                    )}
                    <p className="truncate font-display text-[15px] font-bold leading-snug">{sessionName}</p>
                </div>
                {canRegister ? (
                    <button
                        type="button"
                        onClick={onRegister}
                        className={cn(AMBER_BUTTON, "min-h-12 shrink-0 px-6 text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim")}
                    >
                        {view.primary!.label}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenCard}
                        className="inline-flex min-h-12 shrink-0 items-center rounded-[14px] border-[1.5px] border-denim-field bg-white px-5 text-sm font-semibold text-denim-deep transition-colors hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                    >
                        ดูสถานะ
                    </button>
                )}
            </div>
        </div>
    )
}
