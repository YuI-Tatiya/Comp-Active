"use client"

import { useState, useEffect } from "react"
import { Users, Calendar, ClipboardList, GraduationCap, Megaphone, TrendingUp, Activity as ActivityIcon } from "lucide-react"
import { adminAPI, activitiesAPI, Activity as ActivityType } from "@/lib/api"

interface DashboardStats {
    totalUsers: number
    totalActivities: number
    totalRegistrations: number
    pendingActivities: number
    usersByRole: { role: string; count: number }[]
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [recentActivities, setRecentActivities] = useState<ActivityType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        try {
            const [statsRes, activitiesRes] = await Promise.allSettled([
                adminAPI.getDashboardStats(),
                activitiesAPI.getAll(),
            ])
            if (statsRes.status === "fulfilled") setStats(statsRes.value as DashboardStats)
            if (activitiesRes.status === "fulfilled") {
                const acts = Array.isArray(activitiesRes.value) ? activitiesRes.value : []
                setRecentActivities((acts as ActivityType[]).slice(0, 6))
            }
        } finally {
            setLoading(false)
        }
    }

    const studentCount = stats?.usersByRole.find((r) => r.role === "student")?.count ?? 0
    const organizerCount = stats?.usersByRole.find((r) => r.role === "organizer")?.count ?? 0

    const topCards = [
        {
            label: "ผู้ใช้ทั้งหมด",
            value: stats?.totalUsers ?? 0,
            icon: Users,
            bg: "bg-indigo-50",
            text: "text-indigo-600",
            border: "border-indigo-100",
        },
        {
            label: "กิจกรรมทั้งหมด",
            value: stats?.totalActivities ?? 0,
            icon: Calendar,
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            border: "border-emerald-100",
        },
        {
            label: "การลงทะเบียน",
            value: stats?.totalRegistrations ?? 0,
            icon: ClipboardList,
            bg: "bg-violet-50",
            text: "text-violet-600",
            border: "border-violet-100",
        },
        {
            label: "นักศึกษา",
            value: studentCount,
            icon: GraduationCap,
            bg: "bg-sky-50",
            text: "text-sky-600",
            border: "border-sky-100",
        },
        {
            label: "ผู้จัดกิจกรรม",
            value: organizerCount,
            icon: Megaphone,
            bg: "bg-amber-50",
            text: "text-amber-600",
            border: "border-amber-100",
        },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-1">ภาพรวมระบบจัดการกิจกรรม CP Check</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {topCards.map((card) => (
                    <div key={card.label} className={`bg-white rounded-2xl border ${card.border} p-5 flex flex-col gap-3`}>
                        <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center`}>
                            <card.icon className={`w-5 h-5 ${card.text}`} />
                        </div>
                        <div>
                            <div className={`text-3xl font-bold ${card.text}`}>{card.value.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* User breakdown bar */}
            {stats && stats.totalUsers > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        สัดส่วนผู้ใช้
                    </h2>
                    <div className="flex rounded-full overflow-hidden h-4 mb-3">
                        {organizerCount > 0 && (
                            <div
                                className="bg-amber-400 transition-all"
                                style={{ width: `${(organizerCount / stats.totalUsers) * 100}%` }}
                            />
                        )}
                        {studentCount > 0 && (
                            <div
                                className="bg-sky-400 transition-all"
                                style={{ width: `${(studentCount / stats.totalUsers) * 100}%` }}
                            />
                        )}
                        <div className="bg-slate-200 flex-1" />
                    </div>
                    <div className="flex gap-6 text-sm text-slate-600">
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                            ผู้จัดกิจกรรม {organizerCount} คน
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
                            นักศึกษา {studentCount} คน
                        </span>
                    </div>
                </div>
            )}

            {/* Recent Activities */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-800">กิจกรรมล่าสุด</h2>
                        <p className="text-xs text-slate-500 mt-0.5">กิจกรรมที่เพิ่งสร้างในระบบ</p>
                    </div>
                    <a href="/admin/all-activities" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                        ดูทั้งหมด →
                    </a>
                </div>
                <div className="divide-y divide-slate-50">
                    {recentActivities.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">ยังไม่มีกิจกรรม</div>
                    ) : (
                        recentActivities.map((act) => (
                            <div key={act.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                    <ActivityIcon className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-800 text-sm truncate">{act.name}</div>
                                    <div className="text-xs text-slate-400">{act.category} · {act.date}</div>
                                </div>
                                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                                    เผยแพร่แล้ว
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
