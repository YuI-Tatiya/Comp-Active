import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Plus } from "lucide-react"
import { Container } from "@/components/layout/container"
import { cn } from "@/lib/utils"
import { AMBER_BUTTON, DenimHero, TerminalPrompt } from "./denim-ui"

/**
 * ส่วนบนของหน้าหลักผู้จัด (ธีม Denim Varsity) — แถบทักทายพื้นยีนส์ + มาสคอต DEK COM
 * การ์ดสถิติ (OrganizerStatCards) ต้องวางต่อท้ายทันที: ดึงตัวเองขึ้นมาทับขอบล่างของส่วนนี้ (-mt-16)
 * ซึ่งเผื่อที่ไว้ให้แล้วด้วย pb-24 ของคอลัมน์ข้อความ
 */
export function OrganizerHero({ name, summary }: { name: string; summary: string }) {
    return (
        <DenimHero className="flex min-h-[420px] flex-wrap items-end justify-between gap-6">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[22px] pb-24">
                <TerminalPrompt>~/comp-active/organizer $ whoami</TerminalPrompt>
                <h1 className="break-words font-display text-4xl font-bold leading-[1.05] tracking-[-0.015em] text-white [text-wrap:balance] sm:text-5xl lg:text-[clamp(40px,5.2vw,64px)]">
                    สวัสดี <span className="text-amber">{name}</span>
                    <br />
                    วันนี้จะปล่อยกิจกรรมอะไรดี?
                </h1>
                <p className="max-w-[520px] text-lg leading-relaxed text-denim-on">{summary}</p>
                <div className="flex flex-wrap gap-3">
                    <Link href="/organizer/create" className={AMBER_BUTTON}>
                        <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                        สร้างกิจกรรมใหม่
                    </Link>
                    <Link
                        href="/organizer/dashboard"
                        className="inline-flex min-h-[52px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-white/45 px-[22px] text-base font-medium text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-white"
                    >
                        ดูแดชบอร์ดผู้เข้าร่วม
                        <ArrowRight className="size-[18px]" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            {/* มาสคอตเฉพาะจอกว้าง (lg+) ที่วางข้างข้อความได้ — จอแคบกว่านี้จะตกลงไปใต้ปุ่ม ทำให้แถบทักทายสูงขึ้นอีก ~400px
                ฟองคำพูดยื่นเข้าไปทางซ้าย 150px จึงรอถึง xl: ที่ 1024px มันทับท้ายบรรทัดที่สองของหัวข้อ (วัดจากภาพจริงแล้ว) */}
            <div className="relative mx-auto hidden shrink-0 items-end lg:flex">
                <div className="absolute -left-[150px] top-[18px] hidden w-[190px] rounded-[18px_18px_4px_18px] bg-white px-4 py-3 text-[15px] font-semibold leading-snug text-denim-deep shadow-[0_10px_24px_-10px_rgb(0_0_0_/_0.4)] xl:block">
                    หวัดดี! มีกิจกรรมใหม่มาให้ทุกคนแล้วนะ
                    <span className="mt-1 block font-code text-xs font-normal text-denim-accent">— DEK COM</span>
                </div>
                <Image
                    src="/mascot-wave.png"
                    alt="มาสคอต DEK COM ใส่แจ็กเก็ตวาร์ซิตี้ยีนส์โบกมือทักทาย"
                    width={421}
                    height={900}
                    sizes="187px"
                    priority
                    className="mascot-bob h-[400px] w-auto drop-shadow-[0_20px_30px_rgb(0_0_0_/_0.35)]"
                />
            </div>
        </DenimHero>
    )
}

export interface OrganizerStat {
    /** ป้ายตัวพิมพ์ใหญ่แบบโค้ด เช่น ALL_EVENTS */
    code: string
    label: string
    value: string | number
    icon: LucideIcon
    /** การ์ดเด่น (พื้นยีนส์) — ดีไซน์ใช้กับ "กำลังเปิดรับสมัคร" ใบเดียว */
    highlight?: boolean
    /** ขอบอำพันเรียกความสนใจ — ใช้กับ "รออนุมัติ" เมื่อมีคำขอค้าง */
    attention?: boolean
}

export function OrganizerStatCards({ stats }: { stats: OrganizerStat[] }) {
    return (
        <section aria-label="สรุปภาพรวม" className="relative z-[1] -mt-16">
            <Container>
                {/* มือถือ 2x2 แทนเรียงเดี่ยว 4 ใบ (ใบละ ~170px = กินจอไปเกือบ 700px ก่อนถึงรายการกิจกรรม) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {stats.map(({ code, label, value, icon: Icon, highlight, attention }) => (
                        <div
                            key={code}
                            className={cn(
                                "flex min-w-0 flex-col gap-2.5 rounded-[20px] px-4 py-4 sm:px-6 sm:py-[22px]",
                                highlight
                                    ? "denim-weave text-white shadow-[0_14px_34px_-20px_rgb(18_34_61_/_0.6)]"
                                    : "border bg-white shadow-[0_14px_34px_-20px_rgb(18_34_61_/_0.5)]",
                                !highlight && (attention ? "border-amber ring-2 ring-amber/30" : "border-denim-line")
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className={cn(
                                        "min-w-0 truncate font-code text-[11px] tracking-[0.04em] sm:text-xs",
                                        highlight ? "text-denim-on-soft" : "text-denim-muted"
                                    )}
                                >
                                    {code}
                                </span>
                                <span
                                    className={cn(
                                        "grid size-9 shrink-0 place-items-center rounded-xl sm:size-10",
                                        highlight || attention ? "bg-amber" : "bg-denim-chip"
                                    )}
                                >
                                    <Icon
                                        className={cn("size-5", highlight || attention ? "text-denim-deep" : "text-denim")}
                                        strokeWidth={highlight ? 2.2 : 2}
                                        aria-hidden="true"
                                    />
                                </span>
                            </div>
                            <div
                                className={cn(
                                    "font-display text-[36px] font-bold leading-none tabular-nums sm:text-[44px]",
                                    highlight ? "text-white" : "text-denim-deep"
                                )}
                            >
                                {value}
                            </div>
                            <div className={cn("text-sm", highlight ? "text-denim-on" : "text-denim-ink")}>{label}</div>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    )
}
