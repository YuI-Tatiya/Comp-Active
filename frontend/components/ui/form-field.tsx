"use client"

import * as React from "react"
import { Label } from "./label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
    /** ต้องตรงกับ key ที่ใช้ใน error map ของ parent — ใช้เป็น scroll/focus target ตอน validate ไม่ผ่าน */
    name: string
    label: string
    required?: boolean
    error?: string
    children: React.ReactNode
    className?: string
}

export function FormField({ name, label, required, error, children, className }: FormFieldProps) {
    return (
        <div className={cn("space-y-2", className)} data-field={name}>
            <Label>
                {label} {required && <span className="text-danger">*</span>}
            </Label>
            {children}
            {error && <p className="text-xs text-danger">{error}</p>}
        </div>
    )
}

/** ต่อท้าย className ของ Input/Textarea/select เพื่อให้ขึ้นกรอบแดงเมื่อ field นั้น invalid */
export function fieldInputClass(error?: string): string {
    return error ? "border-danger ring-1 ring-danger/30 focus-visible:ring-danger/50" : ""
}

/** เลื่อนจอไปหาฟิลด์แรกที่ error แล้ว focus input ข้างในให้ */
export function scrollToFirstError(errors: Record<string, string | undefined>): void {
    const firstKey = Object.keys(errors).find((k) => errors[k])
    if (!firstKey) return
    requestAnimationFrame(() => {
        const el = document.querySelector(`[data-field="${firstKey}"]`)
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        const input = el.querySelector<HTMLElement>("input, textarea, select")
        input?.focus()
    })
}
