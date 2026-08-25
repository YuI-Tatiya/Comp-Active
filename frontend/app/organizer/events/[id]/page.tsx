// frontend/app/organizer/events/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Edit, CheckSquare, Download, Loader2, Search } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { eventsAPI, registrationsAPI, activitiesAPI, isUnlimitedCapacity, isCancelledByOrganizer, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"
import { programLabel } from "@/lib/programs"

type EventActivity = EventSummary["activities"][number]

interface RegistrationAnswerRow {
    question: { id: number; label: string }
    textValue?: string | null
    options?: { option: { id: number; label: string } }[]
}

/** รูปร่างของ registration ที่ backend คืนมาใน EventSummary.activities[].registrations — Activity<T> เป็น unknown[] โดย default */
interface RegistrationRow {
    id: number
    student: { name: string; studentId: string; email: string; phone?: string | null }
    status: string
    attendance: string
    checkInTime?: string | null
    evaluation?: unknown
    wantsCertLoanFund?: boolean
    wantsCertScholarship?: boolean
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
    wantsCertLoanFund: boolean
    wantsCertScholarship: boolean
}

const INITIAL_PARTICIPANT_FILTERS: ParticipantFilters = {
    status: "",
    wantsCertLoanFund: false,
    wantsCertScholarship: false,
}

/** กรองรายชื่อผู้เข้าร่วมด้วยคำค้นหา + ตัวกรองสถานะ/กยศ./ทุน — ใช้ทั้งแสดงตารางและ export CSV เพื่อให้ผลตรงกันเสมอ */
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
        const matchesCert =
            (!filters.wantsCertLoanFund && !filters.wantsCertScholarship) ||
            (filters.wantsCertLoanFund && reg.wantsCertLoanFund) ||
            (filters.wantsCertScholarship && reg.wantsCertScholarship)
        return matchesSearch && matchesStatus && matchesCert
    })
}

export default function OrganizerEventDetailsPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

    const [confirmAllIds, setConfirmAllIds] = useState<number[] | null>(null)
    const [confirmingAll, setConfirmingAll] = useState(false)

    const [participantSearch, setParticipantSearch] = useState("")
    const [participantFilters, setParticipantFilters] = useState<ParticipantFilters>(INITIAL_PARTICIPANT_FILTERS)

    const [checkinSearch, setCheckinSearch] = useState("")

    useEffect(() => {
        if (id) fetchEventDetails(id)
    }, [id])

    // silent=true ใช้ตอน refetch หลังทำ action (ยืนยัน/เช็คอิน/ยกเลิก ฯลฯ) — ไม่ toggle loading เพื่อไม่ให้ทั้งหน้าถูก unmount
    // จนเสีย state ของแท็บที่เลือกอยู่ (สำคัญมากสำหรับหน้าเช็คอิน ที่ organizer จะกดเช็คชื่อรัวๆ ต่อเนื่องหน้างาน)
    const fetchEventDetails = async (eventId: number, silent = false) => {
        try {
            if (!silent) setLoading(true)
            const data = await eventsAPI.getById(eventId)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            if (silent) return
            setLoading(false)
        }
    }

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)

    const handleShare = () => {
        if (!event) return
        const publicUrl = `${window.location.origin}/events/${event.id}`
        navigator.clipboard.writeText(publicUrl)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

    const exportCSV = () => {
        if (!activeActivity?.registrations || activeActivity.registrations.length === 0) return
        const filtered = filterRegistrations(activeActivity.registrations as RegistrationRow[], participantSearch, participantFilters)
        if (filtered.length === 0) return

        // คอลัมน์คำถามลงทะเบียนแตกต่างกันไปตามกิจกรรม — สร้างหัวตารางจากคำถามจริงของกิจกรรมนี้
        const questions = activeActivity.questions ?? []
        const headers = [
            "ลำดับ",
            "ชื่อ-นามสกุล",
            "รหัสนักศึกษา",
            "อีเมล",
            "เบอร์โทร",
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
            `งาน: ${event?.name}`,
            `กิจกรรมย่อย: ${activeActivity.name}`,
            `วันที่จัด: ${formatEventDate(activeActivity.date)}  เวลา: ${activeActivity.startTime} - ${activeActivity.endTime}`,
            `สถานที่: ${activeActivity.location}`,
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
        const dateSlug = String(activeActivity.date).slice(0, 10)
        link.download = `ผู้เข้าร่วม_${activeActivity.name.replace(/\s+/g, "_")}_${dateSlug}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const handleRequestCancel = async () => {
        if (!activeActivity) return
        if (!cancelReason.trim()) {
            alert("กรุณาระบุเหตุผลในการยกเลิก")
            return
        }
        try {
            setSubmitting(true)
            await activitiesAPI.requestCancel(activeActivity.id, cancelReason)
            alert("ยกเลิกกิจกรรมสำเร็จ")
            setIsCancelOpen(false)
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "ดำเนินการไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    const handleMarkCompleted = async () => {
        if (!activeActivity) return
        if (!confirm(`ยืนยันจบกิจกรรม "${activeActivity.name}"? ระบบจะปิดรับสมัครและปลดล็อกแบบสำรวจให้ผู้เข้าร่วม`)) return
        try {
            setSubmitting(true)
            await activitiesAPI.markCompleted(activeActivity.id)
            alert("จบกิจกรรมเรียบร้อยแล้ว")
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "จบกิจกรรมไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    const handleConfirm = async (regId: number) => {
        try {
            await registrationsAPI.confirm(regId)
            alert("ยืนยันผู้เข้าร่วมสำเร็จ")
            fetchEventDetails(id, true)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "ยืนยันไม่สำเร็จ")
        }
    }

    const handleCheckIn = async (regId: number) => {
        try {
            await registrationsAPI.checkIn(regId)
            alert("เช็คอินสำเร็จ")
            fetchEventDetails(id, true)
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
            fetchEventDetails(id, true)
        } finally {
            setConfirmingAll(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูลงาน...</p>
                </Container>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบข้อมูลงาน"}</p>
                    <Button variant="outline" asChild>
                        <Link href="/organizer/manage">กลับไปหน้าจัดการกิจกรรม</Link>
                    </Button>
                </Container>
            </div>
        )
    }

    return (
        <div className="bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6 flex justify-between items-center gap-4">
                    <Link href="/organizer/manage" className="inline-flex items-center text-sm text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับสู่หน้าจัดการ
                    </Link>
                    <div className="flex gap-2">
                        <Link href={`/organizer/manage/${event.id}/edit`}>
                            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> แก้ไขงาน</Button>
                        </Link>
                        {activeActivity && !isCancelledByOrganizer(activeActivity.approvalStatus) && activeActivity.status !== "completed" && (
                            <Button variant="outline" size="sm" onClick={handleMarkCompleted} disabled={submitting}>
                                <CheckSquare className="w-4 h-4 mr-2" /> จบกิจกรรม
                            </Button>
                        )}
                        {activeActivity && !isCancelledByOrganizer(activeActivity.approvalStatus) && (
                            <Button variant="destructive" size="sm" onClick={() => setIsCancelOpen(true)}>
                                ยกเลิกกิจกรรมนี้
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <div className="aspect-video w-full max-h-[280px] bg-surface-2 rounded-xl overflow-hidden relative border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveEventImageUrl(event, activeActivity)} alt={event.name} className="w-full h-full object-cover" />
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <Badge variant={event.isPublic ? "success" : "neutral"}>{event.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}</Badge>
                            {event.activities.length > 1 && <Badge variant="default">{event.activities.length} กิจกรรมย่อย</Badge>}
                        </div>
                    </div>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-fg">{event.name}</h1>
                    <p className="mt-2 text-fg-muted whitespace-pre-line">{event.description}</p>

                    {/* กลุ่มเป้าหมายที่ตั้งไว้ตอนสร้าง — เดิมดูย้อนไม่ได้เลย ต้องเปิด wizard แก้ไขถึงจะเห็น */}
                    {event.visibility === "restricted" && (
                        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                                <Users className="size-4 text-brand-600" aria-hidden="true" /> เห็นเฉพาะกลุ่มที่กำหนด
                            </div>
                            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                                <div>
                                    <dt className="text-xs text-fg-muted">สาขา</dt>
                                    <dd className="text-fg">
                                        {event.visibilityProgram?.length
                                            ? event.visibilityProgram.map((p) => programLabel(p.programCode)).join(", ")
                                            : "ทุกสาขา"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-fg-muted">ชั้นปี</dt>
                                    <dd className="text-fg">
                                        {event.visibilityYears?.length
                                            ? event.visibilityYears.map((y) => `ปี ${y.year}`).join(", ")
                                            : "ทุกชั้นปี"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-fg-muted">ตัวกรองรหัสนักศึกษา</dt>
                                    <dd className="whitespace-pre-line break-words font-mono text-xs text-fg">
                                        {event.visibilityStudentIdFilter || "ไม่กำหนด"}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>

                <Tabs value={activeActivityId ? String(activeActivityId) : undefined} onValueChange={(v) => setActiveActivityId(Number(v))}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface-2 p-1 mb-6">
                        {event.activities.map((a) => (
                            <TabsTrigger key={a.id} value={String(a.id)}>{a.name}</TabsTrigger>
                        ))}
                    </TabsList>

                    {event.activities.map((a) => {
                        const unlimited = isUnlimitedCapacity(a.capacity)
                        const capacity = a.capacity || 0
                        const registered = a.registrations?.length || 0
                        const fillPercent = !unlimited && capacity > 0 ? Math.round((registered / capacity) * 100) : 0
                        const seatsLeft = Math.max(capacity - registered, 0)
                        return (
                        <TabsContent key={a.id} value={String(a.id)}>
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <Tabs defaultValue="details" className="w-full">
                                        <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                                            <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                            <TabsTrigger value="participants" className="flex-1">ข้อมูลผู้เข้าร่วม ({a.registrations?.length || 0})</TabsTrigger>
                                            <TabsTrigger value="registration" className="flex-1">คิวอาร์โค้ดลงทะเบียน</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="details" className="space-y-6">
                                            <ActivityAboutPanel activity={a} showActivityImage />
                                            <ActivityRewardsPanel activity={a} />
                                        </TabsContent>

                                        <TabsContent value="participants" className="bg-bg rounded-xl border border-border shadow-xs overflow-hidden">
                                            {(() => {
                                                const allRegs = (a.registrations as RegistrationRow[] | undefined) ?? []
                                                const filteredRegs = filterRegistrations(allRegs, participantSearch, participantFilters)
                                                const questions = a.questions ?? []
                                                const pendingIdsInView = filteredRegs.filter((r) => r.status === "pending").map((r) => r.id)
                                                return (
                                                    <>
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
                                                                                </div>
                                                                                <div className="mt-1 text-xs text-fg-muted">
                                                                                    {reg.student.studentId} · {reg.student.email}
                                                                                    {reg.student.phone && <> · {reg.student.phone}</>}
                                                                                </div>
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
                                                    </>
                                                )
                                            })()}
                                        </TabsContent>

                                        <TabsContent value="registration" className="space-y-6">
                                            {(() => {
                                                const allRegs = (a.registrations as RegistrationRow[] | undefined) ?? []
                                                const checkedIn = allRegs
                                                    .filter((r) => r.attendance === "attended")
                                                    .slice()
                                                    .sort((x, y) => new Date(y.checkInTime ?? 0).getTime() - new Date(x.checkInTime ?? 0).getTime())
                                                const checkinResults = checkinSearch.trim()
                                                    ? filterRegistrations(allRegs, checkinSearch, INITIAL_PARTICIPANT_FILTERS)
                                                    : []
                                                const checkInUrl = typeof window !== "undefined" ? `${window.location.origin}/student/checkin/${a.id}` : ""

                                                return (
                                                    <>
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

                                                        <ActivityRegistrationPanel activity={a} registrationCloseAt={event.registrationCloseAt} />
                                                    </>
                                                )
                                            })()}
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                <div className="space-y-6">
                                    <Card className="border-border shadow-xs overflow-hidden">
                                        <div className="p-6 space-y-6">
                                            <h3 className="font-semibold text-lg text-fg">ข้อมูลกิจกรรมย่อย</h3>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Calendar className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">วันที่</div><div className="font-medium text-fg">{formatEventDate(a.date)}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Clock className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">เวลา</div><div className="font-medium text-fg">{a.startTime} - {a.endTime}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><MapPin className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">สถานที่</div><div className="font-medium text-fg">{a.location}</div></div>
                                                </div>
                                                <div className="pt-4 border-t border-border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-fg"><Users className="w-4 h-4" aria-hidden="true" /> ผู้เข้าร่วม</div>
                                                        <span className="text-sm text-fg-muted tabular-nums">{unlimited ? `${registered} คน (ไม่จำกัด)` : `${registered}/${capacity} คน`}</span>
                                                    </div>
                                                    {!unlimited && (
                                                        <>
                                                            <Progress value={fillPercent} className="h-2" />
                                                            <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {seatsLeft} ที่นั่ง</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3 pt-2">
                                                <Button variant="outline" className="w-full" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" /> แชร์งานนี้</Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                        )
                    })}
                </Tabs>
            </Container>

            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-danger flex items-center gap-2">⚠️ ยืนยันการยกเลิกกิจกรรม &quot;{activeActivity?.name}&quot;</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-warning-bg rounded-lg border border-border text-sm text-warning">
                            <strong>หมายเหตุ:</strong> กิจกรรมย่อยนี้จะถูกยกเลิกทันที ผู้เข้าร่วมที่ลงทะเบียนไว้แล้วจะได้รับผลกระทบและไม่สามารถย้อนกลับได้
                        </div>
                        <div className="space-y-2">
                            <Label>เหตุผลการยกเลิก <span className="text-danger">*</span></Label>
                            <Input placeholder="เช่น ติดภารกิจด่วน, จำนวนผู้สมัครไม่เพียงพอ..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)}>ยกเลิก</Button>
                        <Button variant="destructive" onClick={handleRequestCancel} disabled={submitting || !cancelReason.trim()}>
                            {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการยกเลิก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!confirmAllIds}
                onOpenChange={(open) => !open && setConfirmAllIds(null)}
                title={`ยืนยันผู้เข้าร่วมทั้งหมด ${confirmAllIds?.length ?? 0} คน?`}
                description="ระบบจะยืนยันการเข้าร่วมของทุกคนที่ยังรอการยืนยันในรายการที่กรองอยู่ตอนนี้"
                confirmLabel="ยืนยันทั้งหมด"
                loading={confirmingAll}
                onConfirm={handleConfirmAll}
            />
        </div>
    )
}
