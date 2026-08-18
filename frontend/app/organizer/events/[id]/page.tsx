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
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Tag, Info, CheckCircle, Edit, CheckSquare, Download, Loader2 } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, registrationsAPI, isUnlimitedCapacity, Activity, API_BASE_URL, SkillScores } from "@/lib/api"
import { softSkillLabel } from "@/lib/soft-skills"

interface Participant {
    id: number;
    studentId: number;
    registerDate: string;
    attendance: string;
    status: string;
    student: {
        id: number;
        name: string;
        email: string;
        studentId: string;
    };
    evaluation?: SkillScores & { comment?: string };
}

// Local types removed, using Activity from @/lib/api

export default function OrganizerEventDetailsPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [event, setEvent] = useState<Activity<Participant> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [submitting, setSubmitting] = useState(false)

    // Cancellation state
    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

    const handleShare = () => {
        if (!event) return
        const publicUrl = `${window.location.origin}/events/${event.id}`
        navigator.clipboard.writeText(publicUrl)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

    const exportCSV = () => {
        if (!event?.registrations || event.registrations.length === 0) return

        const headers = ['ลำดับ', 'ชื่อ-นามสกุล', 'รหัสนักศึกษา', 'อีเมล', 'สถานะการลงทะเบียน', 'เช็คอิน']
        const rows = event.registrations.map((reg, idx) => [
            idx + 1,
            reg.student?.name || '-',
            reg.student?.studentId || '-',
            reg.student?.email || '-',
            reg.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอดำเนินการ',
            reg.attendance === 'attended' ? 'เข้าร่วมแล้ว' : 'ยังไม่เช็คอิน'
        ])

        const csvContent = [
            `ชื่อกิจกรรม: ${event.name}`,
            `วันที่จัด: ${formatEventDate(event.date)}  เวลา: ${event.startTime} - ${event.endTime}`,
            `สถานที่: ${event.location}`,
            `จำนวนผู้ลงทะเบียนทั้งหมด: ${event.registrations.length} คน`,
            '',
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const BOM = '\uFEFF'
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        // ตัดเอาเฉพาะ YYYY-MM-DD — ISO เต็มมี ":" ซึ่ง Windows ห้ามใช้ในชื่อไฟล์
        const dateSlug = String(event.date).slice(0, 10)
        link.download = `ผู้เข้าร่วม_${event.name.replace(/\s+/g, '_')}_${dateSlug}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    useEffect(() => {
        if (id) {
            fetchEventDetails(id)
        }
    }, [id])

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(id)
            setEvent(data as Activity<Participant>)
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const handleRequestCancel = async () => {
        if (!cancelReason.trim()) {
            alert("กรุณาระบุเหตุผลในการยกเลิก")
            return
        }
        try {
            setSubmitting(true)
            await activitiesAPI.requestCancel(id, cancelReason)

            alert("ยกเลิกกิจกรรมสำเร็จ")
            setIsCancelOpen(false)
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error;
            alert(e.message || "ดำเนินการไม่สำเร็จ")
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
            const e = err as Error;
            alert(e.message || "ยืนยันไม่สำเร็จ")
        }
    }

    const handleCheckIn = async (regId: number) => {
        try {
            await registrationsAPI.checkIn(regId)
            alert("เช็คอินสำเร็จ")
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error;
            alert(e.message || "เช็คอินไม่สำเร็จ")
        }
    }

    // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูลกิจกรรม...</p>
                </Container>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบข้อมูลกิจกรรม"}</p>
                    <Button variant="outline" asChild>
                        <Link href="/organizer/manage">กลับไปหน้าจัดการกิจกรรม</Link>
                    </Button>
                </Container>
            </div>
        )
    }

    const unlimited = isUnlimitedCapacity(event.capacity)
    // กัน capacity = 0 ไม่ให้กลายเป็น NaN% หรือ Infinity%
    const capacity = event.capacity || 0
    const registered = event.registrations?.length || 0
    const fillPercent = !unlimited && capacity > 0 ? Math.round((registered / capacity) * 100) : 0
    const seatsLeft = Math.max(capacity - registered, 0)

    return (
        <div className="bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6 flex justify-between items-center gap-4">
                    <Link href="/organizer/manage" className="inline-flex items-center text-sm text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับสู่หน้าจัดการ
                    </Link>
                    <div className="flex gap-2">
                        <Link href={`/organizer/manage/${event.id}/edit`}>
                            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> แก้ไขกิจกรรม</Button>
                        </Link>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsCancelOpen(true)}
                            disabled={event.approvalStatus === 'rejected'}
                        >
                            {event.approvalStatus === 'rejected' ? 'ยกเลิกแล้ว' : 'ยกเลิกกิจกรรม'}
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="aspect-video w-full bg-surface-2 rounded-xl overflow-hidden relative border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={event.imageUrl ? `${API_BASE_URL}${event.imageUrl}` : "/activity-placeholder.jpg"}
                                alt={event.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                {event.category && <Badge variant="default">{event.category}</Badge>}
                                <Badge variant={event.status === 'open' ? "success" : "neutral"}>
                                    {event.status === 'open' ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                                </Badge>
                                {event.approvalStatus === 'pending_approval' && (
                                    <Badge variant="warning">รออนุมัติ</Badge>
                                )}
                                {event.approvalStatus === 'rejected' && (
                                    <Badge variant="danger">กิจกรรมถูกยกเลิก</Badge>
                                )}
                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-fg mb-2">{event.name}</h1>
                            <div className="flex items-center text-fg-muted gap-2 mb-6">
                                <Users className="w-5 h-5 text-fg-subtle" aria-hidden="true" />
                                <span>จัดโดยคุณ</span>
                            </div>

                            <Tabs defaultValue="participants" className="w-full">
                                <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                                    <TabsTrigger value="participants" className="flex-1">ผู้เข้าร่วม ({event.registrations?.length || 0})</TabsTrigger>
                                    <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                    <TabsTrigger value="conditions" className="flex-1">เงื่อนไข</TabsTrigger>
                                    <TabsTrigger value="benefits" className="flex-1">สิทธิประโยชน์</TabsTrigger>
                                    <TabsTrigger value="softskills" className="flex-1">Soft Skills</TabsTrigger>
                                </TabsList>

                                <TabsContent value="participants" className="bg-bg rounded-xl border border-border shadow-xs overflow-hidden">
                                    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
                                        <p className="text-sm text-fg-muted">ผู้ลงทะเบียนทั้งหมด <span className="font-semibold text-fg">{registered}</span> คน</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={exportCSV}
                                            disabled={registered === 0}
                                        >
                                            <Download className="w-4 h-4" />
                                            Export CSV
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
                                                {event.registrations && event.registrations.length > 0 ? (
                                                    event.registrations.map((reg) => (
                                                        <tr key={reg.id} className="hover:bg-surface transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-fg">{reg.student.name}</div>
                                                                <div className="text-xs text-fg-muted">{reg.student.studentId} | {reg.student.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant={reg.status === 'confirmed' ? "default" : "neutral"}>
                                                                    {reg.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอการยืนยัน'}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {reg.attendance === 'attended' ? (
                                                                    <Badge variant="success">เข้าร่วมแล้ว</Badge>
                                                                ) : (
                                                                    <span className="text-sm text-fg-subtle">ยังไม่เช็คอิน</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {reg.status === 'pending' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-brand-600"
                                                                            onClick={() => handleConfirm(reg.id)}
                                                                        >
                                                                            ยืนยัน
                                                                        </Button>
                                                                    )}

                                                                    {reg.status === 'confirmed' && reg.attendance !== 'attended' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-success"
                                                                            onClick={() => handleCheckIn(reg.id)}
                                                                        >
                                                                            เช็คอิน
                                                                        </Button>
                                                                    )}

                                                                    {reg.attendance === 'attended' && (
                                                                        reg.evaluation ? (
                                                                            <Badge variant="success" className="gap-1">
                                                                                <CheckSquare className="size-3" aria-hidden="true" />
                                                                                ประเมินอัตโนมัติแล้ว
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="neutral">ยังไม่มีคะแนน</Badge>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-8 text-center text-fg-subtle">ยังไม่มีผู้ลงทะเบียน</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="details" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                    <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-brand-600" aria-hidden="true" /> เกี่ยวกับกิจกรรม
                                    </h3>
                                    <p className="text-fg-muted leading-relaxed whitespace-pre-line">
                                        {event.description || "ไม่มีรายละเอียดกิจกรรม"}
                                    </p>
                                    <div className="mt-8 pt-6 border-t border-border">
                                        <h4 className="text-sm font-semibold mb-3 text-fg">Tags</h4>
                                        {event.tags && event.tags.length > 0 ? (
                                            <div className="flex gap-2 flex-wrap">
                                                {event.tags.map(tag => (
                                                    <Badge key={tag.tagName} variant="neutral" className="px-3 py-1">
                                                        <Tag className="w-3 h-3 mr-1" aria-hidden="true" /> {tag.tagName}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-fg-subtle">ไม่ได้ระบุ Tags</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="conditions" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                    <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-warning" aria-hidden="true" /> เงื่อนไขการเข้าร่วม
                                    </h3>
                                    {event.conditions && event.conditions.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.conditions.map((item, i) => (
                                                <li key={i} className="flex gap-3 text-fg-muted">
                                                    <div className="w-6 h-6 rounded-full bg-warning-bg text-warning flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                                    <span>{item.conditionText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border">
                                            <p className="text-fg-muted">ไม่มีข้อมูลเงื่อนไขการเข้าร่วม</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="benefits" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                    <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-success" aria-hidden="true" /> สิทธิประโยชน์ที่ได้รับ
                                    </h3>
                                    {event.benefits && event.benefits.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.benefits.map((item, i) => (
                                                <li key={i} className="flex gap-3 text-fg-muted">
                                                    <CheckCircle className="w-5 h-5 text-success shrink-0" aria-hidden="true" />
                                                    <span>{item.benefitText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border">
                                            <p className="text-fg-muted">ไม่มีข้อมูลสิทธิประโยชน์</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="softskills" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                    <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                                        <CheckSquare className="w-5 h-5 text-brand-600" aria-hidden="true" /> Soft Skills ที่จะได้รับ
                                    </h3>
                                    {event.softSkills && event.softSkills.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {event.softSkills.map((skill, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-brand-50 border border-border text-brand-700 px-4 py-2.5 rounded-xl font-medium">
                                                    <CheckSquare className="w-4 h-4" aria-hidden="true" />
                                                    <span>{softSkillLabel(skill.skillType)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border">
                                            <p className="text-fg-muted">ไม่ได้ระบุ Soft Skills สำหรับกิจกรรมนี้</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="space-y-6">
                        <Card className="border-border shadow-xs overflow-hidden">
                            <div className="p-6 space-y-6">
                                <h3 className="font-semibold text-lg text-fg">ข้อมูลกิจกรรม</h3>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                            <Calendar className="w-5 h-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">วันที่</div>
                                            <div className="font-medium text-fg">{formatEventDate(event.date)}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                            <Clock className="w-5 h-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">เวลา</div>
                                            <div className="font-medium text-fg">{event.startTime} - {event.endTime}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                            <MapPin className="w-5 h-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">สถานที่</div>
                                            <div className="font-medium text-fg">{event.location}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-fg">
                                                <Users className="w-4 h-4" aria-hidden="true" /> ผู้เข้าร่วม
                                            </div>
                                            <span className="text-sm text-fg-muted tabular-nums">
                                                {unlimited ? `${registered} คน (ไม่จำกัด)` : `${registered}/${capacity} คน`}
                                            </span>
                                        </div>
                                        {!unlimited && (
                                            <>
                                                <Progress value={fillPercent} className="h-2" />
                                                <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {seatsLeft} ที่นั่ง</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Organizer View Actions */}
                                <div className="space-y-3 pt-2">
                                    <Button variant="outline" className="w-full" onClick={handleShare}>
                                        <Share2 className="w-4 h-4 mr-2" /> แชร์กิจกรรม
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </Container>

            {/* Cancellation Dialog */}
            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-danger flex items-center gap-2">
                            ⚠️ ยืนยันการยกเลิกกิจกรรม
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-warning-bg rounded-lg border border-border text-sm text-warning">
                            <strong>หมายเหตุ:</strong> กิจกรรมจะถูกยกเลิกทันที ผู้เข้าร่วมที่ลงทะเบียนไว้แล้วจะได้รับผลกระทบและไม่สามารถย้อนกลับได้
                        </div>
                        <div className="space-y-2">
                            <Label>เหตุผลการยกเลิก <span className="text-danger">*</span></Label>
                            <Input
                                placeholder="เช่น ติดภารกิจด่วน, จำนวนผู้สมัครไม่เพียงพอ..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)}>ยกเลิก</Button>
                        <Button
                            variant="destructive"
                            onClick={handleRequestCancel}
                            disabled={submitting || !cancelReason.trim()}
                        >
                            {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการยกเลิก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
