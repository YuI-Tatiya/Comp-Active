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

/**
 * หัวเรื่องของหน้ารายการ (ธีม Denim Varsity) — แถบยีนส์เต็มความกว้าง กรอบเส้นประอำพัน + แถบหมากรุก
 * แบบเดียวกับแถบหัวหน้าของหน้าหลัก/หน้าผู้จัด ฝั่งขวาเป็นกลุ่มไอคอนที่สื่อความหมายของหน้า (ตกแต่งล้วน, ซ่อนบนจอเล็ก)
 * แอนิเมชันลอย/หมุนช้าอยู่ใน app/globals.css (.ph-*) และหยุดเมื่อ prefers-reduced-motion
 */
export function PageHeader({ title, subtitle, badge, prompt, action, icons, className }: PageHeaderProps) {
    const [MainIcon, TopIcon, BottomIcon] = icons

    return (
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
    )
}
