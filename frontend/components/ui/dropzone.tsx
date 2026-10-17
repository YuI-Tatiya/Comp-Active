"use client"

import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

const DEFAULT_ARIA_LABEL = "ลากไฟล์มาวางตรงนี้ หรือคลิกเพื่อเลือกไฟล์"

interface DropzoneProps {
    accept?: string
    onFileSelected: (file: File) => void
    /** เมื่อ true + children ถูกส่งมา จะแสดง children แทน dropzone (เช่น พรีวิวรูป/ชื่อไฟล์+ปุ่มลบ) */
    hasFile?: boolean
    children?: ReactNode
    /** ไม่ส่ง = ข้อความมาตรฐาน "ลากไฟล์มาวางตรงนี้ หรือ คลิกเพื่อเลือกไฟล์" (ครึ่งหลังเป็นลิงก์สีอำพัน) */
    label?: string
    hint?: string
    className?: string
}

/** กล่องลากวางไฟล์ธีม Denim — เส้นประอำพันบนพื้นอุ่น ไอคอนอัปโหลดบนป้ายกรมท่า */
export function Dropzone({ accept, onFileSelected, hasFile, children, label, hint, className }: DropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    if (hasFile && children) return <>{children}</>

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={label ?? DEFAULT_ARIA_LABEL}
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
                "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-4 py-6 text-center transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim",
                isDragging ? "border-amber-deep bg-amber/15" : "border-amber/70 bg-amber/5 hover:border-amber-deep hover:bg-amber/10",
                className
            )}
        >
            <span className="grid size-11 place-items-center rounded-xl bg-denim-deep text-white shadow-[0_3px_0_rgb(8_16_31)]" aria-hidden="true">
                <Upload className="size-5" />
            </span>
            <p className="text-sm font-semibold text-denim-deep">
                {label ?? (
                    <>
                        ลากไฟล์มาวางตรงนี้ หรือ{" "}
                        <span className="text-amber-ink underline decoration-amber decoration-2 underline-offset-4">คลิกเพื่อเลือกไฟล์</span>
                    </>
                )}
            </p>
            {hint && <p className="font-code text-xs text-denim-muted">{hint}</p>}
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
