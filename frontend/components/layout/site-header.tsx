"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
    { href: "/", label: "หน้าหลัก" },
    { href: "/events", label: "กิจกรรมทั้งหมด" },
    { href: "/about", label: "เกี่ยวกับเรา" },
] as const

/**
 * Navbar กลางของหน้าฝั่ง public
 * แทนที่ navbar ที่เคยถูก copy-paste ซ้ำใน app/page.tsx และ app/events/page.tsx
 */
export function SiteHeader() {
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)

    // ปิดเมนูมือถือเมื่อเปลี่ยนหน้า
    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href)

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
            <Container>
                <div className="flex h-16 items-center gap-4">
                    {/* โลโก้ */}
                    <Link href="/" className="flex flex-col leading-tight rounded-md">
                        <Logo className="text-2xl" />
                        <span className="text-xs text-fg-subtle">วิทยาลัยการคอมพิวเตอร์</span>
                    </Link>

                    {/* กลุ่มขวา — เมนูแบบ pill + ปุ่มเมนูมือถือ */}
                    <div className="ml-auto flex items-center gap-3">
                        {/* เมนูจอใหญ่ */}
                        <nav className="hidden items-center gap-1 rounded-full bg-surface p-1 md:flex">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={isActive(link.href) ? "page" : undefined}
                                    className={cn(
                                        "rounded-full px-4 py-2 text-sm transition-colors",
                                        isActive(link.href)
                                            ? "bg-bg font-semibold text-brand-600 shadow-xs"
                                            : "text-fg-muted hover:text-fg"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        {/* ปุ่มเมนูมือถือ — เดิมจอมือถือไม่มีเมนูเลย */}
                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            aria-controls="site-mobile-nav"
                            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
                            className="inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-fg md:hidden"
                        >
                            {open ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </Container>

            {/* เมนูมือถือ */}
            {open && (
                <div id="site-mobile-nav" className="border-t border-border bg-bg md:hidden">
                    <Container className="flex flex-col gap-1 py-3">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                className={cn(
                                    "rounded-md px-3 py-2.5 text-sm transition-colors",
                                    isActive(link.href)
                                        ? "bg-brand-50 font-medium text-brand-600"
                                        : "text-fg-muted hover:bg-surface hover:text-fg"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </Container>
                </div>
            )}
        </header>
    )
}
