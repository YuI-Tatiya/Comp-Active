"use client"

import { useEffect, useRef, useState } from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
    text: string
    label?: string
    className?: string
}

const PANEL_WIDTH = 256
const VIEWPORT_MARGIN = 12

/**
 * ไอคอน "i" คลิกเพื่อเปิดคำอธิบายสั้นๆ — ใช้คลิกแทน hover ให้กดได้บนมือถือด้วย
 *
 * วางกล่องด้วย position: fixed แล้วคำนวณตำแหน่งจากปุ่ม พร้อมหนีบไม่ให้ล้นขอบจอ
 * เพราะจุดใช้งานจริงอยู่ใน sidebar กว้าง 260px ถ้าจัดกึ่งกลางเฉยๆ กล่องจะล้นออกนอกจอ
 */
export function InfoTooltip({ text, label = "คำอธิบาย", className }: InfoTooltipProps) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
    const rootRef = useRef<HTMLSpanElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    /** คำนวณตำแหน่งตอนกดเปิด ไม่ใช่ใน effect — กันการ re-render ซ้อนโดยไม่จำเป็น */
    function toggle(e: React.MouseEvent) {
        e.stopPropagation()
        e.preventDefault()
        if (open) {
            setOpen(false)
            return
        }
        const rect = buttonRef.current?.getBoundingClientRect()
        if (!rect) return
        const centered = rect.left + rect.width / 2 - PANEL_WIDTH / 2
        const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
        setPos({
            top: rect.bottom + 8,
            left: Math.max(VIEWPORT_MARGIN, Math.min(centered, maxLeft)),
        })
        setOpen(true)
    }

    useEffect(() => {
        if (!open) return

        function handlePointerDown(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false)
        }
        // กล่องเป็น fixed จึงไม่เลื่อนตามเนื้อหา — ปิดไปเลยดีกว่าปล่อยให้ค้างผิดที่
        function handleDismiss() {
            setOpen(false)
        }

        document.addEventListener("mousedown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)
        window.addEventListener("scroll", handleDismiss, true)
        window.addEventListener("resize", handleDismiss)
        return () => {
            document.removeEventListener("mousedown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("scroll", handleDismiss, true)
            window.removeEventListener("resize", handleDismiss)
        }
    }, [open])

    return (
        <span ref={rootRef} className={cn("relative inline-flex", className)}>
            <button
                ref={buttonRef}
                type="button"
                aria-label={label}
                aria-expanded={open}
                onClick={toggle}
                className="inline-flex size-4 items-center justify-center rounded-full text-fg-subtle transition-colors hover:text-brand-600"
            >
                <Info className="size-3.5" aria-hidden="true" />
            </button>

            {open && pos && (
                <div
                    role="tooltip"
                    onClick={(e) => e.stopPropagation()}
                    style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
                    className="fixed z-50 rounded-lg border border-border bg-bg p-3 text-left text-xs font-normal normal-case leading-relaxed text-fg-muted shadow-md"
                >
                    {text}
                </div>
            )}
        </span>
    )
}
