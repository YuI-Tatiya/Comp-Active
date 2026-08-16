"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"
import { UserMenu } from "@/components/ui/user-menu"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export interface AppNavLink {
    href: string
    label: string
    /** true = active เฉพาะเมื่อ path ตรงเป๊ะ (ใช้กับ href รากของโซน) */
    exact?: boolean
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
 * Header กลางของโซนที่ต้องล็อกอิน (student / organizer)
 * ใช้โครงเดียวกับ SiteHeader ของฝั่ง public เพื่อให้หน้าตาต่อเนื่องกัน
 */
export function AppHeader({ links, roleLabel, accountHref }: AppHeaderProps) {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const isActive = (link: AppNavLink) =>
        link.exact ? pathname === link.href : pathname.startsWith(link.href)

    const displayName = user?.name || "ผู้ใช้งาน"

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
            <Container>
                <div className="flex h-16 items-center gap-4">
                    <Link href={links[0]?.href ?? "/"} className="flex flex-col leading-tight rounded-md">
                        <Logo className="text-2xl" />
                        <span className="hidden text-xs text-fg-subtle sm:block">วิทยาลัยการคอมพิวเตอร์</span>
                    </Link>

                    {/* กลุ่มขวา — เมนูแบบ pill + เมนูผู้ใช้ + ปุ่มเมนูมือถือ
                        ใช้โครงเดียวกับ SiteHeader ของหน้า public */}
                    <div className="ml-auto flex items-center gap-2">
                        <nav className="hidden items-center gap-1 rounded-full bg-surface p-1 lg:flex">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={isActive(link) ? "page" : undefined}
                                    className={cn(
                                        "rounded-full px-4 py-2 text-sm transition-colors",
                                        isActive(link)
                                            ? "bg-bg font-semibold text-brand-600 shadow-xs"
                                            : "text-fg-muted hover:text-fg"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="hidden lg:flex">
                            <UserMenu accountHref={accountHref} roleLabel={roleLabel} />
                        </div>

                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            aria-controls="app-mobile-nav"
                            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
                            className="inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-fg lg:hidden"
                        >
                            {open ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </Container>

            {open && (
                <div id="app-mobile-nav" className="border-t border-border bg-bg lg:hidden">
                    <Container className="flex flex-col gap-1 py-3">
                        {/* หัวข้อผู้ใช้ — บนมือถือแสดงเป็นรายการตรง ๆ ไม่ทำ dropdown ซ้อน */}
                        <div className="mb-2 flex items-center gap-3 border-b border-border px-3 pb-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                                {displayName.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-fg">{displayName}</p>
                                <p className="truncate text-xs text-fg-muted">{roleLabel}</p>
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
                                        ? "bg-brand-50 font-medium text-brand-600"
                                        : "text-fg-muted hover:bg-surface hover:text-fg"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            href={accountHref}
                            className="rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
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
