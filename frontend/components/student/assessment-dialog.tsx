"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { TierButtons } from "@/components/activity/tier-buttons"
import { assessmentsAPI, type AssessmentTask, type MyAssessments } from "@/lib/api"
import { SOFT_SKILL_TIERS, softSkillLabel } from "@/lib/soft-skills"

/** กิจกรรมที่เปิดโหมดนี้ได้คือ Tier 3 ซึ่งปลดล็อกครบทั้ง 3 ระดับเสมอ */
const MAX_TIER = 5

interface Props {
    /** null = ปิดหน้าต่าง */
    registrationId: number | null
    onClose: () => void
}

/**
 * แบบประเมินตนเองและเพื่อน (360°) ของนักศึกษา — ให้ระดับตามพฤติกรรมที่สังเกตได้ในกิจกรรมนี้
 * ส่งได้ทีละใบและส่งแล้วแก้ไม่ได้; เพื่อนและผู้จัดไม่เห็นว่าใครให้ระดับเท่าไร
 * server เป็นผู้ตัดสินว่าเปิดให้ส่งได้หรือยัง (ต้องเช็คอินแล้ว + ผู้จัดเปิดโหมด + กิจกรรมจบแล้ว)
 */
export function AssessmentDialog({ registrationId, onClose }: Props) {
    const [data, setData] = useState<MyAssessments | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    // ระดับที่กำลังเลือกอยู่ของแต่ละใบงาน (ยังไม่ส่ง) — key = assignmentId
    const [drafts, setDrafts] = useState<Record<number, Record<string, number>>>({})
    const [submittingId, setSubmittingId] = useState<number | null>(null)

    const load = useCallback(async (id: number) => {
        setError("")
        try {
            setData(await assessmentsAPI.getMine(id))
        } catch (err) {
            setData(null)
            setError((err as Error).message || "โหลดแบบประเมินไม่สำเร็จ")
        }
    }, [])

    useEffect(() => {
        if (registrationId === null) return
        let cancelled = false
        setData(null)
        setDrafts({})
        setLoading(true)
        load(registrationId).finally(() => {
            if (!cancelled) setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [registrationId, load])

    async function submit(task: AssessmentTask) {
        if (registrationId === null || !data) return
        const draft = drafts[task.assignmentId] ?? {}
        setSubmittingId(task.assignmentId)
        setError("")
        try {
            await assessmentsAPI.submit(task.assignmentId, {
                scores: data.skills.map((skill) => ({ skillType: skill, score: draft[skill] })),
            })
            await load(registrationId)
        } catch (err) {
            setError((err as Error).message || "ส่งแบบประเมินไม่สำเร็จ")
        } finally {
            setSubmittingId(null)
        }
    }

    const doneCount = data?.tasks.filter((t) => t.submitted).length ?? 0

    return (
        <Dialog open={registrationId !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ประเมินตนเองและเพื่อน</DialogTitle>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto py-1 pr-1">
                    {error && (
                        <div className="rounded-lg border border-danger bg-danger-bg px-4 py-3 text-sm text-danger">{error}</div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="size-8 animate-spin text-brand-600" aria-hidden="true" />
                        </div>
                    ) : data && !data.enabled ? (
                        <p className="text-sm text-fg-muted">กิจกรรมนี้ไม่ได้เปิดการประเมินรอบด้าน</p>
                    ) : data && !data.open ? (
                        <p className="text-sm text-fg-muted">ยังไม่เปิดให้ประเมิน — จะเปิดเมื่อผู้จัดจบกิจกรรมแล้ว</p>
                    ) : data && data.tasks.length === 0 ? (
                        <p className="text-sm text-fg-muted">ยังไม่มีใบประเมินให้คุณทำ</p>
                    ) : (
                        data && (
                            <>
                                <div className="space-y-1.5 rounded-xl border border-border bg-surface p-3 text-xs text-fg-muted">
                                    <p className="font-semibold text-fg">ให้ระดับตามพฤติกรรมที่สังเกตได้ในกิจกรรมนี้</p>
                                    <ul className="space-y-0.5">
                                        {SOFT_SKILL_TIERS.map((tier) => (
                                            <li key={tier.value}>
                                                <strong className="text-fg">{tier.label}</strong> — {tier.hint}
                                            </li>
                                        ))}
                                    </ul>
                                    <p>เพื่อนและผู้จัดจะไม่เห็นว่าใครให้ระดับเท่าไร และส่งแล้วแก้ไขไม่ได้</p>
                                </div>

                                <p className="text-sm text-fg-muted">
                                    ส่งแล้ว <strong className="tabular-nums text-fg">{doneCount}/{data.tasks.length}</strong> ใบ
                                </p>

                                {data.tasks.map((task) => {
                                    const draft = drafts[task.assignmentId] ?? {}
                                    const complete = data.skills.every((skill) => draft[skill] !== undefined)
                                    const busy = submittingId === task.assignmentId
                                    const title = task.source === "self" ? "ประเมินตนเอง" : `ประเมินเพื่อน: ${task.targetName}`
                                    return (
                                        <section key={task.assignmentId} className="space-y-3 rounded-xl border border-border p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="text-sm font-bold text-fg">{title}</h4>
                                                <div className="flex items-center gap-2">
                                                    {task.targetDutyRole && <Badge variant="neutral">{task.targetDutyRole}</Badge>}
                                                    {task.submitted && (
                                                        <Badge variant="success">
                                                            <CheckCircle2 className="mr-1 size-3" aria-hidden="true" /> ส่งแล้ว
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {data.skills.map((skill) => (
                                                <div key={skill} className="flex flex-wrap items-center justify-between gap-3">
                                                    <span className="text-xs text-fg-muted">{softSkillLabel(skill)}</span>
                                                    <TierButtons
                                                        value={task.submitted ? task.myScores?.[skill] : draft[skill]}
                                                        cap={MAX_TIER}
                                                        disabled={task.submitted || busy}
                                                        label={`${title} ด้าน${softSkillLabel(skill)}`}
                                                        onChange={(tier) => {
                                                            setError("")
                                                            setDrafts((prev) => ({
                                                                ...prev,
                                                                [task.assignmentId]: { ...prev[task.assignmentId], [skill]: tier },
                                                            }))
                                                        }}
                                                    />
                                                </div>
                                            ))}

                                            {!task.submitted && (
                                                <div className="flex justify-end">
                                                    <Button size="sm" disabled={!complete || busy} onClick={() => submit(task)}>
                                                        {busy ? "กำลังส่ง..." : "ส่งใบประเมิน"}
                                                    </Button>
                                                </div>
                                            )}
                                        </section>
                                    )
                                })}
                            </>
                        )
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submittingId !== null}>
                        ปิด
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
