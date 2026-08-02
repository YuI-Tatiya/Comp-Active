"use client"

import { useEffect, useState } from "react"
import { activitiesAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Users,
    Calendar,
    ArrowLeft,
    Search,
    Info
} from "lucide-react"
import Link from "next/link"

interface Participant {
    id: number;
}

interface CancellationRequest {
    id: number;
    name: string;
    category: string;
    date: string;
    cancellationReason: string;
    organizer: {
        name: string;
        email: string;
    };
    registrations: Participant[];
}

export default function AdminCancellationsPage() {
    const [requests, setRequests] = useState<CancellationRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getPendingCancel()
            setRequests(data as unknown as CancellationRequest[])
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message || "โหลดข้อมูลไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id: number) => {
        if (!confirm("ยืนยันการอนุมัติยกเลิกกิจกรรมนี้? ผู้เข้าร่วมทั้งหมดจะถูกยกเลิกสิทธิ์")) return
        try {
            await activitiesAPI.approveCancel(id)
            alert("อนุมัติการยกเลิกเรียบร้อยแล้ว")
            fetchRequests()
        } catch (err: unknown) {
            const e = err as Error;
            alert(e.message || "ดำเนินการไม่สำเร็จ")
        }
    }

    const handleRejectRequest = async (id: number) => {
        // Just set it back to APPROVED if Admin rejects the cancellation request
        if (!confirm("ปฏิเสธคำขอยกเลิก? กิจกรรมจะกลับไปอยู่ในสถานะเปิดตามปกติ")) return
        try {
            await activitiesAPI.approve(id) // Reuse approve to set status back to APPROVED
            alert("ปฏิเสธคำขอยกเลิกเรียบร้อยแล้ว")
            fetchRequests()
        } catch (err: unknown) {
            const e = err as Error;
            alert(e.message || "ดำเนินการไม่สำเร็จ")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-2 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> กลับสู่แดชบอร์ด
                        </Link>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">คำขอยกเลิกกิจกรรม</h1>
                        <p className="text-gray-500 mt-1">ตรวจสอบและพิจารณาคำขอยกเลิกกิจกรรมที่มีผู้สมัครแล้ว</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                        {error}
                    </div>
                )}

                {requests.length === 0 ? (
                    <Card className="p-12 text-center border-dashed border-2 flex flex-col items-center justify-center bg-white/50">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">ไม่มีคำขอยกเลิกที่รอการตรวจสอบ</h3>
                        <p className="text-gray-500 max-w-sm mt-2">ขณะนี้ไม่มีผู้จัดกิจกรรมท่านใดส่งคำร้องขอยกเลิกกิจกรรมเข้ามา</p>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {requests.map((req) => (
                            <Card key={req.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white">
                                <div className="flex flex-col md:flex-row">
                                    <div className="p-6 md:p-8 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                            <Badge variant="outline" className="text-xs font-bold uppercase">{req.category}</Badge>
                                            <Badge className="bg-red-50 text-red-600 border-red-100 uppercase text-[10px] tracking-widest px-2 py-0.5">Pending Cancellation</Badge>
                                        </div>

                                        <h2 className="text-xl font-bold text-gray-900 mb-4">{req.name}</h2>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">{req.date}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">{req.registrations.length} ผู้สมัคร (มีผลกระทบ)</span>
                                            </div>
                                            <div className="sm:col-span-2 flex items-center gap-3 text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-400">
                                                    <Info className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">ผู้จัด: {req.organizer.name} ({req.organizer.email})</span>
                                            </div>
                                        </div>

                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                            <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-1">
                                                <AlertTriangle className="w-4 h-4" /> เหตุผลที่ร้องขอการยกเลิก
                                            </div>
                                            <p className="text-red-700 text-sm italic">&quot;{req.cancellationReason || 'ไม่ได้ระบุเหตุผล'}&quot;</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-6 md:w-64 flex flex-col justify-center gap-3 border-l border-gray-100">
                                        <Button
                                            className="w-full bg-red-600 hover:bg-red-700 font-bold"
                                            onClick={() => handleApprove(req.id)}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> อนุมัติการยกเลิก
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full bg-white hover:bg-gray-100 text-gray-600 border-gray-200 font-bold"
                                            onClick={() => handleRejectRequest(req.id)}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> ปฏิเสธคำขอ
                                        </Button>
                                        <Link href={`/admin/events/${req.id}`} className="w-full">
                                            <Button variant="ghost" className="w-full text-xs text-gray-400 hover:text-gray-600">
                                                <Search className="w-3 h-3 mr-1" /> ดูรายละเอียดกิจกรรม
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
