"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToggleProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    id?: string
    className?: string
}

/** สวิตช์เปิด/ปิดแบบ hand-rolled — ไม่มี Radix Switch ในโปรเจกต์นี้ ใช้ pattern เดียวกับ tabs.tsx/dialog.tsx */
const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ checked, onCheckedChange, disabled, id, className }, ref) => {
        return (
            <button
                ref={ref}
                type="button"
                role="switch"
                id={id}
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-brand-600" : "bg-border-strong",
                    className
                )}
            >
                <span
                    className={cn(
                        "inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform",
                        checked ? "translate-x-6" : "translate-x-1"
                    )}
                />
            </button>
        )
    }
)
Toggle.displayName = "Toggle"

export { Toggle }
