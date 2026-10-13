"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useMounted } from "@/lib/use-mounted"

interface ImageLightboxProps {
    src: string
    alt: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * ดูรูปขนาดใหญ่เต็มจอ — แยกจาก Dialog ทั่วไปใน dialog.tsx เพราะอันนั้นจำกัดความกว้างไว้แค่ max-w-lg
 * และมีกรอบการ์ด+padding สีขาวรอบตัว (ออกแบบมาสำหรับฟอร์ม/ข้อความ ไม่ใช่โชว์รูป) ที่นี่ให้รูปเต็มพื้นที่
 * เกือบเต็มจอแทน (object-contain กันรูปเบี้ยว) พื้นหลังมืดสนิทให้รูปเด่น ไม่ใช่การ์ดขาว
 */
export function ImageLightbox({ src, alt, open, onOpenChange }: ImageLightboxProps) {
    const mounted = useMounted()

    // กด Esc ปิดได้ — พฤติกรรมมาตรฐานของ lightbox ทั่วไป
    useEffect(() => {
        if (!open) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onOpenChange(false)
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [open, onOpenChange])

    if (!open || !mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 animate-dialog-backdrop bg-black/85"
                onClick={() => onOpenChange(false)}
            />
            <div className="relative z-50 flex max-h-[90dvh] max-w-[90vw] animate-dialog-pop items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} className="max-h-[90dvh] max-w-[90vw] rounded-lg object-contain" />
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label="ปิด"
                    className="absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-full bg-bg text-fg shadow-lg transition-colors hover:bg-surface-2"
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            </div>
        </div>,
        document.body
    )
}
