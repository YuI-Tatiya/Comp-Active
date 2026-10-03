"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FlipCardProps {
    front: ReactNode
    back: ReactNode
}

/**
 * การ์ดพลิก 3D — เดสก์ท็อป hover เพื่อพลิก, จอสัมผัสแตะเพื่อสลับ (ปุ่ม aria-pressed)
 * ด้านหลังยังอยู่ใน DOM เสมอ screen reader จึงอ่านได้ทั้งสองด้าน
 */
export function FlipCard({ front, back }: FlipCardProps) {
    const [flipped, setFlipped] = useState(false)

    return (
        <button
            type="button"
            aria-pressed={flipped}
            onClick={() => setFlipped((f) => !f)}
            className="group block h-48 w-full text-left [perspective:1000px]"
        >
            <span
                className={cn(
                    "relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] motion-reduce:transition-none",
                    flipped && "[transform:rotateY(180deg)]",
                )}
            >
                <span className="absolute inset-0 flex flex-col rounded-2xl border border-border bg-bg p-5 shadow-sm [backface-visibility:hidden]">
                    {front}
                </span>
                <span className="absolute inset-0 flex flex-col justify-center rounded-2xl border border-brand-600 bg-brand-900 p-5 text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    {back}
                </span>
            </span>
        </button>
    )
}
