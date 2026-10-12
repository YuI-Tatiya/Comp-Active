"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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
}

interface AppHeaderProps {
    /** ลิงก์เมนูของโซนนั้น ๆ */
    links: AppNavLink[]
    /** ป้ายบอกบทบาท เช่น "นักศึกษา" / "ผู้จัดกิจกรรม" */
    roleLabel: string
    /** ลิงก์หน้าแก้ข้อมูลตัวเอง — student: /student/profile · organizer: /organizer/settings */
    accountHref: string
}

/**
 * Header กลางของโซนที่ต้องล็อกอิน (student / organizer) — ธีม Denim Varsity
 * โครงเดียวกับ SiteHeader ของฝั่ง public (โลโก้ซ้าย · เมนูกึ่งกลาง · ขวาเป็นเมนูผู้ใช้แทนปุ่มเข้าสู่ระบบ)
 */
export function AppHeader({ links, roleLabel, accountHref }: AppHeaderProps) {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const isActive = (link: AppNavLink) =>
        (link.exact ? pathname === link.href : pathname.startsWith(link.href)) ||
        (link.alsoMatches ?? []).some((prefix) => pathname.startsWith(prefix))

    const displayName = user?.name || "ผู้ใช้งาน"

    return (
        <header className="sticky top-0 z-50 border-b border-denim-line bg-white/95 font-plex backdrop-blur">
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
                                aria-current={isActive(link) ? "page" : undefined}
                                className={cn(
                                    "rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors",
                                    isActive(link)
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
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            aria-controls="app-mobile-nav"
                            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
                            className="inline-flex size-10 items-center justify-center rounded-md text-denim-ink transition-colors hover:bg-denim-chip hover:text-denim-deep lg:hidden"
                        >
                            {open ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </Container>

            {open && (
                <div id="app-mobile-nav" className="border-t border-denim-line bg-white lg:hidden">
                    <Container className="flex flex-col gap-1 py-3">
                        {/* หัวข้อผู้ใช้ — บนมือถือแสดงเป็นรายการตรง ๆ ไม่ทำ dropdown ซ้อน */}
                        <div className="mb-2 flex items-center gap-3 border-b border-denim-line px-3 pb-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber font-display text-sm font-bold text-denim-deep">
                                {displayName.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-denim-deep">{displayName}</p>
                                <p className="truncate text-xs text-denim-muted">{roleLabel}</p>
                            </div>
                        </div>
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link) ? "page" : undefined}
                                className={cn(
                                    "rounded-md px-3 py-2.5 text-sm transition-colors",
                                    isActive(link)
                                        ? "bg-denim-chip font-semibold text-denim"
                                        : "text-denim-ink hover:bg-denim-paper hover:text-denim-deep"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            href={accountHref}
                            className="rounded-md px-3 py-2.5 text-sm text-denim-ink transition-colors hover:bg-denim-paper hover:text-denim-deep"
                        >
                            แก้ไขข้อมูลส่วนตัว
                        </Link>
                        <Button variant="outline" onClick={logout} className="mt-2 w-full">
                            <LogOut />
                            ออกจากระบบ
                        </Button>
                    </Container>
                </div>
            )}
        </header>
    )
}
