"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StepMeta {
    number: number
    title: string
    subtitle: string
}

interface StepperSidebarProps {
    steps: StepMeta[]
    currentStep: number
    className?: string
}

/** Stepper แนวตั้งตาม wireframe — logic active/complete เดิมจากวิซาร์ดเก่า retokenize เป็นแนวตั้ง */
export function StepperSidebar({ steps, currentStep, className }: StepperSidebarProps) {
    return (
        <div className={cn("flex flex-col", className)}>
            {steps.map((s, i) => {
                const isComplete = currentStep > s.number
                const isActive = currentStep === s.number
                const isLast = i === steps.length - 1

                return (
                    <div key={s.number} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                                    isActive
                                        ? "bg-brand-600 text-white"
                                        : isComplete
                                            ? "bg-brand-100 text-brand-600"
                                            : "border-2 border-border bg-bg text-fg-subtle"
                                )}
                            >
                                {isComplete ? <Check className="size-5" /> : s.number}
                            </div>
                            {!isLast && (
                                <div
                                    className={cn(
                                        "my-1 min-h-8 w-0.5 flex-1",
                                        isComplete ? "bg-brand-600" : "bg-border"
                                    )}
                                />
                            )}
                        </div>
                        <div className={cn("pb-8", isLast && "pb-0")}>
                            <div
                                className={cn(
                                    "text-sm font-bold",
                                    isActive || isComplete ? "text-fg" : "text-fg-subtle"
                                )}
                            >
                                {s.title}
                            </div>
                            <div className="mt-0.5 text-xs text-fg-muted">{s.subtitle}</div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
