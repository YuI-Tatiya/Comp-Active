"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
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
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { cn } from "@/lib/utils"

const PROGRAMS = [
    { src: "/cs.png", alt: "วิทยาการคอมพิวเตอร์ (Computer Science)" },
    { src: "/it.png", alt: "เทคโนโลยีสารสนเทศ (Information Technology)" },
    { src: "/gis.png", alt: "ภูมิสารสนเทศศาสตร์ (Geoinformatics)" },
    { src: "/cy.png", alt: "ความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity)" },
    { src: "/ai.png", alt: "ปัญญาประดิษฐ์ (Artificial Intelligence)" },
]

/** ความสามารถของระบบแยกตามบทบาท — ให้ตรงกับฟีเจอร์ที่มีอยู่จริงเท่านั้น */
const ROLES: { icon: LucideIcon; title: string; items: string[] }[] = [
    {
        icon: GraduationCap,
        title: "นักศึกษา",
        items: [
            "ค้นหาและลงทะเบียนเข้าร่วมกิจกรรม",
            "สะสมคะแนน Soft Skills 12 ด้านจากการเข้าร่วมกิจกรรม",
            "ติดตามผลการประเมินและความก้าวหน้าของตนเอง",
        ],
    },
    {
        icon: CalendarPlus,
        title: "ผู้จัดกิจกรรม",
        items: [
            "สร้างกิจกรรมและกำหนดทักษะที่ผู้เข้าร่วมจะได้รับ",
            "ตรวจสอบรายชื่อและเช็กอินผู้เข้าร่วม",
            "ประเมินผลและดูสรุปความคิดเห็นของกิจกรรม",
        ],
    },
    {
        icon: ShieldCheck,
        title: "ผู้ดูแลระบบ",
        items: [
            "อนุมัติและจัดการบัญชีผู้จัดกิจกรรม",
            "จัดการเนื้อหาหน้าแรกของระบบ",
            "ดูภาพรวมและสถิติการใช้งาน",
        ],
    },
]

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

interface AboutSectionsProps {
    /** ปลายทางของปุ่ม "ดูกิจกรรม" — แต่ละพอร์ทัล (public/student/organizer) มีหน้ากิจกรรมของตัวเอง */
    eventsHref?: string
    /** ข้อความปุ่มหลัก — ผู้จัดกิจกรรมไปหน้าจัดการกิจกรรม ไม่ใช่ "ดูกิจกรรม" */
    eventsLabel?: string
}

/**
 * เนื้อหาหน้า "เกี่ยวกับเรา" — ใช้ร่วมกันทั้ง public (/about), student (/student/about)
 * และ organizer (/organizer/about) เพื่อให้ทั้งสามหน้าตรงกันเสมอ ไม่ต้องแก้ 3 ที่
 * ไม่รวม header/footer — แต่ละหน้าห่อด้วย chrome ของตัวเอง (SiteHeader/AppHeader ต่างกัน)
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
                </Container>
            </section>

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
                                </li>
                            )
                        })}
                    </ul>
                </Container>
            </section>

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
                            </li>
                        ))}
                    </ul>
                </Container>
            </section>

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
                </Container>
            </section>
        </>
    )
}
