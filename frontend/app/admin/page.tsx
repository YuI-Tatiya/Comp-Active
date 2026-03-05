"use client"

import { useState, useEffect } from "react"
import { Users, Calendar, ClipboardList, Clock, TrendingUp, Activity as ActivityIcon } from "lucide-react"
import { adminAPI, activitiesAPI, Activity as ActivityType } from "@/lib/api"

interface DashboardStats {
    totalUsers: number;
    totalActivities: number;
    totalRegistrations: number;
    pendingActivities: number;
    usersByRole: { role: string; count: number }[];
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalActivities: 0,
        totalRegistrations: 0,
        pendingActivities: 0,
        usersByRole: [],
    })
    const [recentActivities, setRecentActivities] = useState<ActivityType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            // Try to fetch from API
            const [statsData, activitiesData] = await Promise.allSettled([
                adminAPI.getDashboardStats(),
                activitiesAPI.getAll(),
            ])

            if (statsData.status === "fulfilled") {
                setStats(statsData.value as DashboardStats)
            }
            if (activitiesData.status === "fulfilled") {
                const acts = Array.isArray(activitiesData.value) ? activitiesData.value : []
                setRecentActivities(acts.slice(0, 5) as ActivityType[])
            }
        } catch {
            // fallback to empty
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        {
            icon: Users,
            label: "ผู้ใช้ทั้งหมด",
            value: stats.totalUsers.toLocaleString(),
            lightColor: "bg-blue-50",
            textColor: "text-blue-600",
        },
        {
            icon: Calendar,
            label: "กิจกรรมทั้งหมด",
            value: stats.totalActivities.toLocaleString(),
            lightColor: "bg-green-50",
            textColor: "text-green-600",
        },
        {
            icon: ClipboardList,
            label: "การลงทะเบียน",
            value: stats.totalRegistrations.toLocaleString(),
            lightColor: "bg-purple-50",
            textColor: "text-purple-600",
        },
        {
            icon: Clock,
            label: "รออนุมัติ",
            value: stats.pendingActivities.toLocaleString(),
            lightColor: "bg-orange-50",
            textColor: "text-orange-600",
        },
    ]

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">ภาพรวมระบบจัดการกิจกรรม CP Check</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 ${stat.lightColor} rounded-xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                            </div>
                            <TrendingUp className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">กิจกรรมล่าสุด</h2>
                        <p className="text-sm text-gray-500">กิจกรรมที่เพิ่งสร้างในระบบ</p>
                    </div>
                    <a href="/admin/activities" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        ดูทั้งหมด →
                    </a>
                </div>
                <div className="divide-y divide-gray-50">
                    {recentActivities.length === 0 ? (
                        <div className="px-6 py-8 text-center text-gray-500">ยังไม่มีกิจกรรม</div>
                    ) : (
                        recentActivities.map((activity) => (
                            <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <ActivityIcon className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 text-sm">{activity.name}</div>
                                        <div className="text-xs text-gray-500">{activity.category} · {activity.date}</div>
                                    </div>
                                </div>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${activity.approvalStatus === "approved" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                                    }`}>
                                    {activity.approvalStatus === "approved" ? "อนุมัติแล้ว" : "รออนุมัติ"}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
