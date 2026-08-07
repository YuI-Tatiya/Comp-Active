"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
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
    /** ถ้ามี ป้ายบทบาทจะกลายเป็นลิงก์ไปหน้าโปรไฟล์ */
    profileHref?: string
}

/**
 * Header กลางของโซนที่ต้องล็อกอิน (student / organizer)
 * ใช้โครงเดียวกับ SiteHeader ของฝั่ง public เพื่อให้หน้าตาต่อเนื่องกัน
 */
export function AppHeader({ links, roleLabel, profileHref }: AppHeaderProps) {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const isActive = (link: AppNavLink) =>
        link.exact ? pathname === link.href : pathname.startsWith(link.href)

    const roleBadge = (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                profileHref && pathname.startsWith(profileHref)
                    ? "bg-brand-600 font-medium text-white"
                    : "bg-brand-50 font-medium text-brand-700 hover:bg-brand-100"
            )}
        >
            {roleLabel}
            <span className="font-normal opacity-75">({user?.name || "ผู้ใช้งาน"})</span>
        </span>
    )

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
            <Container>
                <div className="flex h-16 items-center justify-between gap-4">
                    <Link href={links[0]?.href ?? "/"} className="flex items-center gap-2.5 rounded-md">
                        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 text-sm font-semibold text-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/logo.png"
                                alt=""
                                className="size-full object-cover"
                                onError={(e) => {
                                    const el = e.currentTarget
                                    el.style.display = "none"
                                    if (el.parentElement) el.parentElement.textContent = "CP"
                                }}
                            />
                        </span>
                        <span className="hidden flex-col leading-tight sm:flex">
                            <span className="text-sm font-semibold text-fg">ระบบจัดการกิจกรรม</span>
                            <span className="text-xs text-fg-subtle">วิทยาลัยการคอมพิวเตอร์</span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-0.5 lg:flex">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link) ? "page" : undefined}
                                className={cn(
                                    "rounded-md px-3 py-2 text-sm transition-colors",
                                    isActive(link)
                                        ? "font-medium text-brand-600"
                                        : "text-fg-muted hover:text-fg"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <div className="hidden items-center gap-2 lg:flex">
                            {profileHref ? <Link href={profileHref}>{roleBadge}</Link> : roleBadge}
                            <Button variant="ghost" size="sm" onClick={logout}>
                                <LogOut />
                                ออกจากระบบ
                            </Button>
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
                        <div className="px-3 pb-2">{roleBadge}</div>
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
                        {profileHref && (
                            <Link
                                href={profileHref}
                                className="rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                            >
                                โปรไฟล์ของฉัน
                            </Link>
                        )}
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
