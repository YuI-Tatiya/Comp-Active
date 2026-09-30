import * as React from "react"
import { cn } from "@/lib/utils"
import { EVENT_CARD_HEIGHT } from "./event-card-layout"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden="true"
            className={cn("animate-pulse rounded-md bg-surface-2", className)}
            {...props}
        />
    )
}

/** โครงการ์ดกิจกรรมระหว่างโหลด — ขนาดและสัดส่วนต้องตรงกับ EventCard ทุกจุด (รูป h-44, เนื้อหา p-5) กันหน้ากระตุกตอนข้อมูลมา */
function ActivityCardSkeleton() {
    return (
        <div
            aria-hidden="true"
            className={cn("flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-bg", EVENT_CARD_HEIGHT)}
        >
            <Skeleton className="h-44 shrink-0 rounded-none" />
            <div className="flex-1 space-y-3 p-5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <div className="space-y-2 pt-2">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-4/5" />
                </div>
            </div>
        </div>
    )
}

export { Skeleton, ActivityCardSkeleton }
