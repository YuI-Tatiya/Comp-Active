"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { LogOut } from "lucide-react"
import { Container } from "@/components/layout/container"
import { DenimLogo } from "@/components/layout/logo"
import { UserMenu } from "@/components/ui/user-menu"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export interface AppNavLink {
    href: string
    label: string
    /** true = active เฉพาะเมื่อ path ตรงเป๊ะ (ใช้กับ href รากของโซน) */
    exact?: boolean
    /** path prefix อื่นที่นับเป็นเมนูนี้ด้วย — หน้าที่เข้าจากเมนูนี้แต่ URL อยู่นอก href (เช่น /organizer/events/12 มาจาก "จัดการกิจกรรม") */
    alsoMatches?: string[]
    /** ไอคอนประจำเมนู — เมนูบนใช้แค่ข้อความ ไม่ใช้ไอคอนนี้ ใช้เฉพาะ BottomNav (components/layout/bottom-nav.tsx) */
    icon?: LucideIcon
    /** ชื่อสั้นบน BottomNav (ช่องแคบ ~90px) เช่น "ของฉัน" แทน "กิจกรรมของฉัน" — ไม่ส่ง = ใช้ label */
    shortLabel?: string
}

/** นับว่าแท็บนี้ active ไหม — ใช้ร่วมกันทั้งเมนูบน (ที่นี่) และแถบเมนูล่างมือถือ (BottomNav) */
export function isNavLinkActive(pathname: string, link: AppNavLink): boolean {
    return (
        (link.exact ? pathname === link.href : pathname.startsWith(link.href)) ||
        (link.alsoMatches ?? []).some((prefix) => pathname.startsWith(prefix))
    )
}

interface AppHeaderProps {
    /** ลิงก์เมนูของโซนนั้น ๆ — ใช้กับเมนูบนจอกว้างเท่านั้น (มือถือใช้ BottomNav ของแต่ละ layout แทน) */
    links: AppNavLink[]
    /** ป้ายบอกบทบาท เช่น "นักศึกษา" / "ผู้จัดกิจกรรม" */
    roleLabel: string
    /** ลิงก์หน้าแก้ข้อมูลตัวเอง — student: /student/profile · organizer: /organizer/settings */
    accountHref: string
    /**
     * ซ่อนทั้งแถบบนจอแคบ (< lg) — พอร์ทัลนักศึกษาใช้ MobileAppBar (components/student/mobile-app-bar.tsx) แทน
     * ซึ่งเปลี่ยนหัวตามหน้า (ชื่อหน้า/ปุ่มของหน้านั้น) แบบแอปมือถือ
     */
    hideBelowLg?: boolean
}

/**
 * Header กลางของโซนที่ต้องล็อกอิน (student / organizer) — ธีม Denim Varsity
 * โครงเดียวกับ SiteHeader ของฝั่ง public (โลโก้ซ้าย · เมนูกึ่งกลาง · ขวาเป็นเมนูผู้ใช้แทนปุ่มเข้าสู่ระบบ)
 *
 * จอแคบ (< lg) ไม่มีเมนูแฮมเบอร์เกอร์แล้ว — ลิงก์หลักทุกอันย้ายไปอยู่ที่ BottomNav (แถบเมนูล่างติดขอบจอ)
 * ของแต่ละ layout แทน เหลือแค่ปุ่มออกจากระบบตรงนี้ (เข้าถึงบัญชี/โปรไฟล์ไปทาง BottomNav แทนเช่นกัน)
 */
export function AppHeader({ links, roleLabel, accountHref, hideBelowLg = false }: AppHeaderProps) {
    const { logout } = useAuth()
    const pathname = usePathname()

    return (
        <header className={cn("sticky top-0 z-50 border-b border-denim-line bg-white/95 font-plex backdrop-blur", hideBelowLg && "max-lg:hidden")}>
            <Container>
                <div className="flex h-[72px] items-center gap-4">
                    <Link href={links[0]?.href ?? "/"} className="rounded-md">
                        <DenimLogo />
                    </Link>

                    <nav aria-label="เมนูหลัก" className="mx-auto hidden items-center gap-1 lg:flex">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isNavLinkActive(pathname, link) ? "page" : undefined}
                                className={cn(
                                    "rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors",
                                    isNavLinkActive(pathname, link)
                                        ? "bg-denim text-white"
                                        : "text-denim-ink hover:bg-denim-chip hover:text-denim-deep"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2 lg:ml-0">
                        <div className="hidden lg:flex">
                            <UserMenu accountHref={accountHref} roleLabel={roleLabel} />
                        </div>

                        <button
                            type="button"
                            onClick={logout}
                            aria-label="ออกจากระบบ"
                            className="inline-flex size-10 items-center justify-center rounded-md text-denim-ink transition-colors hover:bg-denim-chip hover:text-denim-deep lg:hidden"
                        >
                            <LogOut className="size-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </Container>
        </header>
    )
}
