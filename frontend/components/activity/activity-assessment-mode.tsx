"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { evaluationsAPI, type AssessmentOrganizerState } from "@/lib/api"

interface Props {
    activityId: number
}

const RADIO_CLASS = "mt-0.5 size-4 shrink-0 border-border text-brand-600 focus:ring-brand-500"

/**
 * เลือกรูปแบบการประเมินของกิจกรรม Tier 3: ผู้จัดประเมินฝั่งเดียว หรือประเมินรอบด้าน (นักศึกษาประเมินตนเอง + เพื่อน)
 * เลือกแล้วบันทึกทันที — server เป็นผู้ตัดสินว่ากิจกรรมนี้เข้าเงื่อนไขหรือไม่ (ไม่เข้าเงื่อนไข: ไม่แสดงอะไร
 * เพราะหน้าประเมินรายฝ่ายด้านล่างแสดงเหตุผลอยู่แล้ว)
 *
 * ผู้จัดเห็นเฉพาะความคืบหน้า ไม่เห็นคะแนนที่นักศึกษาให้กันเป็นรายคน (เพื่อนต้องไม่ถูกเปิดเผยว่าใครให้ใคร)
 */
export function ActivityAssessmentMode({ activityId }: Props) {
    const [state, setState] = useState<AssessmentOrganizerState | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [saving, setSaving] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
    const [pendingOpen, setPendingOpen] = useState(false)

    const load = useCallback(async () => {
        setLoadError("")
        try {
            setState(await evaluationsAPI.getAssessment(activityId))
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

    async function choose(enabled: boolean) {
        if (!state || saving || state.enabled === enabled) return
        setSaving(true)
        setStatus(null)
        try {
            setState(await evaluationsAPI.setAssessment(activityId, enabled))
            setStatus({ kind: "ok", text: enabled ? "เปิดการประเมินรอบด้านแล้ว" : "กลับไปประเมินฝั่งเดียวแล้ว" })
        } catch (err) {
            setStatus({ kind: "error", text: (err as Error).message || "บันทึกไม่สำเร็จ" })
        } finally {
            setSaving(false)
        }
    }

    async function refresh() {
        setRefreshing(true)
        await load()
        setRefreshing(false)
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลด...
            </div>
        )
    }
    if (loadError) return <p className="text-sm text-danger">{loadError}</p>
    if (!state?.eligible) return null

    const radioName = `assessment-mode-${activityId}`

    return (
        <section className="space-y-4 rounded-2xl border border-border bg-bg p-5">
            <div>
                <h3 className="text-sm font-bold text-fg">รูปแบบการประเมิน</h3>
                <p className="mt-0.5 text-xs text-fg-muted">เลือกว่าคะแนนของผู้เข้าร่วมมาจากผู้จัดคนเดียว หรือมีเสียงของนักศึกษาด้วย</p>
            </div>

            <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-fg">
                    <input
                        type="radio"
                        name={radioName}
                        checked={!state.enabled}
                        disabled={saving}
                        onChange={() => choose(false)}
                        className={RADIO_CLASS}
                    />
                    <span>
                        <span className="font-medium">ผู้จัดประเมินฝั่งเดียว (ค่าเริ่มต้น)</span>
                        <span className="block text-xs text-fg-muted">คะแนนมาจากที่ผู้จัดตั้งไว้ในหน้านี้เท่านั้น</span>
                    </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-fg">
                    <input
                        type="radio"
                        name={radioName}
                        checked={state.enabled}
                        disabled={saving}
                        onChange={() => choose(true)}
                        className={RADIO_CLASS}
                    />
                    <span>
                        <span className="font-medium">ประเมินรอบด้าน (360°)</span>
                        <span className="block text-xs text-fg-muted">
                            เมื่อกิจกรรมจบ ระบบจับคู่เพื่อนให้อัตโนมัติ นักศึกษาแต่ละคนประเมินตนเองและเพื่อน 2 คน
                            ผู้จัดเห็นเฉพาะความคืบหน้าการส่ง แล้วตรวจและอนุมัติคะแนนสุทธิที่แท็บ &quot;อนุมัติผล&quot;
                        </span>
                        <span className="mt-1 block text-xs font-medium text-warning">
                            เมื่อเปิด คะแนนของกิจกรรมนี้จะถูกซ่อนจากนักศึกษาจนกว่าคุณจะอนุมัติ — ปิดโหมดเมื่อไรคะแนนจะกลับมาแสดงทันที
                        </span>
                    </span>
                </label>
            </div>

            {status && (
                <p role="status" className={status.kind === "ok" ? "text-xs text-success" : "text-xs text-danger"}>
                    {status.text}
                </p>
            )}

            {state.enabled && (
                <div className="space-y-3 border-t border-border pt-4">
                    <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
                        คะแนนของกิจกรรมนี้ซ่อนจากนักศึกษาอยู่ จนกว่าคุณจะอนุมัติที่แท็บ &quot;อนุมัติผล&quot; หลังกิจกรรมจบและนักศึกษาส่งแบบประเมินแล้ว
                    </p>

                    {!state.completed || !state.progress ? (
                        <p className="text-sm text-fg-muted">ระบบจะส่งแบบประเมินให้นักศึกษาเมื่อคุณกดจบกิจกรรม</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-fg">
                                    ส่งแล้ว: ประเมินตนเอง{" "}
                                    <strong className="tabular-nums">
                                        {state.progress.self.submitted}/{state.progress.self.total}
                                    </strong>{" "}
                                    · ประเมินเพื่อน{" "}
                                    <strong className="tabular-nums">
                                        {state.progress.peer.submitted}/{state.progress.peer.total}
                                    </strong>
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1.5 text-fg-muted"
                                    disabled={refreshing}
                                    onClick={refresh}
                                >
                                    <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" /> รีเฟรช
                                </Button>
                            </div>

                            {state.pending.length === 0 ? (
                                <p className="text-sm text-success">ทุกคนส่งครบแล้ว</p>
                            ) : (
                                <div className="rounded-xl border border-border">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-fg"
                                        aria-expanded={pendingOpen}
                                        onClick={() => setPendingOpen((v) => !v)}
                                    >
                                        {pendingOpen ? (
                                            <ChevronDown className="size-4" aria-hidden="true" />
                                        ) : (
                                            <ChevronRight className="size-4" aria-hidden="true" />
                                        )}
                                        ยังส่งไม่ครบ {state.pending.length} คน
                                    </button>
                                    {pendingOpen && (
                                        <ul className="divide-y divide-border border-t border-border">
                                            {state.pending.map((p) => (
                                                <li key={p.registrationId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                                                    <span className="text-fg">{p.name}</span>
                                                    <span className="text-xs text-fg-muted">
                                                        ตนเอง: {p.selfDone ? "ส่งแล้ว" : "ยังไม่ส่ง"} · เพื่อน {p.peerGiven}/{p.peerTotal}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
