"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { DenimLogo } from "@/components/layout/logo"
import { UserMenu } from "@/components/ui/user-menu"
import { cn } from "@/lib/utils"

/* แถบหัวบนจอแคบ (< lg) ของพอร์ทัลนักศึกษา — แทน AppHeader (ซ่อนด้วย hideBelowLg) ให้หัวเปลี่ยนตามหน้าแบบแอปมือถือ:
   หน้าหลักเป็นโลโก้ หน้าอื่นเป็นบรรทัดคำสั่ง + ชื่อหน้า ส่วนขวาเป็นอวตาร (เมนูโปรไฟล์/ออกจากระบบ) หรือปุ่มของหน้านั้น
   หน้ารายละเอียดกิจกรรมไม่มีแถบนี้ — ปกเต็มจอมีปุ่มกลับของตัวเอง (ดู ActivityRegistrationView) */

interface MobileAppBarProps {
    /** บรรทัดคำสั่งเหนือชื่อหน้า เช่น "~/student $ ls events/" — ไม่ส่งทั้งคู่ = แถบโลโก้ (หน้าหลัก) */
    prompt?: string
    title?: string
    /** ฝั่งขวา — ไม่ส่ง = อวตาร (เมนูผู้ใช้) */
    action?: React.ReactNode
}

export function MobileAppBar({ prompt, title, action }: MobileAppBarProps) {
    return (
        // safe-area: iPhone ที่มีติ่งกล้อง — เนื้อหาไม่จมใต้แถบสถานะ (แถบนี้ sticky top-0 เอง)
        <header className="sticky top-0 z-40 border-b border-denim-line bg-white/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur lg:hidden">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2.5">
                {title ? (
                    <div className="min-w-0">
                        {prompt && (
                            <p className="truncate font-code text-[11px] text-denim-muted" aria-hidden="true">
                                {prompt}
                            </p>
                        )}
                        {/* ไม่ใช่ h1 — หัวข้อหลัก (h1) ของแต่ละหน้าอยู่ในเนื้อหา แถบนี้เป็นป้ายนำทางเหมือนชื่อแอป */}
                        <p className="truncate font-display text-[22px] font-bold leading-tight text-denim-deep">{title}</p>
                    </div>
                ) : (
                    <Link href="/student" className="rounded-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim">
                        <DenimLogo />
                    </Link>
                )}
                <div className="flex shrink-0 items-center">{action ?? <UserMenu accountHref="/student/profile" roleLabel="นักศึกษา" variant="avatar" />}</div>
            </div>
        </header>
    )
}

/** ปุ่มสี่เหลี่ยมกรมท่ามุมขวาของแถบหัว (เช่น "+" ไปหากิจกรรมใหม่ในหน้ากิจกรรมของฉัน) */
export function MobileAppBarLink({ href, label, icon: Icon = Plus }: { href: string; label: string; icon?: typeof Plus }) {
    return (
        <Link
            href={href}
            aria-label={label}
            title={label}
            className="grid size-11 place-items-center rounded-2xl bg-denim-deep text-amber shadow-[0_3px_0_rgb(8_16_31)] transition-transform active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
        >
            <Icon className="size-5" strokeWidth={2.6} aria-hidden="true" />
        </Link>
    )
}

/** ป้ายอำพันมุมขวาของแถบหัว เช่น "RANK #1" ในหน้าโปรไฟล์ */
export function MobileAppBarPill({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex min-h-8 items-center rounded-full bg-amber px-3 font-code text-xs font-bold text-denim-deep shadow-[0_3px_0_var(--color-amber-deep)]",
                className
            )}
        >
            {children}
        </span>
    )
}

type StudentBar = { prompt?: string; title?: string; action?: "browse" } | null

/**
 * แถบหัวของแต่ละหน้าในพอร์ทัลนักศึกษา — กำหนดที่เดียวใน layout จาก path (หน้าใหม่ได้แถบโลโก้อัตโนมัติ ไม่หลุดเป็นหน้าไร้หัว)
 * null = หน้านั้นวาดหัวเอง: รายละเอียดกิจกรรม (ปกเต็มจอ + ปุ่มกลับ) และโปรไฟล์ (ป้ายอันดับ ต้องใช้ข้อมูลของหน้า)
 */
export function studentMobileBar(pathname: string): StudentBar {
    if (/^\/student\/(events|activities)\/[^/]+/.test(pathname)) return null
    if (pathname.startsWith("/student/profile")) return null
    if (pathname.startsWith("/student/events")) return { prompt: "~/student $ ls events/", title: "กิจกรรมทั้งหมด" }
    if (pathname.startsWith("/student/my-registrations")) {
        return { prompt: "~/student $ ls my-activities/", title: "กิจกรรมของฉัน", action: "browse" }
    }
    if (pathname.startsWith("/student/about")) return { prompt: "~/student $ cat about", title: "เกี่ยวกับเรา" }
    if (pathname.startsWith("/student/checkin")) return { prompt: "~/student $ check-in", title: "เช็คอินกิจกรรม" }
    return {}
}

export function StudentMobileAppBar({ pathname }: { pathname: string }) {
    const bar = studentMobileBar(pathname)
    if (!bar) return null
    return (
        <MobileAppBar
            prompt={bar.prompt}
            title={bar.title}
            action={bar.action === "browse" ? <MobileAppBarLink href="/student/events" label="หากิจกรรมใหม่" /> : undefined}
        />
    )
}
