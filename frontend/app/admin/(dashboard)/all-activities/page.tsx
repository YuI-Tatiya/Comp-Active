"use client"

import { useState, useEffect } from "react"
import { Calendar, MapPin, Users, Activity } from "lucide-react"
import { activitiesAPI, type Activity as ActivityItem } from "@/lib/api"

const approvalStyle: Record<string, { label: string; bg: string; color: string }> = {
    approved: { label: "อนุมัติแล้ว", bg: "rgba(63,160,172,0.12)", color: "#3fa0ac" },
    rejected: { label: "ปฏิเสธ", bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
    pending: { label: "รออนุมัติ", bg: "rgba(224,169,74,0.14)", color: "#c88e2a" },
}

export default function AdminAllActivitiesPage() {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadActivities() }, [])

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
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "4px solid #e2e8f0", borderTopColor: "#2563eb" }} />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>กิจกรรมทั้งหมด</h1>
                <p className="text-sm mt-1" style={{ color: "#64748b" }}>ดูกิจกรรมทั้งหมดในระบบ</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                {["กิจกรรม", "วันที่", "สถานที่", "ผู้ลงทะเบียน", "สถานะ"].map((h) => (
                                    <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-14 text-center text-sm" style={{ color: "#64748b" }}>ยังไม่มีกิจกรรมในระบบ</td>
                                </tr>
                            ) : (
                                activities.map((activity, i) => {
                                    const progress = activity.capacity > 0 ? Math.round(((activity.registeredCount ?? 0) / activity.capacity) * 100) : 0
                                    const statusStyle = approvalStyle[activity.approvalStatus] ?? approvalStyle.pending
                                    return (
                                        <tr
                                            key={activity.id}
                                            className="transition-colors"
                                            style={{ borderBottom: i < activities.length - 1 ? "1px solid #f1f5f9" : "none" }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc" }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent" }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.1)" }}>
                                                        <Activity className="w-4 h-4" style={{ color: "#2563eb" }} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm" style={{ color: "#0f172a" }}>{activity.name}</div>
                                                        <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>{activity.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#64748b" }}>
                                                    <Calendar className="w-4 h-4 shrink-0" />
                                                    {activity.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#64748b" }}>
                                                    <MapPin className="w-4 h-4 shrink-0" />
                                                    <span className="line-clamp-1">{activity.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#0f172a" }}>
                                                    <Users className="w-4 h-4" style={{ color: "#64748b" }} />
                                                    {activity.registeredCount ?? 0}/{activity.capacity}
                                                </div>
                                                <div className="w-20 rounded-full h-1.5 mt-1.5" style={{ background: "#e2e8f0" }}>
                                                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: "#2563eb" }} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                                                    {statusStyle.label}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3" style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <span className="text-xs" style={{ color: "#64748b" }}>ทั้งหมด {activities.length} กิจกรรม</span>
                </div>
            </div>
        </div>
    )
}
