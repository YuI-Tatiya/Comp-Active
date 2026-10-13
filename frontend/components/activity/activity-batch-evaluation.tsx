"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { evaluationsAPI, type EvaluationBatch } from "@/lib/api"
import { softSkillLabel } from "@/lib/soft-skills"
import { cn } from "@/lib/utils"
import { TierButtons } from "./tier-buttons"
import { SoftSkillRubricLink } from "./soft-skill-rubric-link"

type Scores = Record<string, number>

const isTier = (v: number | undefined): v is 1 | 2 | 3 => v === 1 || v === 2 || v === 3

interface Props {
    activityId: number
    /** เรียกหลังบันทึกสำเร็จ — ให้หน้าแม่รีเฟรชข้อมูลผู้เข้าร่วม (badge สถานะการประเมิน) */
    onSaved?: () => void
}

/**
 * ประเมินรายฝ่าย (Batch & Exception) สำหรับกิจกรรม Tier 3
 * ตั้งระดับของทั้งฝ่ายในคลิกเดียว แล้วแก้เฉพาะคนที่เป็นข้อยกเว้น (ต้องมีเหตุผลเสมอ)
 * กิจกรรมที่ไม่เข้าเงื่อนไข server จะบอกมาเองว่า eligible=false — หน้านี้แค่แสดงเหตุผล ไม่ตัดสินเอง
 */
export function ActivityBatchEvaluation({ activityId, onSaved }: Props) {
    const [data, setData] = useState<EvaluationBatch | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [baselines, setBaselines] = useState<Record<string, Scores>>({})
    // เก็บเฉพาะระดับที่ผู้จัดกำหนดให้รายคนเอง — ค่าที่เท่ากับฐานของฝ่ายไม่นับเป็นข้อยกเว้น
    const [memberScores, setMemberScores] = useState<Record<number, Scores>>({})
    const [reasons, setReasons] = useState<Record<number, string>>({})
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

    const hydrate = useCallback((batch: EvaluationBatch) => {
        setData(batch)
        setBaselines(Object.fromEntries(batch.groups.map((g) => [g.dutyRole, { ...g.baseline }])))
        const scores: Record<number, Scores> = {}
        const savedReasons: Record<number, string> = {}
        for (const g of batch.groups) {
            for (const m of g.members) {
                const entries = Object.entries(m.exceptions)
                if (entries.length === 0) continue
                scores[m.registrationId] = Object.fromEntries(entries.map(([skill, e]) => [skill, e.score]))
                savedReasons[m.registrationId] = entries[0][1].reason
            }
        }
        setMemberScores(scores)
        setReasons(savedReasons)
    }, [])

    useEffect(() => {
        let cancelled = false
        evaluationsAPI
            .getBatch(activityId)
            .then((batch) => {
                if (!cancelled) hydrate(batch)
            })
            .catch((err: unknown) => {
                if (!cancelled) setLoadError((err as Error).message || "โหลดข้อมูลไม่สำเร็จ")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [activityId, hydrate])

    const isException = useCallback(
        (registrationId: number, dutyRole: string, skill: string) => {
            const own = memberScores[registrationId]?.[skill]
            return own !== undefined && own !== baselines[dutyRole]?.[skill]
        },
        [memberScores, baselines]
    )

    const exceptionCount = useCallback(
        (registrationId: number, dutyRole: string) =>
            (data?.skills ?? []).filter((skill) => isException(registrationId, dutyRole, skill)).length,
        [data, isException]
    )

    const problems = useMemo(() => {
        if (!data?.eligible) return []
        const list: string[] = []
        for (const g of data.groups) {
            if (data.skills.some((skill) => !isTier(baselines[g.dutyRole]?.[skill]))) {
                list.push(`เลือกระดับให้ครบทุกทักษะของ "${g.dutyRole}"`)
            }
            for (const m of g.members) {
                if (exceptionCount(m.registrationId, g.dutyRole) > 0 && !(reasons[m.registrationId] ?? "").trim()) {
                    list.push(`กรอกเหตุผลข้อยกเว้นของ ${m.name}`)
                }
            }
        }
        return list
    }, [data, baselines, reasons, exceptionCount])

    const totalExceptions = data
        ? data.groups.reduce((sum, g) => sum + g.members.filter((m) => exceptionCount(m.registrationId, g.dutyRole) > 0).length, 0)
        : 0

    function setBaseline(dutyRole: string, skill: string, tier: number) {
        setStatus(null)
        setBaselines((prev) => ({ ...prev, [dutyRole]: { ...prev[dutyRole], [skill]: tier } }))
    }

    function setMemberTier(registrationId: number, dutyRole: string, skill: string, tier: number) {
        setStatus(null)
        setMemberScores((prev) => {
            const next = { ...(prev[registrationId] ?? {}) }
            if (tier === baselines[dutyRole]?.[skill]) delete next[skill]
            else next[skill] = tier
            const out = { ...prev }
            if (Object.keys(next).length > 0) out[registrationId] = next
            else delete out[registrationId]
            return out
        })
    }

    function resetMember(registrationId: number) {
        setStatus(null)
        setMemberScores((prev) => {
            const out = { ...prev }
            delete out[registrationId]
            return out
        })
        setReasons((prev) => {
            const out = { ...prev }
            delete out[registrationId]
            return out
        })
    }

    async function handleSave() {
        if (!data || problems.length > 0) return
        setSaving(true)
        setStatus(null)
        try {
            const result = await evaluationsAPI.saveBatch(activityId, {
                groups: data.groups.map((g) => ({
                    dutyRole: g.dutyRole,
                    scores: data.skills.map((skill) => ({ skillType: skill, score: baselines[g.dutyRole][skill] })),
                })),
                exceptions: data.groups.flatMap((g) =>
                    g.members.flatMap((m) => {
                        const scores = data.skills
                            .filter((skill) => isException(m.registrationId, g.dutyRole, skill))
                            .map((skill) => ({ skillType: skill, score: memberScores[m.registrationId][skill] }))
                        return scores.length > 0
                            ? [{ registrationId: m.registrationId, scores, reason: (reasons[m.registrationId] ?? "").trim() }]
                            : []
                    })
                ),
            })
            hydrate(result)
            setStatus({ kind: "ok", text: "บันทึกการประเมินรายฝ่ายเรียบร้อยแล้ว" })
            onSaved?.()
        } catch (err: unknown) {
            setStatus({ kind: "error", text: (err as Error).message || "บันทึกไม่สำเร็จ" })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-fg-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลดข้อมูลการประเมิน...
            </div>
        )
    }

    if (loadError || !data) {
        return <p className="px-6 py-10 text-center text-sm text-danger">{loadError || "ไม่พบข้อมูลการประเมิน"}</p>
    }

    if (!data.eligible) {
        return (
            <div className="rounded-xl border border-border bg-surface px-6 py-8 text-center">
                <p className="font-semibold text-fg">กิจกรรมนี้ไม่ต้องประเมินรายฝ่าย</p>
                <p className="mx-auto mt-1 max-w-xl text-sm text-fg-muted">{data.reason}</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div>
                <h3 className="font-semibold text-fg">ประเมินรายฝ่าย</h3>
                <p className="mt-1 text-sm text-fg-muted">
                    ตั้งระดับให้ทั้งฝ่ายในคลิกเดียว แล้วแก้เฉพาะคนที่เป็นข้อยกเว้น — ผู้ที่เช็คอินทีหลังจะได้ระดับของฝ่ายตัวเองอัตโนมัติ
                </p>
                <div className="mt-2">
                    <SoftSkillRubricLink />
                </div>
            </div>

            {data.withoutDutyRole > 0 && (
                <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg-muted">
                    มีผู้เช็คอินที่ไม่ได้ระบุฝ่าย {data.withoutDutyRole} คน — หน้านี้แก้ให้ไม่ได้ คนกลุ่มนี้ยังได้ระดับเริ่มต้นของกิจกรรม
                </p>
            )}

            {data.approvedCount > 0 && (
                <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg-muted">
                    มี {data.approvedCount} คนที่อนุมัติผลรอบด้านแล้ว — ค่าของคนเหล่านี้ถูกล็อก การแก้ไขที่นี่ไม่กระทบพวกเขา (แก้ได้ที่แท็บ &quot;อนุมัติผล&quot;)
                </p>
            )}

            {data.groups.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface px-6 py-10 text-center text-fg-subtle">
                    ยังไม่มีผู้เช็คอินที่ระบุฝ่าย
                </p>
            ) : (
                <div className="space-y-4">
                    {data.groups.map((g) => {
                        const open = !!openGroups[g.dutyRole]
                        const groupExceptions = g.members.filter((m) => exceptionCount(m.registrationId, g.dutyRole) > 0).length
                        return (
                            <div key={g.dutyRole} className="overflow-hidden rounded-xl border border-border bg-bg shadow-xs">
                                <div className="border-b border-border px-5 py-3">
                                    <p className="font-semibold text-fg">{g.dutyRole}</p>
                                    <p className="text-xs text-fg-muted">
                                        {g.members.length} คน{groupExceptions > 0 && ` · ข้อยกเว้น ${groupExceptions} คน`}
                                    </p>
                                </div>

                                <div className="space-y-3 px-5 py-4">
                                    {data.skills.map((skill) => (
                                        <div key={skill} className="flex flex-wrap items-center justify-between gap-3">
                                            <span className="text-sm text-fg">{softSkillLabel(skill)}</span>
                                            <TierButtons
                                                value={baselines[g.dutyRole]?.[skill]}
                                                cap={data.cap}
                                                label={`ระดับของ${g.dutyRole} ด้าน${softSkillLabel(skill)}`}
                                                onChange={(tier) => setBaseline(g.dutyRole, skill, tier)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    aria-expanded={open}
                                    onClick={() => setOpenGroups((prev) => ({ ...prev, [g.dutyRole]: !open }))}
                                    className="flex w-full items-center gap-2 border-t border-border px-5 py-3 text-left text-sm font-medium text-brand-600 hover:bg-surface"
                                >
                                    {open ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                                    ดูรายชื่อ / ตั้งข้อยกเว้นรายคน
                                </button>

                                {open && (
                                    <div className="divide-y divide-border border-t border-border">
                                        {g.members.map((m) => {
                                            const exceptions = exceptionCount(m.registrationId, g.dutyRole)
                                            return (
                                                <div key={m.registrationId} className="space-y-3 px-5 py-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-medium text-fg">{m.name}</span>
                                                            {m.studentId && <span className="text-xs text-fg-muted">{m.studentId}</span>}
                                                            {exceptions > 0 && <Badge variant="default">ข้อยกเว้น</Badge>}
                                                        </div>
                                                        {(memberScores[m.registrationId] || reasons[m.registrationId]) && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="gap-1.5 text-fg-muted"
                                                                onClick={() => resetMember(m.registrationId)}
                                                            >
                                                                <RotateCcw className="size-3.5" aria-hidden="true" /> กลับไปใช้ระดับของฝ่าย
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {data.skills.map((skill) => (
                                                        <div key={skill} className="flex flex-wrap items-center justify-between gap-3">
                                                            <span className="text-xs text-fg-muted">{softSkillLabel(skill)}</span>
                                                            <TierButtons
                                                                value={memberScores[m.registrationId]?.[skill] ?? baselines[g.dutyRole]?.[skill]}
                                                                cap={data.cap}
                                                                label={`ระดับของ${m.name} ด้าน${softSkillLabel(skill)}`}
                                                                onChange={(tier) => setMemberTier(m.registrationId, g.dutyRole, skill, tier)}
                                                            />
                                                        </div>
                                                    ))}

                                                    {exceptions > 0 && (
                                                        <div className="space-y-1.5">
                                                            <label htmlFor={`reason-${m.registrationId}`} className="text-xs font-medium text-fg-muted">
                                                                เหตุผลของข้อยกเว้น <span className="text-danger">*</span>
                                                            </label>
                                                            <Input
                                                                id={`reason-${m.registrationId}`}
                                                                value={reasons[m.registrationId] ?? ""}
                                                                maxLength={500}
                                                                placeholder="เช่น รับผิดชอบเกินหน้าที่ / ขาดงาน 1 จาก 4 วัน"
                                                                onChange={(e) => {
                                                                    setStatus(null)
                                                                    setReasons((prev) => ({ ...prev, [m.registrationId]: e.target.value }))
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {data.groups.length > 0 && (
                <div className="space-y-3">
                    {problems.length > 0 && (
                        <ul className="list-disc space-y-0.5 rounded-lg border border-warning bg-warning-bg px-8 py-3 text-sm text-warning">
                            {problems.map((p) => (
                                <li key={p}>{p}</li>
                            ))}
                        </ul>
                    )}
                    {status && (
                        <p
                            role="status"
                            className={cn(
                                "rounded-lg border px-4 py-3 text-sm",
                                status.kind === "ok"
                                    ? "border-success bg-success-bg text-success"
                                    : "border-danger bg-danger-bg text-danger"
                            )}
                        >
                            {status.text}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-fg-muted">
                            {data.groups.length} ฝ่าย · ข้อยกเว้น {totalExceptions} คน
                        </p>
                        <Button type="button" onClick={handleSave} disabled={saving || problems.length > 0}>
                            {saving ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังบันทึก...
                                </>
                            ) : (
                                "บันทึกการประเมิน"
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
