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
                <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "4px solid #dce6f2", borderTopColor: "#3a72ad" }} />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "#14263c" }}>กิจกรรมทั้งหมด</h1>
                <p className="text-sm mt-1" style={{ color: "#5f7691" }}>ดูกิจกรรมทั้งหมดในระบบ</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #dce6f2" }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ background: "#f7f9fc", borderBottom: "1px solid #dce6f2" }}>
                                {["กิจกรรม", "วันที่", "สถานที่", "ผู้ลงทะเบียน", "สถานะ"].map((h) => (
                                    <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#5f7691" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-14 text-center text-sm" style={{ color: "#5f7691" }}>ยังไม่มีกิจกรรมในระบบ</td>
                                </tr>
                            ) : (
                                activities.map((activity, i) => {
                                    const progress = activity.capacity > 0 ? Math.round(((activity.registeredCount ?? 0) / activity.capacity) * 100) : 0
                                    const statusStyle = approvalStyle[activity.approvalStatus] ?? approvalStyle.pending
                                    return (
                                        <tr
                                            key={activity.id}
                                            className="transition-colors"
                                            style={{ borderBottom: i < activities.length - 1 ? "1px solid #f0f4f9" : "none" }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#f7f9fc" }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent" }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(58,114,173,0.1)" }}>
                                                        <Activity className="w-4 h-4" style={{ color: "#3a72ad" }} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm" style={{ color: "#14263c" }}>{activity.name}</div>
                                                        <div className="text-xs mt-0.5" style={{ color: "#5f7691" }}>{activity.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#5f7691" }}>
                                                    <Calendar className="w-4 h-4 shrink-0" />
                                                    {activity.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#5f7691" }}>
                                                    <MapPin className="w-4 h-4 shrink-0" />
                                                    <span className="line-clamp-1">{activity.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#14263c" }}>
                                                    <Users className="w-4 h-4" style={{ color: "#5f7691" }} />
                                                    {activity.registeredCount ?? 0}/{activity.capacity}
                                                </div>
                                                <div className="w-20 rounded-full h-1.5 mt-1.5" style={{ background: "#dce6f2" }}>
                                                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: "#3a72ad" }} />
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
                <div className="px-6 py-3" style={{ borderTop: "1px solid #dce6f2", background: "#f7f9fc" }}>
                    <span className="text-xs" style={{ color: "#5f7691" }}>ทั้งหมด {activities.length} กิจกรรม</span>
                </div>
            </div>
        </div>
    )
}
