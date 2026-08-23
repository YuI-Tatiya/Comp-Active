"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
    open: boolean
    message: string
    description?: string
}

/** ป๊อปอัปแจ้งผลสำเร็จแบบลอย มุมล่างจอ — เข้าด้วย slide+fade, ออกด้วย fade เบาๆ */
export function Toast({ open, message, description }: ToastProps) {
    const [mounted, setMounted] = useState(false)
    const [closing, setClosing] = useState(false)

    useEffect(() => {
        if (open) {
            setMounted(true)
            setClosing(false)
            return
        }
        if (!mounted) return
        setClosing(true)
        const t = setTimeout(() => setMounted(false), 200)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    if (!mounted) return null

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:justify-end",
                closing ? "animate-toast-out" : "animate-toast-in"
            )}
        >
            <div className="flex max-w-sm items-center gap-3 rounded-2xl bg-fg px-5 py-4 text-white shadow-md">
                <span className="flex size-8 shrink-0 animate-toast-pop items-center justify-center rounded-full bg-success/20 text-success">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-sm font-semibold">{message}</p>
                    {description && <p className="mt-0.5 text-xs text-white/70">{description}</p>}
                </div>
            </div>
        </div>
    )
}
