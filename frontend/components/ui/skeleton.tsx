import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden="true"
            className={cn("animate-pulse rounded-md bg-surface-2", className)}
            {...props}
        />
    )
}

/** โครงการ์ดกิจกรรมระหว่างโหลด — สัดส่วนตรงกับ ActivityCard */
function ActivityCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
            <Skeleton className="aspect-video rounded-none" />
            <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <div className="space-y-2 pt-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3.5 w-2/5" />
                </div>
            </div>
        </div>
    )
}

export { Skeleton, ActivityCardSkeleton }
