"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarX, Clock, Info, MapPin } from "lucide-react"
import { Container } from "@/components/layout/container"
import { TerminalPrompt, coverPattern } from "@/components/denim/denim-ui"
import type { SkillScores } from "@/lib/api"
import { categoriesBadgeLabel, getCategory } from "@/lib/categories"
import { registrationBucket } from "@/lib/registration-bucket"
import { MAX_SOFT_SKILL_LEVEL, SOFT_SKILLS } from "@/lib/soft-skills"
import {
    activityStart,
    calendarDaysUntil,
    countdownLabel,
    mascotLine,
    nextStepLabel,
    type UpcomingCandidate,
} from "@/lib/student-home"
import { cn } from "@/lib/utils"

/* หน้าหลักนักศึกษา (/student) ธีม Denim Varsity — แถบทักทายพร้อมมาสคอต, การ์ด "กำลังจะถึง" และไทล์ทักษะ 12 ด้าน
   การ์ดสถิติใต้แถบทักทายใช้ OrganizerStatCards ส่วนการ์ดแนะนำใช้ PublicActivityCard ชุดเดียวกับหน้าอื่น */

export interface HomeRegistration extends UpcomingCandidate {
    id: number
    activity: UpcomingCandidate["activity"] & {
        id: number
        publicId?: string
        name: string
        location: string
        categories?: string[]
    }
}

/* ── แถบทักทาย ───────────────────────────────────────────────────────────── */

/**
 * พื้นยีนส์เรียบ (ไม่มีกรอบเส้นประ/แถบหมากรุก เหมือนหน้ากิจกรรมของฉัน) — OrganizerStatCards ต้องวางต่อท้ายทันที
 * เพราะดึงตัวเองขึ้นมาทับขอบล่าง 64px (-mt-16) ซึ่ง pb-28 เผื่อที่ไว้ให้แล้ว
 * มาสคอตยืนอยู่บนขอบบนของการ์ดสถิติ (bottom-16 = ระยะที่การ์ดทับ) เฉพาะจอกว้างที่วางข้างข้อความได้
 *
 * daysToNext: วันถึงกิจกรรมถัดไป (null = ไม่มี) — undefined = ยังโหลดไม่เสร็จ ไม่แสดงฟองคำพูด กันข้อความผิดกะพริบ
 */
export function StudentHomeHero({ name, daysToNext }: { name: string; daysToNext: number | null | undefined }) {
    const line = daysToNext === undefined ? null : mascotLine(daysToNext)
    return (
        <section className="denim-weave relative overflow-hidden">
            <Container className="relative flex flex-col justify-end pb-28 pt-10 sm:pt-12 lg:min-h-[340px]">
                <div className="flex max-w-2xl flex-col gap-3 lg:max-w-[calc(100%-20rem)]">
                    <TerminalPrompt>~/comp-active/student $ whoami</TerminalPrompt>
                    <h1 className="break-words font-display text-[34px] font-bold leading-[1.15] tracking-[-0.01em] text-white [text-wrap:balance] sm:text-[48px]">
                        สวัสดี <span className="text-amber">{name}</span>
                    </h1>
                    <p className="text-[15px] leading-relaxed text-denim-on sm:text-base">
                        เลือกกิจกรรมที่สนใจ สะสมคะแนน Soft Skills และติดตามการเติบโตของคุณ
                    </p>
                </div>

                <div className="absolute bottom-16 right-6 hidden lg:block xl:right-12">
                    {line && (
                        // ฟองคำพูด — role="status" ให้ screen reader อ่านเมื่อข้อความโผล่หลังโหลดข้อมูลเสร็จ
                        // text-wrap:balance — ไม่งั้นตัดคำไทยแล้วเหลือ "นะ!" ค้างอยู่บรรทัดที่สองตัวเดียว
                        <p
                            role="status"
                            className="absolute right-[calc(100%-14px)] top-5 w-[210px] rounded-[18px_18px_4px_18px] bg-white px-4 py-3 text-sm font-semibold leading-snug text-denim-deep shadow-[0_10px_24px_-10px_rgb(0_0_0/0.4)] [text-wrap:balance]"
                        >
                            {line.before}
                            <span className="text-amber-ink">{line.highlight}</span>
                            {line.after}
                        </p>
                    )}
                    <Image
                        src="/mascot-laptop.png"
                        alt=""
                        width={476}
                        height={1033}
                        sizes="110px"
                        priority
                        className="mascot-bob h-[236px] w-auto drop-shadow-[0_18px_26px_rgb(0_0_0/0.35)]"
                    />
                </div>
            </Container>
        </section>
    )
}

/** ลิงก์ "ดูทั้งหมด →" มุมขวาของหัวข้อส่วน */
export function HeadingLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-denim-deep transition-colors hover:text-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
        >
            {children}
            <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
    )
}

/* ── การ์ด "กำลังจะถึง" ─────────────────────────────────────────────────────── */

const PILL: Record<"pending" | "confirmed", { label: string; className: string }> = {
    pending: { label: "รอยืนยัน", className: "bg-amber/20 text-amber-ink" },
    confirmed: { label: "ยืนยันแล้ว", className: "bg-emerald-50 text-emerald-700" },
}

/** "16" + "ต.ค." ตามเวลาไทย */
function dayMonth(iso: string): { day: string; month: string } | null {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return {
        day: new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "Asia/Bangkok" }).format(d),
        month: new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "Asia/Bangkok" }).format(d),
    }
}

/** รายการที่ลงทะเบียนไว้และยังไม่ถึงวัน — ส่งมาเฉพาะที่ผ่าน selectUpcoming (รอยืนยัน/ยืนยันแล้ว) */
export function UpcomingCard({ reg, now }: { reg: HomeRegistration; now: Date }) {
    const a = reg.activity
    const bucket = registrationBucket(reg) === "confirmed" ? "confirmed" : "pending"
    const start = activityStart(a)
    const date = dayMonth(start)
    const days = calendarDaysUntil(start, now)
    const category = getCategory(a.categories?.[0])
    const pill = PILL[bucket]

    return (
        <Link
            href={`/student/activities/${a.publicId}`}
            className="group flex min-w-0 overflow-hidden rounded-[18px] border border-denim-line bg-white transition-[border-color,box-shadow] hover:border-denim-dash hover:shadow-[0_14px_28px_-20px_rgb(18_34_61/0.5)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
        >
            <div
                className={cn(
                    "flex w-[88px] shrink-0 flex-col items-center justify-center gap-1 px-2 py-3 text-white sm:w-24",
                    coverPattern("open", a.categories ?? [])
                )}
            >
                <span className="font-display text-[34px] font-bold leading-none">{date?.day ?? "–"}</span>
                <span className="text-xs font-semibold text-white/80">{date?.month}</span>
                {days !== null && (
                    <span className="mt-1.5 whitespace-nowrap rounded-md bg-amber px-1.5 py-0.5 font-code text-[11px] font-semibold text-denim-deep">
                        {countdownLabel(days)}
                    </span>
                )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate font-display text-lg font-bold leading-snug text-denim-deep group-hover:underline group-hover:underline-offset-4">
                        {a.name}
                    </h3>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", pill.className)}>{pill.label}</span>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-denim-ink">
                    {category && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className={cn("size-2 shrink-0 rounded-full", category.dot)} aria-hidden="true" />
                            {categoriesBadgeLabel(a.categories)}
                        </span>
                    )}
                    {a.startTime && (
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="size-3.5 shrink-0 text-denim-accent" aria-hidden="true" />
                            {a.startTime}
                        </span>
                    )}
                    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0 text-denim-accent" aria-hidden="true" />
                        <span className="truncate">{a.location || "ไม่ระบุสถานที่"}</span>
                    </span>
                </div>
                <p className="font-code text-[11px] text-denim-muted">ขั้นถัดไป: {nextStepLabel(bucket)}</p>
            </div>
        </Link>
    )
}

export function UpcomingCardSkeleton() {
    return (
        <div className="flex h-[118px] overflow-hidden rounded-[18px] border border-denim-line bg-white" aria-hidden="true">
            <div className="w-[88px] animate-pulse bg-denim-chip sm:w-24" />
            <div className="flex flex-1 flex-col justify-center gap-2.5 p-4">
                <div className="h-5 w-1/2 animate-pulse rounded-md bg-denim-chip" />
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-denim-paper" />
                <div className="h-3 w-1/3 animate-pulse rounded-md bg-denim-paper" />
            </div>
        </div>
    )
}

/** ยังไม่มีกิจกรรมที่จะถึง — ชวนไปหน้ากิจกรรมทั้งหมด */
export function UpcomingEmpty() {
    return (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-denim-line px-6 py-8 text-center">
            <CalendarX className="size-8 text-denim-accent" aria-hidden="true" />
            <p className="font-semibold text-denim-deep">ยังไม่มีกิจกรรมที่จะถึง</p>
            <p className="text-sm text-denim-muted">ลงทะเบียนกิจกรรมที่สนใจเพื่อเริ่มสะสมคะแนนทักษะ</p>
            <Link
                href="/student/events"
                className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-denim-deep px-5 text-sm font-semibold text-white transition-colors hover:bg-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
                ดูกิจกรรมทั้งหมด
                <ArrowRight className="size-4 text-amber" aria-hidden="true" />
            </Link>
        </div>
    )
}

/* ── ทักษะ 12 ด้าน ───────────────────────────────────────────────────────── */

/** ความยาวแถบ = ค่าเฉลี่ย / ระดับสูงสุด (ดีเยี่ยม) — ใช้ร่วมกับตารางทักษะในหน้าโปรไฟล์ */
export function skillBarPercent(v: number): number {
    return Math.max(0, Math.min((v / MAX_SOFT_SKILL_LEVEL) * 100, 100))
}

function formatScore(v: number): string {
    return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** จำนวนทักษะที่มีคะแนนแล้ว (ค่าเฉลี่ย > 0) — ใช้ทั้งหัวข้อและตัดสินว่าจะแสดงแถบแจ้ง "ยังไม่มีคะแนน" */
export function scoredSkillCount(average: SkillScores | undefined): number {
    return SOFT_SKILLS.filter((s) => (average?.[s.field] ?? 0) > 0).length
}

export function NoSkillScoresNotice() {
    return (
        <p className="flex items-start gap-2.5 rounded-xl bg-amber/15 px-4 py-3 text-sm leading-relaxed text-denim-ink">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden="true" />
            ยังไม่มีคะแนนทักษะ — เข้าร่วมกิจกรรมและรอผู้จัดประเมิน คะแนนจะแสดงที่นี่โดยอัตโนมัติ
        </p>
    )
}

/**
 * ไทล์ทักษะ: จอกว้างเรียง ไอคอน | ชื่อ | คะแนน ในแถวเดียวตามดีไซน์ — มือถือ (2 คอลัมน์ ~150px) ชื่อทักษะยาวๆ
 * จะเหลือที่ไม่ถึง 50px จึงย้ายชื่อลงไปบรรทัดใต้ไอคอนแทน (จัดด้วย grid ตัวเดียว ไม่ต้องมีชื่อซ้ำสองชุด)
 */
export function SkillTiles({ average }: { average?: SkillScores }) {
    return (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SOFT_SKILLS.map((s) => {
                const v = average?.[s.field] ?? 0
                const Icon = s.icon
                return (
                    <li
                        key={s.value}
                        className="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr_auto] items-center gap-x-3 gap-y-2.5 rounded-2xl border border-denim-line bg-white p-3.5 shadow-[0_3px_0_var(--color-denim-line)] sm:grid-cols-[auto_1fr_auto] sm:grid-rows-[1fr_auto] sm:p-4"
                    >
                        <span className="col-start-1 row-start-1 grid size-9 place-items-center rounded-xl bg-denim-paper">
                            <Icon className="size-[18px] text-denim" aria-hidden="true" />
                        </span>
                        <span className="col-span-2 row-start-2 self-start text-[13px] font-semibold leading-snug text-denim-deep sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:self-center">
                            {s.label}
                        </span>
                        <span className="col-start-2 row-start-1 justify-self-end font-code text-xs font-semibold tabular-nums text-denim-muted sm:col-start-3">
                            <span className="sr-only">คะแนนเฉลี่ย </span>
                            {formatScore(v)}
                        </span>
                        <span
                            className="col-span-2 row-start-3 h-1.5 overflow-hidden rounded-full bg-denim-chip sm:col-span-3 sm:row-start-2"
                            aria-hidden="true"
                        >
                            <span
                                className="block h-full rounded-full bg-denim transition-[width] duration-700"
                                style={{ width: `${skillBarPercent(v)}%` }}
                            />
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}

export function SkillTilesSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
            {SOFT_SKILLS.map((s) => (
                <div key={s.value} className="h-[78px] animate-pulse rounded-2xl bg-denim-paper" />
            ))}
        </div>
    )
}
