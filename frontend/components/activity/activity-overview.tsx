"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatTile } from "@/components/ui/stat-tile"
import {
    Users,
    ClipboardCheck,
    AlertTriangle,
    CheckCircle2,
    CheckSquare,
    ArrowRight,
    Rocket,
    Settings2,
    Download,
    Search,
} from "lucide-react"
import { evaluationsAPI, type Activity, type ApprovalDashboard } from "@/lib/api"
import type { RegistrationRow } from "./activity-participant-manager"

type BadgeVariant = NonNullable<BadgeProps["variant"]>
type OverviewTab = "participants" | "evaluation" | "approval"

interface RowDescription {
    statusKey: string
    label: string
    variant: BadgeVariant
    icon: typeof CheckCircle2 | null
    actionLabel: string
    actionTab: OverviewTab
}

const PAGE_SIZE = 10

const BARS_STATUS_META: Record<string, { label: string; variant: BadgeVariant; icon: typeof CheckCircle2 | null }> = {
    not_checked_in: { label: "รอประเมิน Step 1", variant: "neutral", icon: null },
    ready: { label: "พร้อมอนุมัติ", variant: "success", icon: CheckCircle2 },
    flagged: { label: "คะแนนขัดแย้ง (Flag)", variant: "warning", icon: AlertTriangle },
    approved: { label: "อนุมัติแล้ว", variant: "success", icon: CheckCircle2 },
}

const BARS_STATUS_OPTIONS = [
    { value: "not_checked_in", label: "รอประเมิน Step 1" },
    { value: "ready", label: "พร้อมอนุมัติ" },
    { value: "flagged", label: "คะแนนขัดแย้ง (Flag)" },
    { value: "approved", label: "อนุมัติแล้ว" },
]

const REGISTRATION_STATUS_OPTIONS = [
    { value: "confirmed", label: "ยืนยันแล้ว" },
    { value: "pending", label: "รอการยืนยัน" },
    { value: "cancelled", label: "ยกเลิกแล้ว" },
]

/**
 * สรุปสถานะต่อแถว 1 คน — แยก 2 โหมด:
 * โหมด BARS (showBars=true เฉพาะกิจกรรม Tier 3 ที่ตั้งทักษะไว้): ใช้ข้อมูล approval dashboard ถ้ามี
 * (ละเอียดกว่า แยก flag ได้) ไม่งั้น fallback ไปสถานะคร่าวๆ จาก evaluation.status ที่มากับทุก registration อยู่แล้ว
 * โหมดทั่วไป: โชว์สถานะการยืนยันลงทะเบียน (reg.status) แทน เพราะ BARS ไม่มีความหมายกับกิจกรรมประเภทนี้
 */
function describeRow(
    reg: RegistrationRow,
    approvalRow: ApprovalDashboard["rows"][number] | undefined,
    showBars: boolean
): RowDescription {
    if (showBars) {
        let statusKey: string
        if (approvalRow) {
            statusKey = approvalRow.approved ? "approved" : approvalRow.flags.length > 0 ? "flagged" : "ready"
        } else if (reg.evaluation) {
            const status = (reg.evaluation as { status?: string }).status
            statusKey = status === "pending_approval" ? "ready" : "approved"
        } else {
            statusKey = "not_checked_in"
        }
        const meta = BARS_STATUS_META[statusKey]
        const action: { label: string; tab: OverviewTab } =
            statusKey === "not_checked_in"
                ? { label: "แก้ไข", tab: "evaluation" }
                : statusKey === "flagged"
                    ? { label: "ตรวจ BARS", tab: "approval" }
                    : { label: "ดูรายละเอียด", tab: "approval" }
        return { statusKey, label: meta.label, variant: meta.variant, icon: meta.icon, actionLabel: action.label, actionTab: action.tab }
    }

    const label = reg.status === "confirmed" ? "ยืนยันแล้ว" : reg.status === "cancelled" ? "ยกเลิกแล้ว" : "รอการยืนยัน"
    const variant: BadgeVariant = reg.status === "confirmed" ? "success" : reg.status === "cancelled" ? "neutral" : "warning"
    return {
        statusKey: reg.status,
        label,
        variant,
        icon: reg.status === "confirmed" ? CheckCircle2 : null,
        actionLabel: "ดูรายละเอียด",
        actionTab: "participants",
    }
}

interface ActivityOverviewProps {
    activity: Activity
    /** registrations ทั้งหมดของกิจกรรม (ไม่กรอง) — คอมโพเนนต์นี้มีตัวกรอง/ค้นหา/แบ่งหน้าของตัวเอง แยกจากแท็บ "ข้อมูลผู้เข้าร่วม" */
    registrations: RegistrationRow[]
    /** true เฉพาะกิจกรรม Tier 3 ที่ตั้งทักษะไว้แล้ว (= showBatchEvaluation ของ ActivityParticipantManager) — คุมว่าจะโชว์การ์ดทางลัด BARS + สถานะ BARS รายคนไหม */
    showBars: boolean
    /** สลับแท็บของ ActivityParticipantManager (ควบคุม Tabs จากภายนอก) */
    onJumpToTab: (tab: OverviewTab) => void
    onExportCSV: () => void
}

/**
 * ภาพรวมกิจกรรม — การ์ดสถิติ 3 ใบ + ตารางสถานะต่อคน (ค้นหา/กรอง/แบ่งหน้าในตัว) แสดงทุกกิจกรรม
 * เฉพาะกิจกรรม Tier 3 ที่ตั้งทักษะไว้ (showBars) จะมีการ์ดทางลัด BARS 2 ขั้นตอนเพิ่ม + คอลัมน์สถานะ
 * เป็น "สถานะ BARS" (ไม่งั้นคอลัมน์สถานะโชว์สถานะยืนยันลงทะเบียนแทน เพราะ BARS ไม่มีความหมายกับกิจกรรมแบบนี้)
 * ไม่ได้แทนที่แท็บ "ข้อมูลผู้เข้าร่วม" เดิม (ยืนยัน/ออกใบรับรอง/ดูคำตอบแบบฟอร์มยังอยู่ที่แท็บนั้นเหมือนเดิม)
 * ที่นี่เป็นจุดดูภาพรวมแล้วกดลัดไปทำงานต่อ
 */
export function ActivityOverview({ activity, registrations, showBars, onJumpToTab, onExportCSV }: ActivityOverviewProps) {
    const [approval, setApproval] = useState<ApprovalDashboard | null>(null)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [page, setPage] = useState(1)

    useEffect(() => {
        if (!showBars) return
        let cancelled = false
        evaluationsAPI
            .getApproval(activity.id)
            .then((data) => {
                if (!cancelled) setApproval(data)
            })
            .catch(() => {
                // เงียบไว้ — สถิติ/ตารางจะ fallback ไปใช้สถานะคร่าวๆ จาก evaluation.status แทน ไม่บล็อกหน้าทั้งหน้า
            })
        return () => {
            cancelled = true
        }
    }, [activity.id, showBars])

    // รีเซ็ตหน้ากลับไปหน้า 1 ตรงจุดที่ค่าค้นหา/ตัวกรองเปลี่ยน (ไม่ใช้ effect — เลี่ยง setState ซ้อนที่ทำให้ re-render สองรอบ)
    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(1)
    }
    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value)
        setPage(1)
    }

    const approvalByReg = useMemo(
        () => new Map((approval?.rows ?? []).map((r) => [r.registrationId, r])),
        [approval]
    )

    const rows = useMemo(
        () => registrations.map((reg) => ({ reg, info: describeRow(reg, approvalByReg.get(reg.id), showBars) })),
        [registrations, approvalByReg, showBars]
    )

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter(({ reg, info }) => {
            const matchesSearch =
                !q || reg.student.name.toLowerCase().includes(q) || reg.student.studentId.toLowerCase().includes(q)
            const matchesStatus = !statusFilter || info.statusKey === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [rows, search, statusFilter])

    const total = registrations.length
    const checkedIn = registrations.filter((r) => r.attendance === "attended").length
    const confirmed = registrations.filter((r) => r.status === "confirmed").length
    const flagged = approval?.summary.flagged ?? 0
    const capacity = activity.capacity
    const fillPercent = typeof capacity === "number" && capacity > 0 ? Math.round((total / capacity) * 100) : null

    const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
    const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const statusOptions = showBars ? BARS_STATUS_OPTIONS : REGISTRATION_STATUS_OPTIONS

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatTile
                    label="จำนวนผู้ลงทะเบียนทั้งหมด"
                    value={typeof capacity === "number" ? `${total}/${capacity}` : total}
                    icon={Users}
                    caption={fillPercent !== null ? `${fillPercent}% ของที่นั่งทั้งหมด` : "ไม่จำกัดจำนวน"}
                />
                <StatTile
                    label="เช็คอินเข้างานแล้ว (QR Code)"
                    value={checkedIn}
                    icon={ClipboardCheck}
                    caption={`${total > 0 ? Math.round((checkedIn / total) * 100) : 0}% ของผู้ลงทะเบียน`}
                />
                {showBars ? (
                    <StatTile
                        label="รายการ BARS ติด Flag รอตรวจ"
                        value={flagged}
                        icon={AlertTriangle}
                        caption={approval && !approval.available ? approval.reason : flagged > 0 ? "ต้องอนุมัติ" : "ไม่มีรายการติดธง"}
                    />
                ) : (
                    <StatTile
                        label="ยืนยันการเข้าร่วมแล้ว"
                        value={confirmed}
                        icon={CheckSquare}
                        caption={`${total > 0 ? Math.round((confirmed / total) * 100) : 0}% ของผู้ลงทะเบียน`}
                    />
                )}
            </div>

            {showBars && (
                <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-fg">
                            <Rocket className="size-4 text-brand-600" aria-hidden="true" /> ทางลัดประเมินทักษะ BARS 2 ขั้นตอน
                        </h3>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-bg" onClick={() => onJumpToTab("evaluation")}>
                            <Settings2 className="size-3.5" aria-hidden="true" /> ตั้งค่าเงื่อนไข BARS
                        </Button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => onJumpToTab("evaluation")}
                            className="flex items-center justify-between gap-3 rounded-xl bg-brand-600 px-5 py-4 text-left text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-700"
                        >
                            Step 1: ให้คะแนนฐานรายฝ่ายสตาฟฟ์ (Batch Evaluation)
                            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onJumpToTab("approval")}
                            className="flex items-center justify-between gap-3 rounded-xl bg-brand-700 px-5 py-4 text-left text-sm font-semibold text-white shadow-xs transition-colors hover:opacity-90"
                        >
                            Step 2: สรุปคะแนน 360° & อนุมัติผล (Approval Dashboard)
                            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-border bg-bg shadow-xs">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-fg">รายชื่อผู้เข้าร่วมและสตาฟฟ์ (Participant List)</h3>
                        <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-fg-muted" onClick={onExportCSV}>
                            <Download className="size-3.5" aria-hidden="true" /> Export CSV
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative sm:w-56">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                            <Input
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="ค้นหาชื่อ/รหัสนักศึกษา..."
                                className="h-9 pl-9"
                            />
                        </div>
                        <Select className="h-9 sm:w-48" value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}>
                            <option value="">กรอง: ทั้งหมด</option>
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {pageRows.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                                <tr>
                                    <th className="px-5 py-3">ชื่อ-นามสกุล</th>
                                    <th className="px-5 py-3">{showBars ? "ตำแหน่ง/ฝ่าย (Role)" : "บทบาท/ทีม"}</th>
                                    <th className="px-5 py-3">สถานะเช็คอิน</th>
                                    <th className="px-5 py-3">{showBars ? "สถานะ BARS" : "สถานะ"}</th>
                                    <th className="px-5 py-3 text-right">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pageRows.map(({ reg, info }) => {
                                    const StatusIcon = info.icon
                                    return (
                                        <tr key={reg.id} className="transition-colors hover:bg-surface/60">
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-fg">{reg.student.name}</div>
                                                <div className="text-xs text-fg-subtle">{reg.student.studentId}</div>
                                            </td>
                                            <td className="px-5 py-3 text-fg-muted">{reg.dutyRole || reg.teamName || "-"}</td>
                                            <td className="px-5 py-3">
                                                {reg.attendance === "attended" ? (
                                                    <span className="text-success">
                                                        เช็คอินแล้ว
                                                        {reg.checkInTime && (
                                                            <span className="text-fg-subtle">
                                                                {" "}
                                                                ({new Date(reg.checkInTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.)
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-fg-subtle">ยังไม่เช็คอิน</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge variant={info.variant} className="gap-1">
                                                    {StatusIcon && <StatusIcon className="size-3" aria-hidden="true" />}
                                                    {info.label}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => onJumpToTab(info.actionTab)}
                                                    className="font-medium text-brand-600 hover:underline"
                                                >
                                                    {info.actionLabel}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="px-5 py-10 text-center text-fg-subtle">
                        {registrations.length === 0 ? "ยังไม่มีผู้ลงทะเบียน" : "ไม่พบผู้เข้าร่วมตามตัวกรองที่เลือก"}
                    </p>
                )}

                {filteredRows.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-sm text-fg-muted">
                        <span>
                            แสดง {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredRows.length)} จากทั้งหมด {filteredRows.length} รายชื่อ
                        </span>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                ก่อนหน้า
                            </Button>
                            <Button type="button" size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                                หน้าถัดไป
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
