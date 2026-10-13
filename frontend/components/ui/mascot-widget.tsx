"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { X, Send, Loader2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { chatbotAPI, type ChatHistoryItem } from "@/lib/api"
import { PUBLIC_ADMIN_HOSTS, isAdminHostname } from "@/lib/admin-host"
import { BOTTOM_NAV_CLEARANCE } from "@/components/layout/bottom-nav"

type Corner = "br" | "bl" | "tr" | "tl"

const GREETING = "สวัสดีค่ะ หนูคือผู้ช่วย Comp Active 🙋‍♂️ มีคำถามเกี่ยวกับการใช้งานเว็บไซต์ ถามได้เลยนะคะ"
/** ส่งให้ backend ไม่เกินนี้ต่อครั้ง (ต้องไม่เกิน ArrayMaxSize(20) ฝั่ง DTO) กันบทสนทนายาวจนกิน token/ค่าใช้จ่ายเกินจำเป็น */
const MAX_HISTORY_SENT = 20

const EDGE_GAP = 20
const HEADER_CLEARANCE = 84
const AVATAR_W = 192
const AVATAR_H = 240
const DRAG_THRESHOLD = 6

/** ซ่อนแล้วจำไว้ใน localStorage ของเบราว์เซอร์นี้ — ไม่โผล่ซ้ำอีกจนกว่าจะล้างข้อมูลเว็บไซต์ */
const HIDDEN_KEY = "compactive:mascot-hidden"

/**
 * บทสนทนา+สถานะเปิด/ปิดกล่องแชท เก็บใน sessionStorage (ไม่ใช่ localStorage) — คงอยู่ตลอดแท็บนี้
 * (สลับหน้าในแอป, กดรีเฟรช) แต่ไม่ค้างข้ามวันข้ามแท็บเหมือน "ซ่อนมาสคอต" ด้านบน เพราะนี่คือบทสนทนาจริง
 * ไม่ใช่แค่ค่ากำหนดเล็กๆ — ปิดแท็บ/เปิดแท็บใหม่แล้วเริ่มทักทายใหม่ถือเป็นเรื่องที่คาดหวังได้ตามปกติ
 */
const MESSAGES_KEY = "compactive:mascot-messages"
const OPEN_KEY = "compactive:mascot-open"

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
 * มาสคอตลอยที่ลากไปวางมุมไหนของจอก็ได้ มีบับเบิลแชทจริงคุยกับ Gemini API ผ่าน backend proxy
 * (ดู chatbotAPI ใน lib/api.ts — ไม่เรียก Gemini ตรงจาก browser เด็ดขาด ไม่งั้น API key หลุด)
 *
 * mount ที่ app/layout.tsx จุดเดียว (ไม่ใช่ต่อหน้า) จึงเป็น instance เดียวกันทั้งแอปอยู่แล้วโดยธรรมชาติ
 * ของ React — คลิกลิงก์ในแอปไปหน้าไหนก็ไม่ remount ไม่เสีย state (ยืนยันแล้วด้วย headless browser)
 * บทสนทนา+สถานะเปิด/ปิดยังเก็บเพิ่มใน sessionStorage (ดู MESSAGES_KEY/OPEN_KEY) ให้ทนต่อการกดรีเฟรช/เปิด
 * URL ตรงๆ ในแท็บเดิมด้วย ไม่ใช่แค่กรณีคลิกลิงก์ภายใน — หายแค่ตอนปิดแท็บ/เปิดแท็บใหม่ (ตั้งใจ ไม่ใช่ localStorage)
 *
 * หัวบับเบิลมี 2 ปุ่มแยกความหมายกันชัดเจน:
 * - ย่อแชท (ChevronDown) = setOpenPersisted(false) เฉยๆ — ปิดกล่องคุย แต่ตัวมาสคอตยังยืนตัวใหญ่ลอยอยู่เหมือนเดิม
 *   กดที่ตัวมาสคอตอีกทีเพื่อเปิดกล่องคุยกลับมา (ไม่ต้อง "เรียกคืน" จากหัวมาสคอตก่อน)
 * - ซ่อนมาสคอต (X) = hideMascot() ซ่อนทั้งตัว (ทั้งบับเบิลและตัวมาสคอต) เหลือแค่หัวมาสคอตมุมขวาล่าง
 *   และจำไว้ใน localStorage ไม่ให้โผล่ซ้ำอีกจนกว่าจะกดหัวมาสคอตนั้นเรียกคืน
 */
export function MascotWidget() {
    const [open, setOpen] = React.useState(false)
    const [corner, setCorner] = React.useState<Corner>("br")
    const [dragPos, setDragPos] = React.useState<{ x: number; y: number } | null>(null)
    const [mounted, setMounted] = React.useState(false)
    const [hidden, setHidden] = React.useState(false)
    const [messages, setMessages] = React.useState<ChatHistoryItem[]>([{ role: "model", text: GREETING }])
    const [input, setInput] = React.useState("")
    const [sending, setSending] = React.useState(false)
    const draggingRef = React.useRef(false)
    const movedRef = React.useRef(false)
    const startRef = React.useRef({ x: 0, y: 0 })
    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    // โซน student/organizer บนจอแคบ (< lg) มีแถบเมนูล่างติดขอบจอ (BottomNav) อยู่แล้ว — ต้องยกมาสคอต
    // ขึ้นพ้นบาร์นั้น ไม่งั้นทับกัน (ทั้งปุ่มหัวมาสคอตตอนซ่อน และมุม br/bl ตอนแสดงปกติ)
    // ใช้ pathname เช็คได้ตรงนี้ (ต่างจากเช็คแอดมินด้านล่างที่ต้องเช็ค hostname) เพราะ /student, /organizer
    // เป็น route จริงของ Next ไม่ใช่โดเมนที่ proxy.ts รีไรต์แบบแอดมิน
    const pathname = usePathname()
    const isAppPortalRoute = pathname.startsWith("/student") || pathname.startsWith("/organizer")
    const [isBelowLg, setIsBelowLg] = React.useState(false)
    React.useEffect(() => {
        const mq = window.matchMedia("(max-width: 1023px)") // ตรงกับ breakpoint lg ของ Tailwind ที่ BottomNav ใช้ (lg:hidden)
        const update = () => setIsBelowLg(mq.matches)
        update()
        mq.addEventListener("change", update)
        return () => mq.removeEventListener("change", update)
    }, [])
    const clearBottomNav = isAppPortalRoute && isBelowLg

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, [messages, sending])

    async function handleSend(e: React.FormEvent) {
        e.preventDefault()
        const text = input.trim()
        if (!text || sending) return

        const historyToSend = messages.slice(-MAX_HISTORY_SENT)
        setMessages((prev) => [...prev, { role: "user", text }])
        setInput("")
        setSending(true)
        try {
            const { reply } = await chatbotAPI.sendMessage(text, historyToSend)
            setMessages((prev) => [...prev, { role: "model", text: reply }])
        } catch {
            // เงียบไว้ไม่ต้องแจ้ง error แยก — แสดงเป็นข้อความของบอทในบทสนทนาเลย อ่านง่ายกว่าแบนเนอร์ error แยกต่างหาก
            setMessages((prev) => [
                ...prev,
                { role: "model", text: "ขออภัยค่ะ เกิดข้อผิดพลาดชั่วคราว ลองส่งข้อความอีกครั้งนะคะ" },
            ])
        } finally {
            setSending(false)
        }
    }

    React.useEffect(() => {
        try {
            if (localStorage.getItem(HIDDEN_KEY) === "1") setHidden(true)
        } catch {
            // localStorage ใช้ไม่ได้ (private mode ฯลฯ) — ถือว่ายังไม่เคยซ่อน แสดงตามปกติ
        }
    }, [])

    /**
     * ตั้ง open พร้อมจำลง sessionStorage ในจังหวะเดียวกัน — ต้องเป็นฟังก์ชันนี้ทุกจุดที่ต้องการให้ค่า
     * "คงอยู่" ข้ามรีเฟรช ห้ามใช้ setOpen ตรงๆ เด็ดขาดนอกจากตอนคืนค่าตัวเอง (ดู effect ด้านล่าง) เพราะถ้าเขียน
     * sessionStorage ผ่าน useEffect(() => ..., [open]) เฉยๆ จะมี race: มันรันตั้งแต่ mount แรกด้วย
     * ทั้งที่ open ตอนนั้นยังเป็น false ชั่วคราวก่อน timer auto-open จะทำงาน (ยังไม่ใช่ค่าที่ "ตัดสินใจแล้ว")
     * ถ้าเผลอรีเฟรชในช่วง 700ms นั้นพอดี จะอ่านค่า false ชั่วคราวนั้นกลับมาเป็น "ผู้ใช้ปิดเอง" แล้วข้าม timer
     * ไปเลย เปิดไม่ขึ้นอีกตลอดเซสชัน — ต้องเขียนเฉพาะจังหวะที่ "ตัดสินใจแล้วจริงๆ" เท่านั้น
     */
    function setOpenPersisted(value: boolean) {
        setOpen(value)
        try {
            sessionStorage.setItem(OPEN_KEY, value ? "1" : "0")
        } catch {
            // เพิกเฉย — แค่จะไม่ถูกจำไว้ข้ามการรีเฟรชรอบนี้ ไม่กระทบการใช้งานรอบปัจจุบัน
        }
    }

    // คืนค่าบทสนทนา+สถานะเปิด/ปิดจาก sessionStorage ถ้ามี (สลับหน้า/รีเฟรชมาในแท็บเดิม) — ถ้าไม่มีเลย
    // ถือว่าเป็นแท็บใหม่จริงๆ ค่อยเข้า timer auto-open ตามเดิม (ไม่งั้นจะเด้งเปิดทับสถานะที่ผู้ใช้เพิ่งปิดไปเอง)
    React.useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
            const savedMessages = sessionStorage.getItem(MESSAGES_KEY)
            const parsed = savedMessages ? JSON.parse(savedMessages) : null
            if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)

            const savedOpen = sessionStorage.getItem(OPEN_KEY)
            if (savedOpen !== null) {
                setOpen(savedOpen === "1") // แค่คืนค่าที่เพิ่งอ่านมา ไม่ต้องเขียนซ้ำกลับไปเฉยๆ
            } else {
                timer = setTimeout(() => setOpenPersisted(true), 700)
            }
        } catch {
            // sessionStorage ใช้ไม่ได้ (private mode ฯลฯ) — ถือว่าไม่มีค่าบันทึกไว้ เปิดแบบแท็บใหม่ตามปกติ
            timer = setTimeout(() => setOpenPersisted(true), 700)
        }
        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [])

    React.useEffect(() => {
        try {
            sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages))
        } catch {
            // เพิกเฉย — แค่จะไม่ถูกจำไว้ข้ามการรีเฟรชรอบนี้ ไม่กระทบบทสนทนาปัจจุบัน
        }
    }, [messages])

    function hideMascot() {
        setOpenPersisted(false)
        setHidden(true)
        try {
            localStorage.setItem(HIDDEN_KEY, "1")
        } catch {
            // เพิกเฉย — แค่จะกลับมาโชว์อีกรอบตอนโหลดหน้าใหม่ ไม่ใช่ error ที่ต้องแจ้งผู้ใช้
        }
    }

    function showMascot() {
        setHidden(false)
        try {
            localStorage.removeItem(HIDDEN_KEY)
        } catch {
            // เพิกเฉย — ไม่กระทบการกดแสดงครั้งนี้ แค่ค่าที่บันทึกไว้อาจไม่ถูกลบ
        }
    }

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
            setOpenPersisted(!open)
        }
    }

    function handlePointerCancel() {
        draggingRef.current = false
        setDragPos(null)
    }

    const isDragging = dragPos !== null

    // !mounted กันไม่ให้เช็ค localStorage (hidden)/hostname ต่างกันระหว่าง SSR กับไคลเอนต์จนขึ้น
    // hydration mismatch (SSR ไม่มี window ให้เช็ค hostname เลย ต้องรอ client เท่านั้น)
    //
    // แอดมินไม่ต้องมี AI chatbot — เช็คจาก window.location.hostname (โฮสต์จริงที่ browser กำลังคุยด้วย
    // ปลอมไม่ได้) ไม่ใช่ usePathname() แบบที่เคยเป็น เพราะ proxy.ts ใช้ rewrite (ไม่ใช่ redirect) พา
    // "admin.localhost/login" ไป serve จาก app/admin/login แบบโปร่งใสฝั่ง server — usePathname()
    // ฝั่ง client จึงเห็นแค่ "/login" เดิม ไม่มี "/admin" ติดมาด้วยเลย เช็ค startsWith("/admin") แบบเดิม
    // จึงไม่เคยเป็นจริงได้จริงบนโดเมนแอดมินจริง (ดูหมายเหตุที่ lib/admin-host.ts ว่าทำไมเช็คที่นี่
    // แทนที่จะเช็คฝั่ง server ใน app/layout.tsx — เรื่อง static prerendering)
    if (!mounted || isAdminHostname(window.location.hostname.toLowerCase(), PUBLIC_ADMIN_HOSTS)) return null

    // ซ่อนแล้วไม่ใช่หายเกลี้ยงไม่มีทางเรียกคืน — เหลือหัวมาสคอตมุมขวาล่างไว้กดเรียกกลับมา
    // (เดิมเป็นวงกลมขาว 48px ที่ยัดมาสคอตทั้งตัวไว้ 32px จนมองไม่ออกว่าเป็นอะไร) ไม่มีพื้น/กรอบ ใช้เงารองให้เห็นบนพื้นทุกสี
    // ใช้ PNG ที่แปลงจาก mascot_head.svg (Canva ห่อรูป raster ไว้ ไฟล์ 1.5MB และ next/image ย่อ SVG ไม่ได้)
    if (hidden) {
        return (
            <button
                type="button"
                onClick={showMascot}
                aria-label="แสดงผู้ช่วย Comp Active"
                title="ผู้ช่วย Comp Active"
                className={cn(
                    "fixed right-4 z-50 rounded-full transition-transform hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim active:scale-95 sm:right-5",
                    // ค่านี้พิมพ์ตรงๆ (ไม่ได้ต่อ string จาก BOTTOM_NAV_CLEARANCE) เพราะ Tailwind สแกนหา class
                    // จากซอร์สโค้ดตรงๆ ใส่ string ที่ประกอบตอน runtime จะไม่ถูกสแกนเจอ — ต้องแก้คู่กับ
                    // BAR_HEIGHT_PX ใน bottom-nav.tsx เองถ้าความสูงบาร์เปลี่ยน
                    clearBottomNav ? "bottom-[calc(68px+env(safe-area-inset-bottom,0px)+12px)]" : "bottom-4 sm:bottom-5"
                )}
            >
                <Image
                    src="/mascot-head.png"
                    alt=""
                    width={520}
                    height={502}
                    sizes="88px"
                    className="h-[72px] w-auto drop-shadow-[0_8px_14px_rgb(18_34_61/0.35)] sm:h-[84px]"
                    draggable={false}
                />
            </button>
        )
    }

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
                    : // มุมล่าง (br/bl) ชนแถบเมนูล่างพอดีถ้าไม่ยกขึ้น — มุมบน (tr/tl) ใช้ top อยู่แล้ว ไม่กระทบ
                      clearBottomNav && (corner === "br" || corner === "bl")
                      ? { ...CORNER_POSITION[corner], bottom: BOTTOM_NAV_CLEARANCE }
                      : CORNER_POSITION[corner]
            }
        >
            <div
                className={cn(
                    "relative flex w-80 flex-col rounded-2xl border border-border bg-bg shadow-lg transition-all duration-300 sm:w-96",
                    CORNER_ORIGIN[corner],
                    CORNER_NOTCH[corner],
                    open && !isDragging
                        ? "translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none translate-y-2 scale-95 opacity-0"
                )}
            >
                <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-fg">ผู้ช่วย Comp Active</p>
                        <p className="text-xs text-fg-subtle">ตอบโดย AI อัตโนมัติ — คำถามเฉพาะบัญชีให้ติดต่อผู้จัด/ผู้ดูแลระบบแทน</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setOpenPersisted(false)}
                            aria-label="ย่อแชท (มาสคอตยังอยู่)"
                            title="ย่อแชท"
                            className="flex size-7 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                        >
                            <ChevronDown className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={hideMascot}
                            aria-label="ซ่อนมาสคอต"
                            title="ซ่อนมาสคอต"
                            className="flex size-7 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto px-4 py-3">
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={cn(
                                "max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed",
                                m.role === "user"
                                    ? "self-end bg-brand-600 text-white"
                                    : "self-start bg-surface text-fg"
                            )}
                        >
                            {m.text}
                        </div>
                    ))}
                    {sending && (
                        <div className="flex size-8 items-center justify-center self-start rounded-xl bg-surface text-fg-subtle">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="flex shrink-0 gap-2 border-t border-border p-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="พิมพ์คำถาม..."
                        maxLength={2000}
                        disabled={sending}
                        className="h-9 flex-1 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-500 focus:outline-none disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        aria-label="ส่งข้อความ"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send className="size-4" aria-hidden="true" />
                    </button>
                </form>
            </div>

            <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                aria-label={open ? "ปิดแชทผู้ช่วย (ลากเพื่อย้ายตำแหน่ง)" : "เปิดแชทผู้ช่วย (ลากเพื่อย้ายตำแหน่ง)"}
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
