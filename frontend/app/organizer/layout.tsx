"use client"

import { AppHeader, type AppNavLink } from "@/components/layout/app-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { RoleGuard } from "@/components/auth/role-guard"

const LINKS: AppNavLink[] = [
  { href: "/organizer", label: "หน้าหลัก", exact: true },
  { href: "/organizer/manage", label: "จัดการกิจกรรม" },
  { href: "/organizer/dashboard", label: "แดชบอร์ด" },
  { href: "/organizer/about", label: "เกี่ยวกับเรา" },
]

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
      </div>
    </RoleGuard>
  )
}
