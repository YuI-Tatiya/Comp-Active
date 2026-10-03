"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
    to: number
    duration?: number
}

/** ตัวเลขวิ่งจาก 0 ถึงค่าเป้าหมายเมื่อเลื่อนมาถึง — reduced-motion แสดงค่าจริงทันที */
export function CountUp({ to, duration = 1200 }: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const [value, setValue] = useState(0)

    useEffect(() => {
        const el = ref.current
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (!el || reduce || typeof IntersectionObserver === "undefined") {
            const raf = requestAnimationFrame(() => setValue(to))
            return () => cancelAnimationFrame(raf)
        }
        let raf = 0
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return
            observer.disconnect()
            const start = performance.now()
            const tick = (now: number) => {
                const t = Math.min((now - start) / duration, 1)
                setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
                if (t < 1) raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
        })
        observer.observe(el)
        return () => {
            observer.disconnect()
            cancelAnimationFrame(raf)
        }
    }, [to, duration])

    return <span ref={ref}>{value}</span>
}
