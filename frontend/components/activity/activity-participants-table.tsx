"use client"

import { Fragment, useMemo, useState } from "react"
import { CheckCircle2, CheckSquare, ChevronDown, Download, Search } from "lucide-react"
import { Select } from "@/components/ui/select"
import type { Activity, ApprovalRow } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { RegistrationRow } from "./activity-participant-manager"

/* ตารางผู้เข้าร่วมของกิจกรรมหนึ่งรายการ (แท็บ "ผู้เข้าร่วม" ของ ActivityParticipantManager)
   เดิมมี 2 รายการซ้อนกัน: ตารางภาพรวม (ค้นหา/กรอง/แบ่งหน้า) กับรายการยาวในแท็บ "ข้อมูลผู้เข้าร่วม" (ปุ่มยืนยัน/เช็คอิน/
   ออกใบรับรอง/คำตอบแบบฟอร์ม) ตอนนี้รวมเป็นตารางเดียว: ขั้นถัดไปของแต่ละคน (ยืนยัน → เช็คอิน → ออกใบรับรอง) เป็นปุ่มในแถว
   ส่วนข้อมูลที่เหลือทั้งหมดอยู่ใน "ดูรายละเอียด" ที่กางใต้แถว */

export type ParticipantTab = "participants" | "evaluation" | "approval"

const PAGE_SIZE = 10

type Tone = "amber" | "emerald" | "slate" | "denim"

const TONE_PILL: Record<Tone, string> = {
    amber: "bg-amber/20 text-amber-ink",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
    denim: "bg-denim-chip text-denim-deep",
}

const BARS_STATUS: Record<string, { label: string; tone: Tone; action: string; tab: ParticipantTab }> = {
    not_checked_in: { label: "รอประเมิน Step 1", tone: "slate", action: "ไปประเมินรายฝ่าย", tab: "evaluation" },
    ready: { label: "พร้อมอนุมัติ", tone: "emerald", action: "ไปอนุมัติผล", tab: "approval" },
    flagged: { label: "คะแนนขัดแย้ง (Flag)", tone: "amber", action: "ตรวจ BARS", tab: "approval" },
    approved: { label: "อนุมัติแล้ว", tone: "emerald", action: "ดูผลที่อนุมัติ", tab: "approval" },
}

/**
 * สถานะ BARS รายคน — ใช้ข้อมูล approval dashboard ถ้ามี (แยก flag ได้) ไม่งั้น fallback ไปสถานะคร่าวๆ
 * จาก evaluation.status ที่มากับทุก registration อยู่แล้ว
 */
function barsStatusKey(reg: RegistrationRow, approvalRow: ApprovalRow | undefined): string {
    if (approvalRow) return approvalRow.approved ? "approved" : approvalRow.flags.length > 0 ? "flagged" : "ready"
    if (reg.evaluation) return (reg.evaluation as { status?: string }).status === "pending_approval" ? "ready" : "approved"
    return "not_checked_in"
}

/** กลุ่มสถานะการลงทะเบียน — ไม่ทับซ้อนกัน: เช็คอินแล้วนับเป็นกลุ่มของตัวเองไม่ว่าจะยืนยันหรือยัง */
function registrationBucket(reg: RegistrationRow): "pending" | "confirmed" | "attended" | "cancelled" {
    if (reg.status === "cancelled") return "cancelled"
    if (reg.attendance === "attended") return "attended"
    return reg.status === "confirmed" ? "confirmed" : "pending"
}

const REG_PILL: Record<string, { label: string; tone: Tone }> = {
    pending: { label: "รอการยืนยัน", tone: "amber" },
    confirmed: { label: "ยืนยันแล้ว", tone: "denim" },
    attended: { label: "ยืนยันแล้ว", tone: "emerald" },
    cancelled: { label: "ยกเลิกแล้ว", tone: "slate" },
}

/** เวลาเช็คอินตามเวลาไทย (เครื่องผู้ใช้อาจไม่ได้ตั้งเขตเวลาไทย) */
function checkInClock(iso: string | null | undefined): string | null {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })
}

function answerText(a: NonNullable<RegistrationRow["answers"]>[number]): string {
    if (a.textValue) return a.textValue
    if (a.options && a.options.length > 0) return a.options.map((o) => o.option.label).join(", ")
    return "-"
}

const SMALL_BUTTON =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-denim-field bg-white px-3 text-xs font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"

const FIELD =
    "h-11 rounded-xl border-[1.5px] border-denim-field bg-white text-sm text-denim-deep hover:border-denim-dash focus-visible:border-denim focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"

interface ActivityParticipantsTableProps {
    activity: Activity
    registrations: RegistrationRow[]
    showBars: boolean
    approvalByReg: Map<number, ApprovalRow>
    /** รหัสกำกับหัวการ์ด เช่น SUB_01 (กิจกรรมย่อย) หรือ ACT-0012 (กิจกรรมเดี่ยว) */
    scopeCode: string
    onConfirm: (regId: number) => void
    onCheckIn: (regId: number) => void
    onIssueCert: (reg: RegistrationRow) => void
    /** ยืนยันทุกคนที่รอการยืนยันในรายการที่กรองอยู่ — ผู้เรียกแสดงกล่องยืนยันเอง */
    onConfirmAll: (regIds: number[]) => void
    /** export เฉพาะรายการที่กรองอยู่ (ทุกหน้า ไม่ใช่แค่หน้าที่เห็น) */
    onExportCSV: (regs: RegistrationRow[]) => void
    onJumpToTab: (tab: ParticipantTab) => void
}

export function ActivityParticipantsTable({
    activity,
    registrations,
    showBars,
    approvalByReg,
    scopeCode,
    onConfirm,
    onCheckIn,
    onIssueCert,
    onConfirmAll,
    onExportCSV,
    onJumpToTab,
}: ActivityParticipantsTableProps) {
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState("")
    const [certLoan, setCertLoan] = useState(false)
    const [certScholarship, setCertScholarship] = useState(false)
    const [page, setPage] = useState(1)
    const [expanded, setExpanded] = useState<number[]>([])

    const questions = activity.questions ?? []
    const certActivity = !!activity.volunteerRole
    // ตัวกรองขอใบรับรอง กยศ./ทุน มีความหมายเฉพาะกิจกรรมจิตอาสา หรือเมื่อมีคนขอมาจริง — กิจกรรมทั่วไปไม่ต้องรก
    const showCertFilters = certActivity || registrations.some((r) => r.wantsCertLoanFund || r.wantsCertScholarship)

    const rows = useMemo(
        () =>
            registrations.map((reg) => ({
                reg,
                bucket: registrationBucket(reg),
                bars: showBars ? barsStatusKey(reg, approvalByReg.get(reg.id)) : null,
            })),
        [registrations, approvalByReg, showBars]
    )

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase()
        const [kind, value] = filter.split(":")
        return rows.filter(({ reg, bucket, bars }) => {
            const matchesSearch =
                !q ||
                reg.student.name.toLowerCase().includes(q) ||
                reg.student.studentId.toLowerCase().includes(q) ||
                reg.student.email.toLowerCase().includes(q)
            const matchesFilter = !filter || (kind === "reg" ? bucket === value : bars === value)
            const matchesCert =
                (!certLoan && !certScholarship) || (certLoan && reg.wantsCertLoanFund) || (certScholarship && reg.wantsCertScholarship)
            return matchesSearch && matchesFilter && matchesCert
        })
    }, [rows, search, filter, certLoan, certScholarship])

    // ตัวกรองเปลี่ยน = กลับหน้า 1 (ตั้งตรงจุดที่เปลี่ยน ไม่ใช้ effect)
    const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
        set(v)
        setPage(1)
    }

    const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
    const safePage = Math.min(page, pageCount)
    const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    const pendingIds = filteredRows.filter(({ reg }) => reg.status === "pending").map(({ reg }) => reg.id)
    const filtersActive = !!(search || filter || certLoan || certScholarship)

    const toggle = (id: number) => setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

    /** ขั้นถัดไปของคนนี้ — ปุ่มเดียวในแถว (ที่เหลืออยู่ใน "ดูรายละเอียด") */
    function nextAction(reg: RegistrationRow, bucket: string, bars: string | null) {
        if (bucket === "cancelled") return null
        if (reg.status === "pending") return { label: "ยืนยัน", run: () => onConfirm(reg.id) }
        if (reg.attendance !== "attended") return { label: "เช็คอิน", run: () => onCheckIn(reg.id) }
        if (bars && bars !== "approved") return { label: BARS_STATUS[bars].action, run: () => onJumpToTab(BARS_STATUS[bars].tab) }
        if (certActivity && !reg.certificate) return { label: "ออกใบรับรอง", run: () => onIssueCert(reg) }
        return null
    }

    return (
        <div className="overflow-hidden rounded-[22px] border border-denim-line bg-white">
            <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <p className="font-code text-xs text-denim-accent" aria-hidden="true">
                        {`// participants · ${scopeCode}`}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-denim-deep">รายชื่อผู้เข้าร่วมและสตาฟฟ์</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-60">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-denim-muted" aria-hidden="true" />
                        <input
                            type="search"
                            aria-label="ค้นหาผู้เข้าร่วม"
                            value={search}
                            onChange={(e) => resetPage(setSearch)(e.target.value)}
                            placeholder="ค้นหาชื่อ/รหัสนักศึกษา..."
                            className={cn(FIELD, "w-full pl-10 pr-3 placeholder:text-denim-muted/80")}
                        />
                    </div>
                    <Select aria-label="กรองผู้เข้าร่วม" className={cn(FIELD, "pl-3.5 sm:w-52")} value={filter} onChange={(e) => resetPage(setFilter)(e.target.value)}>
                        <option value="">กรอง: ทั้งหมด</option>
                        <optgroup label="สถานะการลงทะเบียน">
                            <option value="reg:pending">รอการยืนยัน</option>
                            <option value="reg:confirmed">ยืนยันแล้ว · ยังไม่เช็คอิน</option>
                            <option value="reg:attended">เช็คอินแล้ว</option>
                            <option value="reg:cancelled">ยกเลิกแล้ว</option>
                        </optgroup>
                        {showBars && (
                            <optgroup label="สถานะ BARS">
                                {Object.entries(BARS_STATUS).map(([key, meta]) => (
                                    <option key={key} value={`bars:${key}`}>
                                        {meta.label}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </Select>
                    {pendingIds.length > 0 && (
                        <button type="button" onClick={() => onConfirmAll(pendingIds)} className={cn(SMALL_BUTTON, "min-h-11 rounded-xl px-3.5 text-sm")}>
                            <CheckSquare className="size-4" aria-hidden="true" />
                            ยืนยันทั้งหมด ({pendingIds.length})
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onExportCSV(filteredRows.map(({ reg }) => reg))}
                        disabled={filteredRows.length === 0}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-denim-deep px-4 text-sm font-semibold text-white transition-colors hover:bg-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download className="size-4" aria-hidden="true" />
                        Export CSV
                    </button>
                </div>
            </div>

            {showCertFilters && (
                <div className="-mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pb-4 text-sm text-denim-ink sm:px-6">
                    <span className="text-xs font-semibold text-denim-muted">ขอใบรับรองจิตอาสา:</span>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                        <input type="checkbox" className="size-4 accent-denim" checked={certLoan} onChange={(e) => resetPage(setCertLoan)(e.target.checked)} />
                        กยศ.
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                        <input type="checkbox" className="size-4 accent-denim" checked={certScholarship} onChange={(e) => resetPage(setCertScholarship)(e.target.checked)} />
                        ทุนการศึกษา
                    </label>
                </div>
            )}

            {pageRows.length > 0 ? (
                // ตารางกว้างกว่าจอมือถือ — เลื่อนแนวนอนเฉพาะในกรอบนี้ หน้าไม่เลื่อนตาม
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-denim-deep font-code text-[11px] tracking-[0.06em] text-white/80">
                            <tr>
                                <th scope="col" className="px-5 py-3 font-normal sm:px-6">ชื่อ-นามสกุล</th>
                                <th scope="col" className="px-5 py-3 font-normal">{showBars ? "ฝ่าย (Role)" : "บทบาท/ทีม"}</th>
                                <th scope="col" className="px-5 py-3 font-normal">สถานะเช็คอิน</th>
                                <th scope="col" className="px-5 py-3 font-normal">{showBars ? "สถานะ BARS" : "สถานะ"}</th>
                                <th scope="col" className="px-5 py-3 text-right font-normal sm:px-6">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.map(({ reg, bucket, bars }) => {
                                const open = expanded.includes(reg.id)
                                const pill = bars ? BARS_STATUS[bars] : REG_PILL[bucket]
                                const action = nextAction(reg, bucket, bars)
                                const clock = checkInClock(reg.checkInTime)
                                const detailId = `reg-detail-${reg.id}`
                                return (
                                    <Fragment key={reg.id}>
                                        <tr className={cn("border-t border-denim-line transition-colors", open ? "bg-denim-paper/60" : "hover:bg-denim-paper/40")}>
                                            <td className="px-5 py-3.5 sm:px-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-denim-chip font-semibold text-denim" aria-hidden="true">
                                                        {reg.student.name.trim().charAt(0) || "?"}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className={cn("truncate font-semibold", bucket === "cancelled" ? "text-denim-muted line-through" : "text-denim-deep")}>
                                                            {reg.student.name}
                                                        </p>
                                                        <p className="font-code text-xs text-denim-muted">{reg.student.studentId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-denim-ink">{reg.dutyRole || reg.teamName || "—"}</td>
                                            <td className="px-5 py-3.5">
                                                {bucket === "cancelled" ? (
                                                    <span className="text-denim-muted">—</span>
                                                ) : reg.attendance === "attended" ? (
                                                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                                        <span className="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
                                                        เช็คอินแล้ว{clock && <span className="font-normal text-denim-muted">· {clock} น.</span>}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-denim-muted">
                                                        <span className="size-2 rounded-full border-[1.5px] border-denim-dash" aria-hidden="true" />
                                                        ยังไม่เช็คอิน
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", TONE_PILL[pill.tone])}>
                                                    {bars === "approved" && <CheckCircle2 className="size-3.5" aria-hidden="true" />}
                                                    {pill.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 sm:px-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    {action && (
                                                        <button type="button" onClick={action.run} className={SMALL_BUTTON}>
                                                            {action.label}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggle(reg.id)}
                                                        aria-expanded={open}
                                                        aria-controls={open ? detailId : undefined}
                                                        className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm font-semibold text-denim transition-colors hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"
                                                    >
                                                        ดูรายละเอียด
                                                        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {open && (
                                            <tr id={detailId} className="bg-denim-paper/60">
                                                <td colSpan={5} className="px-5 pb-5 pt-1 sm:px-6">
                                                    <ParticipantDetail
                                                        reg={reg}
                                                        bucket={bucket}
                                                        bars={bars}
                                                        questions={questions}
                                                        certActivity={certActivity}
                                                        onConfirm={onConfirm}
                                                        onCheckIn={onCheckIn}
                                                        onIssueCert={onIssueCert}
                                                        onJumpToTab={onJumpToTab}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="border-t border-denim-line px-6 py-12 text-center">
                    <p className="font-semibold text-denim-deep">{registrations.length === 0 ? "ยังไม่มีผู้ลงทะเบียน" : "ไม่พบผู้เข้าร่วมตามตัวกรองที่เลือก"}</p>
                    {filtersActive && registrations.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("")
                                setFilter("")
                                setCertLoan(false)
                                setCertScholarship(false)
                                setPage(1)
                            }}
                            className={cn(SMALL_BUTTON, "mt-4 min-h-10 px-4 text-sm")}
                        >
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>
            )}

            {filteredRows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-denim-line px-5 py-3.5 text-sm text-denim-muted sm:px-6">
                    <span aria-live="polite">
                        แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRows.length)} จากทั้งหมด {filteredRows.length} รายชื่อ
                    </span>
                    <div className="flex gap-2">
                        <button type="button" className={cn(SMALL_BUTTON, "disabled:cursor-not-allowed disabled:opacity-45")} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                            ก่อนหน้า
                        </button>
                        <button type="button" className={cn(SMALL_BUTTON, "disabled:cursor-not-allowed disabled:opacity-45")} disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                            หน้าถัดไป
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/** รายละเอียดที่กางใต้แถว — ทุกอย่างที่เคยอยู่ในรายการยาวของแท็บ "ข้อมูลผู้เข้าร่วม" เดิม */
function ParticipantDetail({
    reg,
    bucket,
    bars,
    questions,
    certActivity,
    onConfirm,
    onCheckIn,
    onIssueCert,
    onJumpToTab,
}: {
    reg: RegistrationRow
    bucket: string
    bars: string | null
    questions: NonNullable<Activity["questions"]>
    certActivity: boolean
    onConfirm: (regId: number) => void
    onCheckIn: (regId: number) => void
    onIssueCert: (reg: RegistrationRow) => void
    onJumpToTab: (tab: ParticipantTab) => void
}) {
    const chips = [
        reg.wantsCertLoanFund && "ขอจิตอาสา กยศ.",
        reg.wantsCertScholarship && "ขอจิตอาสาทุน",
        reg.dutyRole && `ฝ่าย: ${reg.dutyRole}`,
        reg.dutyShift && `รอบ: ${reg.dutyShift}`,
        reg.teamName && `ทีม: ${reg.teamName}`,
        reg.teamSize != null && `สมาชิก ${reg.teamSize} คน`,
        reg.competitionCategory && reg.competitionCategory,
    ].filter(Boolean) as string[]
    const evaluationStatus = reg.evaluation ? (reg.evaluation as { status?: string }).status : null

    return (
        <div className="grid gap-4 rounded-2xl border border-denim-line bg-white p-4 md:grid-cols-2">
            <div className="min-w-0 space-y-2.5 text-sm">
                <p className="font-code text-[11px] text-denim-accent">{"// contact"}</p>
                <p className="break-all text-denim-ink">{reg.student.email}</p>
                {reg.student.phone && <p className="font-code text-denim-ink">{reg.student.phone}</p>}
                {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {chips.map((c) => (
                            <span key={c} className="rounded-full bg-denim-chip px-2.5 py-0.5 text-xs font-semibold text-denim-deep">
                                {c}
                            </span>
                        ))}
                    </div>
                )}
                {reg.submissionLink && (
                    <a href={reg.submissionLink} target="_blank" rel="noreferrer" className="inline-block font-semibold text-denim underline underline-offset-4">
                        ลิงก์ผลงาน
                    </a>
                )}
            </div>

            <div className="min-w-0 space-y-2.5 text-sm">
                <p className="font-code text-[11px] text-denim-accent">{"// actions"}</p>
                <div className="flex flex-wrap items-center gap-2">
                    {reg.status === "pending" && (
                        <button type="button" className={SMALL_BUTTON} onClick={() => onConfirm(reg.id)}>
                            ยืนยันการเข้าร่วม
                        </button>
                    )}
                    {bucket !== "cancelled" && reg.attendance !== "attended" && (
                        <button type="button" className={SMALL_BUTTON} onClick={() => onCheckIn(reg.id)}>
                            เช็คอินให้
                        </button>
                    )}
                    {reg.attendance === "attended" &&
                        (evaluationStatus === "pending_approval" ? (
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TONE_PILL.amber)}>รออนุมัติผล</span>
                        ) : reg.evaluation ? (
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TONE_PILL.emerald)}>ประเมินอัตโนมัติแล้ว</span>
                        ) : (
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TONE_PILL.slate)}>ยังไม่มีคะแนน</span>
                        ))}
                    {certActivity &&
                        reg.attendance === "attended" &&
                        (reg.certificate ? (
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TONE_PILL.emerald)}>
                                ออกใบรับรองแล้ว{reg.certificate.volunteerHours ? ` (${reg.certificate.volunteerHours} ชม.)` : ""}
                            </span>
                        ) : (
                            <button type="button" className={SMALL_BUTTON} onClick={() => onIssueCert(reg)}>
                                ออกใบรับรอง
                            </button>
                        ))}
                    {bars && reg.attendance === "attended" && (
                        <button type="button" className={SMALL_BUTTON} onClick={() => onJumpToTab(BARS_STATUS[bars].tab)}>
                            {BARS_STATUS[bars].action}
                        </button>
                    )}
                    {bucket === "cancelled" && <span className="text-denim-muted">ผู้สมัครยกเลิกการลงทะเบียนแล้ว</span>}
                </div>
            </div>

            {questions.length > 0 && (
                <div className="min-w-0 border-t border-dashed border-denim-line pt-3 md:col-span-2">
                    <p className="font-code text-[11px] text-denim-accent">{"// answers"}</p>
                    <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        {questions.map((q) => {
                            const ans = reg.answers?.find((a) => a.question.id === q.id)
                            return (
                                <div key={q.id} className="min-w-0">
                                    <dt className="text-xs font-semibold text-denim-muted">{q.label}</dt>
                                    <dd className="mt-0.5 whitespace-pre-line break-words text-denim-ink">{ans ? answerText(ans) : "-"}</dd>
                                </div>
                            )
                        })}
                    </dl>
                </div>
            )}
        </div>
    )
}
