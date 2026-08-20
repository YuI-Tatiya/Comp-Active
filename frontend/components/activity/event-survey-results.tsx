"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { eventsAPI, type SurveyResult } from "@/lib/api"
import { ClipboardList, Loader2, MessageSquareText, Star } from "lucide-react"

/**
 * ผลสรุปแบบสำรวจหลังงาน (ระดับ Event ไม่ใช่รายกิจกรรมย่อย)
 *
 * backend คำนวณค่าเฉลี่ย/รวมคำตอบไว้ที่ GET /api/events/:id/survey-results ตั้งแต่แรก
 * และ lib/api.ts ก็มี getSurveyResults อยู่แล้ว แต่ไม่เคยมีหน้าไหนเรียกใช้เลย
 * ผู้จัดจึงสร้างแบบสำรวจได้ นักศึกษาตอบได้ แต่ไม่มีใครอ่านผลได้
 */
export function EventSurveyResults({ eventId }: { eventId: number }) {
    const [results, setResults] = useState<SurveyResult[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                setLoading(true)
                const data = await eventsAPI.getSurveyResults(eventId)
                if (!cancelled) setResults(Array.isArray(data) ? data : [])
            } catch (err: unknown) {
                if (!cancelled) setError((err as Error).message || "โหลดผลแบบสำรวจไม่สำเร็จ")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [eventId])

    const totalResponses = results?.reduce((max, r) => Math.max(max, r.responseCount), 0) ?? 0

    return (
        <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="size-5 text-brand-600" aria-hidden="true" />
                <h2 className="text-lg font-bold text-fg">ผลแบบสำรวจหลังงาน</h2>
                {!loading && !error && totalResponses > 0 && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                        {totalResponses} คนตอบ
                    </span>
                )}
            </div>

            {loading ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-bg p-6 text-fg-muted">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลดผลแบบสำรวจ...
                </div>
            ) : error ? (
                <div className="rounded-xl border border-danger bg-danger-bg p-6 text-sm text-danger">{error}</div>
            ) : !results || results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                    <p className="text-fg-muted">งานนี้ไม่ได้สร้างแบบสำรวจไว้</p>
                </div>
            ) : totalResponses === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                    <p className="text-fg-muted">ยังไม่มีผู้ตอบแบบสำรวจ</p>
                    <p className="mt-1 text-sm text-fg-subtle">
                        นักศึกษาจะตอบได้หลังเช็คอินเข้าร่วมกิจกรรมแล้วเท่านั้น
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {results.map((r) => (
                        <div key={r.questionId} className="rounded-xl border border-border bg-bg p-6">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <h3 className="flex items-center gap-2 font-semibold text-fg">
                                    {r.type === "rating" ? (
                                        <Star className="size-4 shrink-0 text-warning" aria-hidden="true" />
                                    ) : (
                                        <MessageSquareText className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                                    )}
                                    {r.label}
                                </h3>
                                <span className="text-xs text-fg-muted">{r.responseCount} คำตอบ</span>
                            </div>

                            {r.type === "rating" ? (
                                <div className="mt-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black tabular-nums text-brand-600">
                                            {r.average?.toFixed(2) ?? "0.00"}
                                        </span>
                                        <span className="text-sm text-fg-muted">/ {r.scaleMax ?? 5}</span>
                                    </div>
                                    <Progress
                                        value={r.average ?? 0}
                                        max={r.scaleMax ?? 5}
                                        className="mt-3 h-2"
                                    />
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {r.responses && r.responses.length > 0 ? (
                                        <ul className="space-y-2">
                                            {r.responses.map((text, i) => (
                                                <li
                                                    key={i}
                                                    className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg-muted"
                                                >
                                                    {text}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-fg-subtle">ยังไม่มีผู้เขียนข้อเสนอแนะ</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
