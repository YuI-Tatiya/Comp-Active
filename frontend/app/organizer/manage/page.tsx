"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { FilterBar, type FilterSpec } from "@/components/ui/filter-bar"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { EVENT_CARD_GRID } from "@/components/ui/event-card-layout"
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { eventsAPI, activitiesAPI, isCancelledByOrganizer, EventSummary, Activity } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { RANGE_OPTIONS, withinRange } from "@/lib/events-filter"
import { Loader2, Search, Plus, CalendarPlus, Layers, Pencil, Eye, EyeOff, Trash2 } from "lucide-react"

/** สถานะการอนุมัติของกิจกรรมย่อย — ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma */
const APPROVAL_META: Record<string, { label: string; className: string }> = {
    approved: { label: "อนุมัติแล้ว", className: "bg-success/90" },
    pending_approval: { label: "รออนุมัติ", className: "bg-warning/90" },
    cancelled: { label: "ยกเลิกแล้ว", className: "bg-danger/90" },
    // ค่าเก่าก่อนแยก enum — backend ไม่เขียนค่านี้อีกแล้วแต่คงไว้เผื่อข้อมูลเก่า
    rejected: { label: "ยกเลิกแล้ว", className: "bg-danger/90" },
}

function eventHasRegistrations(ev: EventSummary): boolean {
    return ev.activities.some((a) => (a.registeredCount ?? 0) > 0)
}

/** เรียงตามวันจัดกิจกรรมย่อยแรกที่ใกล้ที่สุด — ใช้แสดงในการ์ดของ Event */
function firstActivity(ev: EventSummary): Activity | undefined {
    return [...ev.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

function eventRegisteredCount(ev: EventSummary): number {
    return ev.activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
}

/** วันจัดกิจกรรมย่อยที่เร็วที่สุด — ใช้เรียงลำดับ "ใกล้จัดงาน" และกรองช่วงเวลา */
function earliestDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
}

/** งานมีใบรับรองจิตอาสาถ้ากิจกรรมย่อยตัวใดตัวหนึ่งออกใบรับรอง */
function eventHasCert(ev: EventSummary): boolean {
    return ev.activities.some((a) => !!a.volunteerRole)
}

interface SortableFields {
    createdAt: number
    eventDate: number
    registered: number
    name: string
}

/** ตัวเปรียบเทียบเรียงลำดับกลาง — ใช้ร่วมกันทั้งการ์ด "งาน" และ "กิจกรรมเดี่ยว" ให้ตัวเลือกเรียงลำดับมีความหมายตรงกันทั้งสองกลุ่ม */
function compareBySort(sort: string, a: SortableFields, b: SortableFields): number {
    switch (sort) {
        case "oldest":
            return a.createdAt - b.createdAt
        case "soon":
            return a.eventDate - b.eventDate
        case "latest":
            return b.eventDate - a.eventDate
        case "registrations_desc":
            return b.registered - a.registered
        case "registrations_asc":
            return a.registered - b.registered
        case "name":
            return a.name.localeCompare(b.name, "th")
        default:
            // newest — วันที่สร้างล่าสุดก่อน
            return b.createdAt - a.createdAt
    }
}

const FILTERS: FilterSpec[] = [
    {
        key: "status",
        label: "สถานะ",
        options: [
            { value: "", label: "ทั้งหมด" },
            { value: "open", label: "เปิดรับสมัคร" },
            { value: "closed", label: "ปิดแล้ว" },
            { value: "cancelled", label: "ยกเลิก" },
        ],
    },
    {
        key: "visibility",
        label: "การเผยแพร่",
        options: [
            { value: "", label: "ทั้งหมด" },
            { value: "public", label: "เผยแพร่แล้ว" },
            { value: "private", label: "ไม่เผยแพร่" },
        ],
    },
    {
        key: "category",
        label: "หมวดหมู่",
        options: [{ value: "", label: "ทุกหมวดหมู่" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))],
    },
    {
        key: "cert",
        label: "ใบรับรอง",
        options: [
            { value: "", label: "ทั้งหมด" },
            { value: "yes", label: "มีใบรับรองจิตอาสา" },
            { value: "no", label: "ไม่มีใบรับรองจิตอาสา" },
        ],
    },
    {
        key: "range",
        label: "ช่วงเวลาจัดงาน",
        options: RANGE_OPTIONS,
    },
    {
        key: "sort",
        label: "เรียงลำดับ",
        neutralValue: "newest",
        options: [
            { value: "newest", label: "วันที่สร้าง: ล่าสุดก่อน" },
            { value: "oldest", label: "วันที่สร้าง: เก่าสุดก่อน" },
            { value: "soon", label: "วันจัดงาน: ใกล้ถึงก่อน" },
            { value: "latest", label: "วันจัดงาน: ไกลสุดก่อน" },
            { value: "registrations_desc", label: "ยอดลงทะเบียน: มากไปน้อย" },
            { value: "registrations_asc", label: "ยอดลงทะเบียน: น้อยไปมาก" },
            { value: "name", label: "ชื่องาน: ก → ฮ" },
        ],
    },
]

const INITIAL_VALUES: Record<string, string> = {
    status: "",
    visibility: "",
    category: "",
    cert: "",
    range: "",
    sort: "newest",
}

type DeleteTarget = { kind: "event"; id: number; name: string } | { kind: "activity"; id: number; name: string }

/** หน้าจัดการกิจกรรมของผู้จัด — แสดงเป็น "งาน" (Event) พร้อมกิจกรรมย่อย, และกิจกรรมเดี่ยวรุ่นเก่าแยกไว้ด้านล่าง */
export default function OrganizerManagePage() {
    const router = useRouter()
    const [events, setEvents] = useState<EventSummary[]>([])
    const [standaloneActivities, setStandaloneActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [values, setValues] = useState<Record<string, string>>(INITIAL_VALUES)
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const [eventData, activityData] = await Promise.all([eventsAPI.getMy(), activitiesAPI.getMy()])
            setEvents(Array.isArray(eventData) ? eventData : [])
            setStandaloneActivities(Array.isArray(activityData) ? activityData.filter((a) => !a.eventId) : [])
        } catch (err) {
            console.error(err)
            setEvents([])
            setStandaloneActivities([])
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

    /** สถานะรวมของงาน — ยกเลิกเมื่อกิจกรรมย่อยทุกตัวถูกยกเลิก, เปิดเมื่อมีอย่างน้อยหนึ่งตัวเปิดอยู่ */
    function eventStatus(ev: EventSummary): "open" | "closed" | "cancelled" {
        const list = ev.activities
        if (list.length > 0 && list.every((a) => isCancelledByOrganizer(a.approvalStatus))) return "cancelled"
        return list.some((a) => a.status === "open") ? "open" : "closed"
    }

    const filteredEvents = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        const list = events.filter((ev) => {
            const matchesSearch =
                !q || ev.name.toLowerCase().includes(q) || ev.activities.some((a) => a.name.toLowerCase().includes(q))
            const matchesStatus = !values.status || eventStatus(ev) === values.status
            const matchesVisibility =
                !values.visibility || (values.visibility === "public" ? ev.isPublic : !ev.isPublic)
            const matchesCategory = !values.category || ev.activities.some((a) => a.categories.includes(values.category))
            const matchesCert = !values.cert || (values.cert === "yes" ? eventHasCert(ev) : !eventHasCert(ev))
            const matchesRange = withinRange(earliestDate(ev), values.range)
            return matchesSearch && matchesStatus && matchesVisibility && matchesCategory && matchesCert && matchesRange
        })

        return [...list].sort((a, b) =>
            compareBySort(
                values.sort,
                { createdAt: new Date(a.createdAt).getTime(), eventDate: earliestDate(a), registered: eventRegisteredCount(a), name: a.name },
                { createdAt: new Date(b.createdAt).getTime(), eventDate: earliestDate(b), registered: eventRegisteredCount(b), name: b.name }
            )
        )
    }, [events, searchQuery, values])

    const filteredStandalone = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        const list = standaloneActivities.filter((a) => {
            const matchesSearch = !q || a.name.toLowerCase().includes(q)
            const status = isCancelledByOrganizer(a.approvalStatus) ? "cancelled" : a.status === "open" ? "open" : "closed"
            const matchesStatus = !values.status || status === values.status
            const matchesCategory = !values.category || a.categories.includes(values.category)
            const matchesCert = !values.cert || (values.cert === "yes" ? !!a.volunteerRole : !a.volunteerRole)
            const matchesRange = withinRange(new Date(a.date).getTime(), values.range)
            // กิจกรรมเดี่ยวไม่มีแนวคิดการเผยแพร่ระดับงาน จึงซ่อนเมื่อผู้ใช้กรองด้วยเงื่อนไขนี้
            const matchesVisibility = !values.visibility
            return matchesSearch && matchesStatus && matchesCategory && matchesVisibility && matchesCert && matchesRange
        })

        return [...list].sort((a, b) =>
            compareBySort(
                values.sort,
                { createdAt: new Date(a.createdAt ?? a.date).getTime(), eventDate: new Date(a.date).getTime(), registered: a.registeredCount ?? 0, name: a.name },
                { createdAt: new Date(b.createdAt ?? b.date).getTime(), eventDate: new Date(b.date).getTime(), registered: b.registeredCount ?? 0, name: b.name }
            )
        )
    }, [standaloneActivities, searchQuery, values])

    const totalCount = filteredEvents.length + filteredStandalone.length

    async function toggleEventPublic(ev: EventSummary) {
        try {
            await eventsAPI.setPublic(ev.id, !ev.isPublic)
            loadData()
        } catch (err: unknown) {
            alert((err as Error).message || "เปลี่ยนสถานะเผยแพร่ไม่สำเร็จ")
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (deleteTarget.kind === "event") {
                await eventsAPI.delete(deleteTarget.id)
            } else {
                await activitiesAPI.delete(deleteTarget.id)
            }
            setDeleteTarget(null)
            loadData()
        } catch (err: unknown) {
            alert((err as Error).message || "ลบไม่สำเร็จ")
        } finally {
            setDeleting(false)
        }
    }

    function eventMenuItems(ev: EventSummary): ActionMenuItem[] {
        return [
            {
                label: "แก้ไขกิจกรรม",
                icon: Pencil,
                onClick: () => router.push(`/organizer/manage/${ev.id}/edit`),
            },
            {
                label: "แก้สถานะกิจกรรม",
                icon: ev.isPublic ? EyeOff : Eye,
                onClick: () => toggleEventPublic(ev),
            },
            {
                label: "ลบกิจกรรม",
                icon: Trash2,
                tone: "danger",
                disabled: eventHasRegistrations(ev),
                onClick: () => setDeleteTarget({ kind: "event", id: ev.id, name: ev.name }),
            },
        ]
    }

    function activityMenuItems(a: Activity): ActionMenuItem[] {
        return [
            {
                label: "แก้ไขกิจกรรม",
                icon: Pencil,
                onClick: () => router.push(`/organizer/activities/${a.id}/edit`),
            },
            {
                label: "ลบกิจกรรม",
                icon: Trash2,
                tone: "danger",
                disabled: (a.registeredCount ?? 0) > 0,
                onClick: () => setDeleteTarget({ kind: "activity", id: a.id, name: a.name }),
            },
        ]
    }

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-fg mb-2">จัดการกิจกรรม</h1>
                        <p className="text-fg-muted">แก้ไข ดูรายละเอียด และติดตามยอดผู้ลงทะเบียนของงานที่คุณสร้าง</p>
                    </div>

                    <Button
                        asChild
                        size="lg"
                        className="w-full gap-2 rounded-xl font-bold shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 md:w-auto"
                    >
                        <Link href="/organizer/create">
                            <CalendarPlus className="size-5" aria-hidden="true" />
                            สร้างงานใหม่
                        </Link>
                    </Button>
                </div>

                <FilterBar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="ค้นหาชื่องานหรือกิจกรรม..."
                    filters={FILTERS}
                    values={values}
                    onFilterChange={setFilter}
                    onReset={resetFilters}
                    resultCount={loading ? undefined : totalCount}
                    resultUnit="รายการ"
                />

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมของคุณ...</p>
                    </div>
                ) : totalCount > 0 ? (
                    <div className="space-y-12">
                        {filteredEvents.length > 0 && (
                            <div className={EVENT_CARD_GRID}>
                                {filteredEvents.map((ev) => {
                                    const fa = firstActivity(ev)
                                    return (
                                        <EventCard
                                            key={`event-${ev.id}`}
                                            activity={{ name: ev.name, imageUrl: ev.imageUrl ?? fa?.imageUrl }}
                                            description={ev.description}
                                            badgeLeft={
                                                ev.activities.length > 1 ? (
                                                    <EventCardBadge variant="light">
                                                        <Layers className="mr-1 inline size-3" aria-hidden="true" />
                                                        {ev.activities.length} กิจกรรมย่อย
                                                    </EventCardBadge>
                                                ) : undefined
                                            }
                                            badgeRight={
                                                <EventCardBadge className={ev.isPublic ? "bg-success/90" : "bg-fg-subtle/90"}>
                                                    {ev.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}
                                                </EventCardBadge>
                                            }
                                            actions={
                                                <>
                                                    <Link href={`/organizer/events/${ev.id}`} className="flex-1">
                                                        <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                    </Link>
                                                    <ActionMenu items={eventMenuItems(ev)} label={`ตัวเลือกของ ${ev.name}`} />
                                                </>
                                            }
                                        />
                                    )
                                })}
                            </div>
                        )}

                        {filteredStandalone.length > 0 && (
                            <div>
                                <h2 className="mb-4 text-lg font-bold text-fg">กิจกรรมเดี่ยว (ไม่ผูกกับงาน)</h2>
                                <div className={EVENT_CARD_GRID}>
                                    {filteredStandalone.map((a) => {
                                        const ap = APPROVAL_META[a.approvalStatus] ?? APPROVAL_META.pending_approval
                                        return (
                                            <EventCard
                                                key={`activity-${a.id}`}
                                                activity={a}
                                                description={a.description}
                                                badgeRight={<EventCardBadge className={ap.className}>{ap.label}</EventCardBadge>}
                                                actions={
                                                    <>
                                                        <Link href={`/organizer/activities/${a.id}`} className="flex-1">
                                                            <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                        </Link>
                                                        <ActionMenu items={activityMenuItems(a)} label={`ตัวเลือกของ ${a.name}`} />
                                                    </>
                                                }
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm mt-8">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            {events.length === 0 && standaloneActivities.length === 0
                                ? <Plus className="w-10 h-10 text-fg-subtle" />
                                : <Search className="w-10 h-10 text-fg-subtle" />}
                        </div>
                        {events.length === 0 && standaloneActivities.length === 0 ? (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ยังไม่มีงาน</h3>
                                <p className="text-fg-muted">เริ่มต้นด้วยการสร้างงานแรกของคุณ</p>
                                <Button asChild className="mt-6 gap-2 rounded-full px-8 shadow-lg shadow-brand-500/30">
                                    <Link href="/organizer/create">
                                        <CalendarPlus className="size-4" aria-hidden="true" />
                                        สร้างงานใหม่
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ไม่พบกิจกรรมที่ค้นหา</h3>
                                <p className="text-fg-muted">ลองใช้คำค้นหาอื่น หรือล้างตัวกรองเพื่อดูกิจกรรมทั้งหมด</p>
                                <Button
                                    variant="outline"
                                    className="mt-6 rounded-full px-8"
                                    onClick={resetFilters}
                                >
                                    ล้างตัวกรอง
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </Container>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={`ลบ "${deleteTarget?.name ?? ""}"?`}
                description="การลบไม่สามารถย้อนกลับได้ ข้อมูลกิจกรรมนี้จะหายไปทั้งหมด"
                confirmLabel="ลบกิจกรรม"
                tone="danger"
                loading={deleting}
                onConfirm={confirmDelete}
            />
        </div>
    )
}
