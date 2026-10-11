import Link from "next/link"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"

const NAV_LINKS = [
    { href: "/", label: "หน้าหลัก" },
    { href: "/events", label: "กิจกรรมทั้งหมด" },
    { href: "/about", label: "เกี่ยวกับแอปพลิเคชัน" },
] as const

const CONTACT_EMAIL = "info@computing.kku.ac.th"

interface SiteFooterProps {
    /** "denim" = ธีม Denim Varsity ของพอร์ทัลผู้จัด (พื้นยีนส์เข้ม + แถบหมากรุก) */
    theme?: "default" | "denim"
}

export function SiteFooter({ theme = "default" }: SiteFooterProps) {
    if (theme === "denim") return <DenimFooter />

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
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="transition-colors hover:text-brand-600"
                                >
                                    {CONTACT_EMAIL}
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

function DenimFooter() {
    return (
        <footer className="denim-weave-deep mt-auto font-plex text-denim-on">
            <div className="checker-strip h-3.5" aria-hidden="true" />
            <Container className="flex flex-col gap-10 pb-7 pt-14">
                <div className="grid gap-8 md:grid-cols-4">
                    <div className="flex flex-col gap-3.5 md:col-span-2">
                        <span className="font-display text-[28px] font-bold text-white">
                            Comp<span className="text-amber">Active</span>
                        </span>
                        <p className="max-w-[440px] text-[15px] leading-[1.7]">
                            แพลตฟอร์มศูนย์กลางสำหรับการเข้าร่วมและจัดการกิจกรรมของนักศึกษา
                            เพื่อส่งเสริมการพัฒนาศักยภาพอย่างรอบด้าน
                        </p>
                        {/* computing-logo.png = ตัวอักษรสีขาว ตรงกับพื้นเข้มของธีมนี้ (ต่างจาก footer ปกติที่ใช้ฉบับ -dark)
                            ไม่มี onError แบบ footer ปกติ: layout ผู้จัดเป็น server component ส่ง event handler ลงมาไม่ได้
                            และไฟล์นี้อยู่ใน public/ ของแอปเอง ไม่ใช่รูปที่ผู้ใช้อัปโหลดซึ่งอาจหายได้ */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/computing-logo.png"
                            alt="College of Computing, Khon Kaen University"
                            className="mt-1 h-11 w-auto self-start object-contain object-left"
                        />
                    </div>

                    <nav aria-label="เมนูส่วนท้าย" className="flex flex-col gap-2.5 text-[15px]">
                        <h3 className="font-code text-xs font-normal tracking-[0.06em] text-amber">MENU</h3>
                        {NAV_LINKS.map((link) => (
                            <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex flex-col gap-2.5 text-[15px]">
                        <h3 className="font-code text-xs font-normal tracking-[0.06em] text-amber">CONTACT</h3>
                        <span>วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น</span>
                        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4 hover:text-white">
                            {CONTACT_EMAIL}
                        </a>
                        <span>โทร 043-000-000</span>
                    </div>
                </div>

                <div className="flex flex-wrap justify-between gap-3 border-t border-dashed border-amber/45 pt-5 text-[13px] text-denim-on-muted">
                    <span>© {new Date().getFullYear()} College of Computing, Khon Kaen University. All rights reserved.</span>
                    <span className="font-code">build: comp-active · made by DEK COM</span>
                </div>
            </Container>
        </footer>
    )
}
