"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
<<<<<<< HEAD
import {
    ArrowRight,
    CalendarPlus,
    Check,
    ChevronDown,
    GraduationCap,
    ShieldCheck,
    Sparkles,
    Target,
    type LucideIcon,
} from "lucide-react"
import { Container } from "@/components/layout/container"
=======
import { ArrowRight, CalendarPlus, Check, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react"
import { Container } from "@/components/layout/container"
import { AMBER_BUTTON, DenimHero, DenimSectionHeading, TerminalPrompt } from "@/components/denim/denim-ui"
>>>>>>> organize
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { cn } from "@/lib/utils"

/** สาขาวิชา — ภาพปกเป็นภาพประจำสาขา (public/*.png) ป้ายสั้นมุมซ้ายบนตามดีไซน์ */
const PROGRAMS = [
    { tag: "CS", th: "วิทยาการคอมพิวเตอร์", en: "Computer Science", src: "/cs.png" },
    { tag: "IT", th: "เทคโนโลยีสารสนเทศ", en: "Information Technology", src: "/it.png" },
    { tag: "GIS", th: "ภูมิสารสนเทศศาสตร์", en: "Geoinformatics", src: "/gis.png" },
    { tag: "CYBER", th: "ความมั่นคงปลอดภัยไซเบอร์", en: "Cybersecurity", src: "/cy.png" },
    { tag: "AI", th: "ปัญญาประดิษฐ์", en: "Artificial Intelligence", src: "/ai.png" },
]

type Role = "student" | "organizer" | "admin"

/** ความสามารถของระบบแยกตามบทบาท — ให้ตรงกับฟีเจอร์ที่มีอยู่จริงเท่านั้น */
const ROLES: { role: Role; icon: LucideIcon; title: string; items: string[] }[] = [
    {
        role: "student",
        icon: GraduationCap,
        title: "นักศึกษา",
        items: [
            "ค้นหาและลงทะเบียนเข้าร่วมกิจกรรม",
            "สะสมคะแนน Soft Skills 12 ด้านจากการเข้าร่วมกิจกรรม",
            "ติดตามผลการประเมินและความก้าวหน้าของตนเอง",
        ],
    },
    {
        role: "organizer",
        icon: CalendarPlus,
        title: "ผู้จัดกิจกรรม",
        items: [
            "สร้างกิจกรรมและกำหนดทักษะที่ผู้เข้าร่วมจะได้รับ",
            "ตรวจสอบรายชื่อและเช็กอินผู้เข้าร่วม",
            "ประเมินผลและดูสรุปความคิดเห็นของกิจกรรม",
        ],
    },
    {
        role: "admin",
        icon: ShieldCheck,
        title: "ผู้ดูแลระบบ",
        items: ["อนุมัติและจัดการบัญชีผู้จัดกิจกรรม", "จัดการเนื้อหาหน้าแรกของระบบ", "ดูภาพรวมและสถิติการใช้งาน"],
    },
]

<<<<<<< HEAD
/** เส้นทางการเติบโตในส่วน "เป้าหมายของเรา" */
const JOURNEY = ["นักศึกษา", "กิจกรรม", "การเรียนรู้", "การพัฒนาทักษะ"]

/**
 * เลื่อนลงมาถึงแล้วค่อยค่อยๆ ปรากฏ — ใช้ IntersectionObserver ครั้งเดียวต่อ element
 * ถ้าผู้ใช้ตั้งลดการเคลื่อนไหว (prefers-reduced-motion) จะแสดงทันทีผ่านคลาส motion-reduce
 */
function useInView<T extends HTMLElement>(threshold = 0.15) {
    const ref = useRef<T>(null)
    const [inView, setInView] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        if (typeof IntersectionObserver === "undefined") {
            const id = requestAnimationFrame(() => setInView(true))
            return () => cancelAnimationFrame(id)
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    io.disconnect()
                }
            },
            { threshold }
        )
        io.observe(el)
        return () => io.disconnect()
    }, [threshold])
    return { ref, inView }
}

function Reveal({
    children,
    delay = 0,
    className,
}: {
    children: React.ReactNode
    delay?: number
    className?: string
}) {
    const { ref, inView } = useInView<HTMLDivElement>()
    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={cn(
                "transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
                inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
                className
            )}
        >
            {children}
        </div>
    )
}

/** ตัวเลขนับขึ้นเมื่อเลื่อนมาถึง */
function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
    const { ref, inView } = useInView<HTMLSpanElement>(0.5)
    const [value, setValue] = useState(0)
    useEffect(() => {
        if (!inView) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const ms = reduced ? 0 : duration
        let raf = 0
        let start: number | null = null
        const tick = (now: number) => {
            if (start === null) start = now
            const t = ms === 0 ? 1 : Math.min(1, (now - start) / ms)
            setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
            if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [inView, to, duration])
    return (
        <span ref={ref} className="tabular-nums">
            {value}
        </span>
    )
}

function SectionTitle({
    eyebrow,
    title,
    description,
    align = "left",
}: {
    eyebrow: string
    title: string
    description?: string
    align?: "left" | "center"
}) {
    return (
        <Reveal className={cn(align === "center" && "mx-auto max-w-2xl text-center")}>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                <span className="size-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                {eyebrow}
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h2>
            {description && <p className="mt-2 text-base text-fg-muted">{description}</p>}
        </Reveal>
    )
}

/** ปุ่มหลักแบบแคปซูล — ลูกศรสไลด์ ยกขึ้นตอนชี้ ยุบตอนกด */
function PrimaryLink({ href, children, inverted = false }: { href: string; children: React.ReactNode; inverted?: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-base font-bold shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95",
                inverted
                    ? "bg-white text-brand-700 shadow-brand-900/20 hover:bg-brand-50"
                    : "bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700"
            )}
        >
            {children}
            <span
                className={cn(
                    "relative flex size-9 items-center justify-center overflow-hidden rounded-full transition-colors duration-300",
                    inverted ? "bg-brand-600 text-white" : "bg-white text-brand-600"
                )}
            >
                <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-9" aria-hidden="true" />
                <ArrowRight className="absolute size-4 -translate-x-9 transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
            </span>
        </Link>
    )
}
=======
/** บรรทัดในการ์ดเทอร์มินัล "--mission" */
const MISSION = [
    { cmd: "learn", text: "เรียนรู้" },
    { cmd: "explore", text: "ค้นหาตัวเอง" },
    { cmd: "grow", text: "เติบโตไปด้วยกัน" },
]

const pad = (n: number) => String(n).padStart(2, "0")
>>>>>>> organize

interface AboutSectionsProps {
    /** ปลายทางของปุ่ม "ดูกิจกรรม" — แต่ละพอร์ทัล (public/student/organizer) มีหน้ากิจกรรมของตัวเอง */
    eventsHref?: string
<<<<<<< HEAD
    /** ข้อความปุ่มหลัก — ผู้จัดกิจกรรมไปหน้าจัดการกิจกรรม ไม่ใช่ "ดูกิจกรรม" */
    eventsLabel?: string
=======
    /** การ์ดบทบาทที่เน้น (พื้นยีนส์) — บทบาทของผู้ที่กำลังดู ตามดีไซน์ที่เน้นการ์ดของพอร์ทัลนั้น */
    highlightRole?: Role
>>>>>>> organize
}

/**
 * เนื้อหาหน้า "เกี่ยวกับเรา" (ธีม Denim Varsity) — ใช้ร่วมกันทั้ง public (/about), student (/student/about)
 * และ organizer (/organizer/about) เพื่อให้ทั้งสามหน้าตรงกันเสมอ ไม่ต้องแก้ 3 ที่
 * ไม่รวม header/footer — แต่ละหน้าห่อด้วย chrome ของตัวเอง (SiteHeader/AppHeader ต่างกัน)
<<<<<<< HEAD
 * โมชั่นทั้งหมดหยุดเมื่อผู้ใช้ตั้ง prefers-reduced-motion
 */
export function AboutSections({ eventsHref = "/events", eventsLabel = "ดูกิจกรรม" }: AboutSectionsProps) {
    function scrollToFeatures(e: React.MouseEvent) {
        e.preventDefault()
        document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    return (
        <>
            {/* ── ส่วนหัว ─────────────────────────────────────────────────────── */}
            <section className="relative isolate overflow-hidden border-b border-border bg-surface">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                    <div className="ph-float absolute -left-24 -top-24 size-96 rounded-full bg-brand-200/50 blur-3xl" />
                    <div className="ph-float ph-delay-2 absolute -bottom-32 right-0 size-[28rem] rounded-full bg-brand-100/70 blur-3xl" />
                    <div
                        className="absolute inset-0 opacity-[0.35]"
                        style={{
                            backgroundImage: "radial-gradient(rgb(43 108 176 / 0.18) 1px, transparent 1px)",
                            backgroundSize: "24px 24px",
                            maskImage: "radial-gradient(ellipse 70% 70% at 50% 40%, black, transparent)",
                            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 40%, black, transparent)",
                        }}
                    />
                </div>

                <Container className="grid items-center gap-12 py-14 lg:grid-cols-2 lg:gap-16 lg:py-24">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-bg/80 px-3.5 py-1.5 text-sm font-semibold text-brand-700 shadow-xs backdrop-blur motion-safe:animate-rise-in">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full rounded-full bg-brand-400 opacity-75 motion-safe:animate-ping" />
                                <span className="relative inline-flex size-2 rounded-full bg-brand-600" />
                            </span>
                            เกี่ยวกับเรา
                        </span>
                        <h1
                            style={{ animationDelay: "90ms" }}
                            className="mt-5 text-4xl font-bold leading-tight tracking-tight text-fg motion-safe:animate-rise-in sm:text-5xl"
                        >
                            เกี่ยวกับ{" "}
                            <span className="bg-linear-to-r from-brand-700 via-brand-500 to-brand-600 bg-clip-text text-transparent">
                                Comp Active
                            </span>
                        </h1>
                        <p
                            style={{ animationDelay: "180ms" }}
                            className="mt-5 max-w-xl text-lg leading-relaxed text-fg-muted motion-safe:animate-rise-in"
                        >
                            ระบบบริหารกิจกรรมและติดตามทักษะ Soft Skills ของนักศึกษา
                            วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
                        </p>
                        <div
                            style={{ animationDelay: "270ms" }}
                            className="mt-8 flex flex-wrap items-center gap-4 motion-safe:animate-rise-in"
                        >
                            <PrimaryLink href={eventsHref}>{eventsLabel}</PrimaryLink>
                            <a
                                href="#features"
                                onClick={scrollToFeatures}
                                className="group inline-flex items-center gap-2 rounded-full border border-border bg-bg px-5 py-3 text-base font-semibold text-fg transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-600 hover:text-brand-700 hover:shadow-md active:scale-95"
                            >
                                ดูว่าทำอะไรได้บ้าง
                                <ChevronDown className="size-4 transition-transform duration-300 group-hover:translate-y-1" aria-hidden="true" />
                            </a>
                        </div>
                    </div>

                    <div style={{ animationDelay: "200ms" }} className="relative motion-safe:animate-rise-in">
                        <div className="group relative">
                            <Image
                                src="/college_image.png"
                                alt="วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                                width={1536}
                                height={1024}
                                priority
                                className="h-auto w-full rounded-[32px] border border-border shadow-xl shadow-brand-900/10 transition-transform duration-700 ease-out group-hover:scale-[1.02] group-hover:-rotate-1"
                            />
                            <div className="ph-float absolute -left-3 top-8 flex items-center gap-2.5 rounded-2xl border border-border bg-bg/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:-left-6">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                    <Sparkles className="size-4.5" aria-hidden="true" />
                                </span>
                                <span className="text-sm font-bold text-fg">
                                    {SOFT_SKILLS.length} Soft Skills
                                </span>
                            </div>
                            <div className="ph-float ph-delay-2 absolute -bottom-4 right-4 flex items-center gap-2.5 rounded-2xl border border-border bg-bg/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:-right-4">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-success-bg text-success">
                                    <GraduationCap className="size-4.5" aria-hidden="true" />
                                </span>
                                <span className="text-sm font-bold text-fg">{PROGRAMS.length} สาขาวิชา (ป.ตรี)</span>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ── ตัวเลขสรุป ─────────────────────────────────────────────────── */}
            <section className="bg-bg">
                <Container className="py-12">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                            { to: SOFT_SKILLS.length, label: "ด้านของ Soft Skills ที่ระบบประเมิน", icon: Sparkles },
                            { to: PROGRAMS.length, label: "สาขาวิชาระดับปริญญาตรีในวิทยาลัยการคอมพิวเตอร์", icon: GraduationCap },
                            { to: ROLES.length, label: "บทบาทผู้ใช้งานในระบบ", icon: ShieldCheck },
                        ].map((stat, i) => (
                            <Reveal key={stat.label} delay={i * 100}>
                                <div className="group relative overflow-hidden rounded-[28px] border border-border bg-bg p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                                    <div
                                        aria-hidden="true"
                                        className="absolute -right-8 -top-8 size-28 rounded-full bg-brand-100 opacity-70 transition-transform duration-500 group-hover:scale-150"
                                    />
                                    <stat.icon
                                        className="relative size-6 text-brand-600 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
                                        aria-hidden="true"
                                    />
                                    <p className="relative mt-3 text-4xl font-bold text-fg">
                                        <CountUp to={stat.to} />
                                    </p>
                                    <p className="relative mt-1 text-sm text-fg-muted">{stat.label}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            {/* ── ความเป็นมา ─────────────────────────────────────────────────── */}
            <section className="bg-bg">
                <Container className="pb-16 pt-4">
                    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
                        <SectionTitle eyebrow="ความเป็นมา" title="พื้นที่กลางของชาว College of Computing" />
                        <Reveal delay={120} className="space-y-4 text-base leading-relaxed text-fg-muted">
=======
 */
export function AboutSections({ eventsHref = "/events", highlightRole = "student" }: AboutSectionsProps) {
    return (
        <div className="bg-denim-paper font-plex text-denim-deep">
            <AboutHero eventsHref={eventsHref} />

            {/* ── 01 ความเป็นมา ──────────────────────────────────────────────── */}
            <section aria-labelledby="about-why" className="bg-white">
                <Container className="grid items-center gap-12 py-20 lg:grid-cols-[1.15fr_1fr]">
                    <div className="flex flex-col gap-5">
                        <DenimSectionHeading
                            id="about-why"
                            comment="01 · why we built this"
                            title={
                                <>
                                    พื้นที่กลางของชาว
                                    <br />
                                    College of Computing
                                </>
                            }
                        />
                        <div className="space-y-4 text-[15px] leading-[1.8] text-denim-muted">
>>>>>>> organize
                            <p>
                                เว็บไซต์นี้ถูกสร้างขึ้นเพื่อเป็นพื้นที่กลางสำหรับนักศึกษาสาขาวิทยาการคอมพิวเตอร์
                                ในการเข้าถึงข้อมูลข่าวสาร กิจกรรม และโอกาสในการพัฒนาตนเองได้อย่างสะดวกและเป็นระบบ
                            </p>
                            <p>
                                เราต้องการให้เว็บไซต์แห่งนี้เป็นพื้นที่ที่ช่วยให้นักศึกษาได้เรียนรู้ ค้นหาตัวเอง
                                และเติบโตไปพร้อมกับสังคมของชาว College of Computing
                            </p>
                            <p>
                                ผ่านการรวบรวมกิจกรรมต่าง ๆ ที่ช่วยส่งเสริมทั้งความรู้ทางด้านเทคโนโลยีและทักษะที่จำเป็นต่อการทำงานในอนาคต
                                ไม่ว่าจะเป็นการสื่อสาร การทำงานเป็นทีม การบริหารเวลา การคิดวิเคราะห์ และการปรับตัว
                            </p>
                        </Reveal>
                    </div>
                    <MissionTerminal />
                </Container>
            </section>

<<<<<<< HEAD
            {/* ── ระบบนี้ทำอะไรได้บ้าง ───────────────────────────────────────── */}
            <section id="features" className="scroll-mt-24 border-y border-border bg-surface">
                <Container className="py-16">
                    <SectionTitle
                        align="center"
                        eyebrow="ฟีเจอร์"
                        title="ระบบนี้ทำอะไรได้บ้าง"
                        description="การใช้งานหลักแยกตามบทบาทของผู้ใช้"
                    />
                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        {ROLES.map(({ icon: Icon, title, items }, i) => (
                            <Reveal key={title} delay={i * 110}>
                                <div className="group h-full rounded-[28px] border border-border bg-bg p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lg">
                                    <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                                        <Icon className="size-6" aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-4 text-lg font-bold text-fg">{title}</h3>
                                    <ul className="mt-3 space-y-2.5">
                                        {items.map((item, j) => (
                                            <li
                                                key={item}
                                                style={{ transitionDelay: `${j * 40}ms` }}
                                                className="flex gap-2.5 text-sm leading-relaxed text-fg-muted transition-transform duration-300 group-hover:translate-x-1"
                                            >
                                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                                    <Check className="size-3" aria-hidden="true" />
                                                </span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            {/* ── Soft Skills 12 ด้าน ───────────────────────────────────────── */}
            <section className="bg-bg">
                <Container className="py-16">
                    <SectionTitle
                        eyebrow="Soft Skills"
                        title={`Soft Skills ${SOFT_SKILLS.length} ด้าน`}
                        description="ทักษะที่ระบบใช้ประเมินผลจากการเข้าร่วมกิจกรรม"
                    />
                    <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {SOFT_SKILLS.map((skill, i) => {
                            const Icon = skill.icon
                            return (
                                <li key={skill.value}>
                                    <Reveal delay={(i % 4) * 70} className="h-full">
                                    <div className="group flex h-full items-start gap-3 rounded-2xl border border-border bg-bg p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-md">
                                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                                            <Icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold leading-snug text-fg">{skill.label}</p>
                                            <p className="mt-0.5 text-xs text-fg-subtle">{skill.labelEn}</p>
                                        </div>
                                    </div>
                                    </Reveal>
=======
            {/* ── 02 ระบบนี้ทำอะไรได้บ้าง ────────────────────────────────────── */}
            <section aria-labelledby="about-roles">
                <Container className="flex flex-col gap-8 py-20">
                    <DenimSectionHeading
                        id="about-roles"
                        comment="02 · features by role"
                        title="ระบบนี้ทำอะไรได้บ้าง"
                        description="การใช้งานหลักแยกตามบทบาทของผู้ใช้"
                    />
                    <ul className="grid gap-5 md:grid-cols-3">
                        {ROLES.map(({ role, icon: Icon, title, items }) => {
                            const active = role === highlightRole
                            return (
                                <li
                                    key={role}
                                    className={cn(
                                        "flex flex-col gap-4 rounded-[20px] p-6",
                                        active
                                            ? "denim-weave text-white shadow-[0_18px_40px_-18px_rgb(18_34_61_/_0.6)] md:-translate-y-2"
                                            : "border border-denim-line bg-white"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            className={cn(
                                                "grid size-11 place-items-center rounded-xl",
                                                active ? "bg-amber text-denim-deep" : "bg-denim-chip text-denim"
                                            )}
                                        >
                                            <Icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <span className={cn("font-code text-xs", active ? "text-denim-on-soft" : "text-denim-muted")}>
                                            role: {role}
                                        </span>
                                    </div>
                                    <h3 className={cn("font-display text-xl font-bold", active ? "text-white" : "text-denim-deep")}>
                                        {title}
                                    </h3>
                                    <ul className="flex flex-col gap-2.5">
                                        {items.map((item) => (
                                            <li
                                                key={item}
                                                className={cn("flex gap-2.5 text-sm leading-relaxed", active ? "text-denim-on" : "text-denim-muted")}
                                            >
                                                <Check
                                                    className={cn("mt-0.5 size-4 shrink-0", active ? "text-amber" : "text-denim-accent")}
                                                    aria-hidden="true"
                                                />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
>>>>>>> organize
                                </li>
                            )
                        })}
                    </ul>
                </Container>
            </section>

<<<<<<< HEAD
            {/* ── สาขาวิชา ───────────────────────────────────────────────────── */}
            <section className="border-y border-border bg-surface">
                <Container className="py-16">
                    <SectionTitle
                        eyebrow="สาขาวิชา"
                        title="สาขาวิชาในวิทยาลัยการคอมพิวเตอร์"
                        description={`${PROGRAMS.length} สาขาวิชาระดับปริญญาตรี — ระบบนี้ให้บริการนักศึกษาทั้งวิทยาลัย ทั้งระดับปริญญาตรี โท และเอก`}
                    />
                    <Reveal delay={100}>
                        <ul className="mt-4 flex flex-wrap gap-2" aria-label="ระดับการศึกษาที่ระบบรองรับ">
                            {["ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"].map((level) => (
                                <li
                                    key={level}
                                    className="rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1 text-sm font-semibold text-brand-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 hover:text-white"
                                >
                                    {level}
                                </li>
                            ))}
                        </ul>
                    </Reveal>
                    <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {PROGRAMS.map((program, i) => (
                            <li key={program.src}>
                                <Reveal delay={i * 80}>
                                <div className="group overflow-hidden rounded-[24px] border border-border bg-bg shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg">
                                    <Image
                                        src={program.src}
                                        alt={program.alt}
                                        width={1536}
                                        height={1024}
                                        className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                    />
                                </div>
                                </Reveal>
=======
            {/* ── 03 Soft Skills 12 ด้าน ─────────────────────────────────────── */}
            <section aria-labelledby="about-skills" className="bg-white">
                <Container className="flex flex-col gap-8 py-20">
                    <DenimSectionHeading
                        id="about-skills"
                        comment={`03 · skills[${SOFT_SKILLS.length}]`}
                        title={
                            <>
                                Soft Skills <span className="text-denim-accent">{SOFT_SKILLS.length}</span> ด้าน
                            </>
                        }
                        description="ทักษะที่ระบบใช้ประเมินผลจากการเข้าร่วมกิจกรรม"
                    />
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {SOFT_SKILLS.map((skill, i) => (
                            <li
                                key={skill.value}
                                className="flex items-start gap-3 rounded-[16px] border border-denim-line bg-white p-4 shadow-[0_4px_0_var(--color-denim-line)]"
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-denim-chip text-denim">
                                    <skill.icon className="size-[18px]" aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-display text-sm font-bold leading-snug text-denim-deep">{skill.label}</p>
                                    <p className="mt-1 text-xs leading-snug text-denim-muted">{skill.labelEn}</p>
                                </div>
                                <span className="font-code text-xs text-denim-accent">{pad(i + 1)}</span>
>>>>>>> organize
                            </li>
                        ))}
                    </ul>
                </Container>
            </section>

<<<<<<< HEAD
            {/* ── เป้าหมายของเรา ─────────────────────────────────────────────── */}
            <section className="bg-bg">
                <Container className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16">
                    <div>
                        <SectionTitle eyebrow="เป้าหมาย" title="เป้าหมายของเรา" />
                        <Reveal delay={100} className="mt-6 space-y-4 text-base leading-relaxed text-fg-muted">
                            <p>
                                เราอยากให้นักศึกษาทุกคนสามารถค้นพบความสามารถของตัวเองผ่านการเข้าร่วมกิจกรรม
                                ได้เรียนรู้จากประสบการณ์จริง และสามารถนำทักษะที่ได้รับไปต่อยอดทั้งในการเรียน
                                การทำงาน และการใช้ชีวิต
                            </p>
                            <p>
                                เพราะเราเชื่อว่า การเติบโตไม่ได้เกิดขึ้นเฉพาะในห้องเรียน
                                แต่เกิดขึ้นจากทุกประสบการณ์ที่เราได้ลงมือทำ
                            </p>
                            <p>
                                เว็บไซต์นี้จึงถูกสร้างขึ้นเพื่อเป็นอีกหนึ่งพื้นที่ที่จะช่วยเชื่อมโยง
                                &ldquo;นักศึกษา – กิจกรรม – การเรียนรู้ – และการพัฒนาทักษะ&rdquo; เข้าด้วยกัน
                            </p>
                        </Reveal>

                        <Reveal delay={200}>
                            <ol className="mt-6 flex flex-wrap items-center gap-2" aria-label="เส้นทางการเติบโต">
                                {JOURNEY.map((step, i) => (
                                    <li key={step} className="flex items-center gap-2">
                                        <span className="rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 hover:text-white">
                                            {step}
                                        </span>
                                        {i < JOURNEY.length - 1 && (
                                            <ArrowRight className="size-4 text-brand-400 motion-safe:animate-pulse" aria-hidden="true" />
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </Reveal>
                    </div>

                    <Reveal delay={150}>
                        <div className="group relative">
                            <Image
                                src="/goal.png"
                                alt="เป้าหมายของ Comp Active"
                                width={1672}
                                height={940}
                                className="h-auto w-full rounded-[32px] border border-border shadow-xl shadow-brand-900/10 transition-transform duration-700 ease-out group-hover:scale-[1.02] group-hover:rotate-1"
                            />
                            <span className="ph-float absolute -right-3 -top-4 flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
                                <Target className="size-6" aria-hidden="true" />
                            </span>
                        </div>
                    </Reveal>
                </Container>
            </section>

            {/* ── ปุ่มปิดท้าย ────────────────────────────────────────────────── */}
            <section className="bg-bg pb-16">
                <Container>
                    <Reveal>
                        <div className="relative isolate overflow-hidden rounded-[32px] bg-linear-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-12 text-center text-white shadow-[0_18px_40px_-18px_rgb(43_108_176/0.6)] sm:px-12">
                            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                                <div className="ph-float absolute -left-10 -top-16 size-56 rounded-full bg-white/15 blur-2xl" />
                                <div className="ph-float ph-delay-2 absolute -bottom-16 right-0 size-64 rounded-full bg-white/10 blur-2xl" />
                            </div>
                            <h2 className="text-2xl font-bold sm:text-3xl">พร้อมเริ่มพัฒนาทักษะของคุณแล้วหรือยัง?</h2>
                            <p className="mx-auto mt-2 max-w-xl text-white/85">
                                เลือกกิจกรรมที่สนใจ ลงมือทำจริง และสะสมคะแนน Soft Skills ไปด้วยกัน
                            </p>
                            <div className="mt-7 flex justify-center">
                                <PrimaryLink href={eventsHref} inverted>
                                    {eventsLabel}
                                </PrimaryLink>
                            </div>
                        </div>
                    </Reveal>
=======
            {/* ── 04 สาขาวิชา (แถบยีนส์เข้ม) ─────────────────────────────────── */}
            <section aria-labelledby="about-majors" className="denim-weave-deep">
                <div className="checker-strip h-3.5" aria-hidden="true" />
                <Container className="flex flex-col gap-8 py-20">
                    <DenimSectionHeading
                        id="about-majors"
                        tone="dark"
                        comment={`04 · majors.length = ${PROGRAMS.length}`}
                        title="สาขาวิชาในวิทยาลัยการคอมพิวเตอร์"
                        description={`${PROGRAMS.length} สาขาวิชา`}
                    />
                    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
                        {PROGRAMS.map((program) => (
                            <li
                                key={program.tag}
                                className="flex flex-col overflow-hidden rounded-[18px] border border-white/10 bg-denim/80"
                            >
                                <div className="relative aspect-[3/2] overflow-hidden">
                                    <Image
                                        src={program.src}
                                        alt=""
                                        fill
                                        sizes="(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw"
                                        className="object-cover"
                                    />
                                    <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-0.5 font-code text-[11px] font-semibold text-denim-deep">
                                        {program.tag}
                                    </span>
                                    <div className="absolute inset-x-3 bottom-0 border-t-2 border-dashed border-amber/70" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col gap-1 p-4">
                                    <h3 className="font-display text-[15px] font-bold leading-snug text-white">{program.th}</h3>
                                    <p className="text-xs text-denim-on-soft">{program.en}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Container>
                <div className="checker-strip h-3.5" aria-hidden="true" />
            </section>

            {/* ── 05 เป้าหมายของเรา ──────────────────────────────────────────── */}
            <section aria-labelledby="about-goal">
                <Container className="grid items-center gap-12 py-20 lg:grid-cols-2">
                    <div className="flex flex-col gap-5">
                        <DenimSectionHeading id="about-goal" comment="05 · our goal" title="เป้าหมายของเรา" />
                        <p className="text-[15px] leading-[1.8] text-denim-muted">
                            เราอยากให้นักศึกษาทุกคนสามารถค้นพบความสามารถของตัวเองผ่านการเข้าร่วมกิจกรรม
                            ได้เรียนรู้จากประสบการณ์จริง และสามารถนำทักษะที่ได้รับไปต่อยอดทั้งในการเรียน
                            การทำงาน และการใช้ชีวิต
                        </p>
                        <blockquote className="rounded-[16px] border-2 border-dashed border-amber/60 bg-white px-6 py-5 font-display text-lg font-bold leading-relaxed text-denim-deep">
                            เพราะเราเชื่อว่า การเติบโตไม่ได้เกิดขึ้นเฉพาะในห้องเรียน แต่เกิดขึ้นจากทุกประสบการณ์ที่เราได้ลงมือทำ
                        </blockquote>
                        <p className="text-[15px] leading-[1.8] text-denim-muted">
                            เว็บไซต์นี้จึงถูกสร้างขึ้นเพื่อเป็นอีกหนึ่งพื้นที่ที่จะช่วยเชื่อมโยง
                            &ldquo;นักศึกษา – กิจกรรม – การเรียนรู้ – และการพัฒนาทักษะ&rdquo; เข้าด้วยกัน
                        </p>
                    </div>
                    <div className="rounded-[24px] border-2 border-dashed border-denim-dash p-2.5">
                        <Image
                            src="/goal.png"
                            alt="เป้าหมายของ Comp Active — นักศึกษาก้าวไปข้างหน้าพร้อมกิจกรรมและทักษะรอบตัว"
                            width={1672}
                            height={940}
                            sizes="(min-width: 1024px) 600px, 100vw"
                            className="h-auto w-full rounded-[18px]"
                        />
                    </div>
>>>>>>> organize
                </Container>
            </section>
        </div>
    )
}

/** แถบหัวหน้า — ข้อความ + กรอบภาพวิทยาลัยเส้นประอำพัน โดยมีมาสคอตยืนหน้ากรอบ (จอ lg+) */
function AboutHero({ eventsHref }: { eventsHref: string }) {
    return (
        <DenimHero className="flex flex-wrap items-center justify-between gap-x-10 gap-y-10 pb-12 sm:pb-14">
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
                <TerminalPrompt>~/comp-active $ cat README.md</TerminalPrompt>
                <h1 className="font-display text-[44px] font-bold leading-[1.08] tracking-[-0.015em] text-white sm:text-[56px] xl:text-[64px]">
                    เกี่ยวกับ
                    <span className="block text-amber">Comp Active</span>
                </h1>
                <p className="max-w-[460px] text-base leading-relaxed text-denim-on sm:text-lg">
                    ระบบบริหารกิจกรรมและติดตามทักษะ Soft Skills ของนักศึกษา วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
                </p>
                <div>
                    <Link href={eventsHref} className={AMBER_BUTTON}>
                        ดูกิจกรรม
                        <ArrowRight className="size-[18px]" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            <div className="relative w-full max-w-[540px] lg:pl-16">
                <div className="rounded-[22px] border-2 border-dashed border-amber/55 p-2.5">
                    <Image
                        src="/college_image.png"
                        alt="ป้ายวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                        width={1536}
                        height={1024}
                        sizes="(min-width: 1024px) 520px, 100vw"
                        priority
                        className="h-auto w-full rounded-[16px]"
                    />
                </div>
                {/* มาสคอตยืนหน้ามุมซ้ายล่างของกรอบ — ตกแต่งล้วน */}
                <Image
                    src="/mascot-wave.png"
                    alt=""
                    aria-hidden="true"
                    width={421}
                    height={900}
                    sizes="120px"
                    className="mascot-bob absolute -bottom-12 left-0 hidden h-[260px] w-auto drop-shadow-[0_16px_24px_rgb(0_0_0_/_0.4)] lg:block"
                />
            </div>
        </DenimHero>
    )
}

/** การ์ดเทอร์มินัล "comp-active --mission" ข้างข้อความความเป็นมา */
function MissionTerminal() {
    return (
        <div className="denim-weave-deep overflow-hidden rounded-[20px] shadow-[0_24px_50px_-24px_rgb(18_34_61_/_0.7)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
                <span className="size-2.5 rounded-full bg-amber" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-denim-on-soft" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-denim-accent" aria-hidden="true" />
                <span className="ml-2 font-code text-xs text-denim-on-soft">dekcom@kku: ~</span>
            </div>
            <div className="flex flex-col gap-2.5 px-5 py-6 font-code text-sm">
                <p className="text-white">
                    <span className="text-amber">$</span> comp-active <span className="text-denim-on-soft">--mission</span>
                </p>
                {MISSION.map((line) => (
                    <p key={line.cmd} className="grid grid-cols-[1.5rem_6rem_1fr] text-denim-on">
                        <span className="text-denim-on-muted" aria-hidden="true">
                            ›
                        </span>
                        <span>{line.cmd}</span>
                        <span className="text-amber">✓ {line.text}</span>
                    </p>
                ))}
                <p className="mt-1 text-denim-on-muted">{"// with College of Computing"}</p>
            </div>
        </div>
    )
}
