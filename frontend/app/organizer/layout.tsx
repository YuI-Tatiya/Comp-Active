"use client"

import { ClipboardList, Home, LayoutDashboard, Settings } from "lucide-react"
import { AppHeader, type AppNavLink } from "@/components/layout/app-header"
import { BottomNav, BottomNavSpacer, type BottomNavTab } from "@/components/layout/bottom-nav"
import { SiteFooter } from "@/components/layout/site-footer"
import { RoleGuard } from "@/components/auth/role-guard"

const LINKS: AppNavLink[] = [
  { href: "/organizer", label: "หน้าหลัก", exact: true, icon: Home },
  // หน้าจัดการงาน/กิจกรรมรายตัว (และแดชบอร์ดรายกิจกรรม) เปิดจากหน้าจัดการ — เมนูนี้ต้องติดสถานะด้วย
  { href: "/organizer/manage", label: "จัดการกิจกรรม", alsoMatches: ["/organizer/events/", "/organizer/activities/"], icon: ClipboardList },
  { href: "/organizer/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  // ซ่อนออกจากเมนูหลัก — หน้า /organizer/soft-skills ยังอยู่ปกติ เข้าถึงได้จากลิงก์ "ดูเกณฑ์การประเมินแต่ละระดับ"
  // ในวิซาร์ดสร้างงาน/หน้าประเมินรายฝ่าย/อนุมัติผล (SoftSkillRubricLink) ซึ่งน่าจะตรงบริบทกว่าวางไว้แยกบนเมนูหลัก
  { href: "/organizer/about", label: "เกี่ยวกับเรา" },
]

// 3 เมนูหลัก + บัญชี — ไม่รวม "เกี่ยวกับเรา" (BottomNav มี 4 ช่องพอดี) ยังกดถึงได้จาก SiteFooter ทุกหน้า
const BOTTOM_TABS: BottomNavTab[] = [
  ...LINKS.filter((l): l is AppNavLink & { icon: NonNullable<AppNavLink["icon"]> } => !!l.icon),
  { href: "/organizer/settings", label: "บัญชี", icon: Settings },
]

// header/footer ใช้ธีม Denim Varsity ทั้งพอร์ทัลผู้จัด ไม่ใช่แค่หน้าหลัก — เปลี่ยนหน้าแล้ว header ต้องไม่เปลี่ยนหน้าตา
// (ฟอนต์ของธีมผูกไว้บน <html> ใน app/layout.tsx แล้ว ใช้ได้ทุกหน้า)
export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard allow={["organizer"]}>
      <div className="flex min-h-screen flex-col">
        <AppHeader
          links={LINKS}
          roleLabel="ผู้จัดกิจกรรม"
          accountHref="/organizer/settings"
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <BottomNavSpacer />
        <BottomNav tabs={BOTTOM_TABS} />
      </div>
    </RoleGuard>
  )
}
