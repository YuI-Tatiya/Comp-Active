"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatTile } from "@/components/ui/stat-tile"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { activitiesAPI, isUnlimitedCapacity, Activity } from "@/lib/api"
import {
    Calendar,
    Users,
    Star,
    CheckCircle,
    LayoutDashboard,
    MapPin,
    Loader2,
} from "lucide-react"

interface Registration {
    status: string
    attendance?: string
    evaluation?: unknown
}

/** สถานะการอนุมัติ → ป้าย — ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma */
const APPROVAL_BADGE: Record<string, { label: string; variant: "success" | "warning" | "neutral" }> = {
    approved: { label: "ออนไลน์", variant: "success" },
    rejected: { label: "ยกเลิกแล้ว", variant: "neutral" },
    pending_approval: { label: "รออนุมัติ", variant: "warning" },
}

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
            setActivities(Array.isArray(data) ? (data as Activity<Registration>[]) : [])
        } catch (err) {
            console.error(err)
            setActivities([])
        } finally {
            setLoading(false)
        }
    }

    // ตัวเลขที่ต้องลงมือทำ — ไม่มีที่หน้าอื่น
    const pendingConfirmations = activities.reduce((sum, a) => {
        const pending = a.registrations?.filter((r: Registration) => r.status === "pending").length || 0
        return sum + pending
    }, 0)

    const pendingEvaluations = activities.reduce((sum, a) => {
        const needEval =
            a.registrations?.filter(
                (r: Registration) => r.attendance === "attended" && !r.evaluation
            ).length || 0
        return sum + needEval
    }, 0)

    const stats = [
        {
            label: "กิจกรรมทั้งหมด",
            value: activities.length,
            icon: Calendar,
            caption: "กิจกรรมที่คุณสร้าง",
        },
        {
            label: "รอยืนยันผู้สมัคร",
            value: pendingConfirmations.toLocaleString("th-TH"),
            icon: Users,
            caption: "ต้องกดยืนยันตัวตน",
        },
        {
            label: "รอประเมินทักษะ",
            value: pendingEvaluations.toLocaleString("th-TH"),
            icon: Star,
            caption: "นักศึกษาที่รอคะแนน",
        },
        {
            label: "อนุมัติแล้ว",
            value: activities.filter((a) => a.approvalStatus === "approved").length,
            icon: CheckCircle,
            caption: "กิจกรรมที่ออนไลน์อยู่",
        },
    ]

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-surface">
            <Container className="space-y-8 py-12">
                {/* หัวข้อ + ปุ่มลัด */}
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-fg">แดชบอร์ดผู้จัดงาน</h1>
                        <p className="mt-1 text-fg-muted">
                            ติดตามประสิทธิภาพกิจกรรมและจัดการความคืบหน้าของนักศึกษา
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button variant="outline" size="lg" className="rounded-xl" asChild>
                            <Link href="/organizer/manage">
                                <LayoutDashboard />
                                จัดการทั้งหมด
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* กล่องสถิติ — ใช้ StatTile ตัวเดียวกับหน้า /organizer */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <StatTile
                            key={stat.label}
                            label={stat.label}
                            value={loading ? "—" : stat.value}
                            caption={stat.caption}
                            icon={stat.icon}
                        />
                    ))}
                </div>

                {/* ตารางกิจกรรมล่าสุด */}
                <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-xs">
                    <div className="flex items-center justify-between border-b border-border px-6 py-4">
                        <h2 className="text-lg font-semibold text-fg">กิจกรรมล่าสุด</h2>
                        <Link
                            href="/organizer/manage"
                            className="text-sm font-medium text-brand-600 hover:underline"
                        >
                            ดูทั้งหมด →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 className="mb-4 size-10 animate-spin text-brand-600" />
                            <p className="text-fg-muted">กำลังดึงข้อมูลกิจกรรมของคุณ...</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-surface">
                                <Calendar className="size-8 text-fg-subtle" aria-hidden="true" />
                            </div>
                            <p className="mb-2 text-xl font-bold text-fg">ยังไม่มีกิจกรรม</p>
                            <p className="mb-8 text-sm text-fg-muted">
                                คุณพร้อมที่จะสร้างกิจกรรมแรกแล้วหรือยัง?
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-surface text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                                        <th className="px-6 py-4">กิจกรรม</th>
                                        <th className="px-6 py-4">วัน-เวลา</th>
                                        <th className="px-6 py-4">ผู้เข้าร่วม</th>
                                        <th className="px-6 py-4">สถานะ</th>
                                        <th className="px-6 py-4 text-right">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {activities.map((activity) => {
                                        const unlimited = isUnlimitedCapacity(activity.capacity)
                                        // กัน capacity = 0 ไม่ให้กลายเป็น NaN% หรือ Infinity%
                                        const capacity = activity.capacity || 0
                                        const registered = activity.registeredCount || 0
                                        const percent =
                                            !unlimited && capacity > 0 ? Math.round((registered / capacity) * 100) : 0
                                        const badge =
                                            APPROVAL_BADGE[activity.approvalStatus] ??
                                            APPROVAL_BADGE.pending_approval

                                        return (
                                            <tr key={activity.id} className="transition-colors hover:bg-surface">
                                                <td className="px-6 py-5">
                                                    <div className="font-semibold text-fg">{activity.name}</div>
                                                    <div className="mt-1 flex items-center text-[11px] font-medium text-fg-subtle">
                                                        {activity.category && (
                                                            <Badge variant="outline" className="mr-2 px-1.5 py-0 text-[9px] font-bold uppercase">
                                                                {activity.category}
                                                            </Badge>
                                                        )}
                                                        <MapPin className="mr-1 size-3 shrink-0" aria-hidden="true" />
                                                        {activity.location}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm font-semibold text-fg">
                                                        {formatEventDate(activity.date)}
                                                    </div>
                                                    <div className="mt-1 text-xs text-fg-subtle">
                                                        {activity.startTime} - {activity.endTime}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="min-w-[100px]">
                                                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold tabular-nums">
                                                            <span className="text-fg">
                                                                {unlimited ? `${registered} (ไม่จำกัด)` : `${registered}/${capacity}`}
                                                            </span>
                                                            {!unlimited && <span className="text-brand-600">{percent}%</span>}
                                                        </div>
                                                        {!unlimited && <Progress value={percent} className="h-1.5" />}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm">
                                                    <Badge variant={badge.variant}>{badge.label}</Badge>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <Button size="sm" variant="ghost" className="rounded-xl font-semibold text-brand-600" asChild>
                                                        <Link href={`/organizer/events/${activity.id}`}>
                                                            จัดการรายคน →
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Container>
        </div>
    )
}
