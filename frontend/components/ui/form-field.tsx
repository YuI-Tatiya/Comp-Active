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
    /** id ของช่องกรอกข้างใน — ผูก <label> เข้ากับช่อง (คลิกหัวข้อแล้วโฟกัสช่อง, โปรแกรมอ่านจออ่านชื่อช่องได้) */
    htmlFor?: string
    labelClassName?: string
    /** ช่องขวาของหัวข้อ เช่น ตัวนับ "0/120" หรือป้าย "ไม่บังคับ" */
    aside?: React.ReactNode
    /** คำแนะนำใต้ช่อง — ถูกแทนด้วยข้อความ error เมื่อมี error */
    hint?: React.ReactNode
    /** id ของบรรทัดคำแนะนำ/error — ให้ช่องกรอกอ้างถึงด้วย aria-describedby */
    messageId?: string
}

export function FormField({
    name,
    label,
    required,
    error,
    children,
    className,
    htmlFor,
    labelClassName,
    aside,
    hint,
    messageId,
}: FormFieldProps) {
    const labelNode = (
        <Label htmlFor={htmlFor} className={labelClassName}>
            {label} {required && <span className="text-danger">*</span>}
        </Label>
    )
    // scroll-mt-24: เลื่อนหาฟิลด์ที่ error แล้วไม่ให้หัวข้อไปจมใต้ AppHeader ที่ sticky อยู่ด้านบน (h-16)
    return (
        <div className={cn("scroll-mt-24 space-y-2", className)} data-field={name}>
            {aside ? (
                <div className="flex items-baseline justify-between gap-3">
                    {labelNode}
                    {aside}
                </div>
            ) : (
                labelNode
            )}
            {children}
            {error ? (
                <p id={messageId} className="text-xs text-danger">
                    {error}
                </p>
            ) : (
                hint && (
                    <p id={messageId} className="text-xs text-denim-muted">
                        {hint}
                    </p>
                )
            )}
        </div>
    )
}

/** ต่อท้าย className ของ Input/Textarea/select เพื่อให้ขึ้นกรอบแดงเมื่อ field นั้น invalid */
export function fieldInputClass(error?: string): string {
    return error ? "border-danger ring-1 ring-danger/30 focus-visible:ring-danger/50" : ""
}

/**
 * เลื่อนจอไปหาฟิลด์แรกที่ error แล้ว focus input ข้างในให้
 *
 * block: "nearest" — เลื่อนแค่เท่าที่จำเป็นให้เห็นฟิลด์ ไม่กระชากทั้งหน้าไปจัดกึ่งกลาง (หน้าวิซาร์ดสร้าง/แก้ไขงาน
 * เคยใช้การ์ดที่เลื่อนในตัวเอง ซึ่ง "center" ไล่เลื่อนทุกกล่องที่เป็นแม่จนเจอพื้นที่ว่างใต้ footer — ตอนนี้ทั้งหน้าเลื่อนปกติแล้ว
 * แต่ "nearest" ก็ยังพอดีกว่า) ระยะใต้ AppHeader มาจาก scroll-mt-24 ของ FormField
 */
export function scrollToFirstError(errors: Record<string, string | undefined>): void {
    const firstKey = Object.keys(errors).find((k) => errors[k])
    if (!firstKey) return
    requestAnimationFrame(() => {
        const el = document.querySelector(`[data-field="${firstKey}"]`)
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "nearest" })
        const input = el.querySelector<HTMLElement>("input, textarea, select")
        input?.focus()
    })
}
