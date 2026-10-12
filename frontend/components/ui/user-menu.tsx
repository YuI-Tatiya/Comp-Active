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
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // วางเมาส์แล้วกาง / เอาออกแล้วหุบ (หน่วง 150ms กันหุบตอนเมาส์ข้ามช่องว่าง) — เฉพาะเมาส์จริง
  // อุปกรณ์สัมผัสยังกดที่ปุ่มเพื่อสลับเปิด/ปิดเหมือนเดิม
  const hoverOpen = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }
  React.useEffect(() => {
    const t = closeTimer
    return () => {
      if (t.current) clearTimeout(t.current)
    }
  }, [])

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
    <div ref={containerRef} className="relative" onPointerEnter={hoverOpen} onPointerLeave={hoverClose}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`เมนูของ ${name}`}
        className={cn(
<<<<<<< HEAD
          "group flex items-center gap-1.5 rounded-full p-1 pr-2 transition-all duration-300",
          open ? "bg-brand-50" : "hover:bg-surface"
        )}
      >
        <span className="relative flex size-8 items-center justify-center">
          {/* วงแสงหายใจรอบอวาตาร์ขณะเมนูเปิด */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute -inset-1 rounded-full bg-brand-400/40 transition-all duration-500",
              open ? "scale-110 opacity-100 motion-safe:animate-pulse" : "scale-75 opacity-0"
            )}
          />
          <span className="relative flex size-8 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-brand-400 text-sm font-semibold text-white shadow-sm ring-2 ring-bg transition-transform duration-300 group-hover:scale-110">
            {initial}
          </span>
=======
          "flex min-h-11 items-center gap-2.5 rounded-full border bg-denim-paper py-1 pl-1 pr-3.5 transition-colors hover:border-denim-field",
          open ? "border-denim-field" : "border-denim-line"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber font-display font-bold text-denim-deep">
          {initial}
>>>>>>> organize
        </span>
        <span className="flex min-w-0 flex-col items-start leading-[1.15]">
          <span className="max-w-40 truncate text-sm font-semibold text-denim-deep">{name}</span>
          <span className="text-xs text-denim-muted">{roleLabel}</span>
        </span>
        <ChevronDown
<<<<<<< HEAD
          className={cn(
            "size-4 text-fg-subtle transition-transform duration-300",
            open && "rotate-180 text-brand-600"
          )}
=======
          className={cn("size-4 text-denim-muted transition-transform", open && "rotate-180")}
>>>>>>> organize
          aria-hidden="true"
        />
      </button>

      {/* pt-2 เป็นสะพานให้เมาส์เดินจากปุ่มลงมาที่เมนูได้โดยไม่หลุดพื้นที่ hover
          เรนเดอร์ค้างไว้เสมอแล้วสลับคลาส เพื่อให้มีแอนิเมชันทั้งตอนกางและตอนหุบ */}
      <div
        className={cn(
          "absolute right-0 z-50 w-64 origin-top-right pt-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-95 opacity-0"
        )}
      >
        <div
          role="menu"
          aria-label="เมนูผู้ใช้"
          className="relative overflow-hidden rounded-2xl border border-border bg-bg shadow-xl shadow-brand-900/10"
        >
<<<<<<< HEAD
          {/* หัวข้อผู้ใช้ — พื้นไล่สีอ่อน, แสดงข้อมูลเฉย ๆ ไม่ใช่รายการที่กดได้ */}
          <div className="relative flex items-start gap-3 overflow-hidden border-b border-border bg-linear-to-br from-brand-50 to-bg p-4">
            <span aria-hidden="true" className="absolute -right-6 -top-8 size-24 rounded-full bg-brand-100/70" />
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-brand-400 text-base font-semibold text-white shadow-md ring-2 ring-bg">
=======
          {/* หัวข้อผู้ใช้ — แสดงข้อมูลเฉย ๆ ไม่ใช่รายการที่กดได้ */}
          <div className="flex items-start gap-3 border-b border-border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber font-display text-base font-bold text-denim-deep">
>>>>>>> organize
              {initial}
            </span>
            <div className="relative min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{name}</p>
              <p className="truncate text-xs text-fg-muted">{user?.email}</p>
<<<<<<< HEAD
              <span className="mt-1.5 inline-flex items-center rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
=======
              <span className="mt-1.5 inline-flex items-center rounded-full bg-denim-chip px-2 py-0.5 text-xs font-medium text-denim">
>>>>>>> organize
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="p-1.5">
            <Link
              href={accountHref}
              role="menuitem"
              tabIndex={open ? 0 : -1}
              style={{ transitionDelay: open ? "70ms" : "0ms" }}
              className={cn(
                "group/item flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-fg-muted transition-all duration-300 hover:bg-brand-50 hover:text-brand-700",
                open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
              )}
            >
              <Settings className="size-4 transition-transform duration-500 group-hover/item:rotate-90" aria-hidden="true" />
              แก้ไขข้อมูลส่วนตัว
            </Link>
          </div>

          <div className="border-t border-border p-1.5">
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={logout}
              style={{ transitionDelay: open ? "120ms" : "0ms" }}
              className={cn(
                "group/item flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-danger transition-all duration-300 hover:bg-danger-bg",
                open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
              )}
            >
              <LogOut className="size-4 transition-transform duration-300 group-hover/item:translate-x-0.5" aria-hidden="true" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
