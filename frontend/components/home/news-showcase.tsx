"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Container } from "@/components/layout/container"
import { DenimSectionHeading, RoundIconButton } from "@/components/denim/denim-ui"
import { NEWS_ITEMS, type NewsItem } from "@/lib/news"
import { cn } from "@/lib/utils"

const AUTO_ADVANCE_MS = 7000

/**
 * ข่าวสารหน้าแรก (ธีม Denim) — สไลด์ข้อความบนพื้นยีนส์ + มาสคอต แทนภาพแบนเนอร์ (ข่าวชุดเดียวกับ /student ที่ lib/news.ts)
 * เลื่อนเองทุก 7 วินาที แต่หยุดระหว่างชี้เมาส์/โฟกัสอยู่ในกล่อง และไม่เลื่อนเลยถ้าผู้ใช้ตั้งลดการเคลื่อนไหวไว้
 */
export function NewsShowcase() {
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    const count = NEWS_ITEMS.length

    useEffect(() => {
        if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS)
        return () => clearInterval(timer)
    }, [paused, count])

    const go = (step: number) => setIndex((i) => (i + step + count) % count)

    return (
        <section aria-labelledby="news-heading" className="bg-white">
            <Container className="flex flex-col gap-6 py-16">
                <DenimSectionHeading
                    id="news-heading"
                    comment="news.latest()"
                    title="ข่าวสารและประกาศ"
                    action={
                        <div className="flex items-center gap-3">
                            <span className="font-code text-[13px] text-denim-muted" aria-live="polite">
                                {index + 1} / {count}
                            </span>
                            <RoundIconButton label="ข่าวก่อนหน้า" icon={ChevronLeft} onClick={() => go(-1)} />
                            <RoundIconButton label="ข่าวถัดไป" icon={ChevronRight} onClick={() => go(1)} />
                        </div>
                    }
                />

                <div
                    className="overflow-hidden rounded-[22px]"
                    aria-roledescription="carousel"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    onFocus={() => setPaused(true)}
                    onBlur={() => setPaused(false)}
                >
                    <div
                        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
                        style={{ transform: `translateX(-${index * 100}%)` }}
                    >
                        {NEWS_ITEMS.map((item, i) => (
                            <NewsSlide key={item.title} item={item} position={`${i + 1} / ${count}`} active={i === index} />
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                    {NEWS_ITEMS.map((item, i) => (
                        <button
                            key={item.title}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`ไปที่ข่าว ${i + 1}: ${item.title}`}
                            aria-current={index === i}
                            className={cn(
                                "h-2 rounded-full transition-all",
                                index === i ? "w-8 bg-denim" : "w-2 bg-denim-line hover:bg-denim-dash"
                            )}
                        />
                    ))}
                </div>
            </Container>
        </section>
    )
}

function NewsSlide({ item, position, active }: { item: NewsItem; position: string; active: boolean }) {
    return (
        <article
            aria-roledescription="slide"
            aria-label={`${position}: ${item.title}`}
            aria-hidden={!active}
            className="denim-weave relative flex min-h-[340px] w-full shrink-0 items-center overflow-hidden px-6 py-10 sm:px-12"
        >
            <div className="relative z-10 flex max-w-[600px] flex-col gap-4 lg:max-w-[560px]">
                <span className="self-start rounded-md bg-amber px-2.5 py-1 font-code text-[11px] font-semibold text-denim-deep">
                    {item.tag}
                </span>
                <h3 className="font-display text-[32px] font-bold leading-[1.15] text-white sm:text-[44px]">
                    {item.headline.map((line, li) => (
                        <span key={li} className="block">
                            {line.map((part, pi) => (
                                <span key={pi} className={cn(part.highlight && "text-amber")}>
                                    {part.text}
                                </span>
                            ))}
                        </span>
                    ))}
                </h3>
                <p className="max-w-[480px] text-[15px] leading-relaxed text-denim-on">{item.desc}</p>

                {item.progress && (
                    <div className="mt-1 max-w-[360px]">
                        <div className="flex items-center justify-between font-code text-xs">
                            <span className="text-denim-on-soft">{item.progress.label}</span>
                            <span className="font-semibold text-amber">{item.progress.value}%</span>
                        </div>
                        <div
                            className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"
                            role="progressbar"
                            aria-label={item.progress.label}
                            aria-valuenow={item.progress.value}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div className="h-full rounded-full bg-amber" style={{ width: `${item.progress.value}%` }} />
                        </div>
                    </div>
                )}

                {item.chips && (
                    <ul className="mt-1 flex flex-wrap gap-2">
                        {item.chips.map((chip) => (
                            <li key={chip} className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white">
                                {chip}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* มาสคอต + การ์ดเล็กข้างหัว — จอ lg+ ที่วางข้างข้อความได้ */}
            <div className="absolute bottom-0 right-10 hidden lg:block xl:right-20" aria-hidden="true">
                <div className="absolute -left-10 top-6 w-56 overflow-hidden rounded-xl bg-white shadow-[0_12px_28px_-12px_rgb(0_0_0_/_0.5)]">
                    <div className="flex gap-1.5 bg-denim-chip px-3 py-2">
                        <span className="size-2 rounded-full bg-amber" />
                        <span className="size-2 rounded-full bg-denim-dash" />
                        <span className="size-2 rounded-full bg-denim-accent" />
                    </div>
                    <div className="px-3 pb-3 pt-2.5">
                        {item.construction && (
                            <div className="mb-2 h-2.5 rounded-sm bg-[repeating-linear-gradient(-45deg,var(--color-amber)_0_8px,var(--color-denim-deep)_8px_16px)]" />
                        )}
                        <p className="font-code text-xs text-denim-ink">{item.note}</p>
                    </div>
                </div>
                <Image
                    src="/mascot-wave.png"
                    alt=""
                    width={421}
                    height={900}
                    sizes="150px"
                    className="relative h-[320px] w-auto drop-shadow-[0_16px_24px_rgb(0_0_0_/_0.35)]"
                />
            </div>
        </article>
    )
}
