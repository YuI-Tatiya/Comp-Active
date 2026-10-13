"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  /** ลิงก์หน้าแก้ข้อมูลตัวเอง — student: /student/profile · organizer: /organizer/settings */
  accountHref: string
  /** ป้ายบทบาท เช่น "นักศึกษา" / "ผู้จัดกิจกรรม" */
  roleLabel: string
}

/**
 * เมนูผู้ใช้แบบ dropdown ที่มุมขวาของ navbar
 * เขียนเองด้วย useState + useRef ตามแพตเทิร์นเดียวกับ dialog.tsx / tabs.tsx
 * (โปรเจกต์นี้ไม่ได้ติดตั้ง headless dropdown library ไว้)
 */
export function UserMenu({ accountHref, roleLabel }: UserMenuProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // ปิดเมื่อเปลี่ยนหน้า (แพตเทิร์นเดียวกับเมนูมือถือใน AppHeader)
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  // คลิกนอกเมนู → ปิด
  // ใช้ mousedown ไม่ใช่ click เพราะ click จะชนกับ onClick ของปุ่ม (เปิดแล้วปิดทันที)
  React.useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  // Escape → ปิดแล้วโฟกัสกลับที่ปุ่ม เพื่อไม่ให้คนใช้คีย์บอร์ดหลงตำแหน่ง
  React.useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  const name = user?.name || "ผู้ใช้งาน"
  const initial = name.trim().charAt(0).toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`เมนูของ ${name}`}
        className={cn(
          "flex min-h-11 items-center gap-2.5 rounded-full border bg-denim-paper py-1 pl-1 pr-3.5 transition-colors hover:border-denim-field",
          open ? "border-denim-field" : "border-denim-line"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber font-display font-bold text-denim-deep">
          {initial}
        </span>
        <span className="flex min-w-0 flex-col items-start leading-[1.15]">
          <span className="max-w-40 truncate text-sm font-semibold text-denim-deep">{name}</span>
          <span className="text-xs text-denim-muted">{roleLabel}</span>
        </span>
        <ChevronDown
          className={cn("size-4 text-denim-muted transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="เมนูผู้ใช้"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-bg shadow-md"
        >
          {/* หัวข้อผู้ใช้ — แสดงข้อมูลเฉย ๆ ไม่ใช่รายการที่กดได้ */}
          <div className="flex items-start gap-3 border-b border-border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber font-display text-base font-bold text-denim-deep">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{name}</p>
              <p className="truncate text-xs text-fg-muted">{user?.email}</p>
              <span className="mt-1.5 inline-flex items-center rounded-full bg-denim-chip px-2 py-0.5 text-xs font-medium text-denim">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="p-1">
            <Link
              href={accountHref}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <Settings className="size-4" aria-hidden="true" />
              แก้ไขข้อมูลส่วนตัว
            </Link>
          </div>

          <div className="border-t border-border p-1">
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-danger transition-colors hover:bg-danger-bg"
            >
              <LogOut className="size-4" aria-hidden="true" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
