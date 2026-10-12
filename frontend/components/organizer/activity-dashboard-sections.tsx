"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, CalendarDays, Check, Clock, Copy, Download, MapPin, Search, Users } from "lucide-react"
import { Container } from "@/components/layout/container"
import { AMBER_BUTTON, DenimSectionHeading, TerminalPrompt } from "@/components/denim/denim-ui"
import { cn } from "@/lib/utils"

/* ชิ้นส่วนแดชบอร์ดของกิจกรรมหนึ่งรายการ (/organizer/activities/:id/dashboard) ธีม Denim Varsity —
   ตัวเลข/การนับ/การ export อยู่ที่หน้า ไฟล์นี้วาดอย่างเดียว */

/** การ์ดขาวของแต่ละส่วน */
export const DASHBOARD_CARD = "rounded-[22px] border border-denim-line bg-white p-5 sm:p-6"

/* ── แถบหัวหน้า ──────────────────────────────────────────────────────────── */

function MetaChip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-2.5 py-1 text-[13px] text-denim-on">
            <Icon className="size-3.5 shrink-0 text-denim-on-muted" aria-hidden="true" />
            {children}
        </span>
    )
}

interface DashboardHeroProps {
    activityId: number
    title: string
    /** "กิจกรรมย่อยของงาน" / "กิจกรรมเดี่ยว" */
    kindLabel: string
    dateLabel: string
    timeLabel: string
    location: string
    manageHref: string
}

/** แถบยีนส์ด้านบน — การ์ดสถิติ (OrganizerStatCards, -mt-16) ดึงขึ้นมาทับขอบล่าง จึงเผื่อ padding ล่างไว้ */
export function ActivityDashboardHero({ activityId, title, kindLabel, dateLabel, timeLabel, location, manageHref }: DashboardHeroProps) {
    return (
        <section className="denim-weave">
            <Container className="flex flex-col gap-5 pb-24 pt-6 sm:pb-28">
                <Link
                    href={manageHref}
                    className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border-[1.5px] border-white/40 px-4 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-white"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" /> กลับไปหน้าจัดการกิจกรรม
                </Link>

                <div className="flex flex-wrap items-end justify-between gap-5">
                    <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <TerminalPrompt>{`~/activities/${activityId}/dashboard`}</TerminalPrompt>
                            <span className="rounded-full bg-denim-on px-2.5 py-0.5 text-[11px] font-semibold text-denim-deep">{kindLabel}</span>
                        </div>
                        {/* pt-1 + leading 1.2 กันสระ/วรรณยุกต์ไทยบรรทัดแรกโดนตัด */}
                        <h1 className="pt-1 font-display text-4xl font-bold leading-[1.2] text-white sm:text-5xl">{title}</h1>
                        <div className="flex flex-wrap gap-2">
                            <MetaChip icon={CalendarDays}>{dateLabel}</MetaChip>
                            {timeLabel && <MetaChip icon={Clock}>{timeLabel}</MetaChip>}
                            <MetaChip icon={MapPin}>{location || "-"}</MetaChip>
                        </div>
                    </div>
                    <Link href={manageHref} className={cn(AMBER_BUTTON, "min-h-12 px-5 text-[15px]")}>
                        <Users className="size-[18px]" aria-hidden="true" />
                        ไปหน้าจัดการผู้เข้าร่วม
                    </Link>
                </div>
            </Container>
        </section>
    )
}

/* ── เส้นทางผู้เข้าร่วม ────────────────────────────────────────────────────── */

/** แถบสัดส่วน ลงทะเบียน → ยืนยัน → เช็คอิน เทียบกับจำนวนผู้ลงทะเบียน (ไม่นับที่ยกเลิก) */
export function PipelineCard({ registered, confirmed, attended }: { registered: number; confirmed: number; attended: number }) {
    const pct = (n: number) => (registered > 0 ? Math.min(100, (n / registered) * 100) : 0)
    const rows = [
        { label: "ลงทะเบียน", value: registered, width: pct(registered), fill: "bg-denim-dash" },
        { label: "ยืนยันแล้ว", value: confirmed, width: pct(confirmed), fill: "bg-denim" },
        { label: "เช็คอินแล้ว", value: attended, width: pct(attended), fill: "bg-amber" },
    ]

    return (
        <section aria-labelledby="dashboard-pipeline" className={DASHBOARD_CARD}>
            <DenimSectionHeading
                size="card"
                id="dashboard-pipeline"
                comment="pipeline"
                title="เส้นทางผู้เข้าร่วม"
                action={<p className="font-code text-xs text-denim-muted">ลงทะเบียน → ยืนยัน → เช็คอิน</p>}
            />
            <dl className="mt-5 space-y-3.5">
                {rows.map((r) => (
                    <div key={r.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_5rem] sm:gap-4">
                        <dt className="text-sm font-semibold text-denim-ink">{r.label}</dt>
                        <dd className="h-3.5 overflow-hidden rounded-full bg-denim-paper" aria-hidden="true">
                            <div className={cn("h-full rounded-full transition-[width] duration-700", r.fill)} style={{ width: `${r.width}%` }} />
                        </dd>
                        <dd className="text-right font-display text-base font-bold tabular-nums text-denim-deep">{r.value} คน</dd>
                    </div>
                ))}
            </dl>
            {registered === 0 && (
                <p className="mt-5 rounded-xl bg-denim-paper px-4 py-3 text-sm text-denim-muted">
                    ยังไม่มีข้อมูล — แถบจะเติมเมื่อมีนักศึกษาลงทะเบียนและเช็คอิน
                </p>
            )}
        </section>
    )
}

/* ── Export ─────────────────────────────────────────────────────────────── */

export interface ExportItem {
    key: string
    /** ชื่อไฟล์แบบโค้ดมุมขวาบน เช่น registrants.csv */
    file: string
    icon: LucideIcon
    title: string
    note: string
    onExport: () => void
    /** ไม่มีแถวให้ export ตอนนี้ — ปุ่มปิดไว้แต่หน้าตาการ์ดปกติ */
    empty: boolean
    /** ส่วนนี้ไม่เกี่ยวกับกิจกรรมนี้เลย (เช่น ไม่มีคำถามลงทะเบียน) — การ์ดจางลงและบอกว่าไม่มีข้อมูล */
    notApplicable?: boolean
}

export function ExportCard({ items, onExportAll, exportAllDisabled }: { items: ExportItem[]; onExportAll: () => void; exportAllDisabled: boolean }) {
    return (
        <section aria-labelledby="dashboard-export" className={DASHBOARD_CARD}>
            <DenimSectionHeading
                size="card"
                id="dashboard-export"
                comment="export --format=csv"
                title="Export ข้อมูล (CSV)"
                description="เลือก export เฉพาะส่วนที่ต้องการ หรือ export ทั้งหมด"
                action={
                    <button
                        type="button"
                        onClick={onExportAll}
                        disabled={exportAllDisabled}
                        title="ไฟล์เดียวรวมทุกคอลัมน์: ข้อมูลติดต่อ คำตอบตอนลงทะเบียน คำขอใบจิตอาสา สถานะ และการเช็คอิน"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-denim-deep px-5 text-sm font-semibold text-white transition-colors hover:bg-denim disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download className="size-4" aria-hidden="true" /> Export ทั้งหมด
                    </button>
                }
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {items.map(({ key, file, icon: Icon, title, note, onExport, empty, notApplicable }) => (
                    <div
                        key={key}
                        className={cn(
                            "flex flex-col gap-3 rounded-2xl border border-denim-line p-4",
                            notApplicable ? "bg-denim-paper" : "bg-white"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-denim-chip text-denim">
                                <Icon className="size-[18px]" aria-hidden="true" />
                            </span>
                            <span className="truncate font-code text-[11px] text-denim-muted">{file}</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-denim-deep">{title}</p>
                            <p className="text-xs text-denim-muted">{note}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onExport}
                            disabled={empty || notApplicable}
                            title={empty && !notApplicable ? "ยังไม่มีข้อมูลในส่วนนี้" : undefined}
                            className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-[1.5px] border-denim-field bg-white text-sm font-semibold text-denim transition-colors hover:bg-denim-paper disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
                        >
                            {notApplicable ? (
                                "ไม่มีข้อมูลให้ export"
                            ) : (
                                <>
                                    <Download className="size-4" aria-hidden="true" /> Export CSV
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    )
}

/* ── รายชื่อผู้ลงทะเบียน ───────────────────────────────────────────────────── */

export interface RegistrantRow {
    id: number
    name: string
    studentId: string
    status: string
    attendance: string
    wantsCertLoanFund?: boolean
    wantsCertScholarship?: boolean
}

const STATUS_PILL: Record<string, { label: string; className: string }> = {
    confirmed: { label: "ยืนยันแล้ว", className: "bg-denim-chip text-denim" },
    pending: { label: "รอการยืนยัน", className: "bg-amber/15 text-amber-ink" },
    cancelled: { label: "ยกเลิกแล้ว", className: "bg-red-50 text-red-700" },
}

const COLUMNS = ["ชื่อ-นามสกุล", "รหัสนักศึกษา", "สถานะ", "เข้าร่วม", "จิตอาสา"]

/** ปุ่มคัดลอกลิงก์สาธารณะของกิจกรรม — บอกผลบนปุ่มเองสั้นๆ (ไม่ต้องมี Toast) */
function CopyLinkButton({ url }: { url: string }) {
    const [state, setState] = useState<"idle" | "copied" | "failed">("idle")

    async function copy() {
        try {
            await navigator.clipboard.writeText(url)
            setState("copied")
        } catch {
            setState("failed")
        }
        setTimeout(() => setState("idle"), 2200)
    }

    return (
        <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-denim px-5 text-sm font-semibold text-denim transition-colors hover:bg-denim hover:text-white"
        >
            {state === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            <span aria-live="polite">
                {state === "copied" ? "คัดลอกลิงก์แล้ว" : state === "failed" ? "คัดลอกไม่สำเร็จ — ลองอีกครั้ง" : "คัดลอกลิงก์กิจกรรม"}
            </span>
        </button>
    )
}

/**
 * รายชื่อผู้ลงทะเบียน (ดูอย่างเดียว ไม่มีปุ่มจัดการ) + ค้นหาด้วยชื่อ/รหัสนักศึกษา
 * จำนวนบนหัวข้อนับเฉพาะที่ยังไม่ยกเลิก (ตรงกับการ์ดสถิติ) — ที่ยกเลิกแล้วต่อท้ายตารางพร้อมป้ายบอก
 */
export function RegistrantsCard({ rows, shareUrl }: { rows: RegistrantRow[]; shareUrl: string }) {
    const [query, setQuery] = useState("")
    const q = query.trim().toLowerCase()
    const ordered = [...rows.filter((r) => r.status !== "cancelled"), ...rows.filter((r) => r.status === "cancelled")]
    const filtered = q ? ordered.filter((r) => r.name.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q)) : ordered
    const activeCount = rows.length - rows.filter((r) => r.status === "cancelled").length
    const cancelledCount = rows.length - activeCount

    return (
        <section aria-labelledby="dashboard-registrants" className="overflow-hidden rounded-[22px] border border-denim-line bg-white">
            <div className="px-5 pb-4 pt-5 sm:px-6">
                <DenimSectionHeading
                    size="card"
                    id="dashboard-registrants"
                    comment={`registrants.length = ${activeCount}`}
                    title={`รายชื่อผู้ลงทะเบียน (${activeCount})`}
                    description={cancelledCount > 0 ? `ยกเลิกแล้ว ${cancelledCount} คน — แสดงท้ายตาราง` : undefined}
                    action={
                        rows.length > 0 && (
                            <label className="relative w-full sm:w-72">
                                <span className="sr-only">ค้นหาผู้ลงทะเบียน</span>
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-denim-muted" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="ค้นหาชื่อหรือรหัสนักศึกษา..."
                                    className="h-11 w-full rounded-xl border-[1.5px] border-denim-field bg-white pl-9 pr-3 text-sm text-denim-deep outline-none placeholder:text-denim-muted focus:border-denim"
                                />
                            </label>
                        )
                    }
                />
            </div>

            {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-6 border-t border-denim-line px-6 py-10 sm:flex-row sm:gap-10">
                    <div className="flex max-w-sm flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                        <h3 className="font-display text-xl font-bold text-denim-deep">ยังไม่มีผู้ลงทะเบียน</h3>
                        <p className="text-sm text-denim-muted">แชร์ลิงก์กิจกรรมให้เพื่อน ๆ เด็กคอม เพื่อเริ่มรับผู้ลงทะเบียน</p>
                        <div className="mt-2">
                            <CopyLinkButton url={shareUrl} />
                        </div>
                    </div>
                    <Image src="/mascot-wave.png" alt="" width={421} height={900} sizes="80px" className="h-36 w-auto shrink-0" />
                </div>
            ) : filtered.length === 0 ? (
                <p className="border-t border-denim-line px-6 py-10 text-center text-sm text-denim-muted">ไม่พบนักศึกษาที่ค้นหา</p>
            ) : (
                <div className="max-h-[520px] overflow-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                        <thead className="sticky top-0 z-[1]">
                            <tr className="denim-weave-deep">
                                {COLUMNS.map((c, i) => (
                                    <th
                                        key={c}
                                        scope="col"
                                        className={cn(
                                            "px-5 py-3.5 font-code text-[11px] font-normal tracking-[0.08em] text-denim-on-soft first:pl-6 last:pr-6",
                                            i > 0 && "border-l border-white/10"
                                        )}
                                    >
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-denim-line">
                            {filtered.map((r) => {
                                const pill = STATUS_PILL[r.status] ?? STATUS_PILL.pending
                                return (
                                    <tr key={r.id} className={cn("text-sm transition-colors hover:bg-denim-paper", r.status === "cancelled" && "text-denim-muted")}>
                                        <td className="px-5 py-3 pl-6 font-semibold text-denim-deep">{r.name}</td>
                                        <td className="px-5 py-3 font-code text-[13px] text-denim-muted">{r.studentId}</td>
                                        <td className="px-5 py-3">
                                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", pill.className)}>{pill.label}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {r.attendance === "attended" ? (
                                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">เข้าร่วมแล้ว</span>
                                            ) : (
                                                <span className="text-xs text-denim-muted">ยังไม่เช็คอิน</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 pr-6">
                                            <div className="flex gap-1">
                                                {r.wantsCertLoanFund && (
                                                    <span className="rounded-md bg-denim-chip px-2 py-0.5 text-xs font-semibold text-denim">กยศ.</span>
                                                )}
                                                {r.wantsCertScholarship && (
                                                    <span className="rounded-md bg-denim-chip px-2 py-0.5 text-xs font-semibold text-denim">ทุน</span>
                                                )}
                                                {!r.wantsCertLoanFund && !r.wantsCertScholarship && <span className="text-xs text-denim-muted">-</span>}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}
