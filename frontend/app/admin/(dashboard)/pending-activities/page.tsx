"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, Eye, Calendar, MapPin, Users } from "lucide-react"
import { activitiesAPI, type Activity } from "@/lib/api"

export default function AdminPendingActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectingId, setRejectingId] = useState<number | null>(null)

    useEffect(() => {
        loadActivities()
    }, [])

    async function loadActivities() {
        try {
            setLoading(true)
            const data = await activitiesAPI.getPending()
            setActivities(Array.isArray(data) ? data : [])
        } catch {
            setActivities([])
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id: number) => {
        try {
            await activitiesAPI.approve(id)
            setActivities((prev) => prev.filter((a) => a.id !== id))
        } catch (err) {
            alert(err instanceof Error ? err.message : "อนุมัติไม่สำเร็จ")
        }
    }

    const handleReject = async () => {
        if (!rejectingId || !rejectReason.trim()) return
        try {
            await activitiesAPI.reject(rejectingId, rejectReason)
            setActivities((prev) => prev.filter((a) => a.id !== rejectingId))
        } catch (err) {
            alert(err instanceof Error ? err.message : "ปฏิเสธไม่สำเร็จ")
        }
        setShowRejectModal(false)
        setRejectReason("")
        setRejectingId(null)
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">อนุมัติกิจกรรม</h1>
                <p className="text-gray-500 mt-1">ตรวจสอบและอนุมัติกิจกรรมที่ผู้จัดส่งเข้ามา</p>
            </div>

            {/* Stats */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-orange-600">{activities.length}</div>
                    <div className="text-xs text-gray-500">รออนุมัติ</div>
                </div>
            </div>

            {/* Pending Activities */}
            {activities.length > 0 ? (
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <div key={activity.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 mr-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                                                {activity.category}
                                            </span>
                                            <span className="px-2.5 py-0.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-full flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                รออนุมัติ
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{activity.name}</h3>
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{activity.description}</p>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{activity.date}</span>
                                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{activity.startTime} - {activity.endTime}</span>
                                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{activity.location}</span>
                                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{activity.capacity} คน</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button onClick={() => setSelectedActivity(activity)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-600">
                                            <Eye className="w-4 h-4" />ดูรายละเอียด
                                        </button>
                                        <button onClick={() => handleApprove(activity.id)} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />อนุมัติ
                                        </button>
                                        <button onClick={() => { setRejectingId(activity.id); setShowRejectModal(true) }} className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2">
                                            <XCircle className="w-4 h-4" />ปฏิเสธ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีกิจกรรมรออนุมัติ</h3>
                    <p className="text-gray-500">กิจกรรมทั้งหมดได้รับการตรวจสอบแล้ว</p>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">ปฏิเสธกิจกรรม</h3>
                        <p className="text-sm text-gray-500 mb-4">กรุณาระบุเหตุผลในการปฏิเสธ</p>
                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                            placeholder="เหตุผลในการปฏิเสธ..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => { setShowRejectModal(false); setRejectReason("") }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
                                ยกเลิก
                            </button>
                            <button onClick={handleReject} disabled={!rejectReason.trim()} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                                ยืนยันปฏิเสธ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedActivity && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">{selectedActivity.category}</span>
                                <h2 className="text-xl font-bold text-gray-900 mt-2">{selectedActivity.name}</h2>
                            </div>
                            <button onClick={() => setSelectedActivity(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-gray-400 mb-1">รายละเอียด</div>
                                <p className="text-sm text-gray-700">{selectedActivity.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><div className="text-xs text-gray-400 mb-1">วันที่</div><div className="text-sm font-medium">{selectedActivity.date}</div></div>
                                <div><div className="text-xs text-gray-400 mb-1">เวลา</div><div className="text-sm font-medium">{selectedActivity.startTime} - {selectedActivity.endTime}</div></div>
                                <div><div className="text-xs text-gray-400 mb-1">สถานที่</div><div className="text-sm font-medium">{selectedActivity.location}</div></div>
                                <div><div className="text-xs text-gray-400 mb-1">จำนวนที่รับ</div><div className="text-sm font-medium">{selectedActivity.capacity} คน</div></div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
                            <button onClick={() => { handleApprove(selectedActivity.id); setSelectedActivity(null) }} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" />อนุมัติ
                            </button>
                            <button onClick={() => { setRejectingId(selectedActivity.id); setShowRejectModal(true); setSelectedActivity(null) }} className="flex-1 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2">
                                <XCircle className="w-4 h-4" />ปฏิเสธ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
