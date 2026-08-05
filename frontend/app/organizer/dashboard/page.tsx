"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Users, Star, CheckCircle, Plus, LayoutDashboard, MapPin } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, Activity } from "@/lib/api"

interface Registration {
    status: string;
    attendance?: string;
    evaluation?: unknown;
}

// Local types removed, using Activity from @/lib/api

export default function OrganizerDashboard() {
    const [activities, setActivities] = useState<Activity<Registration>[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const data = await activitiesAPI.getMy()
            setActivities(Array.isArray(data) ? data as Activity<Registration>[] : [])
        } catch {
            setActivities([])
        } finally {
            setLoading(false)
        }
    }

    // Logic for actionable stats
    const pendingConfirmations = activities.reduce((sum, a) => {
        const pending = a.registrations?.filter((r: Registration) => r.status === 'pending').length || 0
        return sum + pending
    }, 0)

    const pendingEvaluations = activities.reduce((sum, a) => {
        const needEval = a.registrations?.filter((r: Registration) =>
            r.attendance === 'attended' && !r.evaluation
        ).length || 0
        return sum + needEval
    }, 0)

    const stats = [
        {
            title: "กิจกรรมทั้งหมด",
            value: activities.length.toString(),
            icon: <Calendar className="h-4 w-4 text-blue-600" />,
            color: "bg-blue-50",
            description: "กิจกรรมที่คุณสร้าง"
        },
        {
            title: "รอยืนยันผู้สมัคร",
            value: pendingConfirmations.toLocaleString(),
            icon: <Users className="h-4 w-4 text-orange-600" />,
            color: "bg-orange-50",
            description: "ต้องกดยืนยันตัวตน"
        },
        {
            title: "รอประเมินทักษะ",
            value: pendingEvaluations.toLocaleString(),
            icon: <Star className="h-4 w-4 text-purple-600" />,
            color: "bg-purple-50",
            description: "นักศึกษาที่รอคะแนน"
        },
        {
            title: "อนุมัติแล้ว",
            value: activities.filter(a => a.approvalStatus === "approved").length.toString(),
            icon: <CheckCircle className="h-4 w-4 text-green-600" />,
            color: "bg-green-50",
            description: "กิจกรรมที่ออนไลน์อยู่"
        }
    ]

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-heading">แดชบอร์ดผู้จัดงาน</h1>
                    <p className="text-gray-500 mt-1">ติดตามประสิทธิภาพกิจกรรมและจัดการความคืบหน้าของนักศึกษา</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="bg-white border-gray-200 h-11 px-6 rounded-xl hover:bg-gray-50" asChild>
                        <Link href="/organizer/manage"><LayoutDashboard className="w-4 h-4 mr-2" />จัดการทั้งหมด</Link>
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 h-11 px-6 rounded-xl shadow-lg shadow-blue-200" asChild>
                        <Link href="/organizer/create"><Plus className="w-4 h-4 mr-2" />สร้างกิจกรรมใหม่</Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className={`p-3 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-heading">{stat.value}</div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{stat.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Activities Table */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-gray-50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-900 font-heading">กิจกรรมล่าสุด</CardTitle>
                        <Link href="/organizer/manage" className="text-sm text-blue-600 font-bold hover:underline">ดูทั้งหมด →</Link>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {activities.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Calendar className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-xl font-bold text-gray-900 mb-2">ยังไม่มีกิจกรรม</p>
                            <p className="text-sm text-gray-500 mb-8">คุณพร้อมที่จะสร้างกิจกรรมแรกแล้วหรือยัง?</p>
                            <Link href="/organizer/create">
                                <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8 h-11 font-bold">สร้างกิจกรรมใหม่</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        <th className="px-6 py-4">กิจกรรม</th>
                                        <th className="px-6 py-4">วัน-เวลา</th>
                                        <th className="px-6 py-4">ผู้เข้าร่วม</th>
                                        <th className="px-6 py-4">สถานะ</th>
                                        <th className="px-6 py-4 text-right">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {activities.map((activity) => (
                                        <tr key={activity.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-gray-900">{activity.name}</div>
                                                <div className="text-[11px] text-gray-400 font-medium flex items-center mt-1">
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-gray-200 text-gray-400 font-bold mr-2 uppercase">
                                                        {activity.category}
                                                    </Badge>
                                                    <MapPin className="w-3 h-3 mr-1" />{activity.location}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-bold text-gray-700">{activity.date}</div>
                                                <div className="text-xs text-gray-400 mt-1">{activity.startTime} - {activity.endTime}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 min-w-[100px]">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-[11px] font-bold text-gray-900">{activity.registeredCount || 0}/{activity.capacity}</span>
                                                            <span className="text-[11px] font-bold text-blue-600">{Math.round((activity.registeredCount || 0) / activity.capacity * 100)}%</span>
                                                        </div>
                                                        <Progress value={(activity.registeredCount || 0) / activity.capacity * 100} className="h-1.5" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm">
                                                {activity.approvalStatus === "approved" ? (
                                                    <Badge className="text-[10px] font-bold px-2 rounded-lg border-none bg-green-50 text-green-600">ออนไลน์</Badge>
                                                ) : activity.approvalStatus === "rejected" ? (
                                                    <Badge className="text-[10px] font-bold px-2 rounded-lg border-none bg-gray-100 text-gray-500">ยกเลิกแล้ว</Badge>
                                                ) : (
                                                    <Badge className="text-[10px] font-bold px-2 rounded-lg border-none bg-orange-50 text-orange-600">รออนุมัติ</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <Button size="sm" variant="ghost" className="rounded-xl font-bold text-blue-600 hover:bg-blue-50" asChild>
                                                    <Link href={`/organizer/events/${activity.id}`}>จัดการรายคน →</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
