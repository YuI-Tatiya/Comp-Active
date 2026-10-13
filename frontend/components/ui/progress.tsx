import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number
    // null/0 = ไม่มีเพดานให้เทียบ (เช่น กิจกรรมไม่จำกัดจำนวน) — เรนเดอร์เป็น 0% แทนที่จะเป็น NaN/Infinity
    max?: number | null
    indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
        const percentage = max ? Math.min(Math.max(0, ((value || 0) / max) * 100), 100) : 0;

        return (
            <div
                ref={ref}
                className={cn(
                    "relative h-2 w-full overflow-hidden rounded-full bg-surface-2",
                    className
                )}
                {...props}
            >
                <div
                    className={cn("h-full w-full flex-1 bg-brand-600 transition-all", indicatorClassName)}
                    style={{ transform: `translateX(-${100 - percentage}%)` }}
                />
            </div>
        )
    }
)
Progress.displayName = "Progress"

export { Progress }
