"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { DenimLogo, Logo } from "@/components/layout/logo"
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
    /** "denim" = ธีม Denim Varsity ของพอร์ทัลผู้จัด (ฟอนต์มาจาก app/organizer/fonts.ts) */
    theme?: "default" | "denim"
}

/**
 * Header กลางของโซนที่ต้องล็อกอิน (student / organizer)
 * ใช้โครงเดียวกับ SiteHeader ของฝั่ง public เพื่อให้หน้าตาต่อเนื่องกัน
 */
export function AppHeader({ links, roleLabel, accountHref, theme = "default" }: AppHeaderProps) {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)
    const denim = theme === "denim"

    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const isActive = (link: AppNavLink) =>
        link.exact ? pathname === link.href : pathname.startsWith(link.href)

    const displayName = user?.name || "ผู้ใช้งาน"

    const nav = (
        <nav
            aria-label="เมนูหลัก"
            className={cn(
                "hidden items-center gap-1 lg:flex",
                denim ? "mx-auto" : "rounded-full bg-surface p-1"
            )}
        >
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(link) ? "page" : undefined}
                    className={cn(
                        "rounded-full transition-colors",
                        denim ? "px-4 py-2.5 text-[15px] font-medium" : "px-4 py-2 text-sm",
                        isActive(link)
                            ? denim
                                ? "bg-denim text-white"
                                : "bg-bg font-semibold text-brand-600 shadow-xs"
                            : denim
                              ? "text-denim-ink hover:bg-denim-chip hover:text-denim-deep"
                              : "text-fg-muted hover:text-fg"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    )

    return (
        <header
            className={cn(
                "sticky top-0 z-50 border-b backdrop-blur",
                denim ? "border-denim-line bg-white/95 font-plex" : "border-border bg-bg/85"
            )}
        >
            <Container>
                <div className={cn("flex items-center gap-4", denim ? "h-[72px]" : "h-16")}>
                    {denim ? (
                        <Link href={links[0]?.href ?? "/"} className="rounded-md">
                            <DenimLogo />
                        </Link>
                    ) : (
                        <Link href={links[0]?.href ?? "/"} className="flex flex-col leading-tight rounded-md">
                            <Logo className="text-2xl" />
                            <span className="hidden text-xs text-fg-subtle sm:block">วิทยาลัยการคอมพิวเตอร์</span>
                        </Link>
                    )}

                    {/* denim: เมนูอยู่กึ่งกลางระหว่างโลโก้กับเมนูผู้ใช้ (ตามดีไซน์) · default: รวมอยู่กลุ่มขวาแบบ pill
                        ใช้โครงเดียวกับ SiteHeader ของหน้า public */}
                    {denim && nav}
                    <div className={cn("flex items-center gap-2", denim ? "ml-auto lg:ml-0" : "ml-auto")}>
                        {!denim && nav}

                        <div className="hidden lg:flex">
                            <UserMenu accountHref={accountHref} roleLabel={roleLabel} theme={theme} />
                        </div>

                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            aria-controls="app-mobile-nav"
                            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
                            className={cn(
                                "inline-flex size-10 items-center justify-center rounded-md transition-colors lg:hidden",
                                denim
                                    ? "text-denim-ink hover:bg-denim-chip hover:text-denim-deep"
                                    : "text-fg-muted hover:bg-surface hover:text-fg"
                            )}
                        >
                            {open ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </Container>

            {open && (
                <div
                    id="app-mobile-nav"
                    className={cn("border-t lg:hidden", denim ? "border-denim-line bg-white" : "border-border bg-bg")}
                >
                    <Container className="flex flex-col gap-1 py-3">
                        {/* หัวข้อผู้ใช้ — บนมือถือแสดงเป็นรายการตรง ๆ ไม่ทำ dropdown ซ้อน */}
                        <div
                            className={cn(
                                "mb-2 flex items-center gap-3 border-b px-3 pb-3",
                                denim ? "border-denim-line" : "border-border"
                            )}
                        >
                            <span
                                className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                    denim ? "bg-amber font-display font-bold text-denim-deep" : "bg-brand-600 text-white"
                                )}
                            >
                                {displayName.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                                <p className={cn("truncate text-sm font-medium", denim ? "text-denim-deep" : "text-fg")}>
                                    {displayName}
                                </p>
                                <p className={cn("truncate text-xs", denim ? "text-denim-muted" : "text-fg-muted")}>
                                    {roleLabel}
                                </p>
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
                                        ? denim
                                            ? "bg-denim-chip font-semibold text-denim"
                                            : "bg-brand-50 font-medium text-brand-600"
                                        : denim
                                          ? "text-denim-ink hover:bg-denim-paper hover:text-denim-deep"
                                          : "text-fg-muted hover:bg-surface hover:text-fg"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            href={accountHref}
                            className={cn(
                                "rounded-md px-3 py-2.5 text-sm transition-colors",
                                denim
                                    ? "text-denim-ink hover:bg-denim-paper hover:text-denim-deep"
                                    : "text-fg-muted hover:bg-surface hover:text-fg"
                            )}
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
