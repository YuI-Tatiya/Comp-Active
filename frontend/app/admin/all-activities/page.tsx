"use client"

import { useState, useEffect } from "react"
import { Calendar, MapPin, Users, Activity } from "lucide-react"
import { activitiesAPI } from "@/lib/api"

export default function AdminAllActivitiesPage() {
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadActivities()
    }, [])

    async function loadActivities() {
        try {
            setLoading(true)
            const data = await activitiesAPI.getAll()
            setActivities(Array.isArray(data) ? data : [])
        } catch {
            setActivities([])
        } finally {
            setLoading(false)
        }
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
                <h1 className="text-2xl font-bold text-gray-900">กิจกรรมทั้งหมด</h1>
                <p className="text-gray-500 mt-1">ดูกิจกรรมทั้งหมดในระบบ</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">กิจกรรม</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">วันที่</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">สถานที่</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">ผู้ลงทะเบียน</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">ยังไม่มีกิจกรรมในระบบ</td>
                                </tr>
                            ) : (
                                activities.map((activity) => {
                                    const progress = activity.capacity > 0 ? Math.round(((activity.registeredCount ?? 0) / activity.capacity) * 100) : 0

                                    return (
                                        <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                                                        <Activity className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-sm">{activity.name}</div>
                                                        <div className="text-xs text-gray-500">{activity.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <Calendar className="w-4 h-4" />
                                                    {activity.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <MapPin className="w-4 h-4" />
                                                    <span className="line-clamp-1">{activity.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-medium text-gray-900">{activity.registeredCount ?? 0}/{activity.capacity}</span>
                                                </div>
                                                <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                                                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${activity.approvalStatus === "approved" ? "bg-green-50 text-green-600" :
                                                        activity.approvalStatus === "rejected" ? "bg-red-50 text-red-600" :
                                                            "bg-orange-50 text-orange-600"
                                                    }`}>
                                                    {activity.approvalStatus === "approved" ? "อนุมัติแล้ว" :
                                                        activity.approvalStatus === "rejected" ? "ปฏิเสธ" : "รออนุมัติ"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <div className="text-sm text-gray-500">ทั้งหมด {activities.length} กิจกรรม</div>
                </div>
            </div>
        </div>
    )
}
