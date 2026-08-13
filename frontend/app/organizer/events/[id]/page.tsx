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
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Tag, Info, CheckCircle, Edit, CheckSquare, Download } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, evaluationsAPI, registrationsAPI, Activity, API_BASE_URL, SkillScores } from "@/lib/api"
import { SOFT_SKILLS, softSkillLabel } from "@/lib/soft-skills"

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

    // Evaluation state
    const [selectedReg, setSelectedReg] = useState<Participant | null>(null)
    const [isEvalOpen, setIsEvalOpen] = useState(false)
    const [evalScores, setEvalScores] = useState<SkillScores>({
        communication: 0,
        timeManagement: 0,
        flexibilityAdaptability: 0,
        teamworkCollaboration: 0,
        analyticCriticalThinking: 0,
        decisionMaking: 0,
        creativity: 0,
        complexProblemSolving: 0,
        curiosityLifelongLearning: 0,
        negotiationPersuasion: 0,
        leadership: 0,
        positiveAttitude: 0,
    })
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
            `วันที่จัด: ${event.date}  เวลา: ${event.startTime} - ${event.endTime}`,
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
        link.download = `ผู้เข้าร่วม_${event.name.replace(/\s+/g, '_')}_${event.date}.csv`
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

    const handleOpenEval = (reg: Participant) => {
        setSelectedReg(reg)
        if (reg.evaluation) {
            setEvalScores({
                communication: reg.evaluation.communication || 0,
                timeManagement: reg.evaluation.timeManagement || 0,
                flexibilityAdaptability: reg.evaluation.flexibilityAdaptability || 0,
                teamworkCollaboration: reg.evaluation.teamworkCollaboration || 0,
                analyticCriticalThinking: reg.evaluation.analyticCriticalThinking || 0,
                decisionMaking: reg.evaluation.decisionMaking || 0,
                creativity: reg.evaluation.creativity || 0,
                complexProblemSolving: reg.evaluation.complexProblemSolving || 0,
                curiosityLifelongLearning: reg.evaluation.curiosityLifelongLearning || 0,
                negotiationPersuasion: reg.evaluation.negotiationPersuasion || 0,
                leadership: reg.evaluation.leadership || 0,
                positiveAttitude: reg.evaluation.positiveAttitude || 0,
            })
        } else {
            setEvalScores({
                communication: 0,
                timeManagement: 0,
                flexibilityAdaptability: 0,
                teamworkCollaboration: 0,
                analyticCriticalThinking: 0,
                decisionMaking: 0,
                creativity: 0,
                complexProblemSolving: 0,
                curiosityLifelongLearning: 0,
                negotiationPersuasion: 0,
                leadership: 0,
                positiveAttitude: 0,
            })
        }
        setIsEvalOpen(true)
    }

    const handleSubmitEval = async () => {
        if (!selectedReg) return
        try {
            setSubmitting(true)
            await evaluationsAPI.create({
                registrationId: selectedReg.id,
                ...evalScores
            })
            alert("ประเมินผลสำเร็จ!") // Simple alert as fallback
            setIsEvalOpen(false)
            fetchEventDetails(id) // Refresh data to show "Edit" button
        } catch (err: unknown) {
            const e = err as Error;
            alert(e.message || "ประเมินผลไม่สำเร็จ")
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

    if (loading) {
        // ... (omitting middle part to match replace_file_content logic but I should be careful with TargetContent)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
                <div className="text-red-500 font-medium">{error || "ไม่พบข้อมูลกิจกรรม"}</div>
                <Link href="/organizer/manage">
                    <Button variant="outline">กลับไปหน้าจัดการกิจกรรม</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <Link href="/organizer/manage" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors">
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
                        <div className="aspect-video w-full bg-gray-200 rounded-xl overflow-hidden relative">
                            {event.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`${API_BASE_URL}${event.imageUrl}`} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-purple-600">
                                    <span className="text-2xl font-bold opacity-50">{event.category}</span>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <Badge className="bg-blue-600 hover:bg-blue-700">{event.category}</Badge>
                                <Badge className={event.status === 'open' ? "bg-green-500 hover:bg-green-600" : "bg-gray-500"}>
                                    {event.status === 'open' ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                                </Badge>
                                {event.approvalStatus === 'pending_approval' && (
                                    <Badge className="bg-orange-500 hover:bg-orange-600">รออนุมัติ</Badge>
                                )}
                                {event.approvalStatus === 'rejected' && (
                                    <Badge className="bg-red-100 text-red-700 border-red-200">กิจกรรมถูกยกเลิก</Badge>
                                )}
                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
                            <div className="flex items-center text-gray-500 gap-2 mb-6">
                                <Users className="w-5 h-5 text-gray-400" />
                                <span>จัดโดยคุณ</span>
                            </div>

                            <Tabs defaultValue="participants" className="w-full">
                                <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-lg mb-6">
                                    <TabsTrigger value="participants" className="flex-1">ผู้เข้าร่วม ({event.registrations?.length || 0})</TabsTrigger>
                                    <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                    <TabsTrigger value="conditions" className="flex-1">เงื่อนไข</TabsTrigger>
                                    <TabsTrigger value="benefits" className="flex-1">สิทธิประโยชน์</TabsTrigger>
                                    <TabsTrigger value="softskills" className="flex-1">Soft Skills</TabsTrigger>
                                </TabsList>

                                <TabsContent value="participants" className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                        <p className="text-sm text-gray-500">ผู้ลงทะเบียนทั้งหมด <span className="font-semibold text-gray-900">{event.registrations?.length || 0}</span> คน</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-green-200 text-green-700 hover:bg-green-50 gap-2"
                                            onClick={exportCSV}
                                            disabled={!event.registrations || event.registrations.length === 0}
                                        >
                                            <Download className="w-4 h-4" />
                                            Export CSV
                                        </Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-500 text-sm">
                                                    <th className="px-6 py-4 font-semibold">รายชื่อผู้เข้าร่วม</th>
                                                    <th className="px-6 py-4 font-semibold">สถานะ</th>
                                                    <th className="px-6 py-4 font-semibold">เช็คอิน</th>
                                                    <th className="px-6 py-4 font-semibold text-right">การจัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {event.registrations && event.registrations.length > 0 ? (
                                                    event.registrations.map((reg) => (
                                                        <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-gray-900">{reg.student.name}</div>
                                                                <div className="text-xs text-gray-500">{reg.student.studentId} | {reg.student.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant={reg.status === 'confirmed' ? "default" : "secondary"}>
                                                                    {reg.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอการยืนยัน'}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {reg.attendance === 'attended' ? (
                                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">เข้าร่วมแล้ว</Badge>
                                                                ) : (
                                                                    <span className="text-sm text-gray-400">ยังไม่เช็คอิน</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {reg.status === 'pending' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                            onClick={() => handleConfirm(reg.id)}
                                                                        >
                                                                            ยืนยัน
                                                                        </Button>
                                                                    )}

                                                                    {reg.status === 'confirmed' && reg.attendance !== 'attended' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                                                            onClick={() => handleCheckIn(reg.id)}
                                                                        >
                                                                            เช็คอิน
                                                                        </Button>
                                                                    )}

                                                                    <Button
                                                                        size="sm"
                                                                        className={reg.evaluation ? "bg-white text-purple-600 border-purple-200 hover:bg-purple-50" : "bg-purple-600 hover:bg-purple-700"}
                                                                        variant={reg.evaluation ? "outline" : "default"}
                                                                        disabled={reg.attendance !== 'attended'}
                                                                        onClick={() => handleOpenEval(reg)}
                                                                        title={reg.attendance !== 'attended' ? "ต้องเช็คอินก่อนจึงจะประเมินได้" : ""}
                                                                    >
                                                                        {reg.evaluation ? "แก้ไขการประเมิน" : "ประเมิน"}
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">ยังไม่มีผู้ลงทะเบียน</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="details" className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-blue-500" /> เกี่ยวกับกิจกรรม
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <h4 className="text-sm font-semibold mb-3 text-gray-900">Tags</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {event.tags.map(tag => (
                                                <Badge key={tag.tagName} variant="secondary" className="px-3 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200">
                                                    <Tag className="w-3 h-3 mr-1" /> {tag.tagName}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="conditions" className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-orange-500" /> เงื่อนไขการเข้าร่วม
                                    </h3>
                                    {event.conditions && event.conditions.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.conditions.map((item, i) => (
                                                <li key={i} className="flex gap-3 text-gray-600">
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                                                    <span>{item.conditionText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <p className="text-gray-500">ไม่มีข้อมูลเงื่อนไขการเข้าร่วม</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="benefits" className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-green-500" /> สิทธิประโยชน์ที่ได้รับ
                                    </h3>
                                    {event.benefits && event.benefits.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.benefits.map((item, i) => (
                                                <li key={i} className="flex gap-3 text-gray-600">
                                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span>{item.benefitText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <p className="text-gray-500">ไม่มีข้อมูลสิทธิประโยชน์</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="softskills" className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <CheckSquare className="w-5 h-5 text-purple-500" /> Soft Skills ที่จะได้รับ
                                    </h3>
                                    {event.softSkills && event.softSkills.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {event.softSkills.map((skill, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-4 py-2.5 rounded-xl font-medium">
                                                    <CheckSquare className="w-4 h-4" />
                                                    <span>{softSkillLabel(skill.skillType)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <p className="text-gray-500">ไม่ได้ระบุ Soft Skills สำหรับกิจกรรมนี้</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="space-y-6">
                        <Card className="border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 space-y-6">
                                <h3 className="font-semibold text-lg">ข้อมูลกิจกรรม</h3>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">วันที่</div>
                                            <div className="font-medium text-gray-900">{event.date}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">เวลา</div>
                                            <div className="font-medium text-gray-900">{event.startTime} - {event.endTime}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">สถานที่</div>
                                            <div className="font-medium text-gray-900">{event.location}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                <Users className="w-4 h-4" /> ผู้เข้าร่วม
                                            </div>
                                            <span className="text-sm text-gray-500">{event.registrations?.length || 0}/{event.capacity} คน</span>
                                        </div>
                                        <Progress value={(event.registrations?.length || 0) / event.capacity * 100} className="h-2" />
                                        <p className="text-xs text-gray-400 mt-2 text-right">เหลืออีก {event.capacity - (event.registrations?.length || 0)} ที่นั่ง</p>
                                    </div>
                                </div>

                                {/* Organizer View Actions */}
                                <div className="space-y-3 pt-2">
                                    <Button variant="outline" className="w-full border-gray-200 hover:bg-gray-50 text-gray-600" onClick={handleShare}>
                                        <Share2 className="w-4 h-4 mr-2" /> แชร์กิจกรรม
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Evaluation Dialog */}
            <Dialog open={isEvalOpen} onOpenChange={setIsEvalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-purple-600" /> ประเมิน Soft Skills
                        </DialogTitle>
                    </DialogHeader>
                    {selectedReg && (
                        <div className="space-y-6 py-4">
                            <div className="bg-purple-50 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                                    {selectedReg.student.name?.[0] || '?'}
                                </div>
                                <div>
                                    <div className="font-bold text-purple-900">{selectedReg.student.name}</div>
                                    <div className="text-sm text-purple-600">{selectedReg.student.studentId}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 mb-2">กรุณาติ๊กเลือกทักษะที่นักศึกษาแสดงออก:</p>
                                {SOFT_SKILLS
                                    .filter(skill => {
                                        // Only show soft skills provided by this activity
                                        if (event?.softSkills && event.softSkills.length > 0) {
                                            return event.softSkills.some(s => s.skillType === skill.value);
                                        }
                                        return true; // fallback if no soft skills defined
                                    })
                                    .map((skill) => (
                                        <div key={skill.value} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                id={`skill-${skill.value}`}
                                                checked={evalScores[skill.field] === 1}
                                                onChange={(e) => setEvalScores({ ...evalScores, [skill.field]: e.target.checked ? 1 : 0 })}
                                                className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                            />
                                            <Label htmlFor={`skill-${skill.value}`} className="font-medium cursor-pointer flex-1">
                                                {skill.label.replace(/^ทักษะ/, '')} ({skill.labelEn})
                                            </Label>
                                        </div>
                                    ))}
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEvalOpen(false)} disabled={submitting}>ยกเลิก</Button>
                                <Button
                                    className="bg-purple-600 hover:bg-purple-700"
                                    onClick={handleSubmitEval}
                                    disabled={submitting}
                                >
                                    {submitting ? "กำลังประเมิน..." : "บันทึกการประเมิน"}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cancellation Dialog */}
            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            ⚠️ ยืนยันการยกเลิกกิจกรรม
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-800">
                            <strong>หมายเหตุ:</strong> กิจกรรมจะถูกยกเลิกทันที ผู้เข้าร่วมที่ลงทะเบียนไว้แล้วจะได้รับผลกระทบและไม่สามารถย้อนกลับได้
                        </div>
                        <div className="space-y-2">
                            <Label>เหตุผลการยกเลิก <span className="text-red-500">*</span></Label>
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
                            className="bg-red-600 hover:bg-red-700"
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
