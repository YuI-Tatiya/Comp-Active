"use client"

import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropzoneProps {
    accept?: string
    onFileSelected: (file: File) => void
    /** เมื่อ true + children ถูกส่งมา จะแสดง children แทน dropzone (เช่น พรีวิวรูป/ชื่อไฟล์+ปุ่มลบ) */
    hasFile?: boolean
    children?: ReactNode
    label?: string
    hint?: string
    className?: string
}

export function Dropzone({
    accept,
    onFileSelected,
    hasFile,
    children,
    label = "ลากไฟล์มาวางตรงนี้ หรือคลิกเพื่อเลือกไฟล์จากเครื่อง",
    hint,
    className,
}: DropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    if (hasFile && children) return <>{children}</>

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    inputRef.current?.click()
                }
            }}
            onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) onFileSelected(file)
            }}
            className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                isDragging ? "border-brand-500 bg-brand-50" : "border-border bg-surface hover:border-border-strong",
                className
            )}
        >
            <UploadCloud className="size-6 text-fg-subtle" aria-hidden="true" />
            <p className="text-sm font-medium text-fg">{label}</p>
            {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (file) onFileSelected(file)
                }}
            />
        </div>
    )
}
