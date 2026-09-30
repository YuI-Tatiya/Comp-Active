"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface PathStep {
    title: string
    desc: string
    icon: ReactNode
}

/**
 * ไทม์ไลน์แนวตั้ง — เส้นเชื่อมเติมสีตามตำแหน่งการเลื่อน และจุดของแต่ละขั้นสว่างขึ้นเมื่อเส้นมาถึง
 * prefers-reduced-motion → เส้นเต็มและทุกขั้น active ทันที
 */
export function PathTimeline({ steps }: { steps: PathStep[] }) {
    const ref = useRef<HTMLOListElement>(null)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const raf = requestAnimationFrame(() => setProgress(1))
            return () => cancelAnimationFrame(raf)
        }

        let raf = 0
        const update = () => {
            raf = 0
            const rect = el.getBoundingClientRect()
            const p = (window.innerHeight * 0.65 - rect.top) / rect.height
            setProgress(Math.min(Math.max(p, 0), 1))
        }
        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(update)
        }
        schedule()
        window.addEventListener("scroll", schedule, { passive: true })
        window.addEventListener("resize", schedule)
        return () => {
            window.removeEventListener("scroll", schedule)
            window.removeEventListener("resize", schedule)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [])

    return (
        <ol ref={ref} className="relative mx-auto max-w-3xl space-y-10 pl-16 md:pl-20">
            <span className="absolute bottom-6 left-6 top-6 w-0.5 rounded bg-border md:left-8" aria-hidden="true" />
            <span
                className="absolute left-6 top-6 w-0.5 rounded bg-brand-600 md:left-8"
                style={{ height: `calc((100% - 3rem) * ${progress})` }}
                aria-hidden="true"
            />
            {steps.map((step, i) => {
                const active = progress >= (i + 0.3) / steps.length
                return (
                    <li key={step.title} className="relative">
                        <span
                            className={cn(
                                "absolute -left-16 top-0 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors duration-500 md:-left-20 md:h-16 md:w-16",
                                active
                                    ? "border-brand-600 bg-brand-600 text-white shadow-lg shadow-brand-600/30"
                                    : "border-border bg-bg text-fg-subtle",
                            )}
                        >
                            {step.icon}
                        </span>
                        <p className="font-mono text-xs font-medium text-brand-600">step_0{i + 1}</p>
                        <h3 className="mt-1 text-xl font-bold text-fg">{step.title}</h3>
                        <p className="mt-1.5 leading-relaxed text-fg-muted">{step.desc}</p>
                    </li>
                )
            })}
        </ol>
    )
}
