import Link from "next/link"
import { Container } from "@/components/layout/container"

const NAV_LINKS = [
    { href: "/", label: "หน้าหลัก" },
    { href: "/events", label: "กิจกรรมทั้งหมด" },
    { href: "/about", label: "เกี่ยวกับแอปพลิเคชัน" },
] as const

const CONTACT_EMAIL = "info@computing.kku.ac.th"

/** Footer กลางของทุกพอร์ทัล (public / student / organizer) — ธีม Denim Varsity: พื้นยีนส์เข้ม + แถบหมากรุก */
export function SiteFooter() {
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
