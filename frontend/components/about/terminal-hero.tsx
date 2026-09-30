"use client"

import { useEffect, useState } from "react"

interface TerminalLine {
    kind: "cmd" | "out"
    text: string
}

const LINES: TerminalLine[] = [
    { kind: "cmd", text: "whoami" },
    { kind: "out", text: "College of Computing" },
    { kind: "cmd", text: "cat mission.txt" },
    { kind: "out", text: "นักศึกษา – กิจกรรม – การเรียนรู้ – การพัฒนาทักษะ" },
    { kind: "cmd", text: "./start --activities" },
]

/** ตำแหน่งตัวอักษรที่แต่ละบรรทัดเริ่มพิมพ์ (นับสะสมจากบรรทัดก่อนหน้า) */
const LINE_STARTS = LINES.map((_, i) => LINES.slice(0, i).reduce((sum, l) => sum + l.text.length, 0))
const TOTAL = LINES.reduce((sum, l) => sum + l.text.length, 0)
const TICK_MS = 45
/** ค้างไว้ที่ข้อความเต็มก่อนเริ่มพิมพ์ใหม่ (จำนวน tick) */
const HOLD_TICKS = 90

/**
 * หน้าต่างเทอร์มินัลพิมพ์ข้อความทีละตัวอักษรแล้ววนซ้ำ
 * prefers-reduced-motion → แสดงข้อความเต็มทันที ไม่พิมพ์ ไม่วน
 * ข้อความจริงอยู่ใน sr-only ด้วย เพื่อให้ screen reader ไม่ต้องอ่านตัวอักษรที่ทยอยโผล่
 */
export function TerminalHero() {
    const [ticks, setTicks] = useState(0)
    const [reduceMotion, setReduceMotion] = useState(false)

    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (reduce) {
            const raf = requestAnimationFrame(() => setReduceMotion(true))
            return () => cancelAnimationFrame(raf)
        }
        const id = setInterval(() => setTicks((t) => (t >= TOTAL + HOLD_TICKS ? 0 : t + 1)), TICK_MS)
        return () => clearInterval(id)
    }, [])

    const typed = reduceMotion ? TOTAL : Math.min(ticks, TOTAL)

    return (
        <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/15 bg-slate-950/70 text-left shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-red-400/90" />
                <span className="h-3 w-3 rounded-full bg-amber-300/90" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
                <span className="ml-3 font-mono text-xs text-white/50">compactive — zsh</span>
            </div>

            <p className="sr-only">College of Computing — นักศึกษา กิจกรรม การเรียนรู้ การพัฒนาทักษะ</p>

            <div className="min-h-[11rem] space-y-1.5 px-5 py-4 font-mono text-sm md:text-base" aria-hidden="true">
                {LINES.map((line, i) => {
                    const remaining = typed - LINE_STARTS[i]
                    if (remaining <= 0 && !(i === 0 && typed === 0)) return null
                    const shown = line.text.slice(0, Math.max(remaining, 0))
                    const typing = remaining < line.text.length
                    const isLast = i === LINES.length - 1
                    return (
                        <p key={i} className={line.kind === "cmd" ? "text-white" : "pl-4 text-emerald-300"}>
                            {line.kind === "cmd" && <span className="mr-2 text-brand-200">$</span>}
                            {shown}
                            {(typing || isLast) && (
                                <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-brand-200 motion-reduce:animate-none" />
                            )}
                        </p>
                    )
                })}
            </div>
        </div>
    )
}
