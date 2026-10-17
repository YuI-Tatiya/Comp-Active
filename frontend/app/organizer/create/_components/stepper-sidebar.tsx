"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StepMeta {
    number: number
    title: string
    subtitle: string
}

interface StepperProps {
    steps: StepMeta[]
    currentStep: number
    className?: string
}

/** Stepper แนวตั้งบนการ์ดยีนส์เข้ม (แถบข้างจอ lg+) — ขั้นปัจจุบันวงอำพันมีวงแสง ขั้นที่ผ่านแล้วเป็นเครื่องหมายถูก */
export function StepperSidebar({ steps, currentStep, className }: StepperProps) {
    return (
        <nav aria-label="ขั้นตอนการสร้างงาน" className={cn("denim-weave-deep rounded-[20px] px-5 py-5 text-white", className)}>
            <p className="font-code text-xs font-semibold tracking-[0.08em] text-amber">
                STEP {currentStep} / {steps.length}
            </p>
            <ol className="mt-4">
                {steps.map((s, i) => {
                    const isComplete = currentStep > s.number
                    const isActive = currentStep === s.number
                    const isLast = i === steps.length - 1

                    return (
                        <li key={s.number} className="flex gap-3" aria-current={isActive ? "step" : undefined}>
                            <div className="flex flex-col items-center">
                                <span
                                    className={cn(
                                        "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors",
                                        isActive
                                            ? "bg-amber text-denim-deep ring-4 ring-amber/25"
                                            : isComplete
                                                ? "bg-amber/85 text-denim-deep"
                                                : "border-[1.5px] border-white/35 text-white/80"
                                    )}
                                >
                                    {isComplete ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : s.number}
                                </span>
                                {!isLast && (
                                    <span className="my-1.5 min-h-6 flex-1 border-l-[1.5px] border-dashed border-white/25" aria-hidden="true" />
                                )}
                            </div>
                            <div className={cn("min-w-0 pt-1", !isLast && "pb-5")}>
                                <p className={cn("text-sm font-bold", isActive || isComplete ? "text-white" : "text-white/80")}>
                                    {s.title}
                                    {isComplete && <span className="sr-only"> (เสร็จแล้ว)</span>}
                                </p>
                                <p className="mt-0.5 text-xs text-denim-on-muted">{s.subtitle}</p>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

/** แถบขั้นตอนแบบย่อสำหรับจอแคบกว่า lg (ไม่มีแถบข้าง) — บอกขั้นปัจจุบัน + แถบ 4 ช่องให้เห็นว่าเหลืออีกกี่ขั้น */
export function StepperCompact({ steps, currentStep, className }: StepperProps) {
    const current = steps.find((s) => s.number === currentStep)
    return (
        <nav aria-label="ขั้นตอนการสร้างงาน" className={cn("denim-weave-deep flex items-center gap-3 rounded-2xl px-4 py-3 text-white", className)}>
            <span className="shrink-0 font-code text-xs font-semibold tracking-[0.08em] text-amber">
                STEP {currentStep} / {steps.length}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{current?.title}</span>
            <span className="flex shrink-0 gap-1.5" aria-hidden="true">
                {steps.map((s) => (
                    <span key={s.number} className={cn("h-1.5 w-5 rounded-full", s.number <= currentStep ? "bg-amber" : "bg-white/25")} />
                ))}
            </span>
        </nav>
    )
}
