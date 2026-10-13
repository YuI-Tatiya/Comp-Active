import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description?: string
    /** ลิงก์หรือปุ่มด้านขวา เช่น "ดูทั้งหมด →" */
    action?: React.ReactNode
}

/**
 * หัวข้อ section — ใช้ระยะห่างและน้ำหนักตัวอักษรคุมลำดับชั้น
 * ไม่มีขีดสีใต้หัวข้อแบบดีไซน์เดิม (h-1 w-20 bg-blue-600)
 */
function SectionHeading({
    title,
    description,
    action,
    className,
    ...props
}: SectionHeadingProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
                className
            )}
            {...props}
        >
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-fg">{title}</h2>
                {description && <p className="text-sm text-fg-muted">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}

export { SectionHeading }
