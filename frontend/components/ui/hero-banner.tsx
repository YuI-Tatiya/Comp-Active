"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Container } from "@/components/layout/container"
import { cn } from "@/lib/utils"
import { nextWordIndex, splitHeadline } from "@/lib/hero-text"

interface HeroBannerProps {
    /** ป้ายเล็กเหนือหัวข้อ (มีจุดเรืองแสงนำหน้า) */
    eyebrow?: string
    /** หัวข้อ — เปิดทีละคำตอนโหลดหน้า */
    title: string
    /** คำเด่นต่อท้ายหัวข้อ — ไล่สีวนต่อเนื่อง */
    highlight?: string
    /** บรรทัดคำสลับอัตโนมัติ: before + [words วนสลับ] + after */
    tagline?: { before: string; words: string[]; after?: string }
    subtitle?: string
    className?: string
}

const WORD_INTERVAL_MS = 2600
const STAGGER_MS = 70

/**
 * แถบหัวเรื่องของหน้าหลักฝั่งนักศึกษา — พื้นสว่างพร้อมแสงออโรราอ่อนๆ ไหลช้า, หัวข้อเปิดทีละคำ,
 * คำเด่นไล่สี, คำในบรรทัดรองสลับอัตโนมัติ และวงแสงตามเมาส์ (เฉพาะอุปกรณ์ที่มีเมาส์)
 * แอนิเมชันทั้งหมดอยู่ใน app/globals.css (.hero-*) และปิดเมื่อ prefers-reduced-motion
 */
export function HeroBanner({ eyebrow, title, highlight, tagline, subtitle, className }: HeroBannerProps) {
    const ref = useRef<HTMLDivElement>(null)
    const parts = useMemo(() => splitHeadline(title), [title])
    const wordCount = tagline?.words.length ?? 0
    const [wordIndex, setWordIndex] = useState(0)

    useEffect(() => {
        if (wordCount <= 1) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        const id = setInterval(() => setWordIndex((i) => nextWordIndex(i, wordCount)), WORD_INTERVAL_MS)
        return () => clearInterval(id)
    }, [wordCount])

    // อัปเดตตำแหน่งวงแสงผ่าน CSS variable โดยตรง ไม่ re-render ทุกครั้งที่เมาส์ขยับ
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        el.style.setProperty("--hero-mx", `${e.clientX - rect.left}px`)
        el.style.setProperty("--hero-my", `${e.clientY - rect.top}px`)
    }

    // ไล่จังหวะการเปิดทีละองค์ประกอบ (ลำดับตามการเรียกใน JSX)
    let order = 0
    const delay = () => ({ animationDelay: `${order++ * STAGGER_MS}ms` })

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            className={cn("hero-banner relative isolate overflow-hidden border-b border-border bg-bg", className)}
        >
            {/* ชั้นพื้นหลัง: ออโรรา + จุดไข่ปลา + วงแสงตามเมาส์ (ตกแต่งล้วน) */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="hero-aurora hero-aurora-a" />
                <div className="hero-aurora hero-aurora-b" />
                <div className="hero-aurora hero-aurora-c" />
                <div className="hero-aurora hero-aurora-d" />
                <div className="hero-dots" />
                <div className="hero-glow" />
            </div>

            <Container className="relative py-10 sm:py-14">
                {/* มาสคอตยืนมุมขวา เท้าอยู่บนเส้นขอบล่างของแถบ (bottom-0 ของ Container = ขอบล่างแถบ)
                    ซ่อนต่ำกว่า md เพื่อไม่บังข้อความ; ลอยขึ้นลงเบาๆ และมีวงแสงอยู่ข้างหลัง (ตกแต่งล้วน) */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 right-4 hidden md:block sm:right-6 lg:right-8"
                >
                    <div className="hero-mascot-glow" />
                    <Image
                        src="/mascot-student.png"
                        alt=""
                        width={1200}
                        height={1320}
                        sizes="(min-width: 1024px) 260px, 200px"
                        className="hero-mascot relative h-48 w-auto lg:h-60"
                    />
                </div>

                <div className="max-w-3xl md:pr-52 lg:pr-64">
                    {eyebrow && (
                        <p
                            className="hero-rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-fg-muted backdrop-blur"
                            style={delay()}
                        >
                            <span
                                className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgb(16_185_129/0.45)]"
                                aria-hidden="true"
                            />
                            {eyebrow}
                        </p>
                    )}

                    <h1 className="text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl">
                        <span className="sr-only">
                            {title} {highlight}
                        </span>
                        <span aria-hidden="true" className="whitespace-pre-wrap">
                            {parts.map((part, i) =>
                                part.isSpace ? (
                                    part.text
                                ) : (
                                    <span key={i} className="hero-rise inline-block" style={delay()}>
                                        {part.text}
                                    </span>
                                ),
                            )}
                            {highlight && (
                                <>
                                    {" "}
                                    <span className="hero-rise inline-block" style={delay()}>
                                        <span className="hero-gradient-text">{highlight}</span>
                                    </span>
                                </>
                            )}
                        </span>
                    </h1>

                    {tagline && (
                        <p className="hero-rise mt-3 text-xl font-medium text-fg-muted sm:text-2xl" style={delay()}>
                            {tagline.before}{" "}
                            <span className="hero-words text-brand-600">
                                {tagline.words.map((word, i) => {
                                    const state =
                                        i === wordIndex
                                            ? "is-active"
                                            : i === (wordIndex - 1 + wordCount) % wordCount
                                              ? "is-prev"
                                              : "is-next"
                                    return (
                                        <span key={word} className={cn("hero-word", state)} aria-hidden={i !== wordIndex}>
                                            {word}
                                        </span>
                                    )
                                })}
                            </span>
                            {tagline.after ? ` ${tagline.after}` : ""}
                        </p>
                    )}

                    {subtitle && (
                        <p className="hero-rise mt-4 max-w-2xl text-base text-fg-muted" style={delay()}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </Container>
        </div>
    )
}
