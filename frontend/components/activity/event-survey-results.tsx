"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { type EventSurveyResultsResponse, type SurveyResult, type SurveyRespondent } from "@/lib/api"
import { buildSurveyCsv } from "@/lib/survey-csv"
import { cn } from "@/lib/utils"
import {
    ClipboardList,
    Download,
    Info,
    Loader2,
    MessageSquareText,
    Search,
    Star,
    Users,
} from "lucide-react"

/**
 * ผลสรุปแบบสำรวจหลังกิจกรรม — ใช้ได้ทั้งระดับ "งาน" (Event มีหลายกิจกรรมย่อย) และ
 * "กิจกรรมเดี่ยว" (ไม่มี Event แม่) เพราะทั้งสอง endpoint (eventsAPI.getSurveyResults /
 * activitiesAPI.getSurveyResults) ส่ง response หน้าตาเดียวกันเป๊ะ ({questions, respondents})
 * — คอมโพเนนต์นี้จึงรับ fetcher เข้ามาแทนที่จะผูกกับ eventsAPI ตรงๆ
 *
 * เดิม backend ส่งแค่ค่าเฉลี่ย/list คำตอบดิบแบบไม่ผูกตัวตน ทำให้ organizer เห็นภาพรวมได้
 * แต่ตอบไม่ได้ว่า "นักศึกษาคนไหนตอบว่าอะไร" — ตอนนี้ backend ส่ง respondents (รายคน พร้อม
 * นักศึกษา + กิจกรรมย่อยที่เข้าร่วม + คำตอบทุกข้อ) มาด้วย จึงคำนวณสรุปทุกอย่างฝั่งนี้จาก
 * respondents โดยตรง (ไม่ใช้ questions[].average/distribution/responses ที่ backend ส่งมา
 * เป็นค่าสำรอง) เพื่อให้ตัวกรอง "ตามกิจกรรมย่อย" recompute ได้ถูกต้องโดยไม่ต้องยิง API ซ้ำ
 */

interface DisplayQuestion extends SurveyResult {
    distribution: Record<number, number>
    textEntries: { registrationId: number; studentName: string; studentId: string | null; activityName: string; text: string }[]
}

function computeDisplayQuestion(question: SurveyResult, respondents: SurveyRespondent[]): DisplayQuestion {
    const scaleMax = question.scaleMax ?? 5
    const distribution: Record<number, number> = {}
    for (let score = 1; score <= scaleMax; score++) distribution[score] = 0

    if (question.type === "rating") {
        const ratings: number[] = []
        for (const r of respondents) {
            const v = r.answers[question.questionId]?.ratingValue
            if (v != null) {
                ratings.push(v)
                distribution[v] = (distribution[v] ?? 0) + 1
            }
        }
        const average = ratings.length ? ratings.reduce((sum, v) => sum + v, 0) / ratings.length : 0
        return {
            ...question,
            scaleMax,
            responseCount: ratings.length,
            average: Number(average.toFixed(2)),
            distribution,
            textEntries: [],
        }
    }

    const textEntries = respondents
        .map((r) => ({
            registrationId: r.registrationId,
            studentName: r.student.name,
            studentId: r.student.studentId,
            activityName: r.activityName,
            text: r.answers[question.questionId]?.textValue ?? "",
        }))
        .filter((e) => !!e.text)

    return {
        ...question,
        distribution,
        responseCount: textEntries.length,
        textEntries,
    }
}

interface EventSurveyResultsProps {
    /** id ของ Event หรือ Activity เดี่ยว — ใช้แค่เป็น dependency ให้ effect โหลดใหม่เมื่อเปลี่ยนหน้า */
    id: number
    fetchResults: (id: number) => Promise<EventSurveyResultsResponse>
    /** หน้าแก้ไขของงาน/กิจกรรมนี้ — ใช้พาไปเพิ่มแบบสำรวจเมื่อยังไม่มีคำถามสักข้อ */
    editHref?: string
    /** คำเรียกหน่วยที่กำลังดูอยู่ ใช้ในข้อความ ("งาน" หรือ "กิจกรรม") */
    subjectLabel?: string
    /** คำอธิบายขอบเขตของผลที่แสดง — ใช้บอกว่าผลนี้เป็นของทั้งงาน ไม่ใช่เฉพาะกิจกรรมย่อยที่เปิดอยู่ */
    scopeNote?: string
    /** ชื่องาน/กิจกรรม — ใช้เป็นหัวเรื่องและชื่อไฟล์ตอน export CSV */
    subjectName?: string
}

export function EventSurveyResults({
    id,
    fetchResults,
    editHref,
    subjectLabel = "งาน",
    scopeNote,
    subjectName = "",
}: EventSurveyResultsProps) {
    const [data, setData] = useState<EventSurveyResultsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [view, setView] = useState<"overview" | "respondents">("overview")
    const [activityFilter, setActivityFilter] = useState<string>("all")
    const [studentQuery, setStudentQuery] = useState("")

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                setLoading(true)
                const result = await fetchResults(id)
                if (!cancelled) setData(result ?? { questions: [], respondents: [] })
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
        // fetchResults ตั้งใจไม่ใส่ใน deps: เป็น reference ใหม่ทุก render ถ้าใส่ด้วยจะ refetch ทุกครั้งที่ parent re-render ทั้งที่ id ยังไม่เปลี่ยน
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const questions = useMemo(() => data?.questions ?? [], [data])
    const respondents = useMemo(() => data?.respondents ?? [], [data])

    /** กิจกรรมย่อยที่มีคนตอบแบบสำรวจอย่างน้อย 1 คน — ใช้ทำตัวเลือกกรอง ไม่เอาตัวที่ไม่มีคนตอบมาปนให้เลือกแล้วว่างเปล่า */
    const activityOptions = useMemo(() => {
        const map = new Map<number, string>()
        for (const r of respondents) map.set(r.activityId, r.activityName)
        return [...map.entries()].map(([id, name]) => ({ id, name }))
    }, [respondents])

    const filteredRespondents = useMemo(() => {
        if (activityFilter === "all") return respondents
        const id = Number(activityFilter)
        return respondents.filter((r) => r.activityId === id)
    }, [respondents, activityFilter])

    const displayedQuestions = useMemo(
        () => questions.map((q) => computeDisplayQuestion(q, filteredRespondents)),
        [questions, filteredRespondents]
    )

    const q = studentQuery.trim().toLowerCase()
    const tableRespondents = filteredRespondents.filter(
        (r) => !q || r.student.name.toLowerCase().includes(q) || (r.student.studentId ?? "").toLowerCase().includes(q)
    )

    const totalResponses = respondents.length

    /**
     * ส่งออกผลแบบสำรวจเป็น CSV — ไฟล์เดียวมีทั้งบล็อกสรุปรายข้อและคำตอบรายบุคคล
     * ยึดตามขอบเขตที่กรองไว้ตอนนั้น (ตัวกรองกิจกรรมย่อย) แต่ไม่สนคำค้นหาชื่อ เพราะช่องค้นหา
     * เป็นแค่การหาคนชั่วคราวในตาราง ไม่ใช่การเลือกขอบเขตของรายงาน
     */
    const exportCSV = () => {
        if (filteredRespondents.length === 0) return

        const scopeName =
            activityFilter === "all"
                ? "ทุกกิจกรรมย่อย"
                : (activityOptions.find((a) => String(a.id) === activityFilter)?.name ?? "-")

        const csvContent = buildSurveyCsv({
            subjectLabel,
            subjectName,
            scopeName,
            questions: displayedQuestions,
            respondents: filteredRespondents,
            exportedAt: new Date(),
        })

        // BOM นำหน้า ไม่งั้น Excel บน Windows อ่านภาษาไทยเป็นตัวยึกยือ
        const BOM = "﻿"
        const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        const dateSlug = new Date().toISOString().slice(0, 10)
        link.download = `แบบสำรวจ_${(subjectName || subjectLabel).replace(/\s+/g, "_")}_${dateSlug}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <ClipboardList className="size-5 text-brand-600" aria-hidden="true" />
                <h2 className="text-lg font-bold text-fg">ผลแบบสำรวจหลัง{subjectLabel}</h2>
                {!loading && !error && totalResponses > 0 && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                        {totalResponses} คนตอบ
                    </span>
                )}
                {!loading && !error && totalResponses > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto gap-2"
                        onClick={exportCSV}
                        disabled={filteredRespondents.length === 0}
                    >
                        <Download className="size-4" aria-hidden="true" /> Export CSV
                    </Button>
                )}
            </div>

            {scopeNote && !loading && !error && questions.length > 0 && (
                <p className="mb-4 flex items-start gap-1.5 rounded-xl bg-surface px-4 py-3 text-sm text-fg-muted">
                    <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                    {scopeNote}
                </p>
            )}

            {loading ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-bg p-6 text-fg-muted">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลดผลแบบสำรวจ...
                </div>
            ) : error ? (
                <div className="rounded-xl border border-danger bg-danger-bg p-6 text-sm text-danger">{error}</div>
            ) : questions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                    <p className="text-fg-muted">ยังไม่ได้สร้างแบบสำรวจสำหรับ{subjectLabel}นี้</p>
                    {/* เดิมจบแค่ประโยคเดียวเป็นทางตัน ผู้จัดอ่านแล้วไม่รู้ว่าเพิ่มแบบสำรวจได้ที่ไหน
                        จึงเข้าใจว่าหน้านี้พัง — ใส่ทางไปต่อให้ชัดตรงนี้เลย */}
                    {editHref && (
                        <>
                            <p className="mx-auto mt-1 max-w-md text-sm text-fg-subtle">
                                เพิ่มคำถามแบบสำรวจได้ที่หน้าแก้ไข นักศึกษาจะได้ตอบหลังเช็คอินเข้าร่วมแล้ว
                                และผลจะมาแสดงเป็นกราฟและรายบุคคลที่นี่
                            </p>
                            <Button asChild variant="outline" className="mt-5 gap-2 rounded-xl">
                                <Link href={editHref}>
                                    <ClipboardList className="size-4" aria-hidden="true" />
                                    เพิ่มแบบสำรวจ
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            ) : totalResponses === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                    <p className="text-fg-muted">ยังไม่มีผู้ตอบแบบสำรวจ</p>
                    <p className="mt-1 text-sm text-fg-subtle">
                        นักศึกษาจะตอบได้หลังเช็คอินเข้าร่วมกิจกรรมแล้วเท่านั้น
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-xl bg-surface p-1">
                            <button
                                type="button"
                                onClick={() => setView("overview")}
                                className={cn(
                                    "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                                    view === "overview" ? "bg-bg text-brand-600 shadow-sm" : "text-fg-muted hover:text-fg"
                                )}
                            >
                                สรุปภาพรวม
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("respondents")}
                                className={cn(
                                    "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                                    view === "respondents" ? "bg-bg text-brand-600 shadow-sm" : "text-fg-muted hover:text-fg"
                                )}
                            >
                                รายบุคคล ({filteredRespondents.length})
                            </button>
                        </div>

                        {/* กรองตามกิจกรรมย่อย — มีประโยชน์เฉพาะงานที่มีหลายกิจกรรมย่อย ให้ organizer เทียบผลแต่ละกิจกรรมย่อยแยกกันได้ */}
                        {activityOptions.length > 1 && (
                            <Select
                                className="h-10 w-auto min-w-[200px] rounded-lg"
                                value={activityFilter}
                                onChange={(e) => setActivityFilter(e.target.value)}
                                aria-label="กรองตามกิจกรรมย่อย"
                            >
                                <option value="all">ทุกกิจกรรมย่อย</option>
                                {activityOptions.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </div>

                    {view === "overview" ? (
                        <div className="space-y-4">
                            {displayedQuestions.map((r) => (
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
                                        r.responseCount > 0 ? (
                                            <div className="mt-4 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
                                                <div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-black tabular-nums text-brand-600">
                                                            {r.average?.toFixed(2) ?? "0.00"}
                                                        </span>
                                                        <span className="text-sm text-fg-muted">/ {r.scaleMax}</span>
                                                    </div>
                                                    <Progress value={r.average ?? 0} max={r.scaleMax} className="mt-3 h-2 w-40" />
                                                </div>
                                                <div className="h-36 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={Object.entries(r.distribution).map(([score, count]) => ({ score: Number(score), count }))}
                                                            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                                            <XAxis
                                                                dataKey="score"
                                                                tick={{ fontSize: 12, fill: "var(--color-fg-muted)" }}
                                                                axisLine={{ stroke: "var(--color-border)" }}
                                                                tickLine={false}
                                                            />
                                                            <YAxis
                                                                allowDecimals={false}
                                                                tick={{ fontSize: 12, fill: "var(--color-fg-muted)" }}
                                                                axisLine={false}
                                                                tickLine={false}
                                                                width={28}
                                                            />
                                                            <Tooltip
                                                                cursor={{ fill: "var(--color-surface)" }}
                                                                formatter={(value?: number) => [`${value ?? 0} คน`, "จำนวน"]}
                                                                labelFormatter={(label) => `ให้คะแนน ${label}`}
                                                                contentStyle={{
                                                                    background: "var(--color-bg)",
                                                                    border: "1px solid var(--color-border)",
                                                                    borderRadius: 8,
                                                                    fontSize: 12,
                                                                }}
                                                            />
                                                            <Bar dataKey="count" fill="var(--color-brand-600)" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-4 text-sm text-fg-subtle">ยังไม่มีผู้ให้คะแนนข้อนี้</p>
                                        )
                                    ) : (
                                        <div className="mt-4">
                                            {r.textEntries.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {r.textEntries.map((e) => (
                                                        <li
                                                            key={e.registrationId}
                                                            className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg-muted"
                                                        >
                                                            <p className="whitespace-pre-line text-fg">{e.text}</p>
                                                            <p className="mt-1.5 text-xs text-fg-subtle">
                                                                — {e.studentName}
                                                                {e.studentId && ` (${e.studentId})`}
                                                                {activityOptions.length > 1 && ` · ${e.activityName}`}
                                                            </p>
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
                    ) : (
                        <div className="rounded-xl border border-border bg-bg shadow-xs overflow-hidden">
                            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
                                <p className="text-sm text-fg-muted">
                                    ผู้ตอบแบบสำรวจ <span className="font-semibold text-fg">{tableRespondents.length}</span> คน
                                </p>
                                <div className="relative w-56">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                                    <Input
                                        type="text"
                                        placeholder="ค้นหาชื่อ/รหัสนักศึกษา..."
                                        className="h-9 rounded-lg pl-9 text-sm"
                                        value={studentQuery}
                                        onChange={(e) => setStudentQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            {tableRespondents.length === 0 ? (
                                <p className="px-6 py-8 text-center text-fg-subtle">ไม่พบนักศึกษาที่ค้นหา</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-max text-left">
                                        <thead>
                                            <tr className="bg-surface text-sm text-fg-muted">
                                                <th className="whitespace-nowrap px-6 py-4 font-semibold">นักศึกษา</th>
                                                {activityOptions.length > 1 && (
                                                    <th className="whitespace-nowrap px-6 py-4 font-semibold">กิจกรรมย่อย</th>
                                                )}
                                                {questions.map((qn) => (
                                                    <th key={qn.questionId} className="min-w-[180px] px-6 py-4 font-semibold">
                                                        {qn.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {tableRespondents.map((r) => (
                                                <tr key={r.registrationId} className="transition-colors hover:bg-surface">
                                                    <td className="whitespace-nowrap px-6 py-4">
                                                        <div className="font-medium text-fg">{r.student.name}</div>
                                                        {r.student.studentId && (
                                                            <div className="text-xs text-fg-muted">{r.student.studentId}</div>
                                                        )}
                                                    </td>
                                                    {activityOptions.length > 1 && (
                                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-fg-muted">{r.activityName}</td>
                                                    )}
                                                    {questions.map((qn) => {
                                                        const ans = r.answers[qn.questionId]
                                                        return (
                                                            <td key={qn.questionId} className="px-6 py-4 text-sm">
                                                                {qn.type === "rating" ? (
                                                                    ans?.ratingValue != null ? (
                                                                        <Badge variant="default" className="gap-1">
                                                                            <Star className="size-3" aria-hidden="true" />
                                                                            {ans.ratingValue}/{qn.scaleMax}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-fg-subtle">—</span>
                                                                    )
                                                                ) : ans?.textValue ? (
                                                                    <p className="max-w-xs whitespace-pre-line text-fg-muted">{ans.textValue}</p>
                                                                ) : (
                                                                    <span className="text-fg-subtle">—</span>
                                                                )}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activityOptions.length > 1 && (
                        <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
                            <Users className="size-3.5" aria-hidden="true" />
                            งานนี้มี {activityOptions.length} กิจกรรมย่อยที่มีผู้ตอบแบบสำรวจ — ใช้ตัวกรองด้านบนเพื่อดูผลเฉพาะกิจกรรมย่อยใดกิจกรรมย่อยหนึ่ง
                        </p>
                    )}
                </div>
            )}
        </section>
    )
}
