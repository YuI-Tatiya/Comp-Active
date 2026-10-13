"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogIn, Menu, X } from "lucide-react"
import { Container } from "@/components/layout/container"
import { DenimLogo } from "@/components/layout/logo"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
    { href: "/", label: "หน้าหลัก" },
    { href: "/events", label: "กิจกรรมทั้งหมด" },
    { href: "/about", label: "เกี่ยวกับเรา" },
] as const

const ACCOUNT_HREF = "/auth"
const ACCOUNT_LABEL = "เข้าสู่ระบบ"

/**
 * Navbar กลางของหน้าฝั่ง public (ก่อนล็อกอิน) — ธีม Denim Varsity ชุดเดียวกับพอร์ทัลผู้จัด
 * ใช้ทุกหน้า public (/, /events, /about, หน้ารายละเอียดงาน) ให้เปลี่ยนหน้าแล้ว header ไม่เปลี่ยนหน้าตา
 */
export function SiteHeader() {
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)

    // ปิดเมนูมือถือเมื่อเปลี่ยนหน้า
    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

    return (
        <header className="sticky top-0 z-50 border-b border-denim-line bg-white/95 font-plex backdrop-blur">
            <Container>
                <div className="flex h-[72px] items-center gap-4">
                    <Link href="/" className="rounded-md">
                        <DenimLogo />
                    </Link>

                    {/* เมนูจอใหญ่ — กึ่งกลางระหว่างโลโก้กับปุ่มเข้าสู่ระบบ */}
                    <nav aria-label="เมนูหลัก" className="mx-auto hidden items-center gap-1 md:flex">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                className={cn(
                                    "rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors",
                                    isActive(link.href)
                                        ? "bg-denim text-white"
                                        : "text-denim-ink hover:bg-denim-chip hover:text-denim-deep"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2 md:ml-0">
                        <Link
                            href={ACCOUNT_HREF}
                            className="hidden min-h-11 items-center gap-2 rounded-full bg-amber px-5 text-sm font-semibold text-denim-deep shadow-[0_3px_0_var(--color-amber-deep)] transition-[transform,box-shadow] hover:-translate-y-px active:translate-y-0.5 active:shadow-[0_1px_0_var(--color-amber-deep)] md:inline-flex"
                        >
                            <LogIn className="size-4" aria-hidden="true" />
                            {ACCOUNT_LABEL}
                        </Link>

                        {/* ปุ่มเมนูมือถือ */}
                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            aria-controls="site-mobile-nav"
                            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
                            className="inline-flex size-10 items-center justify-center rounded-md text-denim-ink transition-colors hover:bg-denim-chip hover:text-denim-deep md:hidden"
                        >
                            {open ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </Container>

            {/* เมนูมือถือ */}
            {open && (
                <div id="site-mobile-nav" className="border-t border-denim-line bg-white md:hidden">
                    <Container className="flex flex-col gap-1 py-3">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                className={cn(
                                    "rounded-md px-3 py-2.5 text-sm transition-colors",
                                    isActive(link.href)
                                        ? "bg-denim-chip font-semibold text-denim"
                                        : "text-denim-ink hover:bg-denim-paper hover:text-denim-deep"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            href={ACCOUNT_HREF}
                            className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber text-sm font-semibold text-denim-deep shadow-[0_3px_0_var(--color-amber-deep)]"
                        >
                            <LogIn className="size-4" aria-hidden="true" />
                            {ACCOUNT_LABEL}
                        </Link>
                    </Container>
                </div>
            )}
        </header>
    )
}
