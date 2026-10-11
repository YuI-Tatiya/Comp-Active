"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { AMBER_BUTTON, CardCover, CoverPill, CoverTag, DenimHero, TerminalPrompt, categoryTag, type CoverTone } from "@/components/denim/denim-ui"

/* ชิ้นส่วนหน้าจัดการกิจกรรม (/organizer/manage) ธีม Denim Varsity — ตรรกะ/เมนู/การยืนยันทั้งหมดอยู่ที่หน้า ไฟล์นี้วาดอย่างเดียว */

/**
 * แถบหัวหน้า — หัวข้อ + ปุ่มสร้าง + ชิปสรุปแบบเทอร์มินัล (events/open/registered)
 * padding ล่างของกรอบเผื่อที่ให้แท็บสถานะที่หน้าดึงขึ้นมาทับขอบล่าง (-mt-[54px] ≈ 40px ลึกเข้ามาในกรอบ)
 */
export function ManageHero({ stats }: { stats: { label: string; value: string | number }[] }) {
    return (
        <DenimHero className="flex flex-wrap items-end justify-between gap-x-6 gap-y-7 pb-[76px] sm:pb-20 sm:pt-10">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
                <TerminalPrompt>~/comp-active/organizer/manage $ ls --mine</TerminalPrompt>
                <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-[-0.015em] text-white sm:text-5xl lg:text-[56px]">
                    จัดการกิจกรรม
                </h1>
                <p className="max-w-[560px] text-base leading-relaxed text-denim-on sm:text-lg">
                    แก้ไข ดูรายละเอียด และติดตามยอดผู้ลงทะเบียนของงานที่คุณสร้าง
                </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
                <Link href="/organizer/create" className={cn(AMBER_BUTTON, "min-h-14 px-7")}>
                    <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                    สร้างกิจกรรมใหม่
                </Link>
                <dl className="flex flex-wrap gap-2 sm:justify-end" aria-label="สรุปกิจกรรมของคุณ">
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            className="flex items-center gap-1 rounded-md border border-white/30 bg-denim-deep/35 px-2.5 py-1 font-code text-xs text-white"
                        >
                            <dt>{s.label}:</dt>
                            <dd className="font-semibold tabular-nums">{s.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </DenimHero>
    )
}

/** หัวข้อกลุ่มย่อย (ฉบับร่าง / กิจกรรมเดี่ยว) — ขีดคอมเมนต์โค้ดนำหน้าแบบเดียวกับหัวข้อหน้าหลัก */
export function ManageSectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="flex items-baseline gap-2 font-display text-xl font-bold text-denim-deep">
            <span className="font-code text-[13px] font-normal text-denim-accent" aria-hidden="true">
                {"//"}
            </span>
            {children}
        </h2>
    )
}

/** ปุ่มสามจุดบนการ์ด — ส่งเข้า className ของ ActionMenu (ทับสไตล์ตั้งต้นของมันด้วย tailwind-merge) */
export const CARD_MENU_TRIGGER =
    "size-11 rounded-xl border-[1.5px] border-denim-field bg-white text-denim-ink shadow-none hover:bg-denim-paper hover:text-denim-deep"

export interface ManageCardStat {
    /** ป้ายตัวพิมพ์ใหญ่แบบโค้ด เช่น DATE / REGISTERED */
    label: string
    value: string
    /** ข้อความเสริมจางๆ ต่อท้ายค่า เช่น "ไม่จำกัด" */
    note?: string
}

interface ManageCardProps {
    tone: CoverTone
    categories: string[]
    /** รหัสบนปก เช่น EVT-0118 / ACT-0042 / DRAFT */
    code: string
    dateMs?: number
    /** แทนวันที่ตัวใหญ่บนปก (ฉบับร่างยังไม่มีวันจัด) */
    coverIcon?: LucideIcon
    /** ป้ายขาวมุมซ้ายบนของปก — สถานะเผยแพร่ (งาน) หรือสถานะอนุมัติ (กิจกรรมเดี่ยว) */
    badge: { label: string; dotClassName: string }
    /** ป้ายสถานะรวมเหนือชื่อ (เปิดรับ/ปิดรับ/จบแล้ว/ยกเลิก/ฉบับร่าง) */
    chip: { label: string; className: string }
    name: string
    description?: string | null
    stats: ManageCardStat[]
    action: { href: string; label: string; icon: LucideIcon }
    /** เมนูสามจุด (ActionMenu) — สร้างที่หน้าเพราะรายการเมนูผูกกับ state ของหน้า (ยืนยัน/ลบ/โหลดใหม่) */
    menu: React.ReactNode
}

/**
 * การ์ดหน้าจัดการกิจกรรม — ไม่ใช่ลิงก์ทั้งใบเหมือนหน้าหลัก เพราะมีปุ่มสามจุดอยู่ข้างใน (ปุ่มซ้อนในลิงก์ไม่ได้)
 * ทางเข้าหลักคือปุ่ม "รายละเอียดเพิ่มเติม"
 */
export function ManageCard({
    tone,
    categories,
    code,
    dateMs,
    coverIcon: CoverIcon,
    badge,
    chip,
    name,
    description,
    stats,
    action,
    menu,
}: ManageCardProps) {
    const tag = categoryTag(categories)
    const ActionIcon = action.icon

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-denim-line bg-white transition-shadow duration-200 hover:shadow-[0_18px_40px_-20px_rgb(18_34_61_/_0.4)]">
            <CardCover
                tone={tone}
                categories={categories}
                code={code}
                dateMs={dateMs}
                topLeft={<CoverPill dotClassName={badge.dotClassName}>{badge.label}</CoverPill>}
                topRight={tag ? <CoverTag variant="outline">{tag}</CoverTag> : undefined}
                bottomRight={CoverIcon ? <CoverIcon className="size-10 text-white/80" aria-hidden="true" /> : undefined}
            />

            <div className="flex flex-1 flex-col gap-3.5 p-5">
                <span className={cn("self-start rounded-full px-3 py-1 text-xs font-semibold", chip.className)}>{chip.label}</span>
                <div className="flex flex-col gap-1.5">
                    <h3 className="line-clamp-2 font-display text-xl font-bold leading-[1.3] text-denim-deep">{name}</h3>
                    {description && <p className="line-clamp-2 text-sm leading-[1.55] text-denim-muted">{description}</p>}
                </div>

                <dl className={cn("mt-auto grid gap-2.5", stats.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                    {stats.map((s) => (
                        <div key={s.label} className="min-w-0 rounded-xl bg-denim-paper px-3 py-2.5">
                            <dt className="font-code text-[11px] tracking-[0.06em] text-denim-muted">{s.label}</dt>
                            <dd className="mt-1 text-sm font-semibold text-denim-deep">
                                {s.value}
                                {s.note && <span className="font-normal text-denim-muted"> · {s.note}</span>}
                            </dd>
                        </div>
                    ))}
                </dl>

                <div className="flex items-center gap-2.5 border-t border-denim-chip pt-4">
                    <Link
                        href={action.href}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-denim-field bg-denim-paper px-3 text-sm font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"
                    >
                        <ActionIcon className="size-4" aria-hidden="true" />
                        {action.label}
                    </Link>
                    {menu}
                </div>
            </div>
        </article>
    )
}
