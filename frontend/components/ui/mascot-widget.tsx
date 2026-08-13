"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type Corner = "br" | "bl" | "tr" | "tl"

const EDGE_GAP = 20
const HEADER_CLEARANCE = 84
const AVATAR_W = 192
const AVATAR_H = 240
const DRAG_THRESHOLD = 6

const CORNER_POSITION: Record<Corner, React.CSSProperties> = {
  br: { bottom: EDGE_GAP, right: EDGE_GAP },
  bl: { bottom: EDGE_GAP, left: EDGE_GAP },
  tr: { top: HEADER_CLEARANCE, right: EDGE_GAP },
  tl: { top: HEADER_CLEARANCE, left: EDGE_GAP },
}

/** ทิศทางการวางบับเบิลเทียบกับมาสคอต — มุมบนวางบับเบิลไว้ด้านล่างแทน */
const CORNER_LAYOUT: Record<Corner, string> = {
  br: "flex-col items-end",
  bl: "flex-col items-start",
  tr: "flex-col-reverse items-end",
  tl: "flex-col-reverse items-start",
}

const CORNER_ORIGIN: Record<Corner, string> = {
  br: "origin-bottom-right",
  bl: "origin-bottom-left",
  tr: "origin-top-right",
  tl: "origin-top-left",
}

/** มุมบับเบิลด้านที่ชิดมาสคอตให้บุ๋มเล็กน้อย เหมือนหางบับเบิล */
const CORNER_NOTCH: Record<Corner, string> = {
  br: "rounded-br-md",
  bl: "rounded-bl-md",
  tr: "rounded-tr-md",
  tl: "rounded-tl-md",
}

/**
 * มาสคอตลอยที่ลากไปวางมุมไหนของจอก็ได้ — ตอนนี้ยังไม่มีระบบถาม-ตอบจริง
 * มีแค่ข้อความต้อนรับเด้งขึ้นเมื่อกดหรือเข้าเว็บครั้งแรก
 */
export function MascotWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [corner, setCorner] = useState<Corner>("br")
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(timer)
  }, [])

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    movedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY }
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      movedRef.current = true
    }
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragPos(null)

    if (movedRef.current) {
      const isLeft = e.clientX < window.innerWidth / 2
      const isTop = e.clientY < window.innerHeight / 2
      setCorner(isTop ? (isLeft ? "tl" : "tr") : isLeft ? "bl" : "br")
    } else {
      setOpen((v) => !v)
    }
  }

  function handlePointerCancel() {
    draggingRef.current = false
    setDragPos(null)
  }

  const isDragging = dragPos !== null

  // แอดมินมีธีม/ระบบ auth แยกต่างหาก ไม่ให้มาสคอตไปโผล่ในโซนนั้น
  if (pathname?.startsWith("/admin")) return null

  return (
    <div
      className={cn(
        "fixed z-50 flex gap-3",
        !isDragging && "transition-all duration-300",
        CORNER_LAYOUT[corner]
      )}
      style={
        isDragging && dragPos
          ? { left: dragPos.x - AVATAR_W / 2, top: dragPos.y - AVATAR_H / 2 }
          : CORNER_POSITION[corner]
      }
    >
      <div
        className={cn(
          "relative w-64 rounded-2xl border border-border bg-bg p-4 shadow-lg transition-all duration-300",
          CORNER_ORIGIN[corner],
          CORNER_NOTCH[corner],
          open && !isDragging
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="ปิดข้อความ"
          className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-border bg-bg text-fg-subtle shadow-sm transition-colors hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
        <p className="text-sm font-medium leading-relaxed text-fg">
          ยินดีต้อนรับเข้าสู่ Comp Active
        </p>
      </div>

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={open ? "ซ่อนข้อความต้อนรับ (ลากเพื่อย้ายตำแหน่ง)" : "แสดงข้อความต้อนรับ (ลากเพื่อย้ายตำแหน่ง)"}
        className="relative h-[12.5rem] w-40 shrink-0 cursor-grab touch-none transition-transform active:scale-95 active:cursor-grabbing sm:h-60 sm:w-48"
      >
        <Image
          src="/mascot.svg"
          alt="มาสคอตของ Comp Active"
          fill
          sizes="(min-width: 640px) 192px, 160px"
          className="object-contain drop-shadow-xl"
          draggable={false}
        />
      </button>
    </div>
  )
}
