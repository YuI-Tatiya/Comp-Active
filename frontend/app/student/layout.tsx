"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { CalendarDays, Home, Ticket, UserRound } from "lucide-react"
import { AppHeader, type AppNavLink } from "@/components/layout/app-header"
import { BottomNav, BottomNavSpacer, type BottomNavTab } from "@/components/layout/bottom-nav"
import { SiteFooter } from "@/components/layout/site-footer"
import { RoleGuard } from "@/components/auth/role-guard"
import { StudentMobileAppBar } from "@/components/student/mobile-app-bar"
import { QuickScanButton } from "@/components/student/quick-scan-button"
import { registrationsAPI } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { selectUpcoming, type UpcomingCandidate } from "@/lib/student-home"
import { useScanCapable } from "@/lib/use-scan-capable"

const LINKS: AppNavLink[] = [
  { href: "/student", label: "หน้าหลัก", exact: true, icon: Home },
  { href: "/student/events", label: "กิจกรรมทั้งหมด", shortLabel: "กิจกรรม", icon: CalendarDays },
  { href: "/student/my-registrations", label: "กิจกรรมของฉัน", shortLabel: "ของฉัน", icon: Ticket },
  // เมนูนี้ไม่ลงแถบเมนูล่าง (BottomNav มี 4 ช่องพอดี เต็มแล้วด้วย 3 อันข้างบน + โปรไฟล์) —
  // ยังกดถึงได้ปกติจากเมนูลิงก์ท้ายหน้า (SiteFooter) ทุกหน้าอยู่แล้ว
  { href: "/student/about", label: "เกี่ยวกับเรา" },
]

/**
 * จำนวนกิจกรรมที่กำลังจะถึง (รอยืนยัน/ยืนยันแล้ว — กติกาเดียวกับ "กำลังจะถึง" ในหน้าหลัก) สำหรับป้ายบนแท็บ "ของฉัน"
 * ดึงใหม่ทุกครั้งที่เปลี่ยนหน้า ตัวเลขจึงตามทันหลังลงทะเบียน/ยกเลิก (layout ไม่ถูก mount ใหม่ตอนเปลี่ยนหน้า)
 * ดึงไม่ได้ = ไม่แสดงป้าย (เป็นแค่ตัวช่วยบอก ไม่ใช่ข้อมูลที่ต้องเห็น)
 */
function useUpcomingCount(pathname: string): number {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (user?.role !== "student") return
    let cancelled = false
    registrationsAPI
      .getMy()
      .then((rows) => {
        if (!cancelled && Array.isArray(rows)) setCount(selectUpcoming(rows as unknown as UpcomingCandidate[], new Date()).length)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pathname, user?.role])
  return count
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const upcoming = useUpcomingCount(pathname)
  // ปุ่มสแกน QR ด่วนกลางแถบเมนูล่าง — เฉพาะอุปกรณ์ที่เช็คอินด้วยการสแกนได้ (มือถือ/iPad ดู lib/device.ts)
  // โน้ตบุ๊กที่ย่อหน้าต่างจนแคบกว่า lg ได้แถบ 4 แท็บตามเดิม
  const scanCapable = useScanCapable()
  const showQuickScan = scanCapable !== false

  // 3 เมนูหลัก + โปรไฟล์ — ไม่รวม "เกี่ยวกับเรา" (ดูเหตุผลที่ LINKS ด้านบน)
  const bottomTabs: BottomNavTab[] = [
    ...LINKS.filter((l): l is AppNavLink & { icon: NonNullable<AppNavLink["icon"]> } => !!l.icon).map((l) =>
      l.href === "/student/my-registrations" ? { ...l, badge: upcoming, badgeLabel: "กิจกรรมที่กำลังจะถึง" } : l
    ),
    { href: "/student/profile", label: "โปรไฟล์", icon: UserRound },
  ]

  return (
    <RoleGuard allow={["student"]}>
      <div className="flex min-h-screen flex-col">
        <AppHeader
          links={LINKS}
          roleLabel="นักศึกษา"
          accountHref="/student/profile"
          hideBelowLg
        />
        <StudentMobileAppBar pathname={pathname} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <BottomNavSpacer raisedAction={showQuickScan} />
        <BottomNav
          tabs={bottomTabs}
          centerAction={showQuickScan ? <QuickScanButton disabled={scanCapable === null} /> : undefined}
        />
      </div>
    </RoleGuard>
  )
}
