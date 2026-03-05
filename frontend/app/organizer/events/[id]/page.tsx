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
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Tag, Info, CheckCircle, Edit, Star } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, evaluationsAPI, registrationsAPI, Activity } from "@/lib/api"

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
    evaluation?: {
        teamwork: number;
        leadership: number;
        communication: number;
        problemSolving: number;
        adaptability: number;
        comment: string;
    };
}

// Local types removed, using Activity from @/lib/api

export default function OrganizerEventDetailsPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [event, setEvent] = useState<Activity<Participant> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)

    // Evaluation state
    const [selectedReg, setSelectedReg] = useState<Participant | null>(null)
    const [isEvalOpen, setIsEvalOpen] = useState(false)
    const [evalScores, setEvalScores] = useState({
        teamwork: 5,
        leadership: 5,
        communication: 5,
        problemSolving: 5,
        adaptability: 5,
        comment: ""
    })
    const [submitting, setSubmitting] = useState(false)

    // Cancellation state
    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

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

            // If the backend cancelled it immediately (0 students), the message should be different
            // But for simplicity, we'll use a general one and re-fetch status
            alert("ดำเนินการสำเร็จ (หากมีผู้สมัครแล้ว คำขอจะถูกส่งไปให้ Admin อนุมัติ)")
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
                teamwork: reg.evaluation.teamwork,
                leadership: reg.evaluation.leadership,
                communication: reg.evaluation.communication,
                problemSolving: reg.evaluation.problemSolving,
                adaptability: reg.evaluation.adaptability,
                comment: reg.evaluation.comment || ""
            })
        } else {
            setEvalScores({
                teamwork: 5,
                leadership: 5,
                communication: 5,
                problemSolving: 5,
                adaptability: 5,
                comment: ""
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
                <Link href="/organizer/events">
                    <Button variant="outline">กลับไปหน้าค้นหากิจกรรม</Button>
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
                            disabled={event.approvalStatus === 'pending_cancel' || event.approvalStatus === 'rejected'}
                        >
                            {event.approvalStatus === 'pending_cancel' ? 'กำลังรอยกเลิก' :
                                event.approvalStatus === 'rejected' ? 'ยกเลิกแล้ว' : 'ยกเลิกกิจกรรม'}
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="aspect-video w-full bg-gray-200 rounded-xl overflow-hidden relative">
                            {event.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`http://localhost:3001${event.imageUrl}`} alt={event.name} className="w-full h-full object-cover" />
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
                                {event.approvalStatus === 'pending' && (
                                    <Badge className="bg-orange-500 hover:bg-orange-600">รออนุมัติ</Badge>
                                )}
                                {event.approvalStatus === 'pending_cancel' && (
                                    <Badge className="bg-red-500 hover:bg-red-600">รอยกเลิก (Admin)</Badge>
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
                                </TabsList>

                                <TabsContent value="participants" className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
                                                                        <Star className="w-3 h-3 mr-1" /> {reg.evaluation ? "แก้ไขการประเมิน" : "ประเมิน"}
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
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-semibold" onClick={() => setIsRegisterOpen(true)}>
                                        ทดสอบลงทะเบียน (Preview)
                                    </Button>
                                    <Button variant="outline" className="w-full border-gray-200 hover:bg-gray-50 text-gray-600">
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
                            <Star className="w-5 h-5 text-purple-600" /> ประเมิน Soft Skills
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

                            <div className="space-y-5">
                                {[
                                    { key: 'teamwork', label: 'การทำงานเป็นทีม' },
                                    { key: 'leadership', label: 'ภาวะผู้นำ' },
                                    { key: 'communication', label: 'การสื่อสาร' },
                                    { key: 'problemSolving', label: 'การแก้ปัญหา' },
                                    { key: 'adaptability', label: 'การปรับตัว' },
                                ].map((skill) => (
                                    <div key={skill.key} className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label className="font-medium">{skill.label}</Label>
                                            <span className="font-bold text-blue-600">{(evalScores as Record<string, number | string>)[skill.key]}/10</span>
                                        </div>
                                        <Input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={(evalScores as Record<string, number | string>)[skill.key]}
                                            onChange={(e) => setEvalScores({ ...evalScores, [skill.key]: parseInt(e.target.value) })}
                                            className="h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                    </div>
                                ))}

                                <div className="space-y-2 pt-2">
                                    <Label>ความคิดเห็นเพิ่มเติม (ถ้ามี)</Label>
                                    <Input
                                        placeholder="ระบุข้อเสนอแนะสำหรับการพัฒนา..."
                                        value={evalScores.comment}
                                        onChange={(e) => setEvalScores({ ...evalScores, comment: e.target.value })}
                                    />
                                </div>
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
                            <strong>หมายเหตุ:</strong> หากมีผู้เข้าร่วมลงทะเบียนแล้ว คำขอนี้จะถูกส่งไปให้ <strong>Admin อนุมัติ</strong> เพื่อความปลอดภัยและเป็นทางการตามระเบียบของระบบ
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

            {/* Modal - Same as student for previewing */}
            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วมกิจกรรม (Preview)</DialogTitle>
                        <p className="text-gray-500 text-sm">นี่คือตัวอย่างหน้าต่างลงทะเบียน</p>
                    </DialogHeader>

                    <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); setIsRegisterOpen(false); }}>
                        <div className="space-y-2">
                            <Label htmlFor="name">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                            <Input id="name" placeholder="กรอกชื่อ-นามสกุล" required />
                        </div>
                        {/* Other fields... Keeping it consistent */}
                        <div className="space-y-2">
                            <Label htmlFor="studentId">รหัสนักศึกษา <span className="text-red-500">*</span></Label>
                            <Input id="studentId" placeholder="กรอกรหัสนักศึกษา" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล <span className="text-red-500">*</span></Label>
                            <Input id="email" type="email" placeholder="กรอกอีเมล" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label>
                            <Input id="phone" type="tel" placeholder="กรอกเบอร์โทรศัพท์" required />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">ยืนยันการลงทะเบียน</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
