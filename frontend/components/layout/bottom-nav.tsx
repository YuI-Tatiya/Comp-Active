"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { isNavLinkActive, type AppNavLink } from "@/components/layout/app-header"
import { cn } from "@/lib/utils"

/* แถบเมนูล่างสำหรับจอแคบ (< lg) ของโซนที่ต้องล็อกอิน (student / organizer) — คู่กับ AppHeader
   ที่จอกว้าง (lg+) ซ่อนตัวเอง เพราะเมนูเดิมบนหัวหน้าทำหน้าที่นี้อยู่แล้ว

   ความสูงบวก safe-area ของบาร์ (BAR_HEIGHT_PX) ใช้ 2 ที่ ต้องตรงกันเสมอ:
   1. BottomNavSpacer — กันเนื้อหา/footer โดนบาร์บัง (เป็น div จริงในโฟลว์ ไม่ใช่ padding คงที่ — ไม่เรียก
      ตอนมีคนจองพื้นที่ล่างจอไปแล้ว ดู BottomSlotProvider ด้านล่าง)
   2. mascot-widget.tsx — ขยับปุ่ม/บับเบิลมาสคอตขึ้นพ้นบาร์ตอนอยู่ในโซน student/organizer บนจอแคบ
   วัดจริงด้วย headless Chrome ได้ 57.5px ก่อนใส่ safe-area (icon 20px + label + padding) */
const BAR_HEIGHT_PX = 68

/** bottom ที่ปลอดภัยสำหรับของลอยอื่น (มาสคอต) บนจอแคบของโซน student/organizer — เผื่อช่องไฟเหนือบาร์อีก 12px */
export const BOTTOM_NAV_CLEARANCE = `calc(${BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 12px)`

/* ── พื้นที่ล่างจอ (จอแคบ) มีเจ้าของได้แค่ทีละอัน ──────────────────────────────
   หน้ารายละเอียดกิจกรรมของนักศึกษามี MobileActionBar ของตัวเอง (ปุ่มลงทะเบียน) ติดขอบล่างจอเหมือนกัน
   ถ้าปล่อยให้ทั้งคู่ fixed bottom-0 พร้อมกันจะทับกันพอดี หน้าไหนจองพื้นที่ล่างไปแล้ว (เรียก useClaimBottomSlot)
   BottomNav จะซ่อนตัวเอง (ให้ความสำคัญกับ action ของหน้านั้นก่อน) */
const BottomSlotContext = createContext<{ claimed: boolean; setClaimed: (v: boolean) => void } | null>(null)

/** ครอบทั้งแอปใน app/layout.tsx ครั้งเดียว (เหมือน AuthProvider/MascotWidget) */
export function BottomSlotProvider({ children }: { children: React.ReactNode }) {
    const [claimed, setClaimedState] = useState(false)
    // นับจำนวนผู้จอง ไม่ใช่ true/false เฉยๆ — กันเคสที่มีสองอย่างจองซ้อนกันแล้วอันหนึ่ง unmount ก่อนแล้วไปเผลอคืนพื้นที่ให้
    const countRef = useRef(0)
    const setClaimed = (claim: boolean) => {
        countRef.current = Math.max(0, countRef.current + (claim ? 1 : -1))
        setClaimedState(countRef.current > 0)
    }
    return <BottomSlotContext.Provider value={{ claimed, setClaimed }}>{children}</BottomSlotContext.Provider>
}

/** เรียกใน component ที่ชนพื้นที่ล่างจอเอง (เช่น MobileActionBar) — จองไว้ตราบเท่าที่ยัง mount อยู่ */
export function useClaimBottomSlot(claim: boolean) {
    const ctx = useContext(BottomSlotContext)
    useEffect(() => {
        if (!ctx || !claim) return
        ctx.setClaimed(true)
        return () => ctx.setClaimed(false)
    }, [ctx, claim])
}

function useBottomSlotClaimed(): boolean {
    return useContext(BottomSlotContext)?.claimed ?? false
}

export interface BottomNavTab extends AppNavLink {
    icon: NonNullable<AppNavLink["icon"]>
}

export function BottomNav({ tabs }: { tabs: BottomNavTab[] }) {
    const pathname = usePathname()
    const claimed = useBottomSlotClaimed()
    if (claimed) return null

    return (
        <nav
            aria-label="เมนูหลัก"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-denim-line bg-white/95 backdrop-blur [padding-bottom:env(safe-area-inset-bottom,0px)] lg:hidden"
        >
            <div className="mx-auto flex max-w-xl items-stretch justify-around">
                {tabs.map((tab) => {
                    const active = isNavLinkActive(pathname, tab)
                    const Icon = tab.icon
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            aria-current={active ? "page" : undefined}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors"
                        >
                            <Icon
                                className={cn("size-5 transition-colors", active ? "text-denim" : "text-denim-muted")}
                                strokeWidth={active ? 2.5 : 2}
                                aria-hidden="true"
                            />
                            <span className={cn("max-w-full truncate px-1", active ? "text-denim-deep" : "text-denim-muted")}>
                                {tab.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

/**
 * ช่องว่างจริงในโฟลว์ (ไม่ใช่ padding คงที่บน wrapper) กันเนื้อหา/footer โดนแถบเมนูล่างบัง — วางไว้ท้ายสุด
 * ของ layout ก่อน BottomNav ไม่แสดงเมื่อหน้านั้นจองพื้นที่ล่างไปเอง (BottomNav ก็ซ่อนไปพร้อมกัน จึงไม่มีอะไรให้เว้น)
 */
export function BottomNavSpacer() {
    const claimed = useBottomSlotClaimed()
    if (claimed) return null
    // style={{height}} ไม่ใช่ Tailwind class — ค่าประกอบจาก BAR_HEIGHT_PX ตอน runtime, Tailwind สแกนหา
    // class จากซอร์สโค้ดตรงๆ ไม่ใช่ string ที่ต่อกันตอนรัน จะใส่เป็น className เฉยๆ แล้วไม่มีผลอะไรเลย
    return <div aria-hidden="true" className="lg:hidden" style={{ height: `calc(${BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))` }} />
}
