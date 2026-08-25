"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { StatTile } from "@/components/ui/stat-tile"
import { formatEventDate } from "@/components/ui/event-card"
import {
    ArrowLeft,
    Users,
    CheckSquare,
    ClipboardCheck,
    TrendingUp,
    Download,
    Loader2,
    Calendar,
    Clock,
    MapPin,
    ListChecks,
} from "lucide-react"
import { activitiesAPI, type Activity } from "@/lib/api"
import { EventSurveyResults } from "@/components/activity/event-survey-results"
import type { RegistrationRow } from "@/components/activity/activity-participant-manager"

function answerText(a: { textValue?: string | null; options?: { option: { label: string } }[] }): string {
    if (a.textValue) return a.textValue
    if (a.options && a.options.length > 0) return a.options.map((o) => o.option.label).join(", ")
    return "-"
}

function downloadCSV(filename: string, lines: string[]) {
    const BOM = "﻿"
    const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

/**
 * Dashboard สรุปผลของกิจกรรมหนึ่งรายการ — ตัวเลข/กราฟ/export เท่านั้น ไม่มีปุ่มจัดการ (ยืนยัน/เช็คอิน/แก้ไข)
 * แยกจากหน้า "จัดการกิจกรรม" (/organizer/events/[id] หรือ /organizer/activities/[id]) ที่ใช้ทำ action จริง
 */
export default function ActivityDashboardPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [activity, setActivity] = useState<Activity<RegistrationRow> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (id) fetchData(id)
    }, [id])

    const fetchData = async (activityId: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getByIdForOrganizer(activityId)
            setActivity(data as Activity<RegistrationRow>)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูล Dashboard...</p>
                </Container>
            </div>
        )
    }

    if (error || !activity) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบข้อมูลกิจกรรม"}</p>
                    <Button variant="outline" asChild>
                        <Link href="/organizer/dashboard">กลับไปหน้าแดชบอร์ด</Link>
                    </Button>
                </Container>
            </div>
        )
    }

    const registrations = activity.registrations ?? []
    const questions = activity.questions ?? []
    const total = registrations.length
    const confirmed = registrations.filter((r) => r.status === "confirmed").length
    const attended = registrations.filter((r) => r.attendance === "attended").length
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0
    const certRequesters = registrations.filter((r) => r.wantsCertLoanFund || r.wantsCertScholarship)

    const isEventActivity = activity.eventId != null
    const editHref = isEventActivity
        ? `/organizer/manage/${activity.eventId}/edit`
        : `/organizer/activities/${activity.id}/edit`
    const manageHref = isEventActivity ? `/organizer/events/${activity.eventId}` : `/organizer/activities/${activity.id}`

    const baseHeaders = (extra: string[] = []) => [
        "ลำดับ",
        "ชื่อ-นามสกุล",
        "รหัสนักศึกษา",
        "อีเมล",
        "เบอร์โทร",
        ...extra,
    ]
    const baseRow = (r: RegistrationRow, idx: number, extra: (string | number)[] = []) => [
        idx + 1,
        r.student?.name || "-",
        r.student?.studentId || "-",
        r.student?.email || "-",
        r.student?.phone || "-",
        ...extra,
    ]
    const toCSVLine = (cells: (string | number)[]) => cells.map((c) => `"${c}"`).join(",")
    const csvHeader = (label: string, rows: RegistrationRow[]) => [
        `กิจกรรม: ${activity.name}`,
        `วันที่จัด: ${formatEventDate(activity.date)}  เวลา: ${activity.startTime} - ${activity.endTime}`,
        `${label}: ${rows.length} คน`,
        "",
    ]

    const exportAll = () => {
        if (total === 0) return
        const headers = baseHeaders([
            ...questions.map((q) => q.label),
            "ขอจิตอาสา กยศ.",
            "ขอจิตอาสาทุนการศึกษา",
            "สถานะการลงทะเบียน",
            "เช็คอิน",
        ])
        const rows = registrations.map((r, idx) =>
            baseRow(r, idx, [
                ...questions.map((q) => {
                    const a = r.answers?.find((ans) => ans.question.id === q.id)
                    return a ? answerText(a) : "-"
                }),
                r.wantsCertLoanFund ? "ขอ" : "-",
                r.wantsCertScholarship ? "ขอ" : "-",
                r.status === "confirmed" ? "ยืนยันแล้ว" : "รอดำเนินการ",
                r.attendance === "attended" ? "เข้าร่วมแล้ว" : "ยังไม่เช็คอิน",
            ])
        )
        downloadCSV(
            `ผู้เข้าร่วมทั้งหมด_${activity.name.replace(/\s+/g, "_")}.csv`,
            [...csvHeader("จำนวนผู้ลงทะเบียนทั้งหมด", registrations), headers.join(","), ...rows.map(toCSVLine)]
        )
    }

    const exportCertRequesters = () => {
        if (certRequesters.length === 0) return
        const headers = baseHeaders(["ขอจิตอาสา กยศ.", "ขอจิตอาสาทุนการศึกษา"])
        const rows = certRequesters.map((r, idx) =>
            baseRow(r, idx, [r.wantsCertLoanFund ? "ขอ" : "-", r.wantsCertScholarship ? "ขอ" : "-"])
        )
        downloadCSV(
            `ผู้ขอใบจิตอาสา_${activity.name.replace(/\s+/g, "_")}.csv`,
            [...csvHeader("จำนวนผู้ขอใบจิตอาสา", certRequesters), headers.join(","), ...rows.map(toCSVLine)]
        )
    }

    const exportAttendees = () => {
        const attendees = registrations.filter((r) => r.attendance === "attended")
        if (attendees.length === 0) return
        const headers = baseHeaders(["เช็คอินเมื่อ"])
        const rows = attendees.map((r, idx) =>
            baseRow(r, idx, [r.checkInTime ? new Date(r.checkInTime).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "-"])
        )
        downloadCSV(
            `ผู้เข้าร่วมจริง_${activity.name.replace(/\s+/g, "_")}.csv`,
            [...csvHeader("จำนวนผู้เข้าร่วมจริง (เช็คอินแล้ว)", attendees), headers.join(","), ...rows.map(toCSVLine)]
        )
    }

    const exportQuestionnaire = () => {
        if (questions.length === 0 || total === 0) return
        const headers = baseHeaders(questions.map((q) => q.label))
        const rows = registrations.map((r, idx) =>
            baseRow(
                r,
                idx,
                questions.map((q) => {
                    const a = r.answers?.find((ans) => ans.question.id === q.id)
                    return a ? answerText(a) : "-"
                })
            )
        )
        downloadCSV(
            `คำตอบแบบสอบถามลงทะเบียน_${activity.name.replace(/\s+/g, "_")}.csv`,
            [...csvHeader("จำนวนผู้ตอบ", registrations), headers.join(","), ...rows.map(toCSVLine)]
        )
    }

    return (
        <div className="bg-surface pb-12">
            <Container className="space-y-8 py-8">
                <div>
                    <Link href={manageHref} className="inline-flex items-center text-sm text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปหน้าจัดการกิจกรรม
                    </Link>
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-brand-600">Dashboard กิจกรรม</p>
                            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-fg">{activity.name}</h1>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
                                <span className="inline-flex items-center gap-1.5"><Calendar className="size-4" aria-hidden="true" /> {formatEventDate(activity.date)}</span>
                                <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden="true" /> {activity.startTime} - {activity.endTime}</span>
                                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" /> {activity.location}</span>
                            </div>
                        </div>
                        <Button asChild variant="outline">
                            <Link href={manageHref}>ไปหน้าจัดการผู้เข้าร่วม</Link>
                        </Button>
                    </div>
                </div>

                {/* สถิติภาพรวม */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatTile label="ลงทะเบียนทั้งหมด" value={total} icon={Users} />
                    <StatTile label="ยืนยันแล้ว" value={confirmed} icon={CheckSquare} />
                    <StatTile
                        label="เข้าร่วมจริง (เช็คอินแล้ว)"
                        value={attended}
                        icon={ClipboardCheck}
                        caption="เช็คอินผ่านคิวอาร์โค้ด หรือผู้จัดเช็คให้"
                    />
                    <StatTile label="อัตราการเข้าร่วม" value={`${attendanceRate}%`} icon={TrendingUp} />
                </div>

                {/* Export CSV แยกตามหมวด */}
                <Card className="border-border shadow-xs">
                    <div className="space-y-4 p-6">
                        <div>
                            <h2 className="text-lg font-semibold text-fg">Export ข้อมูล (CSV)</h2>
                            <p className="text-sm text-fg-muted">เลือก export เฉพาะส่วนที่ต้องการ หรือ export ทั้งหมด</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <button
                                onClick={exportAll}
                                disabled={total === 0}
                                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Users className="size-5 text-brand-600" aria-hidden="true" />
                                <span className="font-semibold text-fg">ผู้ลงทะเบียนทั้งหมด</span>
                                <span className="text-xs text-fg-muted">{total} คน</span>
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600"><Download className="size-3.5" aria-hidden="true" /> Export CSV</span>
                            </button>
                            <button
                                onClick={exportCertRequesters}
                                disabled={certRequesters.length === 0}
                                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ClipboardCheck className="size-5 text-brand-600" aria-hidden="true" />
                                <span className="font-semibold text-fg">ผู้ขอใบจิตอาสา (กยศ./ทุน)</span>
                                <span className="text-xs text-fg-muted">{certRequesters.length} คน</span>
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600"><Download className="size-3.5" aria-hidden="true" /> Export CSV</span>
                            </button>
                            <button
                                onClick={exportAttendees}
                                disabled={attended === 0}
                                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckSquare className="size-5 text-brand-600" aria-hidden="true" />
                                <span className="font-semibold text-fg">ผู้เข้าร่วมจริง (เช็คอินแล้ว)</span>
                                <span className="text-xs text-fg-muted">{attended} คน</span>
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600"><Download className="size-3.5" aria-hidden="true" /> Export CSV</span>
                            </button>
                            <button
                                onClick={exportQuestionnaire}
                                disabled={questions.length === 0 || total === 0}
                                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ListChecks className="size-5 text-brand-600" aria-hidden="true" />
                                <span className="font-semibold text-fg">คำตอบแบบสอบถามลงทะเบียน</span>
                                <span className="text-xs text-fg-muted">
                                    {questions.length === 0 ? "กิจกรรมนี้ไม่มีคำถามลงทะเบียน" : `${questions.length} คำถาม`}
                                </span>
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600"><Download className="size-3.5" aria-hidden="true" /> Export CSV</span>
                            </button>
                        </div>
                    </div>
                </Card>

                {/* กราฟผลแบบสำรวจหลังกิจกรรม */}
                <EventSurveyResults
                    id={activity.id}
                    fetchResults={activitiesAPI.getSurveyResults}
                    editHref={editHref}
                    subjectLabel={isEventActivity ? "งาน" : "กิจกรรม"}
                    subjectName={activity.name}
                    scopeNote={
                        isEventActivity
                            ? "กิจกรรมนี้เป็นกิจกรรมย่อยของงาน — แบบสำรวจเป็นใบเดียวของทั้งงาน ผลด้านล่างจึงรวมผู้ตอบจากทุกกิจกรรมย่อยในงานเดียวกัน"
                            : undefined
                    }
                />

                {/* ตารางผู้ลงทะเบียน — สรุปดูเท่านั้น ไม่มีปุ่มจัดการ */}
                <Card className="border-border shadow-xs overflow-hidden">
                    <div className="border-b border-border px-6 py-4">
                        <h2 className="text-lg font-semibold text-fg">รายชื่อผู้ลงทะเบียน ({total})</h2>
                    </div>
                    {total > 0 ? (
                        <div className="max-h-[480px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-surface text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                                    <tr>
                                        <th className="px-6 py-3">ชื่อ-นามสกุล</th>
                                        <th className="px-6 py-3">รหัสนักศึกษา</th>
                                        <th className="px-6 py-3">สถานะ</th>
                                        <th className="px-6 py-3">เข้าร่วม</th>
                                        <th className="px-6 py-3">จิตอาสา</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {registrations.map((r) => (
                                        <tr key={r.id}>
                                            <td className="px-6 py-3 font-medium text-fg">{r.student.name}</td>
                                            <td className="px-6 py-3 text-fg-muted">{r.student.studentId}</td>
                                            <td className="px-6 py-3">
                                                <Badge variant={r.status === "confirmed" ? "default" : "neutral"}>
                                                    {r.status === "confirmed" ? "ยืนยันแล้ว" : "รอการยืนยัน"}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-3">
                                                {r.attendance === "attended" ? (
                                                    <Badge variant="success">เข้าร่วมแล้ว</Badge>
                                                ) : (
                                                    <span className="text-xs text-fg-subtle">ยังไม่เช็คอิน</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex gap-1">
                                                    {r.wantsCertLoanFund && <Badge variant="default">กยศ.</Badge>}
                                                    {r.wantsCertScholarship && <Badge variant="default">ทุน</Badge>}
                                                    {!r.wantsCertLoanFund && !r.wantsCertScholarship && <span className="text-xs text-fg-subtle">-</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="px-6 py-10 text-center text-fg-subtle">ยังไม่มีผู้ลงทะเบียน</p>
                    )}
                </Card>
            </Container>
        </div>
    )
}
