"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActionMenuItem {
    label: string
    icon?: LucideIcon
    onClick: () => void
    tone?: "default" | "danger"
    disabled?: boolean
}

interface ActionMenuProps {
    items: ActionMenuItem[]
    /** label สำหรับ screen reader บนปุ่มสามจุด — ควรระบุว่าเมนูของอะไร เช่น "ตัวเลือกของกิจกรรม X" */
    label: string
    className?: string
}

const MENU_WIDTH = 208 // w-52

/**
 * ปุ่มสามจุด + เมนูตัวเลือก — ใช้แพตเทิร์นเดียวกับ user-menu.tsx (คลิกนอกปิด, Escape ปิด)
 * โปรเจกต์นี้ไม่ได้ติดตั้ง headless dropdown library ไว้ จึงเขียนเองด้วย useState + useRef
 *
 * เมนูวาดผ่าน portal ไปที่ document.body แทนที่จะอยู่ใน DOM ตรงจุดที่เรียกใช้ — การ์ดที่ครอบปุ่มนี้
 * (EventCard) มี overflow-hidden เพื่อครอปมุมโค้ง/รูปภาพ ถ้าเมนูอยู่ใน DOM เดิมจะโดนครอปไปด้วย
 */
export function ActionMenu({ items, label, className }: ActionMenuProps) {
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)
    const [mounted, setMounted] = React.useState(false)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const menuRef = React.useRef<HTMLDivElement>(null)

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
        if (!open) return
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
            setOpen(false)
        }
        document.addEventListener("mousedown", onPointerDown)
        return () => document.removeEventListener("mousedown", onPointerDown)
    }, [open])

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
                <MoreVertical className="size-5" aria-hidden="true" />
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
                        {items.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                disabled={item.disabled}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setOpen(false)
                                    item.onClick()
                                }}
                                className={cn(
                                    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                    item.tone === "danger"
                                        ? "text-danger hover:bg-danger-bg"
                                        : "text-fg-muted hover:bg-surface hover:text-fg"
                                )}
                            >
                                {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
                                {item.label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    )
}
