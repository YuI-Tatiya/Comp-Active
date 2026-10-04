"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = ({
    open,
    onOpenChange,
    children,
}: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}) => {
    // พอร์ทัลไป document.body เสมอ — ไม่งั้น position:fixed ของ dialog จะยึดกรอบของ ancestor ที่มี
    // transform/contain/filter แทนวิวพอร์ตจริง (เช่น การ์ดฟอร์มในวิซาร์ดสร้าง/แก้ไขงานที่ใส่ contain:layout
    // กันปัญหา overflow-auto รายงานความสูงหน้าเว็บผิด — ถ้า Dialog ไม่พอร์ทัล จะโดนย่อให้เล็กเท่ากรอบการ์ดไปด้วย)
    // useEffect กัน document ไม่มีตอน SSR
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])

    if (!open || !mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 animate-dialog-backdrop bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange?.(false)}
            />
            {/* Content */}
            <div className="relative z-50 w-full max-w-lg animate-dialog-pop rounded-2xl border border-border bg-bg p-6 shadow-lg">
                {children}
            </div>
        </div>,
        document.body
    )
}

const DialogContent = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("grid gap-4", className)}>{children}</div>
)

const DialogHeader = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
        {children}
    </div>
)

const DialogTitle = ({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
        {children}
    </h2>
)

const DialogDescription = ({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-fg-muted", className)}>
        {children}
    </p>
)

const DialogFooter = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
        {children}
    </div>
)

const DialogClose = ({ onClick, className }: { onClick?: () => void, className?: string }) => (
    <button
        onClick={onClick}
        className={cn("absolute right-4 top-4 rounded-sm opacity-70 ring-offset-bg transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-fg focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-surface data-[state=open]:text-fg-muted", className)}
    >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
    </button>
)

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose }
