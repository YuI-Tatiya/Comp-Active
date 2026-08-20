// frontend/app/organizer/events/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Edit, CheckSquare, Download, Loader2 } from "lucide-react"
import Link from "next/link"
import { eventsAPI, registrationsAPI, activitiesAPI, isUnlimitedCapacity, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

type EventActivity = EventSummary["activities"][number]

/** รูปร่างของ registration ที่ backend คืนมาใน EventSummary.activities[].registrations — Activity<T> เป็น unknown[] โดย default */
interface RegistrationRow {
    id: number
    student: { name: string; studentId: string; email: string }
    status: string
    attendance: string
    evaluation?: unknown
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

    useEffect(() => {
        if (id) fetchEventDetails(id)
    }, [id])

    const fetchEventDetails = async (eventId: number) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getById(eventId)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
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
        const headers = ["ลำดับ", "ชื่อ-นามสกุล", "รหัสนักศึกษา", "อีเมล", "สถานะการลงทะเบียน", "เช็คอิน"]
        const rows = (activeActivity.registrations as RegistrationRow[]).map((reg, idx) => [
            idx + 1,
            reg.student?.name || "-",
            reg.student?.studentId || "-",
            reg.student?.email || "-",
            reg.status === "confirmed" ? "ยืนยันแล้ว" : "รอดำเนินการ",
            reg.attendance === "attended" ? "เข้าร่วมแล้ว" : "ยังไม่เช็คอิน",
        ])
        const csvContent = [
            `งาน: ${event?.name}`,
            `กิจกรรมย่อย: ${activeActivity.name}`,
            `วันที่จัด: ${formatEventDate(activeActivity.date)}  เวลา: ${activeActivity.startTime} - ${activeActivity.endTime}`,
            `สถานที่: ${activeActivity.location}`,
            `จำนวนผู้ลงทะเบียนทั้งหมด: ${activeActivity.registrations.length} คน`,
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
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "ยืนยันไม่สำเร็จ")
        }
    }

    const handleCheckIn = async (regId: number) => {
        try {
            await registrationsAPI.checkIn(regId)
            alert("เช็คอินสำเร็จ")
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "เช็คอินไม่สำเร็จ")
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
                        {activeActivity && activeActivity.approvalStatus !== "rejected" && activeActivity.status !== "completed" && (
                            <Button variant="outline" size="sm" onClick={handleMarkCompleted} disabled={submitting}>
                                <CheckSquare className="w-4 h-4 mr-2" /> จบกิจกรรม
                            </Button>
                        )}
                        {activeActivity && activeActivity.approvalStatus !== "rejected" && (
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
                                    <Tabs defaultValue="participants" className="w-full">
                                        <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                                            <TabsTrigger value="participants" className="flex-1">ผู้เข้าร่วม ({a.registrations?.length || 0})</TabsTrigger>
                                            <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                            <TabsTrigger value="rewards" className="flex-1">สิ่งที่จะได้รับ</TabsTrigger>
                                            <TabsTrigger value="registration" className="flex-1">การลงทะเบียน</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="participants" className="bg-bg rounded-xl border border-border shadow-xs overflow-hidden">
                                            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
                                                <p className="text-sm text-fg-muted">ผู้ลงทะเบียนทั้งหมด <span className="font-semibold text-fg">{a.registrations?.length || 0}</span> คน</p>
                                                <Button size="sm" variant="outline" className="gap-2" onClick={exportCSV} disabled={!a.registrations?.length}>
                                                    <Download className="w-4 h-4" /> Export CSV
                                                </Button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-surface text-fg-muted text-sm">
                                                            <th className="px-6 py-4 font-semibold">รายชื่อผู้เข้าร่วม</th>
                                                            <th className="px-6 py-4 font-semibold">สถานะ</th>
                                                            <th className="px-6 py-4 font-semibold">เช็คอิน</th>
                                                            <th className="px-6 py-4 font-semibold text-right">การจัดการ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {a.registrations && a.registrations.length > 0 ? (
                                                            (a.registrations as RegistrationRow[]).map((reg) => (
                                                                <tr key={reg.id} className="hover:bg-surface transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-medium text-fg">{reg.student.name}</div>
                                                                        <div className="text-xs text-fg-muted">{reg.student.studentId} | {reg.student.email}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <Badge variant={reg.status === "confirmed" ? "default" : "neutral"}>
                                                                            {reg.status === "confirmed" ? "ยืนยันแล้ว" : "รอการยืนยัน"}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {reg.attendance === "attended" ? (
                                                                            <Badge variant="success">เข้าร่วมแล้ว</Badge>
                                                                        ) : (
                                                                            <span className="text-sm text-fg-subtle">ยังไม่เช็คอิน</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            {reg.status === "pending" && (
                                                                                <Button size="sm" variant="outline" className="text-brand-600" onClick={() => handleConfirm(reg.id)}>ยืนยัน</Button>
                                                                            )}
                                                                            {reg.status === "confirmed" && reg.attendance !== "attended" && (
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
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-fg-subtle">ยังไม่มีผู้ลงทะเบียน</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="details">
                                            <ActivityAboutPanel activity={a} />
                                        </TabsContent>

                                        <TabsContent value="rewards">
                                            <ActivityRewardsPanel activity={a} />
                                        </TabsContent>

                                        <TabsContent value="registration">
                                            <ActivityRegistrationPanel activity={a} registrationCloseAt={event.registrationCloseAt} />
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
        </div>
    )
}
