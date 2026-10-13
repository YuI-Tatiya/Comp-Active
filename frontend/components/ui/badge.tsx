import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                // brand
                default: "bg-brand-50 text-brand-700",
                // สถานะที่ผูกกับ enum ใน backend/prisma/schema.prisma
                success: "bg-success-bg text-success",   // open / approved / confirmed
                warning: "bg-warning-bg text-warning",   // pending_approval / pending
                danger: "bg-danger-bg text-danger",      // rejected / cancelled
                info: "bg-info-bg text-info",            // completed / closed
                neutral: "bg-surface-2 text-fg-muted",
                outline: "border border-border text-fg-muted",
                // ชื่อเดิม — เก็บไว้ไม่ให้หน้าเก่าพัง
                secondary: "bg-surface-2 text-fg-muted",
                destructive: "bg-danger-bg text-danger",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
