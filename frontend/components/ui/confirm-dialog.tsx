"use client"

import { AlertTriangle, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    tone?: "danger" | "default"
    loading?: boolean
}

const TONE_ICON_CLASS = {
    danger: "bg-danger-bg text-danger ring-danger/10",
    default: "bg-brand-50 text-brand-600 ring-brand-600/10",
} as const

/** Dialog ยืนยันก่อนทำรายการสำคัญ — ใช้แทน confirm() ของเบราว์เซอร์ ต่อยอดจาก components/ui/dialog.tsx เดิม */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "ยืนยัน",
    cancelLabel = "ยกเลิก",
    onConfirm,
    tone = "default",
    loading = false,
}: ConfirmDialogProps) {
    const Icon = tone === "danger" ? AlertTriangle : HelpCircle

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mx-auto gap-6 sm:max-w-sm">
                <div className="flex flex-col items-center text-center">
                    <span
                        className={cn(
                            "mb-5 flex size-16 animate-icon-pop items-center justify-center rounded-full ring-8",
                            TONE_ICON_CLASS[tone]
                        )}
                    >
                        <Icon className="size-8" aria-hidden="true" />
                    </span>
                    <h2 className="text-xl font-bold text-fg">{title}</h2>
                    {description && (
                        <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-fg-muted">{description}</p>
                    )}
                </div>

                <div className="flex w-full flex-col gap-2">
                    <Button
                        type="button"
                        className={cn("h-11 w-full rounded-xl font-semibold", tone === "danger" && "bg-danger hover:bg-danger/90")}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "กำลังดำเนินการ..." : confirmLabel}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-11 w-full rounded-xl font-semibold"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
