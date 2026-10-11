"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Container } from "@/components/layout/container"
import type { FilterSpec } from "@/components/ui/filter-bar"
import {
    AMBER_BUTTON,
    FilterPanel,
    OrganizerStatCards,
    StatusTabs,
    type OrganizerStat,
} from "@/components/denim/denim-ui"
import {
    ActivityTable,
    ActivityTableCard,
    ActivityTableRow,
    ActivityTableSkeleton,
    DashboardHero,
    type ActivityRowData,
} from "@/components/organizer/dashboard-sections"
import { activitiesAPI, isUnlimitedCapacity, isCancelledByOrganizer, Activity } from "@/lib/api"
import { formatActivitySchedule } from "@/lib/activity-view"
import { CATEGORIES } from "@/lib/categories"
import { RANGE_OPTIONS, withinRange } from "@/lib/events-filter"
import { CalendarDays, CircleCheck, Plus, Search, Star, UserCheck } from "lucide-react"

interface Registration {
    status: string
    attendance?: string
    evaluation?: unknown
}

/**
 * สถานะการอนุมัติ → ป้ายในคอลัมน์ "สถานะ" (ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma)
 * ยกเลิก (cancelled และค่าเก่า rejected) ตัดสินด้วย isCancelledByOrganizer — แผนที่เดิมไม่มีคีย์ cancelled
 * กิจกรรมที่ผู้จัดยกเลิกเองจึงตกไปใช้ค่าตั้งต้น "รออนุมัติ" ผิดความหมาย
 */
const APPROVAL_CHIP = {
    approved: { label: "ออนไลน์", className: "bg-emerald-50 text-emerald-700", dotClassName: "bg-emerald-600" },
    pending: { label: "รออนุมัติ", className: "bg-amber/15 text-amber-ink", dotClassName: "bg-amber" },
    cancelled: { label: "ยกเลิกแล้ว", className: "bg-red-50 text-red-700", dotClassName: "bg-red-500" },
}

function approvalChip(approvalStatus: string) {
    if (isCancelledByOrganizer(approvalStatus)) return APPROVAL_CHIP.cancelled
    return approvalStatus === "approved" ? APPROVAL_CHIP.approved : APPROVAL_CHIP.pending
}

/** สถานะรับสมัคร (Activity.status) — บรรทัดเล็กใต้ป้ายอนุมัติ */
const STATUS_TEXT: Record<string, string> = {
    open: "เปิดรับสมัคร",
    closed: "ปิดรับสมัคร",
    completed: "จบแล้ว",
}

const BKK_DAY = new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "Asia/Bangkok" })
const BKK_MONTH = new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "Asia/Bangkok" })

/**
 * แปลงกิจกรรมเป็นข้อมูลแถวตาราง — วัน-เวลาใช้ formatActivitySchedule (ตัวเดียวกับหน้านักศึกษา) ซึ่งอ่าน
 * startAt/endAt ตามเวลาไทย แทน startTime/endTime ที่เก็บไว้: กิจกรรมจาก wizard สร้างสตริงนั้นด้วยเขตเวลาของ
 * เซิร์ฟเวอร์ (Docker = UTC) งาน 09:30 จึงถูกเก็บเป็น "02:30" — ตารางเดิมโชว์เวลาที่ผิด 7 ชม. ตรงๆ
 */
function toRow(a: Activity<Registration>): ActivityRowData {
    const schedule = formatActivitySchedule(a)
    const start = new Date(a.startAt ?? a.date)
    const validStart = !Number.isNaN(start.getTime())
    return {
        id: a.id,
        name: a.name,
        categories: a.categories,
        location: a.location,
        day: validStart ? BKK_DAY.format(start) : "–",
        month: validStart ? BKK_MONTH.format(start) : "",
        // ตารางแคบ — ตัดวันในสัปดาห์ออก ("ศ. 4 ต.ค. 2569" → "4 ต.ค. 2569") ช่วงหลายวันไม่มีวันในสัปดาห์อยู่แล้ว
        dateLabel: schedule.multiDay ? schedule.dateLabel : schedule.dateLabel.replace(/^\S+\s/, ""),
        timeLabel: schedule.timeLabel,
        ended: a.status === "completed",
        registered: a.registeredCount || 0,
        capacity: isUnlimitedCapacity(a.capacity) ? null : a.capacity || 0,
        approval: approvalChip(a.approvalStatus),
        statusText: STATUS_TEXT[a.status] ?? a.status,
        pendingConfirm: a.registrations?.filter((r) => r.status === "pending").length ?? 0,
        pendingEval: a.registrations?.filter((r) => r.attendance === "attended" && !r.evaluation).length ?? 0,
        href: `/organizer/activities/${a.id}/dashboard`,
    }
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

// แท็บสถานะทรงแคปซูล — หน้าตาเดียวกับ /organizer และ /organizer/manage (ดู statusCounts ด้านล่าง)
const STATUS_TABS: { value: string; label: string }[] = [
    { value: "", label: "ทั้งหมด" },
    { value: "open", label: "เปิดรับสมัคร" },
    { value: "closed", label: "ปิดรับสมัคร" },
    { value: "completed", label: "จบแล้ว" },
]

const FILTERS: FilterSpec[] = [
    { key: "action", label: "ต้องดำเนินการ", options: ACTION_OPTIONS },
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

    /** จำนวนรายการต่อแท็บสถานะ — นับจาก activities ดิบ (ไม่ผ่านตัวกรองอื่น/คำค้นหา) ให้ตัวเลขนิ่งเหมือน /organizer, /organizer/manage */
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { "": activities.length, open: 0, closed: 0, completed: 0 }
        for (const a of activities) counts[a.status] = (counts[a.status] ?? 0) + 1
        return counts
    }, [activities])

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

    const activeFilterCount =
        FILTERS.filter((f) => (values[f.key] ?? f.neutralValue ?? "") !== (f.neutralValue ?? "")).length +
        (searchQuery.trim() ? 1 : 0)

    const stats: OrganizerStat[] = [
        {
            code: "ALL_EVENTS",
            label: "กิจกรรมทั้งหมด",
            caption: "กิจกรรมที่คุณสร้าง",
            value: loading ? "—" : activities.length,
            icon: CalendarDays,
        },
        {
            code: "VERIFY_QUEUE",
            label: "รอยืนยันผู้สมัคร",
            caption: "ต้องกดยืนยันตัวตน",
            value: loading ? "—" : pendingConfirmations.toLocaleString("th-TH"),
            icon: UserCheck,
            attention: !loading && pendingConfirmations > 0,
        },
        {
            code: "SKILL_REVIEW",
            label: "รอประเมินทักษะ",
            caption: "นักศึกษาที่รอคะแนน",
            value: loading ? "—" : pendingEvaluations.toLocaleString("th-TH"),
            icon: Star,
            attention: !loading && pendingEvaluations > 0,
        },
        {
            code: "APPROVED",
            label: "อนุมัติแล้ว",
            caption: "กิจกรรมที่ออนไลน์อยู่",
            value: loading ? "—" : activities.filter((a) => a.approvalStatus === "approved").length,
            icon: CircleCheck,
            highlight: true,
        },
    ]

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-denim-paper font-plex text-denim-deep">
            <DashboardHero />
            <OrganizerStatCards stats={stats} />

            <Container className="flex flex-col gap-6 pb-[88px] pt-10">
                {!loading && activities.length > 0 && (
                    <>
                        <StatusTabs
                            tabs={STATUS_TABS}
                            value={values.status}
                            counts={statusCounts}
                            onChange={(value) => setFilter("status", value)}
                        />
                        <FilterPanel
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder="ค้นหาชื่อกิจกรรมหรือสถานที่..."
                            filters={FILTERS}
                            values={values}
                            onFilterChange={setFilter}
                        />
                    </>
                )}

                <ActivityTableCard
                    count={loading ? undefined : filteredActivities.length}
                    activeFilters={activeFilterCount}
                    onReset={resetFilters}
                >
                    {loading ? (
                        <ActivityTable>
                            <ActivityTableSkeleton />
                        </ActivityTable>
                    ) : activities.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 border-t border-denim-line px-6 py-16 text-center">
                            <span className="grid size-14 place-items-center rounded-full bg-denim-chip" aria-hidden="true">
                                <CalendarDays className="size-7 text-denim" />
                            </span>
                            <p className="font-display text-xl font-bold text-denim-deep">ยังไม่มีกิจกรรม</p>
                            <p className="text-sm text-denim-muted">คุณพร้อมที่จะสร้างกิจกรรมแรกแล้วหรือยัง?</p>
                            <Link href="/organizer/create" className={`${AMBER_BUTTON} mt-3`}>
                                <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                                สร้างกิจกรรมใหม่
                            </Link>
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 border-t border-denim-line px-6 py-16 text-center">
                            <span className="grid size-14 place-items-center rounded-full bg-denim-chip" aria-hidden="true">
                                <Search className="size-7 text-denim" />
                            </span>
                            <p className="font-display text-xl font-bold text-denim-deep">ไม่พบกิจกรรมที่ตรงกับตัวกรอง</p>
                            <p className="text-sm text-denim-muted">ลองปรับตัวกรองหรือคำค้นหาใหม่</p>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-2 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-denim px-5 text-sm font-semibold text-denim transition-colors hover:bg-denim hover:text-white"
                            >
                                ล้างตัวกรอง
                            </button>
                        </div>
                    ) : (
                        <ActivityTable>
                            {filteredActivities.map((activity) => (
                                <ActivityTableRow key={activity.id} row={toRow(activity)} />
                            ))}
                        </ActivityTable>
                    )}
                </ActivityTableCard>
            </Container>
        </div>
    )
}
