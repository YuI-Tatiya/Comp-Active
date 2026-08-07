import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
    label: string
    value: React.ReactNode
    icon?: LucideIcon
}

function StatTile({ label, value, icon: Icon, className, ...props }: StatTileProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-border bg-bg p-5 shadow-xs",
                className
            )}
            {...props}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm text-fg-muted">{label}</p>
                    <p className="text-3xl font-semibold tracking-tight text-fg">{value}</p>
                </div>
                {Icon && (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                        <Icon className="size-4.5 text-brand-600" aria-hidden="true" />
                    </span>
                )}
            </div>
        </div>
    )
}

export { StatTile }
