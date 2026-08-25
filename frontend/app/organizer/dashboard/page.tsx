"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatTile } from "@/components/ui/stat-tile"
import { Container } from "@/components/layout/container"
import { FilterBar, type FilterSpec } from "@/components/ui/filter-bar"
import { formatEventDate } from "@/components/ui/event-card"
import { activitiesAPI, isUnlimitedCapacity, isCancelledByOrganizer, Activity } from "@/lib/api"
import { CATEGORIES, categoryLabel } from "@/lib/categories"
import { RANGE_OPTIONS, withinRange } from "@/lib/events-filter"
import {
    Calendar,
    Users,
    Star,
    CheckCircle,
    LayoutDashboard,
    MapPin,
    Loader2,
    Search,
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

/** true ถ้ากิจกรรมยังมีผู้สมัครที่ผู้จัดต้องกดยืนยันตัวตน */
function hasPendingConfirmations(a: Activity<Registration>): boolean {
    return !!a.registrations?.some((r) => r.status === "pending")
}

/** true ถ้ามีคนเช็คอินเข้าร่วมแล้วแต่ยังไม่ได้คะแนน Soft Skills */
function hasPendingEvaluations(a: Activity<Registration>): boolean {
    return !!a.registrations?.some((r) => r.attendance === "attended" && !r.evaluation)
}

function isFull(a: Activity<Registration>): boolean {
    if (isUnlimitedCapacity(a.capacity)) return false
    const capacity = a.capacity || 0
    return capacity > 0 && (a.registeredCount || 0) >= capacity
}

/** สัดส่วนที่นั่งที่ถูกจองแล้ว (0-1) — ไม่จำกัดจำนวนถือเป็น 0 เพราะไม่มีเพดานให้เทียบ */
function fillRatio(a: Activity<Registration>): number {
    if (isUnlimitedCapacity(a.capacity)) return 0
    const capacity = a.capacity || 0
    return capacity > 0 ? (a.registeredCount || 0) / capacity : 0
}

/**
 * ตัวกรอง "ต้องดำเนินการ" คือหัวใจของหน้านี้ — ต่อยอดจากตัวเลข "รอยืนยันผู้สมัคร"/"รอประเมินทักษะ"
 * ด้านบน ให้กดหาได้ว่ากิจกรรมไหนบ้างที่ค้างอยู่ ไม่ใช่รู้แค่ยอดรวมแล้วต้องไล่หาเอง
 */
const ACTION_OPTIONS = [
    { value: "", label: "ทั้งหมด" },
    { value: "pending_confirm", label: "มีคนรอยืนยันสมัคร" },
    { value: "pending_eval", label: "มีคนรอประเมินทักษะ" },
    { value: "full", label: "ที่นั่งเต็มแล้ว" },
    { value: "empty", label: "ยังไม่มีคนสมัคร" },
]

const FILTERS: FilterSpec[] = [
    { key: "action", label: "ต้องดำเนินการ", options: ACTION_OPTIONS },
    {
        key: "status",
        label: "สถานะกิจกรรม",
        options: [
            { value: "", label: "ทั้งหมด" },
            { value: "open", label: "เปิดรับสมัคร" },
            { value: "closed", label: "ปิดรับสมัคร" },
            { value: "completed", label: "จบแล้ว" },
        ],
    },
    {
        key: "approval",
        label: "การอนุมัติ",
        options: [
            { value: "", label: "ทั้งหมด" },
            { value: "approved", label: "อนุมัติแล้ว" },
            { value: "pending_approval", label: "รออนุมัติ" },
            { value: "cancelled", label: "ยกเลิกแล้ว" },
        ],
    },
    {
        key: "category",
        label: "หมวดหมู่",
        options: [{ value: "", label: "ทุกหมวดหมู่" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))],
    },
    {
        key: "range",
        label: "ช่วงเวลา",
        // "ผ่านมาแล้ว" มีเฉพาะหน้านี้ — ผู้จัดต้องย้อนดูงานที่จบไปเพื่อตามเก็บงานค้าง
        // (ฝั่งนักศึกษาไม่ต้องการตัวเลือกนี้ จึงไม่ไปแก้ RANGE_OPTIONS ที่ใช้ร่วมกัน)
        options: [...RANGE_OPTIONS, { value: "past", label: "ผ่านมาแล้ว" }],
    },
    {
        key: "sort",
        label: "เรียงลำดับ",
        neutralValue: "soon",
        options: [
            { value: "soon", label: "วันจัดงาน: ใกล้ถึงก่อน" },
            { value: "latest", label: "วันจัดงาน: ไกลสุดก่อน" },
            { value: "registrations", label: "ยอดลงทะเบียน: มาก→น้อย" },
            { value: "fill", label: "% เต็ม: มาก→น้อย" },
            { value: "newest", label: "สร้างล่าสุด" },
        ],
    },
]

const INITIAL_VALUES: Record<string, string> = {
    action: "",
    status: "",
    approval: "",
    category: "",
    range: "",
    sort: "soon",
}

/** true ถ้าวันจัดกิจกรรมอยู่ในช่วงที่เลือก — รองรับ "past" เพิ่มจาก withinRange ที่ใช้ร่วมกัน */
function withinDashboardRange(dateMs: number, range: string): boolean {
    if (range === "past") {
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)
        return Number.isFinite(dateMs) && dateMs < startOfToday.getTime()
    }
    return withinRange(dateMs, range)
}

export default function OrganizerDashboard() {
    const [activities, setActivities] = useState<Activity<Registration>[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [values, setValues] = useState<Record<string, string>>(INITIAL_VALUES)

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

    function setFilter(key: string, value: string) {
        setValues((prev) => ({ ...prev, [key]: value }))
    }

    function resetFilters() {
        setSearchQuery("")
        setValues(INITIAL_VALUES)
    }

    const filteredActivities = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()

        const list = activities.filter((a) => {
            const matchesSearch =
                !q || a.name.toLowerCase().includes(q) || (a.location ?? "").toLowerCase().includes(q)
            const matchesStatus = !values.status || a.status === values.status
            // ค่าเก่า "rejected" ถือเป็น "ยกเลิกแล้ว" เช่นกัน จึงเทียบผ่าน helper ไม่ใช่เทียบสตริงตรงๆ
            const matchesApproval =
                !values.approval ||
                (values.approval === "cancelled"
                    ? isCancelledByOrganizer(a.approvalStatus)
                    : a.approvalStatus === values.approval)
            const matchesCategory = !values.category || a.categories.includes(values.category)
            const matchesRange = withinDashboardRange(new Date(a.date).getTime(), values.range)

            const matchesAction =
                !values.action ||
                (values.action === "pending_confirm" && hasPendingConfirmations(a)) ||
                (values.action === "pending_eval" && hasPendingEvaluations(a)) ||
                (values.action === "full" && isFull(a)) ||
                (values.action === "empty" && (a.registeredCount || 0) === 0)

            return matchesSearch && matchesStatus && matchesApproval && matchesCategory && matchesRange && matchesAction
        })

        return [...list].sort((a, b) => {
            const da = new Date(a.date).getTime()
            const db = new Date(b.date).getTime()
            if (values.sort === "latest") return db - da
            if (values.sort === "registrations") return (b.registeredCount || 0) - (a.registeredCount || 0)
            if (values.sort === "fill") return fillRatio(b) - fillRatio(a)
            if (values.sort === "newest") {
                return new Date(b.createdAt ?? b.date).getTime() - new Date(a.createdAt ?? a.date).getTime()
            }
            return da - db
        })
    }, [activities, searchQuery, values])

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
                        <Button
                            asChild
                            size="lg"
                            className="gap-2 rounded-xl font-bold shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40"
                        >
                            <Link href="/organizer/manage">
                                <LayoutDashboard className="size-5" aria-hidden="true" />
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

                {!loading && activities.length > 0 && (
                    <FilterBar
                        searchValue={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="ค้นหาชื่อกิจกรรมหรือสถานที่..."
                        filters={FILTERS}
                        values={values}
                        onFilterChange={setFilter}
                        onReset={resetFilters}
                        resultCount={filteredActivities.length}
                        resultUnit="กิจกรรม"
                    />
                )}

                {/* ตารางกิจกรรม */}
                <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-xs">
                    <div className="flex items-center justify-between border-b border-border px-6 py-4">
                        <h2 className="text-lg font-semibold text-fg">กิจกรรมของคุณ</h2>
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
                    ) : filteredActivities.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-surface">
                                <Search className="size-8 text-fg-subtle" aria-hidden="true" />
                            </div>
                            <p className="mb-2 text-xl font-bold text-fg">ไม่พบกิจกรรมที่ตรงกับตัวกรอง</p>
                            <p className="mb-6 text-sm text-fg-muted">ลองปรับตัวกรองหรือคำค้นหาใหม่</p>
                            <Button variant="outline" className="rounded-full px-8" onClick={resetFilters}>
                                ล้างตัวกรอง
                            </Button>
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
                                    {filteredActivities.map((activity) => {
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
                                                        {activity.categories.map((c) => (
                                                            <Badge key={c} variant="outline" className="mr-2 px-1.5 py-0 text-[9px] font-bold uppercase">
                                                                {categoryLabel(c)}
                                                            </Badge>
                                                        ))}
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
                                                        <Link href={`/organizer/activities/${activity.id}/dashboard`}>
                                                            ดู dashboard →
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
