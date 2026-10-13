"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, ChevronDown, ChevronRight, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { chatbotAPI } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { PUBLIC_ADMIN_HOSTS, isAdminHostname } from "@/lib/admin-host"
import { chatbotFaqs, faqsToShow, toHistoryItem, type ChatFaq, type ChatMessage } from "@/lib/chatbot-faq"
import { BOTTOM_NAV_CLEARANCE } from "@/components/layout/bottom-nav"

type Corner = "br" | "bl" | "tr" | "tl"

const GREETING = "สวัสดีค่ะ หนูคือผู้ช่วย Comp Active มีคำถามเกี่ยวกับการใช้งานเว็บไซต์ ถามได้เลยนะคะ"
/** ส่งให้ backend ไม่เกินนี้ต่อครั้ง (ต้องไม่เกิน ArrayMaxSize(20) ฝั่ง DTO) กันบทสนทนายาวจนกิน token/ค่าใช้จ่ายเกินจำเป็น */
const MAX_HISTORY_SENT = 20

const EDGE_GAP = 20
const HEADER_CLEARANCE = 84
const LAUNCHER_SIZE = 64
const DRAG_THRESHOLD = 6

/**
 * ความสูงกล่องแชท — สูงคงที่ (ไม่หดตามเนื้อหา) แต่ไม่เกินจอ: 260px เผื่อทั้งหัวเว็บ ปุ่มเปิดแชท และแถบเมนูล่างมือถือ
 * (กรณีแย่สุด = มุมล่างบนจอแคบในโซน student/organizer) จอเตี้ยอย่าง iPhone SE ยังเหลือกล่อง ~400px
 */
const PANEL_HEIGHT = "min(560px, calc(100dvh - 260px - env(safe-area-inset-bottom, 0px)))"

/**
 * กด "ปิด" (X) ที่หัวกล่องแล้วจำไว้ใน localStorage — ไม่เด้งเปิดเองในแท็บใหม่อีก (ปุ่มเปิดแชทยังอยู่ กดเปิดเองได้ตลอด)
 * ชื่อ key เป็นของเดิมสมัยที่ X แปลว่า "ซ่อนมาสคอตทั้งตัว" — คงไว้ ผู้ที่เคยซ่อนไว้จะได้ไม่โดนเด้งเปิดใส่หลังอัปเดต
 */
const NO_AUTO_OPEN_KEY = "compactive:mascot-hidden"

/**
 * บทสนทนา+สถานะเปิด/ปิดกล่องแชท เก็บใน sessionStorage (ไม่ใช่ localStorage) — คงอยู่ตลอดแท็บนี้
 * (สลับหน้าในแอป, กดรีเฟรช) แต่ไม่ค้างข้ามวันข้ามแท็บ เพราะนี่คือบทสนทนาจริง ไม่ใช่แค่ค่ากำหนดเล็กๆ —
 * ปิดแท็บ/เปิดแท็บใหม่แล้วเริ่มทักทายใหม่ถือเป็นเรื่องที่คาดหวังได้ตามปกติ
 */
const MESSAGES_KEY = "compactive:mascot-messages"
const OPEN_KEY = "compactive:mascot-open"

const CORNER_POSITION: Record<Corner, React.CSSProperties> = {
    br: { bottom: EDGE_GAP, right: EDGE_GAP },
    bl: { bottom: EDGE_GAP, left: EDGE_GAP },
    tr: { top: HEADER_CLEARANCE, right: EDGE_GAP },
    tl: { top: HEADER_CLEARANCE, left: EDGE_GAP },
}

/** ทิศทางวางกล่องแชทเทียบกับปุ่มเปิด — มุมบนวางกล่องไว้ใต้ปุ่มแทน */
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

/** ปุ่มบนหัวกล่อง (พื้นยีนส์) — วงโฟกัสอำพันได้ เพราะอยู่บนพื้นเข้ม */
const HEADER_BUTTON =
    "grid size-9 place-items-center rounded-[10px] bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"

/** อวตารมาสคอต — ใช้ sizes เดียวกันทุกจุด เบราว์เซอร์จะเลือกไฟล์ขนาดเดียวกัน โหลดครั้งเดียว (นับรวม request budget) */
function MascotAvatar({ className }: { className?: string }) {
    return (
        <span className={cn("relative block shrink-0 overflow-hidden", className)}>
            <Image src="/mascot-wave.png" alt="" fill sizes="48px" className="object-cover object-top" draggable={false} />
        </span>
    )
}

/**
 * แชทผู้ช่วย (ธีม Denim Varsity) — ปุ่มเปิดสี่เหลี่ยมมุมมนลากไปวางมุมไหนของจอก็ได้ กล่องแชทคุยกับ Gemini API
 * ผ่าน backend proxy (ดู chatbotAPI ใน lib/api.ts — ไม่เรียก Gemini ตรงจาก browser เด็ดขาด ไม่งั้น API key หลุด)
 * ส่วน "คำถามที่พบบ่อย" ตอบด้วยข้อความสำเร็จรูปใน lib/chatbot-faq.ts ไม่ได้ไปถาม AI (ดูเหตุผลที่นั่น)
 *
 * mount ที่ app/layout.tsx จุดเดียว (ไม่ใช่ต่อหน้า) จึงเป็น instance เดียวกันทั้งแอปอยู่แล้วโดยธรรมชาติ
 * ของ React — คลิกลิงก์ในแอปไปหน้าไหนก็ไม่ remount ไม่เสีย state (ยืนยันแล้วด้วย headless browser)
 *
 * หัวกล่องมี 2 ปุ่มแยกความหมายกัน:
 * - ย่อแชท (ChevronDown) = ปิดกล่องในแท็บนี้เฉยๆ แท็บใหม่ครั้งหน้ายังเด้งเปิดเองตามปกติ (จอกว้างเท่านั้น)
 * - ปิด (X) = ปิดกล่อง + จำไว้ว่าไม่ต้องเด้งเปิดเองอีก (NO_AUTO_OPEN_KEY) ปุ่มเปิดแชทยังอยู่ให้กดเองได้
 */
export function MascotWidget() {
    const { user } = useAuth()
    const [open, setOpen] = React.useState(false)
    const [corner, setCorner] = React.useState<Corner>("br")
    const [dragPos, setDragPos] = React.useState<{ x: number; y: number } | null>(null)
    const [mounted, setMounted] = React.useState(false)
    const [messages, setMessages] = React.useState<ChatMessage[]>([{ role: "model", text: GREETING }])
    const [input, setInput] = React.useState("")
    const [sending, setSending] = React.useState(false)
    const draggingRef = React.useRef(false)
    const movedRef = React.useRef(false)
    /** pointerup หลังลากแล้วจะตามด้วย click เสมอ — กันไม่ให้ click นั้นไปสลับเปิด/ปิดกล่อง */
    const suppressClickRef = React.useRef(false)
    const startRef = React.useRef({ x: 0, y: 0 })
    const logRef = React.useRef<HTMLDivElement>(null)
    const launcherRef = React.useRef<HTMLButtonElement>(null)

    // โซน student/organizer บนจอแคบ (< lg) มีแถบเมนูล่างติดขอบจอ (BottomNav หรือ MobileActionBar) อยู่แล้ว
    // ต้องยกปุ่มเปิดแชท (และกล่องที่เกาะอยู่) ขึ้นพ้นบาร์นั้นตอนอยู่มุมล่าง ไม่งั้นทับกัน
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

    const faqs = chatbotFaqs(user?.role)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    // เลื่อนให้คำถามล่าสุดของผู้ใช้อยู่บนสุดของกล่อง (ไม่ใช่ลงล่างสุด) — คำตอบยาวๆ + ปุ่มคำถามต่อท้าย
    // ถ้าเลื่อนลงล่างสุด ต้นคำตอบจะหลุดขอบบนจนต้องเลื่อนกลับขึ้นไปอ่าน ยังไม่ถามอะไรเลย = อยู่บนสุด (เห็นคำทักทาย)
    // ตั้ง scrollTop ตรงๆ ไม่ใช้ scrollIntoView — ตัวนั้นเลื่อนบรรพบุรุษทุกชั้นรวมถึงหน้าเว็บ หน้าที่อ่านอยู่จะกระโดดตาม
    React.useEffect(() => {
        const log = logRef.current
        if (!log) return
        const questions = log.querySelectorAll<HTMLElement>("[data-chat-role=user]")
        const latest = questions[questions.length - 1]
        log.scrollTop = latest ? log.scrollTop + latest.getBoundingClientRect().top - log.getBoundingClientRect().top - 12 : 0
    }, [messages, sending, open])

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

    /**
     * เด้งเปิดเองเฉพาะแท็บใหม่บนจอ ≥ 640px และยังไม่เคยกด X — บนมือถือกล่องกว้างเกือบเต็มจอ
     * เด้งเปิดทุกแท็บใหม่จะบังเนื้อหาจนใช้งานหน้าไม่ได้ ให้กดปุ่มเปิดเองแทน
     */
    function shouldAutoOpen(): boolean {
        try {
            if (localStorage.getItem(NO_AUTO_OPEN_KEY) === "1") return false
        } catch {
            // localStorage ใช้ไม่ได้ (private mode ฯลฯ) — ถือว่ายังไม่เคยกดปิด
        }
        return window.matchMedia("(min-width: 640px)").matches
    }

    // คืนค่าบทสนทนา+สถานะเปิด/ปิดจาก sessionStorage ถ้ามี (สลับหน้า/รีเฟรชมาในแท็บเดิม) — ถ้าไม่มีเลย
    // ถือว่าเป็นแท็บใหม่จริงๆ ค่อยเข้า timer auto-open (ไม่งั้นจะเด้งเปิดทับสถานะที่ผู้ใช้เพิ่งปิดไปเอง)
    React.useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
            const savedMessages = sessionStorage.getItem(MESSAGES_KEY)
            const parsed = savedMessages ? JSON.parse(savedMessages) : null
            if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)

            const savedOpen = sessionStorage.getItem(OPEN_KEY)
            if (savedOpen !== null) {
                setOpen(savedOpen === "1") // แค่คืนค่าที่เพิ่งอ่านมา ไม่ต้องเขียนซ้ำกลับไปเฉยๆ
            } else if (shouldAutoOpen()) {
                timer = setTimeout(() => setOpenPersisted(true), 700)
            }
        } catch {
            // sessionStorage ใช้ไม่ได้ (private mode ฯลฯ) — ถือว่าไม่มีค่าบันทึกไว้ เปิดแบบแท็บใหม่ตามปกติ
            if (shouldAutoOpen()) timer = setTimeout(() => setOpenPersisted(true), 700)
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

    async function handleSend(e: React.FormEvent) {
        e.preventDefault()
        const text = input.trim()
        if (!text || sending) return

        // ส่งแค่ role/text — DTO ฝั่ง backend ตีกลับทั้งคำขอถ้ามี field เกิน (link/faqId ของคำตอบสำเร็จรูป)
        const historyToSend = messages.slice(-MAX_HISTORY_SENT).map(toHistoryItem)
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

    /** คำถามที่พบบ่อย — ตอบทันทีด้วยข้อความสำเร็จรูป ไม่เรียก API */
    function askFaq(faq: ChatFaq) {
        if (sending) return
        setMessages((prev) => [
            ...prev,
            { role: "user", text: faq.question },
            { role: "model", text: faq.answer, link: faq.link, faqId: faq.id },
        ])
    }

    function minimize() {
        setOpenPersisted(false)
        launcherRef.current?.focus()
    }

    function dismiss() {
        minimize()
        try {
            localStorage.setItem(NO_AUTO_OPEN_KEY, "1")
        } catch {
            // เพิกเฉย — แค่แท็บใหม่ครั้งหน้าอาจเด้งเปิดอีกรอบ ไม่ใช่ error ที่ต้องแจ้งผู้ใช้
        }
    }

    /** กดลิงก์ในคำตอบบนจอแคบ — ย่อกล่องให้เห็นหน้าที่เพิ่งไป (กล่องกว้างเกือบเต็มจอ บังหน้านั้นหมด) */
    function handleAnswerLink() {
        if (window.matchMedia("(max-width: 639px)").matches) setOpenPersisted(false)
    }

    // ลากปุ่มเปิดแชทไปมุมอื่นได้ — เข้าโหมดลากเมื่อขยับเกิน DRAG_THRESHOLD เท่านั้น แตะเฉยๆ ปุ่มไม่กระโดด
    function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        e.currentTarget.setPointerCapture(e.pointerId)
        draggingRef.current = true
        movedRef.current = false
        startRef.current = { x: e.clientX, y: e.clientY }
    }

    function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
        if (!draggingRef.current) return
        const dx = e.clientX - startRef.current.x
        const dy = e.clientY - startRef.current.y
        if (!movedRef.current && Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return
        movedRef.current = true
        setDragPos({ x: e.clientX, y: e.clientY })
    }

    function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
        if (!draggingRef.current) return
        draggingRef.current = false
        setDragPos(null)
        if (movedRef.current) {
            suppressClickRef.current = true
            const isLeft = e.clientX < window.innerWidth / 2
            const isTop = e.clientY < window.innerHeight / 2
            setCorner(isTop ? (isLeft ? "tl" : "tr") : isLeft ? "bl" : "br")
        }
    }

    function handlePointerCancel() {
        draggingRef.current = false
        setDragPos(null)
    }

    // สลับเปิด/ปิดผ่าน onClick (ไม่ใช่ pointerup) — กด Enter/Space บนคีย์บอร์ดไม่มี pointer event
    // เดิมสลับใน pointerup อย่างเดียว ผู้ใช้คีย์บอร์ดจึงเปิดแชทไม่ได้เลย
    function handleLauncherClick() {
        if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
        }
        setOpenPersisted(!open)
    }

    const isDragging = dragPos !== null
    const showPanel = open && !isDragging

    // !mounted กันไม่ให้เช็ค sessionStorage/hostname ต่างกันระหว่าง SSR กับไคลเอนต์จนขึ้น
    // hydration mismatch (SSR ไม่มี window ให้เช็ค hostname เลย ต้องรอ client เท่านั้น)
    //
    // แอดมินไม่ต้องมี AI chatbot — เช็คจาก window.location.hostname (โฮสต์จริงที่ browser กำลังคุยด้วย
    // ปลอมไม่ได้) ไม่ใช่ usePathname() แบบที่เคยเป็น เพราะ proxy.ts ใช้ rewrite (ไม่ใช่ redirect) พา
    // "admin.localhost/login" ไป serve จาก app/admin/login แบบโปร่งใสฝั่ง server — usePathname()
    // ฝั่ง client จึงเห็นแค่ "/login" เดิม ไม่มี "/admin" ติดมาด้วยเลย เช็ค startsWith("/admin") แบบเดิม
    // จึงไม่เคยเป็นจริงได้จริงบนโดเมนแอดมินจริง (ดูหมายเหตุที่ lib/admin-host.ts ว่าทำไมเช็คที่นี่
    // แทนที่จะเช็คฝั่ง server ใน app/layout.tsx — เรื่อง static prerendering)
    if (!mounted || isAdminHostname(window.location.hostname.toLowerCase(), PUBLIC_ADMIN_HOSTS)) return null

    const visibleFaqs = faqsToShow(faqs, messages)

    return (
        // pointer-events-none ที่กรอบนอก: กล่องแชทตอนปิดแค่โปร่งใส ยังกินพื้นที่อยู่ — เดิมพื้นที่ว่างนั้นบังการคลิก
        // เนื้อหาหน้าเว็บด้านหลังไปด้วย เปิดรับคลิกเฉพาะกล่องตอนเปิดและปุ่มเปิดแชท
        <div
            className={cn("pointer-events-none fixed z-50 flex gap-3", CORNER_LAYOUT[corner])}
            style={
                isDragging && dragPos
                    ? { left: dragPos.x - LAUNCHER_SIZE / 2, top: dragPos.y - LAUNCHER_SIZE / 2 }
                    : // มุมล่าง (br/bl) ชนแถบเมนูล่างพอดีถ้าไม่ยกขึ้น — มุมบน (tr/tl) ใช้ top อยู่แล้ว ไม่กระทบ
                      clearBottomNav && (corner === "br" || corner === "bl")
                      ? { ...CORNER_POSITION[corner], bottom: BOTTOM_NAV_CLEARANCE }
                      : CORNER_POSITION[corner]
            }
        >
            {/* inert ตอนปิด: กล่องแค่โปร่งใส ไม่ใส่ไว้ Tab จะยังโฟกัสช่องพิมพ์/ปุ่มที่มองไม่เห็นได้ */}
            <section
                aria-labelledby="chat-assistant-title"
                inert={!showPanel}
                onKeyDown={(e) => {
                    if (e.key === "Escape") minimize()
                }}
                style={{ height: PANEL_HEIGHT }}
                className={cn(
                    "flex w-[calc(100vw-40px)] flex-col overflow-hidden rounded-[28px] border border-denim-line bg-denim-paper font-plex shadow-[0_28px_60px_-24px_rgb(18_34_61/0.6)] transition-[opacity,transform] duration-300 sm:w-[380px]",
                    CORNER_ORIGIN[corner],
                    // ระหว่างลาก เอากล่องออกจาก layout — กรอบนอกเหลือแค่ปุ่ม ตำแหน่งปุ่มจะตรงนิ้วพอดี
                    isDragging && "hidden",
                    showPanel ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
                )}
            >
                <header className="denim-weave flex shrink-0 items-center gap-2.5 border-b-2 border-dashed border-amber/60 px-3.5 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
                    <span className="relative shrink-0">
                        <MascotAvatar className="size-11 rounded-[13px] bg-amber shadow-[0_3px_0_var(--color-amber-deep)] sm:size-12 sm:rounded-[14px]" />
                        <span
                            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-denim bg-emerald-400"
                            aria-hidden="true"
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id="chat-assistant-title" className="truncate font-display text-base font-bold leading-tight text-white sm:text-lg">
                            ผู้ช่วย Comp Active
                        </h2>
                        <p className="truncate font-code text-[11px] text-denim-on-soft sm:text-xs">online · ตอบโดย AI อัตโนมัติ</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5 sm:gap-2">
                        <button type="button" onClick={minimize} aria-label="ย่อแชท" title="ย่อแชท" className={HEADER_BUTTON}>
                            <ChevronDown className="size-[18px]" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={dismiss}
                            aria-label="ปิดแชท และไม่ต้องเปิดขึ้นมาเองอีก"
                            title="ปิด (ไม่เปิดขึ้นมาเองอีก)"
                            className={HEADER_BUTTON}
                        >
                            <X className="size-[18px]" aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <div
                    ref={logRef}
                    role="log"
                    aria-label="บทสนทนา"
                    className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
                >
                    <p className="text-center font-code text-xs text-denim-muted" aria-hidden="true">
                        — วันนี้ —
                    </p>

                    {messages.map((m, i) =>
                        m.role === "user" ? (
                            <p
                                key={i}
                                data-chat-role="user"
                                className="max-w-[80%] self-end whitespace-pre-line rounded-2xl rounded-br-md bg-denim-deep px-4 py-2.5 text-[15px] leading-relaxed text-white"
                            >
                                {m.text}
                            </p>
                        ) : (
                            <div key={i} className="flex items-end gap-2">
                                <MascotAvatar className="size-8 rounded-full border border-denim-line bg-white" />
                                <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-denim-line bg-white px-4 py-3 text-[15px] leading-relaxed text-denim-deep">
                                    <p className="whitespace-pre-line">{m.text}</p>
                                    {m.link && (
                                        <Link
                                            href={m.link.href}
                                            onClick={handleAnswerLink}
                                            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-denim-chip px-3.5 text-[13px] font-semibold text-denim-deep transition-colors hover:bg-denim-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
                                        >
                                            {m.link.label}
                                            <ArrowRight className="size-3.5" aria-hidden="true" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {sending && (
                        <div className="flex items-end gap-2" aria-label="ผู้ช่วยกำลังพิมพ์">
                            <MascotAvatar className="size-8 rounded-full border border-denim-line bg-white" />
                            <span className="flex gap-1 rounded-2xl rounded-bl-md border border-denim-line bg-white px-4 py-4">
                                {[0, 150, 300].map((delay) => (
                                    <span
                                        key={delay}
                                        className="size-2 animate-bounce rounded-full bg-denim-muted motion-reduce:animate-none"
                                        style={{ animationDelay: `${delay}ms` }}
                                        aria-hidden="true"
                                    />
                                ))}
                            </span>
                        </div>
                    )}

                    {!sending && visibleFaqs.length > 0 && (
                        <div className="flex flex-col gap-2 pl-10">
                            <p className="text-xs text-denim-muted">คำถามที่พบบ่อย</p>
                            {visibleFaqs.map((faq) => (
                                <button
                                    key={faq.id}
                                    type="button"
                                    onClick={() => askFaq(faq)}
                                    className="flex min-h-11 items-center gap-2.5 rounded-xl border-[1.5px] border-denim-line bg-white px-4 py-2 text-left text-sm font-semibold text-denim-deep transition-colors hover:border-denim-dash hover:bg-denim-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"
                                >
                                    <ChevronRight className="size-4 shrink-0 text-amber" aria-hidden="true" />
                                    {faq.question}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSend} className="flex shrink-0 gap-2.5 border-t border-denim-line bg-white p-3">
                    {/* text-base (16px) — ต่ำกว่านี้ Safari บน iPhone จะซูมทั้งหน้าตอนแตะช่องพิมพ์ */}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="พิมพ์คำถาม..."
                        aria-label="พิมพ์คำถาม"
                        maxLength={2000}
                        disabled={sending}
                        className="h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-denim-field bg-white px-4 text-base text-denim-deep placeholder:text-denim-muted/70 hover:border-denim-dash focus:border-denim focus:outline-none disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        aria-label="ส่งข้อความ"
                        className="grid size-12 shrink-0 place-items-center rounded-xl bg-denim-deep text-white transition-colors hover:bg-denim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim disabled:cursor-not-allowed disabled:bg-denim-chip disabled:text-denim-muted"
                    >
                        <Send className="size-5" aria-hidden="true" />
                    </button>
                </form>
            </section>

            <button
                ref={launcherRef}
                type="button"
                onClick={handleLauncherClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                aria-expanded={open}
                aria-label={open ? "ปิดแชทผู้ช่วย" : "เปิดแชทผู้ช่วย Comp Active"}
                title="ลากเพื่อย้ายไปมุมอื่นได้"
                className="denim-weave pointer-events-auto relative grid size-16 shrink-0 cursor-grab touch-none place-items-center rounded-[18px] border-2 border-amber text-white shadow-[0_14px_30px_-10px_rgb(18_34_61/0.65)] transition-transform hover:-translate-y-0.5 active:scale-95 active:cursor-grabbing focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
                {open ? (
                    <X className="size-7" strokeWidth={2.5} aria-hidden="true" />
                ) : (
                    <>
                        <Image
                            src="/mascot-head.png"
                            alt=""
                            width={520}
                            height={502}
                            sizes="56px"
                            className="pointer-events-none h-[50px] w-auto"
                            draggable={false}
                        />
                        <span
                            className="absolute -right-1 -top-1 size-3.5 rounded-full border-2 border-white bg-emerald-400"
                            aria-hidden="true"
                        />
                    </>
                )}
            </button>
        </div>
    )
}
