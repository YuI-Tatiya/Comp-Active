import Link from "next/link"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"

const NAV_LINKS = [
    { href: "/", label: "หน้าหลัก" },
    { href: "/events", label: "กิจกรรมทั้งหมด" },
    { href: "/about", label: "เกี่ยวกับแอปพลิเคชัน" },
] as const

export function SiteFooter() {
    return (
        <footer className="mt-auto border-t border-border bg-surface">
            <Container className="py-14">
                <div className="grid gap-10 md:grid-cols-4">
                    <div className="space-y-4 md:col-span-2">
                        <Logo className="text-2xl" />
                        <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
                            แพลตฟอร์มศูนย์กลางสำหรับการเข้าร่วมและจัดการกิจกรรมของนักศึกษา
                            เพื่อส่งเสริมการพัฒนาศักยภาพอย่างรอบด้าน
                        </p>
                        <div className="relative flex h-12 w-auto items-center pt-2">
                            {/* computing-logo-dark.png — ตัวอักษรถูกแปลงเป็นสีเข้มให้อ่านออกบนพื้นสว่าง
                                (ต้นฉบับ computing-logo.png เป็นตัวอักษรสีขาว ใช้ได้เฉพาะพื้นเข้ม) */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/computing-logo-dark.png"
                                alt="College of Computing, Khon Kaen University"
                                className="h-full w-auto object-contain object-left"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none"
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-fg">เมนูหลัก</h3>
                        <ul className="space-y-2.5">
                            {NAV_LINKS.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-fg-muted transition-colors hover:text-brand-600"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-fg">ติดต่อเรา</h3>
                        <ul className="space-y-2.5 text-sm text-fg-muted">
                            <li>วิทยาลัยการคอมพิวเตอร์ ขอนแก่น</li>
                            <li>
                                <a
                                    href="mailto:info@computing.kku.ac.th"
                                    className="transition-colors hover:text-brand-600"
                                >
                                    info@computing.kku.ac.th
                                </a>
                            </li>
                            <li>โทร: 043-000-000</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 border-t border-border pt-6">
                    <p className="text-xs text-fg-subtle">
                        © {new Date().getFullYear()} College of Computing, Khon Kaen University.
                        All rights reserved.
                    </p>
                </div>
            </Container>
        </footer>
    )
}
