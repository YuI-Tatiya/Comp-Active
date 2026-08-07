import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: LucideIcon
    title: string
    description?: string
    action?: React.ReactNode
}

function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center",
                className
            )}
            {...props}
        >
            {Icon && (
                <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2">
                    <Icon className="size-6 text-fg-subtle" aria-hidden="true" />
                </span>
            )}
            <h3 className="text-lg font-semibold text-fg">{title}</h3>
            {description && (
                <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}

export { EmptyState }
