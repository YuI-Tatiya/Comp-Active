"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { AMBER_BUTTON, DenimHero, TerminalPrompt } from "@/components/denim/denim-ui"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    subtitle?: string
    /** ป้ายเล็กเหนือหัวข้อ เช่น "ระดับ 3" */
    badge?: string
    /** บรรทัดคำสั่งเทอร์มินัลเหนือหัวข้อ เช่น "~/comp-active $ ls events/" — ไม่ส่งมาก็ไม่แสดง */
    prompt?: string
    /** ปุ่มนำทางสีอำพันใต้คำอธิบาย */
    action?: { label: string; href: string }
    /** ไอคอนในกลุ่มตกแต่งฝั่งขวา: [ตัวหลักตรงกลาง, การ์ดเล็กขวาบน, การ์ดเล็กซ้ายล่าง] */
    icons: [LucideIcon, LucideIcon, LucideIcon]
    className?: string
}

<<<<<<< HEAD
const GRID_MASK = "radial-gradient(ellipse 45% 70% at 78% 50%, black, transparent)"

/** ค่า --px/--py (-1..1) คูณกับตัวเลขนี้ = ระยะที่ชั้นนั้นขยับตามเมาส์ (ติดลบ = ขยับสวนทาง) */
const parallax = (x: number, y: number): React.CSSProperties => ({
    transform: `translate3d(calc(var(--px) * ${x}px), calc(var(--py) * ${y}px), 0)`,
})

/**
 * หัวเรื่องของหน้าฝั่งนักศึกษา — การ์ดสีฟ้าแบรนด์มุมมน (brand-700 → brand-600 → brand-500)
 * ฝั่งขวาเป็นกลุ่มไอคอนกระจกที่สื่อความหมายของหน้า (ตกแต่งล้วน, ซ่อนบนจอเล็ก)
 *
 * โต้ตอบกับเมาส์: แสงสปอตไลต์ตามเคอร์เซอร์, การ์ดเอียงเล็กน้อย, แต่ละชั้น (ข้อความ / ไอคอน / ตาราง)
 * ขยับด้วยความลึกต่างกัน — ค่าเมาส์เขียนลง CSS variable ตรงๆ ไม่ผ่าน React state จึงไม่ re-render
 * และไล่ค่าแบบ lerp ใน requestAnimationFrame ให้ลื่น หยุดทำงานเมื่อผู้ใช้ตั้ง prefers-reduced-motion
 * แอนิเมชันลอย/หมุนช้าอยู่ใน app/globals.css (.ph-*)
=======
/**
 * หัวเรื่องของหน้ารายการ (ธีม Denim Varsity) — แถบยีนส์เต็มความกว้าง กรอบเส้นประอำพัน + แถบหมากรุก
 * แบบเดียวกับแถบหัวหน้าของหน้าหลัก/หน้าผู้จัด ฝั่งขวาเป็นกลุ่มไอคอนที่สื่อความหมายของหน้า (ตกแต่งล้วน, ซ่อนบนจอเล็ก)
 * แอนิเมชันลอย/หมุนช้าอยู่ใน app/globals.css (.ph-*) และหยุดเมื่อ prefers-reduced-motion
>>>>>>> organize
 */
export function PageHeader({ title, subtitle, badge, prompt, action, icons, className }: PageHeaderProps) {
    const [MainIcon, TopIcon, BottomIcon] = icons
    const ref = useRef<HTMLElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        // target = ตำแหน่งเมาส์จริง, cur = ค่าที่ไล่ตามอยู่ (ทำให้ขยับนุ่มและคืนตำแหน่งช้าๆ ตอนเมาส์ออก)
        const target = { px: 0, py: 0, sx: 0, sy: 0, glow: 0 }
        const cur = { px: 0, py: 0, sx: 0, sy: 0, glow: 0 }
        let raf = 0
        let running = false

        const frame = () => {
            const k = 0.12
            cur.px += (target.px - cur.px) * k
            cur.py += (target.py - cur.py) * k
            cur.sx += (target.sx - cur.sx) * 0.25
            cur.sy += (target.sy - cur.sy) * 0.25
            cur.glow += (target.glow - cur.glow) * 0.1
            el.style.setProperty("--px", cur.px.toFixed(4))
            el.style.setProperty("--py", cur.py.toFixed(4))
            el.style.setProperty("--sx", `${cur.sx.toFixed(1)}px`)
            el.style.setProperty("--sy", `${cur.sy.toFixed(1)}px`)
            el.style.setProperty("--glow", cur.glow.toFixed(3))

            const settled =
                Math.abs(target.px - cur.px) < 0.001 &&
                Math.abs(target.py - cur.py) < 0.001 &&
                Math.abs(target.glow - cur.glow) < 0.002
            if (settled) {
                running = false
                return
            }
            raf = requestAnimationFrame(frame)
        }
        const kick = () => {
            if (running) return
            running = true
            raf = requestAnimationFrame(frame)
        }

        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return
            const r = el.getBoundingClientRect()
            const x = e.clientX - r.left
            const y = e.clientY - r.top
            target.sx = x
            target.sy = y
            target.px = (x / r.width) * 2 - 1
            target.py = (y / r.height) * 2 - 1
            target.glow = 1
            kick()
        }
        const onLeave = () => {
            target.px = 0
            target.py = 0
            target.glow = 0
            kick()
        }

        el.addEventListener("pointermove", onMove)
        el.addEventListener("pointerleave", onLeave)
        return () => {
            el.removeEventListener("pointermove", onMove)
            el.removeEventListener("pointerleave", onLeave)
            cancelAnimationFrame(raf)
        }
    }, [])

    return (
<<<<<<< HEAD
        <Container className={cn("pt-4 [perspective:1400px] motion-safe:animate-rise-in sm:pt-5", className)}>
            <section
                ref={ref}
                style={
                    {
                        "--px": 0,
                        "--py": 0,
                        "--sx": "50%",
                        "--sy": "50%",
                        "--glow": 0,
                        transform: "rotateX(calc(var(--py) * -1.4deg)) rotateY(calc(var(--px) * 1.8deg))",
                    } as React.CSSProperties
                }
                className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white shadow-[0_18px_40px_-18px_rgb(43_108_176/0.6)] will-change-transform sm:rounded-[2rem]"
            >
                {/* ── ชั้นตกแต่ง ─────────────────────────────────────────────── */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                    {/* ตารางเส้นบาง จางออกจากฝั่งขวา — ขยับสวนทางเมาส์เล็กน้อย */}
                    <div className="absolute -inset-6" style={parallax(-10, -8)}>
                        <div
                            className="size-full opacity-[0.1]"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)",
                                backgroundSize: "32px 32px",
                                maskImage: GRID_MASK,
                                WebkitMaskImage: GRID_MASK,
                            }}
                        />
                    </div>
                    {/* แสงตกกระทบมุมซ้ายบน */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_90%_at_8%_0%,rgb(255_255_255/0.2),transparent_70%)]" />
                    {/* สปอตไลต์ตามเคอร์เซอร์ */}
                    <div
                        className="absolute inset-0"
                        style={{
                            opacity: "var(--glow)",
                            background:
                                "radial-gradient(380px circle at var(--sx) var(--sy), rgb(255 255 255 / 0.24), transparent 65%)",
                        }}
                    />
                    {/* เส้นแสงขอบบน */}
                    <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                    {/* คลื่นโปร่งที่ขอบล่าง */}
                    <svg className="absolute inset-x-0 bottom-0 h-10 w-full" viewBox="0 0 1200 64" preserveAspectRatio="none">
                        <path d="M0 40 C300 0 620 72 1200 18 V64 H0 Z" fill="rgb(255 255 255 / 0.06)" />
                    </svg>
                </div>

                <div className="grid items-center gap-4 px-5 py-5 sm:px-8 sm:py-6 md:grid-cols-[1fr_auto] lg:px-10">
                    {/* ── ข้อความ ─────────────────────────────────────────────── */}
                    <div style={parallax(-5, -4)}>
                        {badge && (
                            <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
                                <span className="relative flex size-1.5" aria-hidden="true">
                                    <span className="absolute inline-flex size-full rounded-full bg-emerald-300 opacity-75 motion-safe:animate-ping" />
                                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
                                </span>
                                {badge}
                            </span>
                        )}
                        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
                        {subtitle && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">{subtitle}</p>}
                        {action && (
                            <Link
                                href={action.href}
                                className="group mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-md shadow-brand-900/20 transition hover:-translate-y-0.5 hover:bg-brand-50"
                            >
                                {action.label}
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                            </Link>
                        )}
                    </div>

                    {/* ── กลุ่มไอคอนกระจก (ตกแต่ง) — แต่ละชิ้นลึกต่างกัน ขยับตามเมาส์ไม่เท่ากัน ───────── */}
                    <div aria-hidden="true" className="relative mr-2 hidden size-36 shrink-0 md:block lg:mr-6">
                        <div className="absolute inset-[-25%] rounded-full bg-[radial-gradient(circle,rgb(144_205_244/0.55),transparent_65%)]" style={parallax(8, 6)} />
                        <svg className="ph-orbit absolute inset-0 size-full" viewBox="0 0 240 240">
                            <circle cx="120" cy="120" r="112" fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="1.5" strokeDasharray="3 8" />
                        </svg>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={parallax(16, 14)}>
                            <span className="ph-float flex size-20 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md">
                                <MainIcon className="size-9" strokeWidth={1.6} />
                            </span>
                        </div>
                        <div className="absolute right-0 top-1" style={parallax(30, 22)}>
                            <span className="ph-float ph-delay-1 flex size-9 items-center justify-center rounded-xl border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md">
                                <TopIcon className="size-4" />
                            </span>
                        </div>
                        <div className="absolute bottom-3 left-0" style={parallax(-24, -18)}>
                            <span className="ph-float ph-delay-2 flex size-8 items-center justify-center rounded-lg border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md">
                                <BottomIcon className="size-4" />
                            </span>
                        </div>

                        <div className="absolute bottom-6 right-2" style={parallax(38, 28)}>
                            <Sparkle className="size-3.5 fill-white text-white/90" />
                        </div>
                        <span className="absolute left-6 top-6 size-1.5 rounded-full bg-white/70" style={parallax(-34, -26)} />
                        <span className="absolute bottom-0 right-20 size-1 rounded-full bg-white/60" style={parallax(20, 30)} />
                    </div>
                </div>
            </section>
        </Container>
=======
        <DenimHero className={cn("grid items-center gap-6 pb-10 sm:pb-12 md:grid-cols-[1fr_auto]", className)}>
            <div className="flex min-w-0 flex-col gap-3">
                {prompt && <TerminalPrompt>{prompt}</TerminalPrompt>}
                {badge && (
                    <span className="self-start rounded-md bg-amber px-2.5 py-1 font-code text-xs font-semibold text-denim-deep">
                        {badge}
                    </span>
                )}
                <h1 className="font-display text-[32px] font-bold leading-[1.15] tracking-[-0.01em] text-white sm:text-[40px]">
                    {title}
                </h1>
                {subtitle && <p className="max-w-2xl text-[15px] leading-relaxed text-denim-on sm:text-base">{subtitle}</p>}
                {action && (
                    <div className="mt-2">
                        <Link href={action.href} className={cn(AMBER_BUTTON, "min-h-11 px-5 text-sm")}>
                            {action.label}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </div>

            {/* ── กลุ่มไอคอน (ตกแต่ง) ──────────────────────────────────────── */}
            <div aria-hidden="true" className="relative mr-2 hidden size-36 shrink-0 md:block lg:mr-6">
                <svg className="ph-orbit absolute inset-0 size-full" viewBox="0 0 240 240">
                    <circle
                        cx="120"
                        cy="120"
                        r="112"
                        fill="none"
                        stroke="rgb(232 163 58 / 0.55)"
                        strokeWidth="2"
                        strokeDasharray="4 9"
                    />
                </svg>
                <span className="ph-float absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber text-denim-deep shadow-[0_4px_0_var(--color-amber-deep)]">
                    <MainIcon className="size-9" strokeWidth={1.8} />
                </span>
                <span className="ph-float ph-delay-1 absolute right-0 top-1 flex size-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white">
                    <TopIcon className="size-4" />
                </span>
                <span className="ph-float ph-delay-2 absolute bottom-3 left-0 flex size-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white">
                    <BottomIcon className="size-4" />
                </span>
            </div>
        </DenimHero>
>>>>>>> organize
    )
}
