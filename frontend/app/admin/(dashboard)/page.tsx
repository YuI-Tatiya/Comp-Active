"use client"

import { useState, useEffect } from "react"
import { Users, Calendar, ClipboardList, GraduationCap, Megaphone, Activity as ActivityIcon } from "lucide-react"
import { adminAPI, activitiesAPI, Activity as ActivityType } from "@/lib/api"
import { categoryLabel } from "@/lib/categories"

interface DashboardStats {
    totalUsers: number
    totalActivities: number
    totalRegistrations: number
    usersByRole: { role: string; count: number }[]
}

const buildCards = (stats: DashboardStats | null, studentCount: number, organizerCount: number) => [
    { label: "ผู้ใช้ทั้งหมด", value: stats?.totalUsers ?? 0, icon: Users, bar: "#2563eb", iconBg: "rgba(37,99,235,0.12)", iconColor: "#2563eb" },
    { label: "กิจกรรมทั้งหมด", value: stats?.totalActivities ?? 0, icon: Calendar, bar: "#3fa0ac", iconBg: "rgba(63,160,172,0.12)", iconColor: "#3fa0ac" },
    { label: "การลงทะเบียน", value: stats?.totalRegistrations ?? 0, icon: ClipboardList, bar: "#7c5ac2", iconBg: "rgba(124,90,194,0.12)", iconColor: "#7c5ac2" },
    { label: "นักศึกษา", value: studentCount, icon: GraduationCap, bar: "#0ea5e9", iconBg: "rgba(14,165,233,0.12)", iconColor: "#0ea5e9" },
    { label: "ผู้จัดกิจกรรม", value: organizerCount, icon: Megaphone, bar: "#e0a94a", iconBg: "rgba(224,169,74,0.14)", iconColor: "#c88e2a" },
]

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
    const cards = buildCards(stats, studentCount, organizerCount)

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
                <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Dashboard</h1>
                <p className="text-sm mt-1" style={{ color: "#64748b" }}>ภาพรวมระบบจัดการกิจกรรม Comp Active</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((card) => (
                    <div key={card.label} className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                        <div className="h-1.5" style={{ background: card.bar }} />
                        <div className="p-5">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: card.iconBg }}>
                                <card.icon className="w-5 h-5" style={{ color: card.iconColor }} />
                            </div>
                            <div className="text-2xl font-bold" style={{ color: "#0f172a" }}>{card.value.toLocaleString()}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User proportion */}
                <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e2e8f0" }}>
                    <h2 className="font-semibold text-sm mb-5" style={{ color: "#0f172a" }}>สัดส่วนผู้ใช้</h2>
                    {stats && stats.totalUsers > 0 ? (
                        <>
                            <div className="flex rounded-full overflow-hidden h-3 mb-4">
                                {organizerCount > 0 && (
                                    <div style={{ width: `${(organizerCount / stats.totalUsers) * 100}%`, background: "#e0a94a" }} />
                                )}
                                {studentCount > 0 && (
                                    <div style={{ width: `${(studentCount / stats.totalUsers) * 100}%`, background: "#0ea5e9" }} />
                                )}
                                <div className="flex-1" style={{ background: "#e2e8f0" }} />
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2" style={{ color: "#64748b" }}>
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#e0a94a" }} />
                                        ผู้จัดกิจกรรม
                                    </span>
                                    <span className="font-semibold" style={{ color: "#0f172a" }}>{organizerCount} คน</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2" style={{ color: "#64748b" }}>
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#0ea5e9" }} />
                                        นักศึกษา
                                    </span>
                                    <span className="font-semibold" style={{ color: "#0f172a" }}>{studentCount} คน</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6 text-sm" style={{ color: "#64748b" }}>ยังไม่มีข้อมูล</div>
                    )}
                </div>

                {/* Summary dark card */}
                <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)" }}>
                    <h2 className="font-semibold text-sm mb-5" style={{ color: "rgba(255,255,255,0.6)" }}>สรุปภาพรวม</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "ผู้ใช้ทั้งหมด", value: stats?.totalUsers ?? 0, color: "#3fa0ac" },
                            { label: "การลงทะเบียน", value: stats?.totalRegistrations ?? 0, color: "#94a3b8" },
                            { label: "กิจกรรมทั้งหมด", value: stats?.totalActivities ?? 0, color: "#a78bfa" },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.08)" }}>
                                <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}</div>
                                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <div>
                        <h2 className="font-semibold text-sm" style={{ color: "#0f172a" }}>กิจกรรมล่าสุด</h2>
                        <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>กิจกรรมที่เพิ่งสร้างในระบบ</p>
                    </div>
                    <a href="/admin/all-activities" className="text-xs font-medium hover:underline" style={{ color: "#2563eb" }}>
                        ดูทั้งหมด →
                    </a>
                </div>
                <div>
                    {recentActivities.length === 0 ? (
                        <div className="py-12 text-center text-sm" style={{ color: "#64748b" }}>ยังไม่มีกิจกรรม</div>
                    ) : (
                        recentActivities.map((act, i) => (
                            <div
                                key={act.id}
                                className="px-6 py-3.5 flex items-center gap-4 transition-colors cursor-default"
                                style={{ borderBottom: i < recentActivities.length - 1 ? "1px solid #f1f5f9" : "none" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.1)" }}>
                                    <ActivityIcon className="w-4 h-4" style={{ color: "#2563eb" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate" style={{ color: "#0f172a" }}>{act.name}</div>
                                    <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>{categoryLabel(act.category)} · {act.date}</div>
                                </div>
                                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(63,160,172,0.1)", color: "#3fa0ac" }}>
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
