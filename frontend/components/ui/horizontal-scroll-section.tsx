"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HorizontalScrollSectionProps {
    title: string
    count?: number
    children: React.ReactNode
}

/** แถวการ์ดเลื่อนซ้าย-ขวาได้ — scroll-snap ธรรมชาติของเบราว์เซอร์ + ลากด้วยเมาส์ ไม่พึ่งไลบรารีภายนอก */
export function HorizontalScrollSection({ title, count, children }: HorizontalScrollSectionProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const dragState = useRef({ active: false, moved: false, startX: 0, startScrollLeft: 0 })
    const [dragging, setDragging] = useState(false)

    function scroll(direction: 1 | -1) {
        const el = scrollRef.current
        if (!el) return
        el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" })
    }

    function onMouseDown(e: React.MouseEvent) {
        const el = scrollRef.current
        if (!el) return
        dragState.current = { active: true, moved: false, startX: e.pageX, startScrollLeft: el.scrollLeft }
        setDragging(true)
    }

    function onMouseMove(e: React.MouseEvent) {
        const el = scrollRef.current
        if (!el || !dragState.current.active) return
        const delta = e.pageX - dragState.current.startX
        if (Math.abs(delta) > 4) dragState.current.moved = true
        el.scrollLeft = dragState.current.startScrollLeft - delta
    }

    function endDrag() {
        dragState.current.active = false
        setDragging(false)
    }

    // กันคลิกหลุดไปเปิดลิงก์การ์ดโดยไม่ตั้งใจ หลังจากลากเมาส์เลื่อนแล้ว
    function onClickCapture(e: React.MouseEvent) {
        if (dragState.current.moved) {
            e.preventDefault()
            e.stopPropagation()
            dragState.current.moved = false
        }
    }

    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-fg">
                    {title}
                    {count !== undefined && <span className="ml-2 text-sm font-normal text-fg-muted">({count})</span>}
                </h2>
                <div className="flex gap-2">
                    <button
                        type="button"
                        aria-label="เลื่อนซ้าย"
                        onClick={() => scroll(-1)}
                        className="flex size-9 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-sm transition-colors hover:bg-surface hover:text-fg"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-label="เลื่อนขวา"
                        onClick={() => scroll(1)}
                        className="flex size-9 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-sm transition-colors hover:bg-surface hover:text-fg"
                    >
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onClickCapture={onClickCapture}
                className={cn(
                    "flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    dragging ? "cursor-grabbing select-none snap-none" : "cursor-grab"
                )}
            >
                {children}
            </div>
        </section>
    )
}
