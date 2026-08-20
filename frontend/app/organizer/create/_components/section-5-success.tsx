"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import type { EventFormState, ActivityFormState } from "./types"

interface Props {
    event: EventFormState
    activities: ActivityFormState[]
    onCreateAnother: () => void
}

export function SectionSuccess({ event, activities, onCreateAnother }: Props) {
    return (
        <div className="flex flex-col items-center space-y-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-8" />
            </div>
            <div>
                <h2 className="text-xl font-black text-fg">สร้างงานสำเร็จ!</h2>
                <p className="mt-2 max-w-md text-sm text-fg-muted">
                    งานของคุณกำลังรออนุมัติจากแอดมิน จะยังไม่แสดงต่อนักศึกษาจนกว่าจะได้รับการอนุมัติ
                </p>
            </div>

            <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4 text-left">
                {event.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={event.imagePreview}
                        alt={event.name}
                        className="mb-3 aspect-video w-full rounded-md object-cover"
                    />
                )}
                <div className="font-bold text-fg">{event.name}</div>
                <div className="mt-1 text-sm text-fg-muted">{activities.length} กิจกรรมย่อย</div>
            </div>

            <div className="flex w-full max-w-sm gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onCreateAnother}>
                    สร้างงานใหม่อีกครั้ง
                </Button>
                <Button asChild className="flex-1">
                    <Link href="/organizer/manage">ไปหน้าจัดการกิจกรรม</Link>
                </Button>
            </div>
        </div>
    )
}
