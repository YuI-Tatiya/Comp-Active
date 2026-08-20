"use client"

import { AppHeader, type AppNavLink } from "@/components/layout/app-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { RoleGuard } from "@/components/auth/role-guard"

const LINKS: AppNavLink[] = [
  { href: "/student", label: "หน้าหลัก", exact: true },
  { href: "/student/events", label: "กิจกรรมทั้งหมด" },
  { href: "/student/my-registrations", label: "กิจกรรมของฉัน" },
  { href: "/student/about", label: "เกี่ยวกับเรา" },
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
      </div>
    </RoleGuard>
  )
}
