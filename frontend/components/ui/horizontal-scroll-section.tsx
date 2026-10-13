"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HorizontalScrollSectionProps {
    title: string
    count?: number
    children: React.ReactNode
}

/** ปุ่มเลื่อนกลมขาว — แบบเดียวกับ RoundIconButton ของหน้าแรก (ย่อเหลือ 40px ให้พอดีหัวแถว) */
const NAV_BUTTON =
    "grid size-10 place-items-center rounded-full border-[1.5px] border-denim-line bg-white text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"

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
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex min-w-0 items-center gap-2.5 font-display text-xl font-bold text-denim-deep">
                    <span className="truncate">{title}</span>
                    {count !== undefined && (
                        <span className="rounded-full bg-denim-chip px-2.5 py-0.5 font-code text-xs font-semibold tabular-nums text-denim">
                            {count}
                            <span className="sr-only"> รายการ</span>
                        </span>
                    )}
                </h2>
                <div className="flex shrink-0 gap-2">
                    <button type="button" aria-label={`เลื่อนหมวด${title}ไปทางซ้าย`} onClick={() => scroll(-1)} className={NAV_BUTTON}>
                        <ChevronLeft className="size-[18px]" aria-hidden="true" />
                    </button>
                    <button type="button" aria-label={`เลื่อนหมวด${title}ไปทางขวา`} onClick={() => scroll(1)} className={NAV_BUTTON}>
                        <ChevronRight className="size-[18px]" aria-hidden="true" />
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
                // overflow-x ตัดทุกอย่างที่ล้นกรอบ (แกน y ด้วย) — เผื่อขอบไว้ให้การ์ดยกตัว/เงาตอน hover (ล้นล่าง ~40px
                // ข้าง ~22px) และกรอบโฟกัส แล้วหักคืนด้วย margin ติดลบ ตำแหน่งการ์ดจึงเท่าเดิม ด้านข้างเผื่อได้ไม่เกิน
                // padding ของ Container (16px / sm 24px) ไม่งั้นหน้าจอแคบจะเลื่อนแนวนอนได้ · scroll-px ให้ snap ชิดขอบคอลัมน์
                // ช่องห่าง gap-6 เท่ากริดการ์ดหน้าแรก (ACTIVITY_GRID)
                className={cn(
                    "-mx-4 -mt-3 -mb-10 flex snap-x snap-mandatory scroll-px-4 gap-6 overflow-x-auto scroll-smooth px-4 pt-3 pb-12 sm:-mx-6 sm:scroll-px-6 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    dragging ? "cursor-grabbing select-none snap-none" : "cursor-grab"
                )}
            >
                {children}
            </div>
        </section>
    )
}
