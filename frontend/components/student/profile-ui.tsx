"use client"

import { useId } from "react"
import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, BarChart3, FileCheck2, FileDown, FileText, Loader2, Lock, UserRound } from "lucide-react"
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts"
import { Container } from "@/components/layout/container"
import { AmberAvatarPatch, DenimInfoChip, TerminalPrompt, nameInitial } from "@/components/denim/denim-ui"
import { skillBarPercent } from "@/components/student/student-home-ui"
import { formatEventDate } from "@/components/ui/event-card"
import type { SkillScores, SkillsData } from "@/lib/api"
import { MAX_SOFT_SKILL_LEVEL, SOFT_SKILLS, softSkillLabelByField, softSkillTierLabel } from "@/lib/soft-skills"
import { formatThaiDate, formatTranscriptCode, type TranscriptListItem } from "@/lib/transcript"
import { cn } from "@/lib/utils"

/* หน้าโปรไฟล์นักศึกษา (/student/profile) ธีม Denim Varsity — แถบหัวโปรไฟล์ + แท็บ, กราฟเรดาร์คู่ตารางทักษะ,
   ผลประเมินรายกิจกรรม และเอกสารที่ออกแล้ว สถานะ/การโหลดข้อมูล/ฟอร์มแก้ไขอยู่ที่ page.tsx */

export type ProfileTab = "softskills" | "edit"

/* ── แถบหัวโปรไฟล์ ───────────────────────────────────────────────────────── */

const TABS: { value: ProfileTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
    { value: "softskills", label: "Soft Skills", shortLabel: "Soft Skills", icon: BarChart3 },
    { value: "edit", label: "แก้ไขข้อมูลส่วนตัว", shortLabel: "แก้ไขข้อมูล", icon: UserRound },
]

/** สถิติ 3 ช่องในการ์ดโปรไฟล์บนมือถือ (จอกว้างแสดงเป็นการ์ดสถิติใต้หัวข้อ Soft Skills Dashboard แทน) */
export interface ProfileSummaryItem {
    code: string
    value: string
    note: string
    /** ชื่อสถิติภาษาไทยสำหรับ screen reader (ป้ายโค้ดภาษาอังกฤษซ่อนไว้) */
    label: string
}

export const profileTabId = (tab: ProfileTab) => `profile-tab-${tab}`
export const profilePanelId = (tab: ProfileTab) => `profile-panel-${tab}`

/**
 * พื้นยีนส์เรียบ — อวตารแบบป้ายปักสีอำพัน ชื่อ ชิปรหัส/อีเมล และแท็บวางชิดขอบล่างของแถบ
 * มาสคอตโบกมือโผล่แค่ครึ่งบน (ส่วนล่างถูก overflow-hidden ของแถบตัดไป) เฉพาะจอกว้าง
 */
export function ProfileHero({
    name,
    studentId,
    email,
    tab,
    onTabChange,
    summary,
}: {
    name: string
    studentId?: string | null
    email?: string | null
    tab: ProfileTab
    onTabChange: (tab: ProfileTab) => void
    summary: ProfileSummaryItem[]
}) {
    return (
        // จอแคบ: ไม่มีแถบยีนส์เต็มจอ (ชื่อหน้าอยู่บน MobileAppBar) — เหลือการ์ดยีนส์ในหน้า + แท็บเต็มความกว้าง
        // แท็บเป็นชุดเดียวกันทุกจอ (id ของแท็บ/แผงต้องไม่ซ้ำ) จัดหน้าตาต่างกันด้วยคลาสตามจอ
        <section className="denim-weave relative overflow-hidden max-lg:bg-transparent max-lg:bg-none">
            <Container className="relative pt-4 sm:pt-6 lg:pt-10">
                <ProfileMobileCard name={name} studentId={studentId} email={email} summary={summary} />

                <div className="flex flex-col gap-5 max-lg:hidden sm:flex-row sm:items-center sm:gap-6 lg:pr-60">
                    <AmberAvatarPatch initial={nameInitial(name)} framed />
                    <div className="flex min-w-0 flex-col gap-2">
                        <TerminalPrompt>~/comp-active/student $ cat profile</TerminalPrompt>
                        <h1 className="break-words font-display text-[32px] font-bold leading-[1.15] tracking-[-0.01em] text-white sm:text-[44px]">
                            {name}
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            <DenimInfoChip label="id" value={studentId || "ไม่ระบุ"} />
                            <DenimInfoChip label="mail" value={email || "ไม่ระบุ"} />
                        </div>
                    </div>
                </div>

                <div
                    role="tablist"
                    aria-label="ส่วนของโปรไฟล์"
                    className="relative z-[1] mt-4 flex w-full gap-1 rounded-[20px] border border-denim-line bg-white p-1.5 lg:mt-8 lg:inline-flex lg:w-auto lg:max-w-full lg:border-0 lg:shadow-[0_18px_34px_-18px_rgb(18_34_61/0.6)]"
                >
                    {TABS.map(({ value, label, shortLabel, icon: Icon }) => {
                        const active = tab === value
                        return (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                id={profileTabId(value)}
                                aria-selected={active}
                                aria-controls={profilePanelId(value)}
                                onClick={() => onTabChange(value)}
                                className={cn(
                                    "inline-flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim sm:px-6 lg:flex-none",
                                    active ? "bg-denim-deep text-white" : "text-denim-ink hover:bg-denim-paper hover:text-denim-deep"
                                )}
                            >
                                <Icon className={cn("size-4 shrink-0 max-lg:hidden", active && "text-amber")} aria-hidden="true" />
                                <span className="lg:hidden">{shortLabel}</span>
                                <span className="max-lg:hidden">{label}</span>
                            </button>
                        )
                    })}
                </div>

                <Image
                    src="/mascot-wave.png"
                    alt=""
                    width={421}
                    height={900}
                    sizes="170px"
                    priority
                    className="pointer-events-none absolute right-8 top-14 hidden h-[360px] w-auto drop-shadow-[0_18px_26px_rgb(0_0_0/0.35)] lg:block xl:right-16"
                />
            </Container>
        </section>
    )
}

/** การ์ดโปรไฟล์บนจอแคบ — อวตารอำพัน + ชื่อ/รหัส/อีเมล + สถิติ 3 ช่องบนพื้นยีนส์ (จอกว้างใช้แถบยีนส์เต็มจอแทน) */
function ProfileMobileCard({
    name,
    studentId,
    email,
    summary,
}: {
    name: string
    studentId?: string | null
    email?: string | null
    summary: ProfileSummaryItem[]
}) {
    return (
        <div className="denim-weave rounded-[26px] p-5 text-white shadow-[0_18px_34px_-22px_rgb(18_34_61/0.7)] lg:hidden">
            <div className="flex items-center gap-4">
                <AmberAvatarPatch initial={nameInitial(name)} className="size-[72px] rounded-[20px] text-[34px] sm:text-[34px]" />
                <div className="min-w-0">
                    <h1 className="break-words font-display text-[22px] font-bold leading-tight">{name}</h1>
                    <p className="mt-1 truncate font-code text-xs text-denim-on">
                        <span className="text-amber">id</span> {studentId || "ไม่ระบุ"}
                    </p>
                    <p className="truncate font-code text-xs text-denim-on">{email || "ไม่ระบุอีเมล"}</p>
                </div>
            </div>
            <ul className="mt-5 grid grid-cols-3 gap-2">
                {summary.map((item) => (
                    <li key={item.code} className="min-w-0 rounded-2xl border border-white/10 bg-denim-deep/45 px-3 py-2.5">
                        <span className="block truncate font-code text-[10px] tracking-[0.06em] text-denim-on-soft" aria-hidden="true">
                            {item.code}
                        </span>
                        <span className="mt-0.5 block font-display text-[22px] font-bold leading-none tabular-nums text-white">
                            <span className="sr-only">{item.label} </span>
                            {item.value}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-denim-on">{item.note}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

/* ── ปุ่มส่งออกเอกสาร ─────────────────────────────────────────────────────── */

export function ExportTranscriptButton({
    canExport,
    loading,
    exporting,
    onExport,
}: {
    canExport: boolean
    loading: boolean
    exporting: boolean
    onExport: () => void
}) {
    const noteId = useId()
    const showNote = !loading && !canExport
    return (
        <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
                type="button"
                onClick={onExport}
                disabled={!canExport || exporting}
                aria-describedby={showNote ? noteId : undefined}
                className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-[12px] px-5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim",
                    canExport
                        ? "bg-denim-deep text-white hover:bg-denim disabled:opacity-70"
                        : "cursor-not-allowed border border-denim-line bg-denim-chip text-denim-muted"
                )}
            >
                {exporting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : canExport ? (
                    <FileDown className="size-4 text-amber" aria-hidden="true" />
                ) : (
                    <Lock className="size-4" aria-hidden="true" />
                )}
                ส่งออกเอกสารรับรอง (PDF)
            </button>
            {showNote && (
                <p id={noteId} className="max-w-sm text-xs text-denim-muted sm:max-w-md sm:text-right">
                    ต้องมีผลประเมินที่อนุมัติแล้วอย่างน้อย 1 กิจกรรมจึงจะออกเอกสารได้
                </p>
            )}
        </div>
    )
}

/* ── เรดาร์ + ตารางทักษะ ──────────────────────────────────────────────────── */

const pad2 = (n: number) => String(n).padStart(2, "0")

/** ค่าเฉลี่ยทศนิยมไม่เกิน 2 ตำแหน่ง — ตรงกับตัวเลขในเอกสารรับรอง (PDF) ที่แสดง toFixed(2) */
function formatAverage(v: number): string {
    return v.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

export function SkillRadarPanel({ skills, loading }: { skills: SkillsData | null; loading: boolean }) {
    const average: Partial<SkillScores> = skills?.average ?? {}
    const values = SOFT_SKILLS.map((s) => average[s.field] ?? 0)
    const top = Math.max(0, ...values)
    // เต็มสเกล = ระดับสูงสุด (ดีเยี่ยม) — เผื่อข้อมูลเก่าที่ค่าเกินมา กราฟจะขยายตามแทนการล้นกรอบ
    const domainMax = Math.max(MAX_SOFT_SKILL_LEVEL, top)
    const count = skills?.count ?? 0
    const data = SOFT_SKILLS.map((s, i) => ({ n: pad2(i + 1), v: values[i] }))
    // จุดเด่น/ควรพัฒนา = ทักษะค่าเฉลี่ยสูงสุด/ต่ำสุด (ต่ำสุดนับทักษะที่ยังไม่เคยได้คะแนนด้วย) — ทุกด้านเท่ากันไม่มีอะไรเด่น ไม่แสดง
    const strongest = values.indexOf(top)
    const weakest = values.indexOf(Math.min(...values))
    const hasHighlights = !loading && count > 0 && values[strongest] > values[weakest]

    return (
        <section
            aria-labelledby="skills-table-heading"
            className="grid overflow-hidden rounded-[24px] border border-denim-line bg-white shadow-[0_14px_34px_-28px_rgb(18_34_61/0.45)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]"
        >
            {/* เรดาร์ — ตัวเลขรอบกราฟตรงกับลำดับในตาราง (ตารางคือข้อมูลชุดเดียวกันที่ screen reader อ่านได้)
                จอกว้าง: พื้นยีนส์เข้ม · จอแคบ: พื้นขาวต่อกับหัวการ์ด (สีของกราฟสลับด้วยตัวแปร CSS — กราฟชุดเดียว ไม่วาดสองรอบ) */}
            <div
                className="denim-weave-deep flex flex-col p-5 text-white [--radar-dot:var(--color-denim-deep)] [--radar-grid:rgb(18_34_61/0.12)] [--radar-strong:#047857] [--radar-tick:var(--color-denim-muted)] [--radar-weak:var(--color-amber-ink)] max-lg:bg-white max-lg:bg-none max-lg:pb-2 max-lg:text-denim-deep sm:p-6 lg:[--radar-dot:var(--color-amber)] lg:[--radar-grid:rgb(255_255_255/0.2)] lg:[--radar-strong:#6ee7b7] lg:[--radar-tick:var(--color-denim-on-soft)] lg:[--radar-weak:var(--color-amber)]"
                aria-hidden="true"
            >
                <div className="flex items-start justify-between gap-3 font-code text-xs">
                    <span className="text-denim-accent lg:text-amber">{"// radar(skills[12])"}</span>
                    <span className="text-denim-muted lg:text-denim-on-soft">max {top > 0 ? formatAverage(top) : "—"}</span>
                </div>
                <p className="mt-1 font-display text-xl font-bold lg:hidden">Soft Skills Dashboard</p>
                <div className="h-[280px] sm:h-[340px]">
                    {!loading && (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={data} outerRadius="74%">
                                <PolarGrid stroke="var(--radar-grid)" />
                                <PolarAngleAxis
                                    dataKey="n"
                                    tick={(props: { x: number | string; y: number | string; textAnchor: string; index: number; payload: { value: unknown } }) => {
                                        const i = props.index
                                        const fill = !hasHighlights
                                            ? "var(--radar-tick)"
                                            : i === strongest
                                              ? "var(--radar-strong)"
                                              : i === weakest
                                                ? "var(--radar-weak)"
                                                : "var(--radar-tick)"
                                        return (
                                            <text
                                                x={props.x}
                                                y={props.y}
                                                textAnchor={props.textAnchor as "start" | "middle" | "end"}
                                                dominantBaseline="central"
                                                fill={fill}
                                                fontSize={11}
                                                fontWeight={hasHighlights && (i === strongest || i === weakest) ? 700 : 400}
                                                fontFamily="var(--font-code)"
                                            >
                                                {String(props.payload.value)}
                                            </text>
                                        )
                                    }}
                                />
                                <PolarRadiusAxis domain={[0, domainMax]} tick={false} axisLine={false} />
                                <Radar
                                    dataKey="v"
                                    stroke="var(--color-amber)"
                                    strokeWidth={2}
                                    fill="var(--color-amber)"
                                    fillOpacity={0.25}
                                    dot={{ r: 3, fill: "var(--radar-dot)", strokeWidth: 0 }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <p className="mt-auto text-center text-[13px] text-denim-muted lg:text-denim-on">
                    {loading
                        ? "กำลังโหลด..."
                        : count === 0
                          ? "กราฟจะขยายออกเมื่อได้รับผลประเมินจากกิจกรรม"
                          : `ค่าเฉลี่ยจาก ${count.toLocaleString("th-TH")} กิจกรรม · เต็ม ${MAX_SOFT_SKILL_LEVEL}`}
                </p>
            </div>

            {/* จอแคบ: สรุปจุดเด่น/ควรพัฒนาใต้เรดาร์ — จอกว้างเห็นตารางคู่กับกราฟอยู่แล้ว */}
            {hasHighlights && (
                <div className="grid grid-cols-2 gap-3 px-5 pb-1 pt-2 sm:px-6 lg:hidden">
                    <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-3">
                        <p className="font-code text-[11px] text-emerald-700">จุดเด่น · {pad2(strongest + 1)}</p>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-denim-deep">{SOFT_SKILLS[strongest].label}</p>
                        <p className="mt-1 font-code text-xs font-semibold text-emerald-700">เฉลี่ย {formatAverage(values[strongest])}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-amber/30 bg-amber/10 px-3.5 py-3">
                        <p className="font-code text-[11px] text-amber-ink">ควรพัฒนา · {pad2(weakest + 1)}</p>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-denim-deep">{SOFT_SKILLS[weakest].label}</p>
                        <p className="mt-1 font-code text-xs font-semibold text-amber-ink">เฉลี่ย {formatAverage(values[weakest])}</p>
                    </div>
                </div>
            )}

            <div className="p-5 sm:p-6">
                <h3 id="skills-table-heading" className="sr-only">
                    คะแนนเฉลี่ยรายทักษะ
                </h3>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-denim-line font-code text-[11px] text-denim-muted">
                            <th scope="col" className="w-9 pb-2 font-normal">
                                #
                            </th>
                            <th scope="col" className="pb-2 font-normal">
                                ทักษะ
                            </th>
                            <th scope="col" className="w-16 pb-2 font-normal sm:w-28">
                                ระดับ
                            </th>
                            <th scope="col" className="w-12 pb-2 text-right font-normal">
                                เฉลี่ย
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {SOFT_SKILLS.map((s, i) => {
                            const v = values[i]
                            return (
                                <tr key={s.value}>
                                    <td className="py-[7px] font-code text-xs text-denim-accent">{pad2(i + 1)}</td>
                                    <th scope="row" className="py-[7px] pr-3 text-sm font-semibold leading-snug text-denim-deep">
                                        {/* มือถือตัดคำว่า "ทักษะ" ที่ซ้ำทุกแถว (หัวคอลัมน์บอกแล้ว) ชื่อยาวๆ จะได้ไม่ขึ้นสองบรรทัด */}
                                        <span className="max-sm:hidden">ทักษะ</span>
                                        {s.label.replace(/^ทักษะ/, "")}
                                    </th>
                                    <td className="py-[7px] pr-3">
                                        <span className="block h-1.5 overflow-hidden rounded-full bg-denim-chip" aria-hidden="true">
                                            <span
                                                className="block h-full rounded-full bg-denim transition-[width] duration-700"
                                                style={{ width: `${skillBarPercent(v)}%` }}
                                            />
                                        </span>
                                    </td>
                                    <td className="py-[7px] text-right font-code text-sm font-semibold tabular-nums text-denim-deep">
                                        {loading ? "–" : formatAverage(v)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

/* ── ผลประเมินรายกิจกรรม ───────────────────────────────────────────────────── */

export function AssessmentsEmpty() {
    return (
        <div className="flex flex-col gap-4 rounded-[18px] border border-dashed border-denim-field bg-denim-paper/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="font-semibold text-denim-deep">ยังไม่มีผลประเมิน Soft Skills จากกิจกรรมใด ๆ เลย</p>
                <p className="mt-1 font-code text-xs text-denim-muted">assessments: []</p>
            </div>
            <Link
                href="/student/events"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-denim-deep px-5 text-sm font-semibold text-white transition-colors hover:bg-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
                หากิจกรรมเข้าร่วม
                <ArrowRight className="size-4 text-amber" aria-hidden="true" />
            </Link>
        </div>
    )
}

/** ผลประเมินหนึ่งกิจกรรม — ทักษะที่ได้พร้อมป้ายระดับ (ผ่าน/ดี/ดีเยี่ยม) และวันที่ประเมิน */
export function AssessmentRow({ entry }: { entry: NonNullable<SkillsData["history"]>[number] }) {
    const awarded = Object.entries(entry.scores).filter(([, v]) => v > 0)
    return (
        <li className="flex flex-col gap-3 rounded-[18px] border border-denim-line p-4 transition-colors hover:border-denim-dash sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="min-w-0">
                <h4 className="font-display text-lg font-bold leading-snug text-denim-deep">{entry.activityName}</h4>
                {awarded.length > 0 ? (
                    <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="ทักษะที่ได้รับ">
                        {awarded.map(([field, v]) => (
                            <li
                                key={field}
                                className="inline-flex items-center gap-1.5 rounded-full bg-denim-chip px-3 py-1 text-xs font-semibold text-denim-deep"
                            >
                                {softSkillLabelByField(field)}
                                <span className="rounded-full bg-white px-1.5 py-px text-[11px] text-denim-accent">
                                    {softSkillTierLabel(v)}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-1.5 text-xs text-denim-muted">ไม่มีทักษะที่ได้รับในการประเมินนี้</p>
                )}
            </div>
            <p className="shrink-0 font-code text-xs text-denim-muted sm:pt-1.5">{formatEventDate(entry.date)}</p>
        </li>
    )
}

/* ── เอกสารที่ออกแล้ว ─────────────────────────────────────────────────────── */

export function IssuedTranscriptsPanel({
    items,
    onOpen,
    onRevoke,
}: {
    items: TranscriptListItem[]
    onOpen: (code: string) => void
    onRevoke: (code: string) => void
}) {
    return (
        <section
            aria-labelledby="transcripts-heading"
            className="rounded-[24px] border border-denim-line bg-white p-5 shadow-[0_14px_34px_-28px_rgb(18_34_61/0.45)] sm:p-7"
        >
            <div className="flex items-start gap-3.5">
                <span className="denim-weave grid size-12 shrink-0 place-items-center rounded-[14px]" aria-hidden="true">
                    <FileCheck2 className="size-5 text-amber" />
                </span>
                <div className="min-w-0">
                    <h2 id="transcripts-heading" className="font-display text-2xl font-bold leading-tight text-denim-deep">
                        เอกสารที่ออกแล้ว
                    </h2>
                    <p className="mt-1 text-sm text-denim-muted">
                        ผู้รับเอกสารตรวจสอบความถูกต้องได้ด้วย QR หรือเลขที่เอกสาร ยกเลิกเมื่อไรก็ได้ เอกสารที่ยกเลิกจะตรวจสอบไม่ผ่านทันที
                    </p>
                </div>
            </div>

            {items.length === 0 ? (
                <p className="mt-5 rounded-[18px] border border-dashed border-denim-field bg-denim-paper/60 px-5 py-6 text-center text-sm text-denim-muted">
                    ยังไม่มีเอกสารที่ออก กดปุ่ม “ส่งออกเอกสารรับรอง (PDF)” ด้านบนเพื่อออกฉบับแรก
                </p>
            ) : (
                <ul className="mt-5 divide-y divide-denim-line rounded-[18px] border border-denim-line">
                    {items.map((item) => {
                        const revoked = item.revokedAt !== null
                        return (
                            <li key={item.code} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-denim-chip text-denim" aria-hidden="true">
                                        <FileText className="size-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className={cn("font-code text-sm font-semibold text-denim-deep", revoked && "line-through decoration-denim-muted")}>
                                            {formatTranscriptCode(item.code)}
                                        </p>
                                        <p className="text-xs text-denim-muted">
                                            ออกเมื่อ {formatThaiDate(item.issuedAt)} · {item.activityCount} กิจกรรม ·{" "}
                                            {item.totalScore.toLocaleString("th-TH")} แต้ม
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {revoked ? (
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            ยกเลิกแล้ว {formatThaiDate(item.revokedAt as string)}
                                        </span>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onOpen(item.code)}
                                                className="inline-flex min-h-10 items-center rounded-[10px] border-[1.5px] border-denim-field bg-white px-3.5 text-sm font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                                            >
                                                เปิด / พิมพ์อีกครั้ง
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onRevoke(item.code)}
                                                className="inline-flex min-h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                                            >
                                                ยกเลิก
                                            </button>
                                        </>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
