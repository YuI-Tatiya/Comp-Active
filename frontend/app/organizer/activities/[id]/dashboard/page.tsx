"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ListChecks, Loader2, ScanLine, Shield, SquareCheckBig, TrendingUp, Users } from "lucide-react"
import { Container } from "@/components/layout/container"
import { OrganizerStatCards, type OrganizerStat } from "@/components/denim/denim-ui"
import {
    ActivityDashboardHero,
    ExportCard,
    PipelineCard,
    RegistrantsCard,
    type ExportItem,
} from "@/components/organizer/activity-dashboard-sections"
import { activitiesAPI, type Activity } from "@/lib/api"
import { formatActivitySchedule } from "@/lib/activity-view"
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

const STATUS_TEXT: Record<string, string> = { confirmed: "ยืนยันแล้ว", cancelled: "ยกเลิกแล้ว" }

/**
 * Dashboard สรุปผลของกิจกรรมหนึ่งรายการ (ธีม Denim) — ตัวเลข/เส้นทางผู้เข้าร่วม/export/ผลแบบสำรวจ/รายชื่อ
 * ไม่มีปุ่มจัดการ (ยืนยัน/เช็คอิน/แก้ไข) — แยกจากหน้า "จัดการกิจกรรม" (/organizer/events/[id] หรือ
 * /organizer/activities/[id]) ที่ใช้ทำ action จริง
 *
 * API ของผู้จัดส่งใบลงทะเบียนมาทุกสถานะรวมที่ยกเลิกแล้ว — ตัวเลข เส้นทาง และ export รายส่วนนับเฉพาะที่ยังไม่ยกเลิก
 * (เดิมนับรวม ใบที่ยกเลิกจึงดันยอดลงทะเบียนและกดอัตราการเข้าร่วมลง และขึ้นในตารางเป็น "รอการยืนยัน")
 * ส่วน "Export ทั้งหมด" ยังมีครบทุกใบพร้อมสถานะจริง
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
                    <Loader2 className="mb-4 size-10 animate-spin text-denim" aria-hidden="true" />
                    <p className="font-medium text-denim-muted">กำลังโหลดข้อมูล Dashboard...</p>
                </Container>
            </div>
        )
    }

    if (error || !activity) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบข้อมูลกิจกรรม"}</p>
                    <Link
                        href="/organizer/dashboard"
                        className="inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-denim px-5 text-sm font-semibold text-denim transition-colors hover:bg-denim hover:text-white"
                    >
                        กลับไปหน้าแดชบอร์ด
                    </Link>
                </Container>
            </div>
        )
    }

    const everyone = activity.registrations ?? []
    const registrations = everyone.filter((r) => r.status !== "cancelled")
    const questions = activity.questions ?? []
    const total = registrations.length
    const confirmed = registrations.filter((r) => r.status === "confirmed").length
    const attendees = registrations.filter((r) => r.attendance === "attended")
    const attended = attendees.length
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0
    const certRequesters = registrations.filter((r) => r.wantsCertLoanFund || r.wantsCertScholarship)

    const isEventActivity = activity.eventId != null
    const editHref = isEventActivity ? `/organizer/manage/${activity.eventId}/edit` : `/organizer/activities/${activity.id}/edit`
    const manageHref = isEventActivity ? `/organizer/events/${activity.eventId}` : `/organizer/activities/${activity.id}`
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${
        isEventActivity ? `/events/${activity.eventId}` : `/events/activities/${activity.id}`
    }`

    // วัน-เวลาตามเวลาไทยจาก startAt/endAt (รองรับหลายวัน) — ชิปบนแถบหัวหน้าไม่ต้องมีชื่อวัน
    const schedule = formatActivitySchedule(activity)
    const dateChip = schedule.multiDay ? schedule.dateLabel : schedule.dateLabel.replace(/^\S+\s/, "")

    const baseHeaders = (extra: string[] = []) => ["ลำดับ", "ชื่อ-นามสกุล", "รหัสนักศึกษา", "อีเมล", "เบอร์โทร", ...extra]
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
        `วันที่จัด: ${schedule.dateLabel}  เวลา: ${schedule.timeLabel || "-"}`,
        `${label}: ${rows.length} คน`,
        "",
    ]
    const fileSlug = activity.name.replace(/\s+/g, "_")
    const statusText = (r: RegistrationRow) => STATUS_TEXT[r.status] ?? "รอดำเนินการ"
    const answerCells = (r: RegistrationRow) =>
        questions.map((q) => {
            const a = r.answers?.find((ans) => ans.question.id === q.id)
            return a ? answerText(a) : "-"
        })

    /** ไฟล์เดียวรวมทุกคอลัมน์ ทุกใบลงทะเบียน (รวมที่ยกเลิก พร้อมสถานะจริง) */
    const exportAll = () => {
        if (everyone.length === 0) return
        const headers = baseHeaders([
            ...questions.map((q) => q.label),
            "ขอจิตอาสา กยศ.",
            "ขอจิตอาสาทุนการศึกษา",
            "สถานะการลงทะเบียน",
            "เช็คอิน",
        ])
        const rows = everyone.map((r, idx) =>
            baseRow(r, idx, [
                ...answerCells(r),
                r.wantsCertLoanFund ? "ขอ" : "-",
                r.wantsCertScholarship ? "ขอ" : "-",
                statusText(r),
                r.attendance === "attended" ? "เข้าร่วมแล้ว" : "ยังไม่เช็คอิน",
            ])
        )
        downloadCSV(`ข้อมูลทั้งหมด_${fileSlug}.csv`, [
            ...csvHeader("จำนวนใบลงทะเบียนทั้งหมด (รวมที่ยกเลิก)", everyone),
            headers.join(","),
            ...rows.map(toCSVLine),
        ])
    }

    const exportRegistrants = () => {
        if (total === 0) return
        const headers = baseHeaders(["สถานะการลงทะเบียน", "เช็คอิน"])
        const rows = registrations.map((r, idx) =>
            baseRow(r, idx, [statusText(r), r.attendance === "attended" ? "เข้าร่วมแล้ว" : "ยังไม่เช็คอิน"])
        )
        downloadCSV(`ผู้ลงทะเบียน_${fileSlug}.csv`, [
            ...csvHeader("จำนวนผู้ลงทะเบียน", registrations),
            headers.join(","),
            ...rows.map(toCSVLine),
        ])
    }

    const exportCertRequesters = () => {
        if (certRequesters.length === 0) return
        const headers = baseHeaders(["ขอจิตอาสา กยศ.", "ขอจิตอาสาทุนการศึกษา"])
        const rows = certRequesters.map((r, idx) =>
            baseRow(r, idx, [r.wantsCertLoanFund ? "ขอ" : "-", r.wantsCertScholarship ? "ขอ" : "-"])
        )
        downloadCSV(`ผู้ขอใบจิตอาสา_${fileSlug}.csv`, [
            ...csvHeader("จำนวนผู้ขอใบจิตอาสา", certRequesters),
            headers.join(","),
            ...rows.map(toCSVLine),
        ])
    }

    const exportAttendees = () => {
        if (attended === 0) return
        const headers = baseHeaders(["เช็คอินเมื่อ"])
        const rows = attendees.map((r, idx) =>
            baseRow(r, idx, [
                r.checkInTime
                    ? new Date(r.checkInTime).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" })
                    : "-",
            ])
        )
        downloadCSV(`ผู้เข้าร่วมจริง_${fileSlug}.csv`, [
            ...csvHeader("จำนวนผู้เข้าร่วมจริง (เช็คอินแล้ว)", attendees),
            headers.join(","),
            ...rows.map(toCSVLine),
        ])
    }

    const exportQuestionnaire = () => {
        if (questions.length === 0 || total === 0) return
        const headers = baseHeaders(questions.map((q) => q.label))
        const rows = registrations.map((r, idx) => baseRow(r, idx, answerCells(r)))
        downloadCSV(`คำตอบแบบสอบถามลงทะเบียน_${fileSlug}.csv`, [
            ...csvHeader("จำนวนผู้ตอบ", registrations),
            headers.join(","),
            ...rows.map(toCSVLine),
        ])
    }

    const stats: OrganizerStat[] = [
        { code: "REGISTERED", label: "ลงทะเบียนทั้งหมด", value: total, icon: Users },
        { code: "CONFIRMED", label: "ยืนยันแล้ว", value: confirmed, icon: SquareCheckBig },
        {
            code: "CHECKED_IN",
            label: "เข้าร่วมจริง (เช็คอินแล้ว)",
            value: attended,
            icon: ScanLine,
            caption: "เช็คอินผ่าน QR Code หรือผู้จัดเช็คให้",
        },
        {
            code: "ATTEND_RATE",
            label: "อัตราการเข้าร่วม",
            value: `${attendanceRate}%`,
            icon: TrendingUp,
            highlight: true,
            progress: attendanceRate,
        },
    ]

    const exportItems: ExportItem[] = [
        {
            key: "registrants",
            file: "registrants.csv",
            icon: Users,
            title: "ผู้ลงทะเบียนทั้งหมด",
            note: `${total} คน`,
            onExport: exportRegistrants,
            empty: total === 0,
        },
        {
            key: "volunteer",
            file: "volunteer.csv",
            icon: Shield,
            title: "ผู้ขอใบจิตอาสา (กยศ./ทุน)",
            note: `${certRequesters.length} คน`,
            onExport: exportCertRequesters,
            empty: certRequesters.length === 0,
        },
        {
            key: "checked-in",
            file: "checked_in.csv",
            icon: SquareCheckBig,
            title: "ผู้เข้าร่วมจริง (เช็คอินแล้ว)",
            note: `${attended} คน`,
            onExport: exportAttendees,
            empty: attended === 0,
        },
        {
            key: "answers",
            file: "answers.csv",
            icon: ListChecks,
            title: "คำตอบแบบสอบถามลงทะเบียน",
            note: questions.length === 0 ? "กิจกรรมนี้ไม่มีคำถามลงทะเบียน" : `${questions.length} คำถาม`,
            onExport: exportQuestionnaire,
            empty: total === 0,
            notApplicable: questions.length === 0,
        },
    ]

    return (
        <div className="bg-surface pb-16">
            <ActivityDashboardHero
                activityId={activity.id}
                title={activity.name}
                kindLabel={isEventActivity ? "กิจกรรมย่อยของงาน" : "กิจกรรมเดี่ยว"}
                dateLabel={dateChip}
                timeLabel={schedule.timeLabel}
                location={activity.location}
                manageHref={manageHref}
            />

            <OrganizerStatCards stats={stats} strongLabels />

            <Container className="mt-8 space-y-6">
                <PipelineCard registered={total} confirmed={confirmed} attended={attended} />

                <ExportCard items={exportItems} onExportAll={exportAll} exportAllDisabled={everyone.length === 0} />

                <EventSurveyResults
                    className=""
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

                <RegistrantsCard
                    shareUrl={shareUrl}
                    rows={everyone.map((r) => ({
                        id: r.id,
                        name: r.student?.name ?? "-",
                        studentId: r.student?.studentId ?? "-",
                        status: r.status,
                        attendance: r.attendance,
                        wantsCertLoanFund: r.wantsCertLoanFund,
                        wantsCertScholarship: r.wantsCertScholarship,
                    }))}
                />
            </Container>
        </div>
    )
}
