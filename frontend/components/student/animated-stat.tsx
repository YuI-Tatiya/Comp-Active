"use client"

import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** นับเลขจาก 0 ขึ้นไปถึงค่าจริงแบบชะลอท้าย (ease-out) — ผู้ใช้ที่ตั้งลดการเคลื่อนไหวจะเห็นค่าจริงทันที */
export function useCountUp(target: number | null, duration = 1200): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === null) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const ms = reduced ? 0 : duration
    let raf = 0
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const t = ms === 0 ? 1 : Math.min(1, (now - start) / ms)
      setValue(target * (1 - Math.pow(1 - t, 3)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

const STAT_TONES = {
  brand: { chip: "bg-brand-50 text-brand-600", glow: "bg-brand-100", bar: "from-brand-600 to-brand-300" },
  success: { chip: "bg-success-bg text-success", glow: "bg-success-bg", bar: "from-success to-success/30" },
  warning: { chip: "bg-warning-bg text-warning", glow: "bg-warning-bg", bar: "from-warning to-warning/30" },
  info: { chip: "bg-brand-50 text-info", glow: "bg-brand-50", bar: "from-info to-info/30" },
} as const

/** การ์ดสถิติ — เลขนับขึ้น, ไอคอนลอยเบาๆ และเอียงเด้งตอนชี้, แถบสีไล่ยาวออกที่ขอบล่าง */
export function StatCard({
  label,
  value,
  format,
  icon: Icon,
  tone,
  caption,
  index,
}: {
  label: string
  /** null = ยังโหลดอยู่ */
  value: number | null
  format: (n: number) => string
  icon: LucideIcon
  tone: keyof typeof STAT_TONES
  caption?: string
  index: number
}) {
  const animated = useCountUp(value)
  const t = STAT_TONES[tone]
  return (
    <article
      style={{ animationDelay: `${index * 90}ms` }}
      className="group relative overflow-hidden rounded-[28px] border border-border bg-bg p-5 shadow-xs transition-all duration-300 motion-safe:animate-rise-in hover:-translate-y-1 hover:shadow-md"
    >
      <div
        aria-hidden="true"
        className={cn("absolute -right-8 -top-8 size-28 rounded-full opacity-70 transition-transform duration-500 ease-out group-hover:scale-150", t.glow)}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-fg">
            {value === null ? "—" : format(animated)}
          </p>
        </div>
        <span className="transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110">
          <span className={cn("ph-float flex size-11 items-center justify-center rounded-2xl shadow-sm", t.chip)}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </span>
      </div>
      {caption && <p className="relative mt-3 text-xs text-fg-subtle">{caption}</p>}
      <span
        aria-hidden="true"
        className={cn("absolute bottom-0 left-0 h-1 w-8 rounded-r-full bg-gradient-to-r transition-all duration-500 ease-out group-hover:w-full", t.bar)}
      />
    </article>
  )
}
