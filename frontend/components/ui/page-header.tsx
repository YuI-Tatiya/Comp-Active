import Link from "next/link"
import { ArrowRight, Sparkle, type LucideIcon } from "lucide-react"
import { Container } from "@/components/layout/container"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    subtitle?: string
    /** ป้ายเล็กเหนือหัวข้อ เช่น "ระดับ 3" */
    badge?: string
    /** ปุ่มนำทางสีขาวใต้คำอธิบาย */
    action?: { label: string; href: string }
    /** ไอคอนในกลุ่มกระจกฝั่งขวา: [ตัวหลักตรงกลาง, การ์ดเล็กขวาบน, การ์ดเล็กซ้ายล่าง] */
    icons: [LucideIcon, LucideIcon, LucideIcon]
    className?: string
}

const GRID_MASK = "radial-gradient(ellipse 45% 70% at 78% 50%, black, transparent)"

/**
 * หัวเรื่องของหน้าฝั่งนักศึกษา — การ์ดสีฟ้าแบรนด์มุมมน (brand-700 → brand-600 → brand-500)
 * ฝั่งขวาเป็นกลุ่มไอคอนกระจกที่สื่อความหมายของหน้า (ตกแต่งล้วน, ซ่อนบนจอเล็ก)
 * แอนิเมชันลอย/หมุนช้าอยู่ใน app/globals.css (.ph-*) และหยุดเมื่อ prefers-reduced-motion
 */
export function PageHeader({ title, subtitle, badge, action, icons, className }: PageHeaderProps) {
    const [MainIcon, TopIcon, BottomIcon] = icons

    return (
        <Container className={cn("pt-4 sm:pt-5", className)}>
            <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white shadow-[0_18px_40px_-18px_rgb(43_108_176/0.6)] sm:rounded-[2rem]">
                {/* ── ชั้นตกแต่ง ─────────────────────────────────────────────── */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                    {/* ตารางเส้นบาง จางออกจากฝั่งขวา */}
                    <div
                        className="absolute inset-0 opacity-[0.1]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                            maskImage: GRID_MASK,
                            WebkitMaskImage: GRID_MASK,
                        }}
                    />
                    {/* แสงตกกระทบมุมซ้ายบน */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_90%_at_8%_0%,rgb(255_255_255/0.2),transparent_70%)]" />
                    {/* เส้นแสงขอบบน */}
                    <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                    {/* คลื่นโปร่งที่ขอบล่าง */}
                    <svg className="absolute inset-x-0 bottom-0 h-10 w-full" viewBox="0 0 1200 64" preserveAspectRatio="none">
                        <path d="M0 40 C300 0 620 72 1200 18 V64 H0 Z" fill="rgb(255 255 255 / 0.06)" />
                    </svg>
                </div>

                <div className="grid items-center gap-4 px-5 py-5 sm:px-8 sm:py-6 md:grid-cols-[1fr_auto] lg:px-10">
                    {/* ── ข้อความ ─────────────────────────────────────────────── */}
                    <div>
                        {badge && (
                            <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
                                <span className="size-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
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

                    {/* ── กลุ่มไอคอนกระจก (ตกแต่ง) ─────────────────────────────── */}
                    <div aria-hidden="true" className="relative mr-2 hidden size-36 shrink-0 md:block lg:mr-6">
                        <div className="absolute inset-[-25%] rounded-full bg-[radial-gradient(circle,rgb(144_205_244/0.55),transparent_65%)]" />
                        <svg className="ph-orbit absolute inset-0 size-full" viewBox="0 0 240 240">
                            <circle cx="120" cy="120" r="112" fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="1.5" strokeDasharray="3 8" />
                        </svg>

                        <span className="ph-float absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md">
                            <MainIcon className="size-9" strokeWidth={1.6} />
                        </span>
                        <span className="ph-float ph-delay-1 absolute right-0 top-1 flex size-9 items-center justify-center rounded-xl border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md">
                            <TopIcon className="size-4" />
                        </span>
                        <span className="ph-float ph-delay-2 absolute bottom-3 left-0 flex size-8 items-center justify-center rounded-lg border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md">
                            <BottomIcon className="size-4" />
                        </span>

                        <Sparkle className="absolute bottom-6 right-2 size-3.5 fill-white text-white/90" />
                        <span className="absolute left-6 top-6 size-1.5 rounded-full bg-white/70" />
                        <span className="absolute bottom-0 right-20 size-1 rounded-full bg-white/60" />
                    </div>
                </div>
            </section>
        </Container>
    )
}
