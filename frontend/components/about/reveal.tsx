"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RevealProps {
    children: ReactNode
    className?: string
    /** หน่วง ms — ใช้ไล่จังหวะการ์ดที่อยู่แถวเดียวกัน */
    delay?: number
}

/**
 * Fade-in + เลื่อนขึ้นเมื่อเลื่อนหน้ามาถึง (ครั้งเดียว)
 * ไม่รองรับ IntersectionObserver → แสดงทันที; prefers-reduced-motion → ไม่มีการเคลื่อนไหว (ผ่าน motion-reduce:)
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el || typeof IntersectionObserver === "undefined") {
            const raf = requestAnimationFrame(() => setVisible(true))
            return () => cancelAnimationFrame(raf)
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.15 },
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            style={{ transitionDelay: visible ? `${delay}ms` : undefined }}
            className={cn(
                "transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
                visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
                className,
            )}
        >
            {children}
        </div>
    )
}
