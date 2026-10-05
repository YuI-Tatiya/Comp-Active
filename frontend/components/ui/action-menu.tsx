"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { MoreVertical, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActionMenuItem {
    label: string
    icon?: LucideIcon
    /** ไม่ส่งมา = ต้องส่ง submenu แทน (รายการนี้กลายเป็นตัวเปิดเมนูย่อย ไม่ใช่ปุ่มกดทำงานตรงๆ) */
    onClick?: () => void
    tone?: "default" | "danger"
    disabled?: boolean
    /** มีค่า = แถวนี้เป็นตัวเปิดเมนูย่อย (กดแล้วกางออกด้านข้าง) แทนที่จะเรียก onClick ตรงๆ */
    submenu?: ActionMenuItem[]
}

interface ActionMenuProps {
    items: ActionMenuItem[]
    /** label สำหรับ screen reader บนปุ่มสามจุด — ควรระบุว่าเมนูของอะไร เช่น "ตัวเลือกของกิจกรรม X" */
    label: string
    className?: string
    /** ขนาดไอคอนจุดสามจุด — ปรับเวลาใช้ในที่แคบ เช่น แท็บเล็กๆ (ค่าเริ่มต้นคงขนาดเดิมของปุ่มมุมการ์ด) */
    iconClassName?: string
}

const MENU_WIDTH = 208 // w-52
const SUBMENU_WIDTH = 260 // ข้อความแถวในเมนูย่อยยาวกว่าเมนูหลัก (เช่น "ปิดรับสมัครกิจกรรมชั่วคราว")

/**
 * ปุ่มสามจุด + เมนูตัวเลือก — ใช้แพตเทิร์นเดียวกับ user-menu.tsx (คลิกนอกปิด, Escape ปิด)
 * โปรเจกต์นี้ไม่ได้ติดตั้ง headless dropdown library ไว้ จึงเขียนเองด้วย useState + useRef
 *
 * เมนูวาดผ่าน portal ไปที่ document.body แทนที่จะอยู่ใน DOM ตรงจุดที่เรียกใช้ — การ์ดที่ครอบปุ่มนี้
 * (EventCard) มี overflow-hidden เพื่อครอปมุมโค้ง/รูปภาพ ถ้าเมนูอยู่ใน DOM เดิมจะโดนครอปไปด้วย
 *
 * รายการที่มี submenu กดแล้วกางเมนูย่อยออกทางขวาของแถวนั้น (พับทางซ้ายถ้าทางขวาไม่พอที่) แทนการเรียก onClick —
 * เมนูหลักยังเปิดค้างไว้ระหว่างเมนูย่อยเปิดอยู่ (กดนอกทั้งคู่ หรือเลือกรายการในเมนูย่อยถึงจะปิดทั้งหมด)
 */
export function ActionMenu({ items, label, className, iconClassName }: ActionMenuProps) {
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)
    const [openSubmenu, setOpenSubmenu] = React.useState<{ label: string; position: { top: number; left: number } } | null>(null)
    const [mounted, setMounted] = React.useState(false)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const menuRef = React.useRef<HTMLDivElement>(null)
    const submenuRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const updatePosition = React.useCallback(() => {
        const rect = triggerRef.current?.getBoundingClientRect()
        if (!rect) return
        setPosition({
            top: rect.bottom + window.scrollY + 8,
            left: Math.min(rect.right + window.scrollX - MENU_WIDTH, window.scrollX + window.innerWidth - MENU_WIDTH - 8),
        })
    }, [])

    React.useEffect(() => {
        if (!open) {
            setOpenSubmenu(null)
            return
        }
        updatePosition()
        window.addEventListener("scroll", updatePosition, true)
        window.addEventListener("resize", updatePosition)
        return () => {
            window.removeEventListener("scroll", updatePosition, true)
            window.removeEventListener("resize", updatePosition)
        }
    }, [open, updatePosition])

    React.useEffect(() => {
        if (!open) return
        function onPointerDown(e: MouseEvent) {
            const target = e.target as Node
            if (triggerRef.current?.contains(target)) return
            if (menuRef.current?.contains(target)) return
            if (submenuRef.current?.contains(target)) return
            setOpen(false)
        }
        document.addEventListener("mousedown", onPointerDown)
        return () => document.removeEventListener("mousedown", onPointerDown)
    }, [open])

    React.useEffect(() => {
        if (!open) return
        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== "Escape") return
            if (openSubmenu) {
                setOpenSubmenu(null)
                return
            }
            setOpen(false)
            triggerRef.current?.focus()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, openSubmenu])

    function toggleSubmenu(item: ActionMenuItem, e: React.MouseEvent<HTMLButtonElement>) {
        if (openSubmenu?.label === item.label) {
            setOpenSubmenu(null)
            return
        }
        const rect = e.currentTarget.getBoundingClientRect()
        const left = Math.min(
            rect.right + window.scrollX + 4,
            window.scrollX + window.innerWidth - SUBMENU_WIDTH - 8
        )
        setOpenSubmenu({ label: item.label, position: { top: rect.top + window.scrollY, left } })
    }

    function renderItem(item: ActionMenuItem) {
        const isSubmenuTrigger = Boolean(item.submenu)
        return (
            <button
                key={item.label}
                type="button"
                role={isSubmenuTrigger ? "menuitem" : "menuitem"}
                aria-haspopup={isSubmenuTrigger ? "menu" : undefined}
                aria-expanded={isSubmenuTrigger ? openSubmenu?.label === item.label : undefined}
                disabled={item.disabled}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (isSubmenuTrigger) {
                        toggleSubmenu(item, e)
                        return
                    }
                    setOpen(false)
                    item.onClick?.()
                }}
                className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    item.tone === "danger"
                        ? "text-danger hover:bg-danger-bg"
                        : "text-fg-muted hover:bg-surface hover:text-fg",
                    isSubmenuTrigger && openSubmenu?.label === item.label && "bg-surface text-fg"
                )}
            >
                {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
                <span className="flex-1 text-left">{item.label}</span>
                {isSubmenuTrigger && <ChevronRight className="size-4 shrink-0" aria-hidden="true" />}
            </button>
        )
    }

    const activeSubmenuItems = openSubmenu ? items.find((i) => i.label === openSubmenu.label)?.submenu : undefined

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen((v) => !v)
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-bg text-fg-muted shadow-sm transition-colors hover:bg-surface hover:text-fg",
                    open && "bg-surface text-fg",
                    className
                )}
            >
                <MoreVertical className={iconClassName ?? "size-5"} aria-hidden="true" />
            </button>

            {open && mounted && position &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        aria-label={label}
                        style={{ position: "absolute", top: position.top, left: position.left, width: MENU_WIDTH }}
                        className="z-50 overflow-hidden rounded-xl border border-border bg-bg py-1 shadow-md"
                    >
                        {items.map(renderItem)}
                    </div>,
                    document.body
                )}

            {open && mounted && openSubmenu && activeSubmenuItems &&
                createPortal(
                    <div
                        ref={submenuRef}
                        role="menu"
                        aria-label={openSubmenu.label}
                        style={{ position: "absolute", top: openSubmenu.position.top, left: openSubmenu.position.left, width: SUBMENU_WIDTH }}
                        className="z-50 overflow-hidden rounded-xl border border-border bg-bg py-1 shadow-md"
                    >
                        {activeSubmenuItems.map((sub) => (
                            <button
                                key={sub.label}
                                type="button"
                                role="menuitem"
                                disabled={sub.disabled}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setOpen(false)
                                    sub.onClick?.()
                                }}
                                className={cn(
                                    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                    sub.tone === "danger"
                                        ? "text-danger hover:bg-danger-bg"
                                        : "text-fg-muted hover:bg-surface hover:text-fg"
                                )}
                            >
                                {sub.icon && <sub.icon className="size-4 shrink-0" aria-hidden="true" />}
                                {sub.label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    )
}
