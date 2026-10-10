"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { evaluationsAPI, type ApprovalDashboard, type ApprovalFlag, type ApprovalRow, type ApproveEvaluationBody } from "@/lib/api"
import { softSkillLabel, softSkillTierLabel } from "@/lib/soft-skills"
import { TierButtons } from "./tier-buttons"
import { SoftSkillRubricLink } from "./soft-skill-rubric-link"

const FLAG_LABEL: Record<ApprovalFlag, string> = {
    self_missing: "ยังไม่ส่งแบบประเมินตนเอง",
    peer_incomplete: "เพื่อนส่งไม่ครบ 2 คน",
    divergent: "ตนเองกับเพื่อนให้ต่างกัน 2 ระดับ",
    has_exception: "ผู้จัดตั้งข้อยกเว้นไว้",
}

const isTier = (v: number | null | undefined): v is 1 | 2 | 3 => v === 1 || v === 2 || v === 3

/** ระดับเป็นป้ายพฤติกรรม; ค่าเฉลี่ยของเพื่อนที่ไม่ตรงระดับ (เช่น 2.5) แสดงเป็นตัวเลข */
function levelText(value: number | null): string {
    if (value === null) return "—"
    return isTier(value) ? softSkillTierLabel(value) : `เฉลี่ย ${value.toFixed(1)}`
}

interface CardProps {
    row: ApprovalRow
    skills: string[]
    cap: number
    /** approved = แก้ไขผลที่อนุมัติแล้ว (ค่าเริ่มต้นเป็นค่าที่ล็อกไว้ และแสดงช่องเหตุผลเสมอ) */
    editing: boolean
    busy: boolean
    onSubmit: (body: ApproveEvaluationBody) => void
    onCancel?: () => void
}

/** การ์ดตรวจสอบรายคน: เห็นที่มาของแต่ละแหล่งเทียบกับค่าที่ระบบแนะนำ แล้วเลือกค่าสุดท้ายเอง (ต่างจากที่แนะนำ → ต้องมีเหตุผล) */
function ApprovalCard({ row, skills, cap, editing, busy, onSubmit, onCancel }: CardProps) {
    const [picked, setPicked] = useState<Record<string, number>>({})
    const [reason, setReason] = useState(row.overrideReason ?? "")

    const byskill = useMemo(() => new Map(row.skills.map((s) => [s.skillType, s])), [row.skills])
    const valueOf = (skill: string) => picked[skill] ?? (editing ? byskill.get(skill)?.final : undefined) ?? byskill.get(skill)?.recommended
    const differs = skills.some((skill) => valueOf(skill) !== byskill.get(skill)?.recommended)
    const needsReason = differs
    const reasonMissing = needsReason && !reason.trim()

    function submit() {
        // ไม่ได้เลือกเองและไม่ใช่การแก้ → ยอมรับที่ระบบแนะนำ (ไม่ส่ง scores)
        if (!editing && Object.keys(picked).length === 0) {
            onSubmit({})
            return
        }
        onSubmit({
            scores: skills.map((skill) => ({ skillType: skill, score: valueOf(skill) as number })),
            ...(needsReason ? { reason: reason.trim() } : {}),
        })
    }

    return (
        <div className="space-y-4 rounded-xl border border-border bg-bg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-fg">{row.name}</span>
                    {row.dutyRole && <Badge variant="neutral">{row.dutyRole}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {row.flags.map((flag) => (
                        <Badge key={flag} variant="warning" className="gap-1">
                            <AlertTriangle className="size-3" aria-hidden="true" /> {FLAG_LABEL[flag]}
                        </Badge>
                    ))}
                </div>
            </div>

            {skills.map((skill) => {
                const s = byskill.get(skill)
                if (!s) return null
                return (
                    <div key={skill} className="space-y-2 rounded-lg border border-border bg-surface p-3">
                        <div className="text-xs font-semibold text-fg">{softSkillLabel(skill)}</div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                            <div>
                                <dt className="text-fg-muted">ผู้จัด</dt>
                                <dd className="font-medium text-fg">{levelText(s.organizer)}</dd>
                            </div>
                            <div>
                                <dt className="text-fg-muted">ตนเอง</dt>
                                <dd className="font-medium text-fg">{levelText(s.self)}</dd>
                            </div>
                            <div>
                                <dt className="text-fg-muted">เพื่อน{s.peerCount > 0 ? ` (${s.peerCount} คน)` : ""}</dt>
                                <dd className="font-medium text-fg">{levelText(s.peer)}</dd>
                            </div>
                            <div>
                                <dt className="text-fg-muted">ระบบแนะนำ</dt>
                                <dd className="font-bold text-brand-600">{levelText(s.recommended)}</dd>
                            </div>
                        </dl>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <span className="text-xs text-fg-muted">ค่าสุดท้าย</span>
                            <TierButtons
                                value={valueOf(skill)}
                                cap={cap}
                                disabled={busy}
                                label={`ค่าสุดท้ายของ${row.name} ด้าน${softSkillLabel(skill)}`}
                                onChange={(tier) => setPicked((prev) => ({ ...prev, [skill]: tier }))}
                            />
                        </div>
                    </div>
                )
            })}

            {(needsReason || editing) && (
                <div className="space-y-1.5">
                    <label htmlFor={`approve-reason-${row.registrationId}`} className="text-xs font-medium text-fg-muted">
                        เหตุผลที่เลือกต่างจากที่ระบบแนะนำ {needsReason && <span className="text-danger">*</span>}
                    </label>
                    <Input
                        id={`approve-reason-${row.registrationId}`}
                        value={reason}
                        maxLength={500}
                        disabled={busy}
                        placeholder="เช่น รับผิดชอบเกินหน้าที่ตลอดทั้งค่าย"
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
                {onCancel && (
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCancel}>
                        ยกเลิก
                    </Button>
                )}
                <Button type="button" size="sm" disabled={busy || reasonMissing} onClick={submit}>
                    {busy ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "อนุมัติ"}
                </Button>
            </div>
        </div>
    )
}

interface Props {
    activityId: number
    /** เรียกหลังอนุมัติสำเร็จ — ให้หน้าแม่รีเฟรชรายชื่อผู้เข้าร่วม (badge "รออนุมัติ") */
    onChanged?: () => void
}

/**
 * อนุมัติผลประเมินรอบด้าน (360°) — คะแนนสุทธิจากผู้จัด + ตนเอง + เพื่อน
 * รายที่ระบบ flag แสดงก่อนและกางไว้; "อนุมัติทั้งหมด" ทำเฉพาะรายที่ไม่มีข้อขัดแย้ง และ server ตัดสินใหม่ทุกครั้ง
 * ผลที่อนุมัติแล้วเข้าคะแนนจริงของนักศึกษา (ก่อนหน้านั้นนักศึกษามองไม่เห็นคะแนนของกิจกรรมนี้)
 */
export function ActivityApprovalDashboard({ activityId, onChanged }: Props) {
    const [data, setData] = useState<ApprovalDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [busyId, setBusyId] = useState<number | null>(null)
    const [bulkBusy, setBulkBusy] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [readyOpen, setReadyOpen] = useState(false)
    const [approvedOpen, setApprovedOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

    const load = useCallback(async () => {
        setLoadError("")
        try {
            setData(await evaluationsAPI.getApproval(activityId))
        } catch (err) {
            setLoadError((err as Error).message || "โหลดข้อมูลไม่สำเร็จ")
        }
    }, [activityId])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        load().finally(() => {
            if (!cancelled) setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [load])

    const flagged = useMemo(() => data?.rows.filter((r) => !r.approved && r.flags.length > 0) ?? [], [data])
    const ready = useMemo(() => data?.rows.filter((r) => !r.approved && r.flags.length === 0) ?? [], [data])
    const approved = useMemo(() => data?.rows.filter((r) => r.approved) ?? [], [data])

    async function refresh() {
        setRefreshing(true)
        await load()
        setRefreshing(false)
    }

    async function approveOne(row: ApprovalRow, body: ApproveEvaluationBody) {
        setBusyId(row.registrationId)
        setStatus(null)
        try {
            setData(await evaluationsAPI.approveOne(row.registrationId, body))
            setEditingId(null)
            setStatus({ kind: "ok", text: `อนุมัติผลของ ${row.name} แล้ว` })
            onChanged?.()
        } catch (err) {
            setStatus({ kind: "error", text: (err as Error).message || "อนุมัติไม่สำเร็จ" })
        } finally {
            setBusyId(null)
        }
    }

    async function approveAllReady() {
        setBulkBusy(true)
        setStatus(null)
        try {
            const result = await evaluationsAPI.approveReady(activityId, ready.map((r) => r.registrationId))
            setConfirmOpen(false)
            setStatus({
                kind: "ok",
                text:
                    result.skipped.length > 0
                        ? `อนุมัติแล้ว ${result.approved} คน — ข้าม ${result.skipped.length} คนที่สถานะเปลี่ยนไประหว่างที่คุณดูอยู่`
                        : `อนุมัติแล้ว ${result.approved} คน`,
            })
            await load()
            onChanged?.()
        } catch (err) {
            setConfirmOpen(false)
            setStatus({ kind: "error", text: (err as Error).message || "อนุมัติไม่สำเร็จ" })
        } finally {
            setBulkBusy(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลด...
            </div>
        )
    }
    if (loadError) return <p className="text-sm text-danger">{loadError}</p>
    if (!data) return null

    if (!data.available) {
        return (
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-fg">อนุมัติผลประเมิน Soft Skills</h3>
                <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg-muted">{data.reason}</p>
            </div>
        )
    }

    const { summary } = data

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-fg">อนุมัติผลประเมิน Soft Skills</h3>
                    <p className="mt-0.5 text-xs text-fg-muted">
                        ทั้งหมด {summary.total} คน · อนุมัติแล้ว {summary.approved} · พร้อมอนุมัติ {summary.ready} · ต้องตรวจสอบ {summary.flagged}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                        นักศึกษาจะเห็นคะแนนของกิจกรรมนี้หลังคุณอนุมัติเท่านั้น
                    </p>
                    <div className="mt-1.5">
                        <SoftSkillRubricLink />
                    </div>
                </div>
                <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-fg-muted" disabled={refreshing} onClick={refresh}>
                    <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" /> รีเฟรช
                </Button>
            </div>

            {status && (
                <p role="status" className={status.kind === "ok" ? "text-sm text-success" : "text-sm text-danger"}>
                    {status.text}
                </p>
            )}

            <Button
                type="button"
                className="gap-2"
                disabled={ready.length === 0 || bulkBusy || busyId !== null}
                onClick={() => setConfirmOpen(true)}
            >
                <CheckCircle2 className="size-4" aria-hidden="true" /> อนุมัติทั้งหมดที่ไม่มีข้อขัดแย้ง ({ready.length})
            </Button>

            {flagged.length > 0 && (
                <section className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-fg">
                        <AlertTriangle className="size-4 text-warning" aria-hidden="true" /> ต้องตรวจสอบ ({flagged.length})
                    </h4>
                    {flagged.map((row) => (
                        <ApprovalCard
                            key={`${row.registrationId}-review`}
                            row={row}
                            skills={data.skills}
                            cap={data.cap}
                            editing={false}
                            busy={busyId === row.registrationId}
                            onSubmit={(body) => approveOne(row, body)}
                        />
                    ))}
                </section>
            )}

            {ready.length > 0 && (
                <section className="rounded-xl border border-border">
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-fg"
                        aria-expanded={readyOpen}
                        onClick={() => setReadyOpen((v) => !v)}
                    >
                        {readyOpen ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                        พร้อมอนุมัติ ({ready.length})
                    </button>
                    {readyOpen && (
                        <ul className="divide-y divide-border border-t border-border">
                            {ready.map((row) => (
                                <li key={row.registrationId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                                    <span className="text-fg">{row.name}</span>
                                    <span className="text-xs text-fg-muted">
                                        {row.skills.map((s) => `${softSkillLabel(s.skillType)}: ${levelText(s.recommended)}`).join(" · ")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {approved.length > 0 && (
                <section className="rounded-xl border border-border">
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-fg"
                        aria-expanded={approvedOpen}
                        onClick={() => setApprovedOpen((v) => !v)}
                    >
                        {approvedOpen ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                        อนุมัติแล้ว ({approved.length})
                    </button>
                    {approvedOpen && (
                        <div className="space-y-3 border-t border-border p-3">
                            {approved.map((row) =>
                                editingId === row.registrationId ? (
                                    <ApprovalCard
                                        key={`${row.registrationId}-edit`}
                                        row={row}
                                        skills={data.skills}
                                        cap={data.cap}
                                        editing
                                        busy={busyId === row.registrationId}
                                        onSubmit={(body) => approveOne(row, body)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <div key={row.registrationId} className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
                                        <div>
                                            <span className="text-fg">{row.name}</span>
                                            {row.overrideReason && <span className="ml-2 text-xs text-fg-muted">({row.overrideReason})</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-xs text-fg-muted">
                                                {row.skills.map((s) => `${softSkillLabel(s.skillType)}: ${levelText(s.final)}`).join(" · ")}
                                            </span>
                                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(row.registrationId)}>
                                                แก้ไข
                                            </Button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </section>
            )}

            {summary.total === 0 && <p className="text-sm text-fg-muted">ยังไม่มีผู้เช็คอินที่รอการอนุมัติ</p>}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={`อนุมัติ ${ready.length} คนที่ไม่มีข้อขัดแย้ง?`}
                description={`คะแนนสุทธิที่ระบบแนะนำจะเข้าโปรไฟล์นักศึกษาทันที และถูกล็อก${
                    flagged.length > 0 ? ` ส่วนอีก ${flagged.length} คนที่ต้องตรวจสอบจะไม่ถูกอนุมัติ` : ""
                }`}
                confirmLabel="อนุมัติ"
                cancelLabel="ยังก่อน"
                loading={bulkBusy}
                onConfirm={approveAllReady}
            />
        </div>
    )
}
