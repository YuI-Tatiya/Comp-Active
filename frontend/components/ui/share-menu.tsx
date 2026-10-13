"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { Copy, Facebook, MessageCircle, Share2, Twitter } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MENU_WIDTH = 224 // w-56

interface ShareMenuProps {
    /** ลิงก์ที่จะแชร์ — ต้องเป็นลิงก์สาธารณะที่คนไม่ล็อกอินเปิดได้เสมอ (หน้า /events/... ไม่ใช่ /student/... หรือ /organizer/...) */
    url: string
    /** ข้อความนำเวลาแชร์ไป LINE/X — ปกติคือชื่อกิจกรรม ไม่ใส่ก็แชร์แค่ลิงก์เฉยๆ */
    title?: string
    /** เรียกหลังคัดลอกลิงก์สำเร็จ — ให้หน้าที่เรียกโชว์ Toast ของตัวเอง (คุมข้อความ/จังหวะเองได้ ไม่ผูกกับคอมโพเนนต์นี้) */
    onCopied?: () => void
    variant?: ButtonProps["variant"]
    size?: ButtonProps["size"]
    /** ข้อความบนปุ่ม — ไม่ใส่ = ปุ่มไอคอนอย่างเดียว (ใช้คู่กับ size="icon") */
    label?: string
    className?: string
}

/**
 * ปุ่มแชร์ + เมนูเลือกช่องทาง (Facebook / LINE / X / คัดลอกลิงก์) — แทนที่ปุ่ม "คัดลอกลิงก์" เดี่ยวๆ
 * ที่เดิมกระจายอยู่คนละจุดในแต่ละหน้า (เขียนเองตามแพตเทิร์น action-menu.tsx/user-menu.tsx เพราะโปรเจกต์
 * ไม่ได้ติดตั้ง headless dropdown library ไว้)
 *
 * วาดเมนูผ่าน portal ไปที่ document.body เหมือน ActionMenu — ปุ่มนี้มักอยู่ในการ์ดที่มี overflow-hidden
 * (ครอปมุมโค้ง/รูปภาพ) ถ้าวาดเมนูใน DOM เดิมจะโดนครอปไปด้วย
 *
 * ไม่ใช้ navigator.share() (Web Share API) เพราะต้องมี secure context (HTTPS) ซึ่งโปรดักชันยังไม่เปิดใช้
 * (ดู CLAUDE.md: TLS ยังไม่ตั้งค่า) — ใช้ลิงก์ share-intent ของแต่ละแพลตฟอร์มตรงๆ แทน ใช้ได้แน่นอนทุกที่
 *
 * ทุกตัวเลือก (รวมคัดลอกลิงก์) ปิดเมนูทันทีหลังกด เหมือนกันหมด — ฟีดแบ็ก "คัดลอกแล้ว" ให้หน้าที่เรียก
 * โชว์เป็น Toast ของตัวเองผ่าน onCopied แทน ไม่ทำ state "เพิ่งคัดลอก" ไว้ในเมนูเอง เพราะเมนูปิดไปแล้วตอนนั้น
 */
export function ShareMenu({ url, title, onCopied, variant = "outline", size, label, className }: ShareMenuProps) {
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
        // ชิดขอบซ้ายของปุ่มเป็นหลัก (ต่างจาก ActionMenu ที่ปุ่มสามจุดอยู่ขวาสุดของการ์ดเสมอ ปุ่มแชร์นี้
        // มักอยู่ชิดซ้ายของแถว) แล้วค่อย clamp ทั้งสองด้านกันล้นขอบจอ ไม่ใช่ clamp แค่ด้านขวาด้านเดียว
        const left = Math.max(
            window.scrollX + 8,
            Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - MENU_WIDTH - 8)
        )
        setPosition({ top: rect.bottom + window.scrollY + 8, left })
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
            if (e.key !== "Escape") return
            setOpen(false)
            triggerRef.current?.focus()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open])

    function openPopup(shareUrl: string) {
        window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600")
        setOpen(false)
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url)
            onCopied?.()
        } catch {
            // เบราว์เซอร์บางตัวต้องมี permission/HTTPS ถึงจะเขียน clipboard ได้ — ถ้าพังก็แค่ไม่เรียก onCopied
            // ไม่ใช่ error ที่ควรโยนต่อ (ปิดเมนูให้ปกติเหมือนเดิม)
        }
        setOpen(false)
    }

    const encodedUrl = encodeURIComponent(url)
    const encodedTitle = encodeURIComponent(title ?? "")

    const items = [
        {
            key: "facebook",
            label: "แชร์ไปยัง Facebook",
            icon: Facebook,
            iconClassName: "text-[#1877F2]",
            onClick: () => openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
        },
        {
            key: "line",
            label: "แชร์ไปยัง LINE",
            icon: MessageCircle,
            iconClassName: "text-[#06C755]",
            onClick: () => openPopup(`https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedTitle}`),
        },
        {
            key: "x",
            label: "แชร์ไปยัง X (Twitter)",
            icon: Twitter,
            iconClassName: "text-fg-muted",
            onClick: () => openPopup(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`),
        },
        {
            key: "copy",
            label: "คัดลอกลิงก์",
            icon: Copy,
            iconClassName: "text-fg-muted",
            onClick: copyLink,
        },
    ]

    return (
        <>
            <Button
                ref={triggerRef}
                type="button"
                variant={variant}
                size={size ?? (label ? undefined : "icon")}
                className={className}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label ? undefined : "แชร์กิจกรรมนี้"}
            >
                <Share2 className="size-4" aria-hidden="true" />
                {label}
            </Button>

            {open && mounted && position &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        aria-label="แชร์กิจกรรมนี้"
                        style={{ position: "absolute", top: position.top, left: position.left, width: MENU_WIDTH }}
                        className="z-50 overflow-hidden rounded-xl border border-border bg-bg py-1 shadow-md"
                    >
                        {items.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    item.onClick()
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                            >
                                <item.icon className={cn("size-4 shrink-0", item.iconClassName)} aria-hidden="true" />
                                {item.label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    )
}
