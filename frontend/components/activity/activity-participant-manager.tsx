"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CheckSquare, Download, Search } from "lucide-react"
import { formatEventDate } from "@/components/ui/event-card"
import { registrationsAPI, type Activity } from "@/lib/api"
import { ActivityAboutPanel, ActivityRegistrationPanel, ActivityRewardsPanel } from "@/components/activity/activity-info-panels"

interface RegistrationAnswerRow {
    question: { id: number; label: string }
    textValue?: string | null
    options?: { option: { id: number; label: string } }[]
}

/** รูปร่างของ registration ที่ backend คืนมาใน activity.registrations — Activity<T> เป็น unknown[] โดย default */
export interface RegistrationRow {
    id: number
    student: { name: string; studentId: string; email: string; phone?: string | null }
    status: string
    attendance: string
    checkInTime?: string | null
    evaluation?: unknown
    wantsCertLoanFund?: boolean
    wantsCertScholarship?: boolean
    dutyRole?: string | null
    dutyShift?: string | null
    teamName?: string | null
    teamSize?: number | null
    competitionCategory?: string | null
    submissionLink?: string | null
    answers?: RegistrationAnswerRow[]
}

/** ข้อความคำตอบของคำถามหนึ่งข้อ — text ใช้ตรงๆ, choice รวม label ตัวเลือกที่เลือกด้วยจุลภาค */
function answerText(a: RegistrationAnswerRow): string {
    if (a.textValue) return a.textValue
    if (a.options && a.options.length > 0) return a.options.map((o) => o.option.label).join(", ")
    return "-"
}

interface ParticipantFilters {
    status: "" | "confirmed" | "pending"
    attendance: "" | "attended" | "not_attended"
    wantsCertLoanFund: boolean
    wantsCertScholarship: boolean
}

const INITIAL_PARTICIPANT_FILTERS: ParticipantFilters = {
    status: "",
    attendance: "",
    wantsCertLoanFund: false,
    wantsCertScholarship: false,
}

/** กรองรายชื่อผู้เข้าร่วมด้วยคำค้นหา + ตัวกรองสถานะ/การเข้าร่วม/กยศ.-ทุน — ใช้ทั้งแสดงรายการและ export CSV เพื่อให้ผลตรงกันเสมอ */
function filterRegistrations(
    registrations: RegistrationRow[] | undefined,
    search: string,
    filters: ParticipantFilters
): RegistrationRow[] {
    if (!registrations) return []
    const q = search.trim().toLowerCase()
    return registrations.filter((reg) => {
        const matchesSearch =
            !q ||
            reg.student.name.toLowerCase().includes(q) ||
            reg.student.studentId.toLowerCase().includes(q) ||
            reg.student.email.toLowerCase().includes(q)
        const matchesStatus = !filters.status || reg.status === filters.status
        const matchesAttendance =
            !filters.attendance ||
            (filters.attendance === "attended" ? reg.attendance === "attended" : reg.attendance !== "attended")
        const matchesCert =
            (!filters.wantsCertLoanFund && !filters.wantsCertScholarship) ||
            (filters.wantsCertLoanFund && reg.wantsCertLoanFund) ||
            (filters.wantsCertScholarship && reg.wantsCertScholarship)
        return matchesSearch && matchesStatus && matchesAttendance && matchesCert
    })
}

interface ActivityParticipantManagerProps {
    /** กิจกรรม (กิจกรรมย่อยของงาน หรือกิจกรรมเดี่ยว) — ต้องมี registrations แนบมาด้วยแล้ว */
    activity: Activity
    /** วันปิดรับสมัคร — มีเฉพาะกิจกรรมที่อยู่ในงาน (Event) กิจกรรมเดี่ยวไม่มีแนวคิดนี้ */
    registrationCloseAt?: string | null
    /** ชื่องานแม่ — ใส่เฉพาะกิจกรรมย่อยของงาน เพื่อระบุในหัว CSV */
    eventName?: string
    /** เรียกซ้ำหลังทำ action ใดๆ (ยืนยัน/เช็คอิน) — ควรเป็น silent refetch ไม่ toggle loading เพื่อไม่ให้เสีย state แท็บ/ตัวกรองที่เลือกอยู่ */
    onRefetch: () => void
}

/**
 * หน่วยจัดการผู้เข้าร่วมของกิจกรรมหนึ่งรายการ — ใช้ร่วมกันทั้งหน้า /organizer/events/[id] (ต่อกิจกรรมย่อย)
 * และ /organizer/activities/[id] (กิจกรรมเดี่ยว) กันสองหน้านี้มีชุดฟีเจอร์เพี้ยนออกจากกัน
 * แสดง 3 แท็บ: รายละเอียด, ข้อมูลผู้เข้าร่วม (ค้นหา/กรอง/ยืนยันทั้งหมด/export CSV), คิวอาร์โค้ดลงทะเบียน (เช็คอิน)
 */
export function ActivityParticipantManager({ activity, registrationCloseAt, eventName, onRefetch }: ActivityParticipantManagerProps) {
    const [confirmAllIds, setConfirmAllIds] = useState<number[] | null>(null)
    const [confirmingAll, setConfirmingAll] = useState(false)
    const [participantSearch, setParticipantSearch] = useState("")
    const [participantFilters, setParticipantFilters] = useState<ParticipantFilters>(INITIAL_PARTICIPANT_FILTERS)
    const [checkinSearch, setCheckinSearch] = useState("")

    const handleConfirm = async (regId: number) => {
        try {
            await registrationsAPI.confirm(regId)
            alert("ยืนยันผู้เข้าร่วมสำเร็จ")
            onRefetch()
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "ยืนยันไม่สำเร็จ")
        }
    }

    const handleCheckIn = async (regId: number) => {
        try {
            await registrationsAPI.checkIn(regId)
            alert("เช็คอินสำเร็จ")
            onRefetch()
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "เช็คอินไม่สำเร็จ")
        }
    }

    const handleConfirmAll = async () => {
        if (!confirmAllIds || confirmAllIds.length === 0) return
        setConfirmingAll(true)
        try {
            const results = await Promise.allSettled(confirmAllIds.map((regId) => registrationsAPI.confirm(regId)))
            const failed = results.filter((r) => r.status === "rejected").length
            setConfirmAllIds(null)
            if (failed > 0) {
                alert(`ยืนยันสำเร็จ ${confirmAllIds.length - failed} คน, ไม่สำเร็จ ${failed} คน`)
            } else {
                alert(`ยืนยันผู้เข้าร่วมสำเร็จทั้งหมด ${confirmAllIds.length} คน`)
            }
            onRefetch()
        } finally {
            setConfirmingAll(false)
        }
    }

    const exportCSV = () => {
        const allRegs = (activity.registrations as RegistrationRow[] | undefined) ?? []
        if (allRegs.length === 0) return
        const filtered = filterRegistrations(allRegs, participantSearch, participantFilters)
        if (filtered.length === 0) return

        // คอลัมน์คำถามลงทะเบียนแตกต่างกันไปตามกิจกรรม — สร้างหัวตารางจากคำถามจริงของกิจกรรมนี้
        const questions = activity.questions ?? []
        const registrationType = activity.registrationType ?? "participant"
        const typeHeaders =
            registrationType === "staff_volunteer"
                ? ["บทบาท/หน้าที่", "รอบ/กะเวลา"]
                : registrationType === "contestant"
                    ? ["ชื่อทีม", "จำนวนสมาชิกทีม", "ประเภท/รุ่นการแข่งขัน", "ลิงก์ผลงาน"]
                    : []
        const headers = [
            "ลำดับ",
            "ชื่อ-นามสกุล",
            "รหัสนักศึกษา",
            "อีเมล",
            "เบอร์โทร",
            ...typeHeaders,
            ...questions.map((q) => q.label),
            "ขอจิตอาสา กยศ.",
            "ขอจิตอาสาทุนการศึกษา",
            "สถานะการลงทะเบียน",
            "เช็คอิน",
        ]
        const rows = filtered.map((reg, idx) => [
            idx + 1,
            reg.student?.name || "-",
            reg.student?.studentId || "-",
            reg.student?.email || "-",
            reg.student?.phone || "-",
            ...(registrationType === "staff_volunteer"
                ? [reg.dutyRole || "-", reg.dutyShift || "-"]
                : registrationType === "contestant"
                    ? [reg.teamName || "-", reg.teamSize ?? "-", reg.competitionCategory || "-", reg.submissionLink || "-"]
                    : []),
            ...questions.map((q) => {
                const a = reg.answers?.find((ans) => ans.question.id === q.id)
                return a ? answerText(a) : "-"
            }),
            reg.wantsCertLoanFund ? "ขอ" : "-",
            reg.wantsCertScholarship ? "ขอ" : "-",
            reg.status === "confirmed" ? "ยืนยันแล้ว" : "รอดำเนินการ",
            reg.attendance === "attended" ? "เข้าร่วมแล้ว" : "ยังไม่เช็คอิน",
        ])
        const csvContent = [
            ...(eventName ? [`งาน: ${eventName}`] : []),
            `กิจกรรม: ${activity.name}`,
            `วันที่จัด: ${formatEventDate(activity.date)}  เวลา: ${activity.startTime} - ${activity.endTime}`,
            `สถานที่: ${activity.location}`,
            `จำนวนผู้ลงทะเบียนที่ export (ตามตัวกรองที่เลือก): ${filtered.length} คน`,
            "",
            headers.join(","),
            ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
        ].join("\n")

        const BOM = "﻿"
        const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        const dateSlug = String(activity.date).slice(0, 10)
        link.download = `ผู้เข้าร่วม_${activity.name.replace(/\s+/g, "_")}_${dateSlug}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const allRegs = (activity.registrations as RegistrationRow[] | undefined) ?? []
    const filteredRegs = filterRegistrations(allRegs, participantSearch, participantFilters)
    const questions = activity.questions ?? []
    const pendingIdsInView = filteredRegs.filter((r) => r.status === "pending").map((r) => r.id)

    const checkedIn = allRegs
        .filter((r) => r.attendance === "attended")
        .slice()
        .sort((x, y) => new Date(y.checkInTime ?? 0).getTime() - new Date(x.checkInTime ?? 0).getTime())
    const checkinResults = checkinSearch.trim() ? filterRegistrations(allRegs, checkinSearch, INITIAL_PARTICIPANT_FILTERS) : []
    const checkInUrl = typeof window !== "undefined" ? `${window.location.origin}/student/checkin/${activity.id}` : ""

    return (
        <>
            <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                    <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                    <TabsTrigger value="participants" className="flex-1">ข้อมูลผู้เข้าร่วม ({allRegs.length})</TabsTrigger>
                    <TabsTrigger value="registration" className="flex-1">คิวอาร์โค้ดลงทะเบียน</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <ActivityAboutPanel activity={activity} showActivityImage />
                    <ActivityRewardsPanel activity={activity} />
                </TabsContent>

                <TabsContent value="participants" className="bg-bg rounded-xl border border-border shadow-xs overflow-hidden">
                    <div className="space-y-3 px-6 py-4 border-b border-border">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-fg-muted">
                                ผู้ลงทะเบียนทั้งหมด <span className="font-semibold text-fg">{allRegs.length}</span> คน
                                {filteredRegs.length !== allRegs.length && (
                                    <> — พบ <span className="font-semibold text-fg">{filteredRegs.length}</span> คนตามตัวกรอง</>
                                )}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setConfirmAllIds(pendingIdsInView)}
                                    disabled={pendingIdsInView.length === 0}
                                >
                                    <CheckSquare className="w-4 h-4" /> ยืนยันทั้งหมด ({pendingIdsInView.length})
                                </Button>
                                <Button size="sm" variant="outline" className="gap-2" onClick={exportCSV} disabled={!filteredRegs.length}>
                                    <Download className="w-4 h-4" /> Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                            <div className="relative sm:w-64">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                                <Input
                                    value={participantSearch}
                                    onChange={(e) => setParticipantSearch(e.target.value)}
                                    placeholder="ค้นหาชื่อ, รหัสนักศึกษา, อีเมล..."
                                    className="h-9 pl-9"
                                />
                            </div>
                            <Select
                                className="h-9 sm:w-52"
                                value={participantFilters.status}
                                onChange={(e) =>
                                    setParticipantFilters((prev) => ({ ...prev, status: e.target.value as ParticipantFilters["status"] }))
                                }
                            >
                                <option value="">สถานะ: ทั้งหมด</option>
                                <option value="confirmed">อนุมัติการเข้าร่วมกิจกรรมแล้ว</option>
                                <option value="pending">ยังไม่อนุมัติการเข้าร่วมกิจกรรม</option>
                            </Select>
                            <Select
                                className="h-9 sm:w-52"
                                value={participantFilters.attendance}
                                onChange={(e) =>
                                    setParticipantFilters((prev) => ({ ...prev, attendance: e.target.value as ParticipantFilters["attendance"] }))
                                }
                            >
                                <option value="">การเข้าร่วม: ทั้งหมด</option>
                                <option value="attended">เข้าร่วมแล้ว (เช็คอินแล้ว)</option>
                                <option value="not_attended">ยังไม่เข้าร่วม</option>
                            </Select>
                            <label className="flex items-center gap-1.5 text-sm text-fg-muted">
                                <input
                                    type="checkbox"
                                    checked={participantFilters.wantsCertLoanFund}
                                    onChange={(e) =>
                                        setParticipantFilters((prev) => ({ ...prev, wantsCertLoanFund: e.target.checked }))
                                    }
                                />
                                ขอจิตอาสา กยศ.
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-fg-muted">
                                <input
                                    type="checkbox"
                                    checked={participantFilters.wantsCertScholarship}
                                    onChange={(e) =>
                                        setParticipantFilters((prev) => ({ ...prev, wantsCertScholarship: e.target.checked }))
                                    }
                                />
                                ขอจิตอาสาทุน
                            </label>
                            {(participantSearch ||
                                participantFilters.status ||
                                participantFilters.attendance ||
                                participantFilters.wantsCertLoanFund ||
                                participantFilters.wantsCertScholarship) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setParticipantSearch("")
                                        setParticipantFilters(INITIAL_PARTICIPANT_FILTERS)
                                    }}
                                >
                                    ล้างตัวกรอง
                                </Button>
                            )}
                        </div>
                    </div>
                    {filteredRegs.length > 0 ? (
                        <div className="max-h-[720px] overflow-y-auto divide-y divide-border">
                            {filteredRegs.map((reg) => (
                                <div key={reg.id} className="p-5 hover:bg-surface/60 transition-colors">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-fg">{reg.student.name}</span>
                                                <Badge variant={reg.status === "confirmed" ? "default" : "neutral"}>
                                                    {reg.status === "confirmed" ? "ยืนยันแล้ว" : "รอการยืนยัน"}
                                                </Badge>
                                                {reg.attendance === "attended" && <Badge variant="success">เข้าร่วมแล้ว</Badge>}
                                                {reg.wantsCertLoanFund && <Badge variant="default">กยศ.</Badge>}
                                                {reg.wantsCertScholarship && <Badge variant="default">ทุน</Badge>}
                                                {reg.dutyRole && <Badge variant="default">บทบาท: {reg.dutyRole}</Badge>}
                                                {reg.dutyShift && <Badge variant="default">รอบ: {reg.dutyShift}</Badge>}
                                                {reg.teamName && <Badge variant="default">ทีม: {reg.teamName}</Badge>}
                                                {reg.competitionCategory && <Badge variant="default">{reg.competitionCategory}</Badge>}
                                            </div>
                                            <div className="mt-1 text-xs text-fg-muted">
                                                {reg.student.studentId} · {reg.student.email}
                                                {reg.student.phone && <> · {reg.student.phone}</>}
                                            </div>
                                            {(reg.teamSize != null || reg.submissionLink) && (
                                                <div className="mt-1 text-xs text-fg-muted">
                                                    {reg.teamSize != null && <>สมาชิก {reg.teamSize} คน</>}
                                                    {reg.submissionLink && (
                                                        <>
                                                            {reg.teamSize != null && " · "}
                                                            <a
                                                                href={reg.submissionLink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-brand-600 underline"
                                                            >
                                                                ลิงก์ผลงาน
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 gap-2">
                                            {reg.status === "pending" && (
                                                <Button size="sm" variant="outline" className="text-brand-600" onClick={() => handleConfirm(reg.id)}>ยืนยัน</Button>
                                            )}
                                            {reg.status !== "cancelled" && reg.attendance !== "attended" && (
                                                <Button size="sm" variant="outline" className="text-success" onClick={() => handleCheckIn(reg.id)}>เช็คอิน</Button>
                                            )}
                                            {reg.attendance === "attended" && (
                                                reg.evaluation ? (
                                                    <Badge variant="success" className="gap-1"><CheckSquare className="size-3" aria-hidden="true" />ประเมินอัตโนมัติแล้ว</Badge>
                                                ) : (
                                                    <Badge variant="neutral">ยังไม่มีคะแนน</Badge>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {questions.length > 0 && (
                                        <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-surface p-3">
                                            <ul className="space-y-1">
                                                {questions.map((q) => {
                                                    const ans = reg.answers?.find((a2) => a2.question.id === q.id)
                                                    return (
                                                        <li key={q.id} className="text-xs text-fg-muted">
                                                            <span className="font-medium text-fg">{q.label}:</span>{" "}
                                                            {ans ? answerText(ans) : "-"}
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="px-6 py-10 text-center text-fg-subtle">
                            {allRegs.length === 0 ? "ยังไม่มีผู้ลงทะเบียน" : "ไม่พบผู้เข้าร่วมตามตัวกรองที่เลือก"}
                        </p>
                    )}
                </TabsContent>

                <TabsContent value="registration" className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Card className="border-border shadow-xs">
                            <div className="flex flex-col items-center gap-4 p-6 text-center">
                                <h3 className="font-semibold text-fg">QR Code สำหรับเช็คอิน</h3>
                                {checkInUrl && (
                                    <div className="rounded-xl border border-border bg-white p-4">
                                        <QRCodeSVG value={checkInUrl} size={168} />
                                    </div>
                                )}
                                <p className="text-xs text-fg-subtle">
                                    ให้ผู้เข้าร่วมสแกนด้วยมือถือของตัวเอง (ต้องเข้าสู่ระบบนักศึกษาไว้ก่อน) เพื่อเช็คอินได้ทันที
                                </p>
                            </div>
                        </Card>
                        <div className="grid grid-cols-2 gap-4 content-start">
                            <Card className="border-border p-5 shadow-xs">
                                <p className="text-xs text-fg-muted">ลงทะเบียนทั้งหมด</p>
                                <p className="mt-1 text-3xl font-bold tabular-nums text-fg">{allRegs.length}</p>
                            </Card>
                            <Card className="border-border p-5 shadow-xs">
                                <p className="text-xs text-fg-muted">เช็คอินแล้ว</p>
                                <p className="mt-1 text-3xl font-bold tabular-nums text-success">{checkedIn.length}</p>
                            </Card>
                        </div>
                    </div>

                    <Card className="border-border shadow-xs">
                        <div className="space-y-4 p-6">
                            <h3 className="font-semibold text-fg">เช็คอินด้วยตนเอง (ค้นหารหัสนักศึกษา)</h3>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                                <Input
                                    value={checkinSearch}
                                    onChange={(e) => setCheckinSearch(e.target.value)}
                                    placeholder="ค้นหารหัสนักศึกษาหรือชื่อ..."
                                    className="pl-9"
                                />
                            </div>
                            {checkinSearch.trim() && (
                                checkinResults.length > 0 ? (
                                    <div className="divide-y divide-border rounded-lg border border-border">
                                        {checkinResults.map((reg) => (
                                            <div key={reg.id} className="flex items-center justify-between gap-3 p-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-fg">{reg.student.name}</p>
                                                    <p className="text-xs text-fg-muted">{reg.student.studentId}</p>
                                                </div>
                                                {reg.attendance === "attended" ? (
                                                    <Badge variant="success" className="shrink-0">เช็คอินแล้ว</Badge>
                                                ) : reg.status === "cancelled" ? (
                                                    <Badge variant="neutral" className="shrink-0">ยกเลิกการลงทะเบียนแล้ว</Badge>
                                                ) : (
                                                    <Button size="sm" className="shrink-0" onClick={() => handleCheckIn(reg.id)}>เช็คชื่อ</Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-4 text-center text-sm text-fg-subtle">ไม่พบผู้ลงทะเบียนตรงกับคำค้นหา</p>
                                )
                            )}
                        </div>
                    </Card>

                    <Card className="border-border shadow-xs overflow-hidden">
                        <div className="border-b border-border px-6 py-4">
                            <h3 className="font-semibold text-fg">รายชื่อผู้เช็คอินแล้ว ({checkedIn.length})</h3>
                        </div>
                        {checkedIn.length > 0 ? (
                            <div className="max-h-[420px] divide-y divide-border overflow-y-auto">
                                {checkedIn.map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between gap-3 px-6 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-fg">{reg.student.name}</p>
                                            <p className="text-xs text-fg-muted">{reg.student.studentId}</p>
                                        </div>
                                        <p className="shrink-0 text-xs text-fg-subtle">
                                            {reg.checkInTime &&
                                                new Date(reg.checkInTime).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="px-6 py-10 text-center text-fg-subtle">ยังไม่มีผู้เช็คอิน</p>
                        )}
                    </Card>

                    <ActivityRegistrationPanel activity={activity} registrationCloseAt={registrationCloseAt} />
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={!!confirmAllIds}
                onOpenChange={(open) => !open && setConfirmAllIds(null)}
                title={`ยืนยันผู้เข้าร่วมทั้งหมด ${confirmAllIds?.length ?? 0} คน?`}
                description="ระบบจะยืนยันการเข้าร่วมของทุกคนที่ยังรอการยืนยันในรายการที่กรองอยู่ตอนนี้"
                confirmLabel="ยืนยันทั้งหมด"
                loading={confirmingAll}
                onConfirm={handleConfirmAll}
            />
        </>
    )
}
