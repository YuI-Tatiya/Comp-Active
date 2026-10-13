"use client"

import { CalendarDays, Home, Ticket, UserRound } from "lucide-react"
import { AppHeader, type AppNavLink } from "@/components/layout/app-header"
import { BottomNav, BottomNavSpacer, type BottomNavTab } from "@/components/layout/bottom-nav"
import { SiteFooter } from "@/components/layout/site-footer"
import { RoleGuard } from "@/components/auth/role-guard"

const LINKS: AppNavLink[] = [
  { href: "/student", label: "หน้าหลัก", exact: true, icon: Home },
  { href: "/student/events", label: "กิจกรรมทั้งหมด", icon: CalendarDays },
  { href: "/student/my-registrations", label: "กิจกรรมของฉัน", icon: Ticket },
  // เมนูนี้ไม่ลงแถบเมนูล่าง (BottomNav มี 4 ช่องพอดี เต็มแล้วด้วย 3 อันข้างบน + โปรไฟล์) —
  // ยังกดถึงได้ปกติจากเมนูลิงก์ท้ายหน้า (SiteFooter) ทุกหน้าอยู่แล้ว
  { href: "/student/about", label: "เกี่ยวกับเรา" },
]

// 3 เมนูหลัก + โปรไฟล์ — ไม่รวม "เกี่ยวกับเรา" (ดูเหตุผลที่ LINKS ด้านบน)
const BOTTOM_TABS: BottomNavTab[] = [
  ...LINKS.filter((l): l is AppNavLink & { icon: NonNullable<AppNavLink["icon"]> } => !!l.icon),
  { href: "/student/profile", label: "โปรไฟล์", icon: UserRound },
]

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard allow={["student"]}>
      <div className="flex min-h-screen flex-col">
        <AppHeader
          links={LINKS}
          roleLabel="นักศึกษา"
          accountHref="/student/profile"
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <BottomNavSpacer />
        <BottomNav tabs={BOTTOM_TABS} />
      </div>
    </RoleGuard>
  )
}
