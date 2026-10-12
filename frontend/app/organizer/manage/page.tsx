"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Container } from "@/components/layout/container"
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Toast } from "@/components/ui/toast"
import {
    ACTIVITY_GRID,
    ActivityCardSkeleton,
    CreateActivityTile,
    StatusTabs,
    referenceCode,
} from "@/components/denim/denim-ui"
import {
    CARD_MENU_TRIGGER,
    ManageCard,
    ManageHero,
    ManageSectionHeading,
    type ManageCardStat,
} from "@/components/organizer/manage-sections"
import { eventsAPI, activitiesAPI, EventSummary, Activity, type EventDraftResponse } from "@/lib/api"
import { closedReason, type RegistrationWindow } from "@/lib/activity-view"
import { formatCompactDateSpan } from "@/lib/date-span"
import { eventImagePath } from "@/lib/events-filter"
import {
    Search,
    Pencil,
    Eye,
    EyeOff,
    ToggleLeft,
    ToggleRight,
    PauseCircle,
    Share2,
    Trash2,
    FileEdit,
    ClipboardList,
    AlertTriangle,
} from "lucide-react"

/** ชื่อที่ใช้แสดงฉบับร่าง — payload เป็น JSON ล้วนๆ จาก lib/event-draft.ts ไม่มี type ร่วมกับหน้านี้ (คนละ bundle) */
function draftDisplayName(payload: unknown): string {
    if (payload && typeof payload === "object") {
        const p = payload as { event?: { name?: string }; activities?: { name?: string }[] }
        const name = p.event?.name?.trim() || p.activities?.find((a) => a?.name?.trim())?.name?.trim()
        if (name) return name
    }
    return "ฉบับร่างยังไม่ตั้งชื่อ"
}

/** เวลาแบบอ่านง่าย ใช้โชว์ตอน "บันทึกฉบับร่างล่าสุดเมื่อ..." — เหมือนกับที่ใช้ใน create/page.tsx */
function formatDraftTime(iso: string): string {
    try {
        return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(iso))
    } catch {
        return iso
    }
}

/**
 * สถานะรวมที่ผู้จัดเห็นในหน้านี้ — ใช้ closedReason (ตัวเดียวกับที่หน้าลงทะเบียนนักศึกษาใช้ตัดสิน
 * ว่ากิจกรรมปิดรับสมัครหรือยัง) แทนการเช็ค a.status === "open" เฉยๆ เพราะของเดิมเอา "จบแล้ว"
 * (completed) กับ "ปิดรับสมัคร" ไปรวมเป็นก้อนเดียวกันหมด ผู้จัดแยกไม่ออกว่ากิจกรรมไหนจบจริงแล้ว
 */
type StatusBucket = "open" | "closed" | "completed" | "cancelled"

function statusBucket(w: RegistrationWindow, now: Date): StatusBucket {
    const reason = closedReason(w, now)
    if (reason === "cancelled") return "cancelled"
    if (reason === "completed") return "completed"
    if (reason === null) return "open"
    return "closed" // "closed" | "deadline_passed" — ปิดรับสมัครแล้วแต่ยังไม่ถูกทำเครื่องหมายว่าจบ
}

/**
 * สถานะรวมของงาน — เปิดถ้ามีกิจกรรมย่อยอย่างน้อยหนึ่งตัวยังเปิดอยู่, ยกเลิกถ้าทุกตัวถูกยกเลิก,
 * จบแล้วถ้า (ที่ไม่ถูกยกเลิก) ทุกตัวถูกทำเครื่องหมายว่าจบ, นอกนั้นถือว่าปิดรับสมัคร
 */
function eventStatus(ev: EventSummary, now: Date): StatusBucket {
    const buckets = ev.activities.map((a) =>
        statusBucket(
            {
                status: a.status,
                approvalStatus: a.approvalStatus,
                registrationOpenAt: ev.registrationOpenAt,
                registrationCloseAt: ev.registrationCloseAt,
            },
            now
        )
    )
    if (buckets.length === 0) return "closed"
    if (buckets.every((b) => b === "cancelled")) return "cancelled"
    if (buckets.some((b) => b === "open")) return "open"
    const relevant = buckets.filter((b) => b !== "cancelled")
    if (relevant.length > 0 && relevant.every((b) => b === "completed")) return "completed"
    return "closed"
}

/** กิจกรรมเดี่ยวไม่มี registrationCloseAt ของตัวเอง (ฟิลด์นี้อยู่ระดับ Event เท่านั้น) */
function standaloneStatus(a: Activity, now: Date): StatusBucket {
    return statusBucket({ status: a.status, approvalStatus: a.approvalStatus, registrationCloseAt: null }, now)
}

/** ปุ่มรองในกล่องข้อความ (ลองใหม่ / กลับไปแท็บเริ่มต้น) */
const OUTLINE_BUTTON =
    "mt-2 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-denim px-5 text-sm font-semibold text-denim transition-colors hover:bg-denim hover:text-white"

/** สถานะรวมบนการ์ด (ป้ายเหนือชื่อ) */
const STATUS_CHIP: Record<StatusBucket, { label: string; className: string }> = {
    open: { label: "กำลังเปิดรับสมัคร", className: "border border-amber/50 bg-amber/15 text-amber-ink" },
    closed: { label: "ปิดรับสมัคร", className: "bg-denim-chip text-denim" },
    completed: { label: "กิจกรรมจบแล้ว", className: "border border-denim-line bg-denim-paper text-denim-muted" },
    cancelled: { label: "ยกเลิกแล้ว", className: "border border-red-200 bg-red-50 text-red-700" },
}

const DRAFT_CHIP = { label: "ฉบับร่าง", className: "border border-dashed border-denim-dash bg-white text-denim-muted" }

/** ป้ายขาวบนปกของงาน — สถานะเผยแพร่ */
const PUBLISHED_BADGE = { label: "เผยแพร่แล้ว", dotClassName: "bg-emerald-600" }
const UNPUBLISHED_BADGE = { label: "ไม่เผยแพร่", dotClassName: "bg-denim-muted" }

/**
 * ป้ายขาวบนปกของกิจกรรมเดี่ยว — ไม่มี isPublic แบบงาน จึงบอกสถานะการอนุมัติแทน
 * (ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma)
 */
const APPROVAL_BADGE: Record<string, { label: string; dotClassName: string }> = {
    approved: { label: "อนุมัติแล้ว", dotClassName: "bg-emerald-600" },
    pending_approval: { label: "รออนุมัติ", dotClassName: "bg-amber" },
    cancelled: { label: "ยกเลิกแล้ว", dotClassName: "bg-red-500" },
    // ค่าเก่าก่อนแยก enum — backend ไม่เขียนค่านี้อีกแล้วแต่คงไว้เผื่อข้อมูลเก่า
    rejected: { label: "ยกเลิกแล้ว", dotClassName: "bg-red-500" },
}

function eventHasRegistrations(ev: EventSummary): boolean {
    return ev.activities.some((a) => (a.registeredCount ?? 0) > 0)
}

function eventRegisteredCount(ev: EventSummary): number {
    return ev.activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
}

/** หมวดหมู่ทั้งหมดของกิจกรรมย่อยในงาน — ใช้ทำแท็กบนปก */
function eventCategories(ev: EventSummary): string[] {
    return Array.from(new Set(ev.activities.flatMap((a) => a.categories)))
}

/**
 * ช่อง REGISTERED — กิจกรรมเดียวโชว์ "X/Y คน" (หรือ "X คน · ไม่จำกัด") ของกิจกรรมนั้นตรงๆ
 * งานที่มีหลายกิจกรรมย่อยรวมยอดลงทะเบียนทั้งหมด แต่ไม่รวมที่นั่ง (จำนวนที่นั่งแต่ละกิจกรรมย่อยไม่เท่ากัน
 * รวมกันแล้วไม่สื่อความหมาย) ไว้ให้กดเข้าไปดูรายละเอียดรายกิจกรรมย่อยแทน
 */
function registeredStat(activities: Activity[]): ManageCardStat {
    if (activities.length === 1) {
        const a = activities[0]
        return a.capacity != null
            ? { label: "REGISTERED", value: `${a.registeredCount ?? 0}/${a.capacity} คน` }
            : { label: "REGISTERED", value: `${a.registeredCount ?? 0} คน`, note: "ไม่จำกัด" }
    }
    const total = activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
    return {
        label: "REGISTERED",
        value: `${total} คน`,
        note: activities.length > 1 ? `รวม ${activities.length} กิจกรรม` : undefined,
    }
}

/** วันจัดกิจกรรมย่อยที่เร็วที่สุด — ใช้เรียงลำดับ "ใกล้จัดงาน" และกรองช่วงเวลา */
function earliestDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
}

/** วันจัดกิจกรรมย่อยวันสุดท้าย — คู่กับ earliestDate ใช้แสดงช่วงวันที่ในช่อง DATE */
function latestDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.max(...times) : Number.NEGATIVE_INFINITY
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

/**
 * แท็บสถานะทรงแคปซูล — หน้าตาเดียวกับเมนู pill บน AppHeader (rounded-full bg-surface p-1 + แท็บที่เลือกเป็น bg-bg)
 * เป็นตัวกรองเดียวที่เหลืออยู่ในหน้านี้ (เดิมมี FilterBar แยกต่างหาก — ผู้ใช้ให้เอาออก เหลือไว้แค่แท็บสถานะ)
 * แท็บ "จบแล้ว" ผู้ใช้ยืนยันให้รวมกิจกรรมที่ยกเลิก (cancelled) เข้ากับกิจกรรมที่ดำเนินจบแล้ว (completed)
 * เป็นก้อนเดียว ไม่แยกเป็น "สิ้นสุดไปแล้ว"/"จบไปแล้ว" สองแท็บเหมือนที่เคยลองทำ — ดู matchesStatusFilter
 */
const STATUS_TABS: { value: string; label: string }[] = [
    { value: "", label: "ทั้งหมด" },
    { value: "open", label: "กำลังเปิดรับสมัคร" },
    { value: "closed", label: "ปิดรับสมัคร" },
    { value: "completed", label: "กิจกรรมจบแล้ว" },
    { value: "draft", label: "ฉบับร่าง" },
]

/** แท็บ "จบแล้ว" ครอบคลุมทั้ง completed และ cancelled — ดูหมายเหตุที่ STATUS_TABS */
function matchesStatusFilter(bucket: StatusBucket, filterValue: string): boolean {
    if (!filterValue) return true
    if (filterValue === "completed") return bucket === "completed" || bucket === "cancelled"
    return bucket === filterValue
}

// แท็บเริ่มต้นคือ "ทั้งหมด" — เดิมเริ่มที่ "open" ตรงๆ (ตอนนั้นไม่มีแท็บ "ทั้งหมด") ทำให้ผู้จัดที่ไม่มี
// กิจกรรมเปิดรับสมัครอยู่ตอนนี้เปิดหน้ามาแล้วเจอ "ไม่พบกิจกรรมในแท็บนี้" ทั้งที่มีกิจกรรมอยู่จริงในแท็บอื่น
const DEFAULT_STATUS = ""

type DeleteTarget =
    | { kind: "event"; id: number; name: string }
    | { kind: "activity"; id: number; name: string }
    | { kind: "draft"; name: string }

/**
 * ยืนยันก่อนเปิด/ปิดรับสมัคร — คนละอันกับ DeleteTarget/ConfirmDialog ตัวแรก (นั่นไว้เฉพาะลบ)
 * เก็บเป็น title/description/confirmLabel/run ตรงๆ แทนการทำ discriminated union ตามชนิดแอ็กชัน
 * เพราะมีหลายรูปแบบ (ปิดชั่วคราว/ปิดถาวร/เปิด × งาน/กิจกรรมเดี่ยว) ข้อความแต่ละอันต่างกันพอสมควร
 */
interface StatusConfirm {
    title: string
    description: string
    confirmLabel: string
    run: () => Promise<void>
}

/** หน้าจัดการกิจกรรมของผู้จัด — แสดงเป็น "งาน" (Event) พร้อมกิจกรรมย่อย, และกิจกรรมเดี่ยวรุ่นเก่าแยกไว้ด้านล่าง */
export default function OrganizerManagePage() {
    const router = useRouter()
    const [events, setEvents] = useState<EventSummary[]>([])
    const [standaloneActivities, setStandaloneActivities] = useState<Activity[]>([])
    const [draft, setDraft] = useState<EventDraftResponse | null>(null)
    const [loading, setLoading] = useState(true)
    // โหลดไม่สำเร็จ ≠ ไม่มีงาน — เดิม catch แล้วตั้งรายการว่าง ผู้ใช้จึงเห็น "ยังไม่มีงาน" ทั้งที่งานยังอยู่
    const [loadError, setLoadError] = useState<string | null>(null)
    const [status, setStatus] = useState(DEFAULT_STATUS)
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [statusConfirm, setStatusConfirm] = useState<StatusConfirm | null>(null)
    const [statusActing, setStatusActing] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            setLoadError(null)
            // ฉบับร่างดึงแยก catch ของตัวเอง — ดึงไม่ได้ก็แค่ไม่โชว์การ์ดฉบับร่าง ไม่ควรทำให้รายการงานจริงหายไปด้วย
            const [eventData, activityData, draftData] = await Promise.all([
                eventsAPI.getMy(),
                activitiesAPI.getMy(),
                eventsAPI.getDraft().catch(() => null),
            ])
            setEvents(Array.isArray(eventData) ? eventData : [])
            setStandaloneActivities(Array.isArray(activityData) ? activityData.filter((a) => !a.eventId) : [])
            setDraft(draftData)
        } catch (err) {
            console.error(err)
            setLoadError(err instanceof Error ? err.message : "โหลดรายการกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    function resetToDefaultTab() {
        setStatus(DEFAULT_STATUS)
    }

    // ถือสถานะ (bucket) ไปด้วยเลย การ์ดใช้ต่อทำป้ายสถานะ/ลายปก ไม่ต้องคำนวณซ้ำตอนวาด
    const filteredEvents = useMemo(() => {
        const now = new Date()
        const list = events
            .map((ev) => ({ ev, bucket: eventStatus(ev, now) }))
            .filter(({ bucket }) => matchesStatusFilter(bucket, status))

        return list.sort((a, b) =>
            compareBySort(
                "newest",
                { createdAt: new Date(a.ev.createdAt).getTime(), eventDate: earliestDate(a.ev), registered: eventRegisteredCount(a.ev), name: a.ev.name },
                { createdAt: new Date(b.ev.createdAt).getTime(), eventDate: earliestDate(b.ev), registered: eventRegisteredCount(b.ev), name: b.ev.name }
            )
        )
    }, [events, status])

    const filteredStandalone = useMemo(() => {
        const now = new Date()
        const list = standaloneActivities
            .map((a) => ({ a, bucket: standaloneStatus(a, now) }))
            .filter(({ bucket }) => matchesStatusFilter(bucket, status))

        return list.sort((x, y) =>
            compareBySort(
                "newest",
                { createdAt: new Date(x.a.createdAt ?? x.a.date).getTime(), eventDate: new Date(x.a.date).getTime(), registered: x.a.registeredCount ?? 0, name: x.a.name },
                { createdAt: new Date(y.a.createdAt ?? y.a.date).getTime(), eventDate: new Date(y.a.date).getTime(), registered: y.a.registeredCount ?? 0, name: y.a.name }
            )
        )
    }, [standaloneActivities, status])

    // ฉบับร่างไม่มีสถานะแบบงานจริง — นับเป็นของแท็บ "ฉบับร่าง" เท่านั้น
    const draftMatches = useMemo(() => {
        if (!draft) return false
        return !status || status === "draft"
    }, [draft, status])

    const totalCount = filteredEvents.length + filteredStandalone.length + (draftMatches ? 1 : 0)

    /**
     * จำนวนรายการต่อแท็บสถานะ — นับจาก events/standaloneActivities/draft ดิบ (ไม่ผ่านตัวกรองค้นหา/หมวดหมู่/ฯลฯ)
     * ให้ตัวเลขบนแท็บนิ่ง ไม่กระพริบเวลาผู้ใช้พิมพ์ค้นหาหรือเปลี่ยนตัวกรองอื่น — สะท้อนแค่ "สถานะนี้มีกี่รายการ" ล้วนๆ
     */
    const statusCounts = useMemo(() => {
        const now = new Date()
        const counts: Record<string, number> = { "": 0, draft: draft ? 1 : 0, open: 0, closed: 0, completed: 0 }
        for (const ev of events) {
            const bucket = eventStatus(ev, now)
            counts[bucket === "cancelled" ? "completed" : bucket]++
        }
        for (const a of standaloneActivities) {
            const bucket = standaloneStatus(a, now)
            counts[bucket === "cancelled" ? "completed" : bucket]++
        }
        counts[""] = events.length + standaloneActivities.length + (draft ? 1 : 0)
        return counts
    }, [events, standaloneActivities, draft])

    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    function showToast(message: string, description?: string) {
        setToast({ open: true, message, description })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 3200)
    }

    /** มีกิจกรรมย่อยอย่างน้อย 1 ตัวเปิดรับสมัครอยู่ไหม — ใช้ตัดสินใจเมนูย่อยแก้สถานะเท่านั้น
     * (ไม่ใช้ eventStatus/statusBucket เพราะอันนั้นปนเรื่องกิจกรรมจบแล้ว/ยกเลิกไปด้วย ซึ่งไม่เกี่ยวกับปุ่มนี้) */
    function eventHasOpenActivity(ev: EventSummary): boolean {
        return ev.activities.some((a) => a.status === "open")
    }

    async function runStatusConfirm() {
        if (!statusConfirm) return
        setStatusActing(true)
        try {
            await statusConfirm.run()
            setStatusConfirm(null)
        } catch (err: unknown) {
            alert((err as Error).message || "ทำรายการไม่สำเร็จ")
        } finally {
            setStatusActing(false)
        }
    }

    async function closeEventTemporarily(ev: EventSummary) {
        await eventsAPI.setActivitiesStatus(ev.id, "closed")
        showToast("ปิดรับสมัครชั่วคราวแล้ว", `"${ev.name}" จะไม่แสดงปุ่มลงทะเบียนให้นักศึกษาจนกว่าจะเปิดอีกครั้ง`)
        loadData()
    }

    async function unpublishEventPermanently(ev: EventSummary) {
        await eventsAPI.setPublic(ev.id, false)
        showToast("ปิดการใช้งานถาวรแล้ว", `"${ev.name}" จะไม่แสดงให้นักศึกษาเห็นอีก จนกว่าจะเผยแพร่ใหม่ด้วยตัวเอง`)
        loadData()
    }

    /** "เปิด" แก้ทั้งสถานะรับสมัครและการเผยแพร่พร้อมกันเสมอ — ไม่ว่าเดิมถูกปิดมาด้วยวิธีไหน กลับมาเปิดปกติทั้งหมด */
    async function reopenEvent(ev: EventSummary) {
        await Promise.all([
            eventsAPI.setActivitiesStatus(ev.id, "open"),
            ev.isPublic ? Promise.resolve() : eventsAPI.setPublic(ev.id, true),
        ])
        showToast("เปิดกิจกรรมแล้ว", `"${ev.name}" กลับมาเปิดรับสมัครตามปกติ`)
        loadData()
    }

    async function closeActivityTemporarily(a: Activity) {
        await activitiesAPI.setStatus(a.id, "closed")
        showToast("ปิดรับสมัครชั่วคราวแล้ว", `"${a.name}" จะไม่แสดงปุ่มลงทะเบียนให้นักศึกษาจนกว่าจะเปิดอีกครั้ง`)
        loadData()
    }

    async function reopenActivity(a: Activity) {
        await activitiesAPI.setStatus(a.id, "open")
        showToast("เปิดกิจกรรมแล้ว", `"${a.name}" กลับมาเปิดรับสมัครตามปกติ`)
        loadData()
    }

    function shareEvent(ev: EventSummary) {
        navigator.clipboard.writeText(`${window.location.origin}/events/${ev.id}`)
        showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")
    }

    function shareActivity(a: Activity) {
        navigator.clipboard.writeText(`${window.location.origin}/events/activities/${a.id}`)
        showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (deleteTarget.kind === "event") {
                await eventsAPI.delete(deleteTarget.id)
            } else if (deleteTarget.kind === "activity") {
                await activitiesAPI.delete(deleteTarget.id)
            } else {
                await eventsAPI.clearDraft()
            }
            setDeleteTarget(null)
            loadData()
        } catch (err: unknown) {
            alert((err as Error).message || "ลบไม่สำเร็จ")
        } finally {
            setDeleting(false)
        }
    }

    /**
     * เมนูย่อยของ "แก้สถานะกิจกรรม" — ปิดอยู่ (ไม่เผยแพร่ หรือไม่มีกิจกรรมย่อยไหนเปิดเลย) แสดงแค่ "เปิด"
     * เปิดอยู่แสดง 2 ทาง (ปิดชั่วคราว/ปิดถาวร) ทุกตัวเลือกต้องผ่านยืนยันก่อนเสมอ (ดู statusConfirm)
     */
    function eventStatusSubmenu(ev: EventSummary): ActionMenuItem[] {
        const closed = !ev.isPublic || !eventHasOpenActivity(ev)
        if (closed) {
            return [
                {
                    label: "เปิด",
                    icon: ToggleRight,
                    onClick: () =>
                        setStatusConfirm({
                            title: `เปิด "${ev.name}" อีกครั้ง?`,
                            description: "กิจกรรมนี้จะกลับมาเปิดรับสมัครและแสดงให้นักศึกษาเห็นตามปกติทันที",
                            confirmLabel: "เปิดกิจกรรม",
                            run: () => reopenEvent(ev),
                        }),
                },
            ]
        }
        return [
            {
                label: "ปิดรับสมัครกิจกรรมชั่วคราว",
                icon: PauseCircle,
                onClick: () =>
                    setStatusConfirm({
                        title: `ปิดรับสมัคร "${ev.name}" ชั่วคราว?`,
                        description: "นักศึกษาจะลงทะเบียนไม่ได้ชั่วคราว แต่ยังเห็นกิจกรรมนี้อยู่ตามปกติ — กลับมาเปิดได้ทุกเมื่อ",
                        confirmLabel: "ปิดรับสมัครชั่วคราว",
                        run: () => closeEventTemporarily(ev),
                    }),
            },
            {
                label: "ปิดการใช้งานกิจกรรมถาวร",
                icon: EyeOff,
                tone: "danger",
                onClick: () =>
                    setStatusConfirm({
                        title: `ปิดการใช้งาน "${ev.name}" ถาวร?`,
                        description: "กิจกรรมนี้จะไม่แสดงให้นักศึกษาเห็นอีกเลย จนกว่าจะเผยแพร่ใหม่ด้วยตัวเอง",
                        confirmLabel: "ปิดการใช้งานถาวร",
                        run: () => unpublishEventPermanently(ev),
                    }),
            },
        ]
    }

    /** กิจกรรมเดี่ยวไม่มีสถานะเผยแพร่แยกต่างหากแบบงาน (ไม่มี isPublic) จึงมีแค่ตัวเลือกปิดชั่วคราว/เปิด ไม่มี "ปิดถาวร" */
    function activityStatusSubmenu(a: Activity): ActionMenuItem[] {
        const closed = a.status !== "open"
        if (closed) {
            return [
                {
                    label: "เปิด",
                    icon: ToggleRight,
                    onClick: () =>
                        setStatusConfirm({
                            title: `เปิด "${a.name}" อีกครั้ง?`,
                            description: "กิจกรรมนี้จะกลับมาเปิดรับสมัครตามปกติทันที",
                            confirmLabel: "เปิดกิจกรรม",
                            run: () => reopenActivity(a),
                        }),
                },
            ]
        }
        return [
            {
                label: "ปิดรับสมัครกิจกรรมชั่วคราว",
                icon: PauseCircle,
                onClick: () =>
                    setStatusConfirm({
                        title: `ปิดรับสมัคร "${a.name}" ชั่วคราว?`,
                        description: "นักศึกษาจะลงทะเบียนไม่ได้ชั่วคราว แต่ยังเห็นกิจกรรมนี้อยู่ตามปกติ — กลับมาเปิดได้ทุกเมื่อ",
                        confirmLabel: "ปิดรับสมัครชั่วคราว",
                        run: () => closeActivityTemporarily(a),
                    }),
            },
        ]
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
                icon: ToggleLeft,
                submenu: eventStatusSubmenu(ev),
            },
            {
                label: "ดูรายละเอียดกิจกรรมเพิ่มเติม",
                icon: ClipboardList,
                onClick: () => router.push(`/organizer/events/${ev.id}`),
            },
            {
                label: "ดูตัวอย่าง",
                icon: Eye,
                onClick: () => window.open(`/events/${ev.id}`, "_blank", "noopener,noreferrer"),
            },
            {
                label: "แชร์กิจกรรม",
                icon: Share2,
                onClick: () => shareEvent(ev),
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
                label: "แก้สถานะกิจกรรม",
                icon: ToggleLeft,
                submenu: activityStatusSubmenu(a),
            },
            {
                label: "ดูรายละเอียดกิจกรรมเพิ่มเติม",
                icon: ClipboardList,
                onClick: () => router.push(`/organizer/activities/${a.id}`),
            },
            {
                label: "ดูตัวอย่าง",
                icon: Eye,
                onClick: () => window.open(`/events/activities/${a.id}`, "_blank", "noopener,noreferrer"),
            },
            {
                label: "แชร์กิจกรรม",
                icon: Share2,
                onClick: () => shareActivity(a),
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

    const totalRegistered = useMemo(
        () =>
            events.reduce((sum, ev) => sum + eventRegisteredCount(ev), 0) +
            standaloneActivities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0),
        [events, standaloneActivities]
    )

    // ชิปสรุปบนแถบหัวหน้า — นับเฉพาะงาน/กิจกรรมจริง ไม่นับฉบับร่าง (ยังไม่ใช่งาน) ต่างจากแท็บ "ทั้งหมด" ที่รวมฉบับร่างด้วย
    const unknown = loading || !!loadError
    const heroStats = [
        { label: "events", value: unknown ? "—" : events.length + standaloneActivities.length },
        { label: "open", value: unknown ? "—" : (statusCounts.open ?? 0) },
        { label: "registered", value: unknown ? "—" : totalRegistered.toLocaleString("th-TH") },
    ]

    const activeTabLabel = STATUS_TABS.find((tab) => tab.value === status)?.label ?? "ทั้งหมด"
    const hasAnyItem = events.length > 0 || standaloneActivities.length > 0 || !!draft
    // ช่องสร้างใหม่ต่อท้ายกริดสุดท้ายของงานจริง — ไม่ต่อท้ายฉบับร่างอย่างเดียว (แท็บฉบับร่างไว้กลับไปทำต่อ ไม่ใช่เริ่มงานใหม่)
    // ยังไม่มีอะไรเลยสักอย่าง = กริดงานที่มีแค่ช่องนี้ช่องเดียว ทำหน้าที่เป็น empty state ในตัว
    const showEventsGrid = filteredEvents.length > 0 || !hasAnyItem
    const createTileInStandalone = filteredStandalone.length > 0

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-denim-paper font-plex text-denim-deep">
            <ManageHero stats={heroStats} />

            {/* แท็บสถานะลอยทับขอบล่างของแถบหัวหน้า (ตามดีไซน์) — ManageHero เผื่อ padding ล่างไว้ให้แล้ว
                กดสลับได้ทันทีโดยไม่ต้องเปิด dropdown */}
            <Container className="relative z-[1] -mt-[54px]">
                <StatusTabs
                    tabs={STATUS_TABS}
                    value={status}
                    counts={statusCounts}
                    onChange={setStatus}
                    className="shadow-[0_14px_34px_-18px_rgb(18_34_61_/_0.55)]"
                />
            </Container>

            <Container className="flex flex-col gap-6 pb-[88px] pt-6">
                <p className="font-code text-[13px] text-denim-muted" aria-live="polite">
                    {loading ? (
                        "→ กำลังดึงข้อมูลกิจกรรมของคุณ..."
                    ) : loadError ? (
                        "→ โหลดไม่สำเร็จ"
                    ) : (
                        <>
                            → แสดง <strong className="font-semibold text-denim-deep">{totalCount}</strong> รายการ ·{" "}
                            {activeTabLabel}
                        </>
                    )}
                </p>

                {loading ? (
                    <div className={ACTIVITY_GRID}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <ActivityCardSkeleton key={i} />
                        ))}
                    </div>
                ) : loadError ? (
                    <div
                        role="alert"
                        className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-denim-line bg-white px-6 py-16 text-center"
                    >
                        <span className="grid size-12 place-items-center rounded-full bg-red-50 text-red-600" aria-hidden="true">
                            <AlertTriangle className="size-6" />
                        </span>
                        <h3 className="font-display text-lg font-bold text-denim-deep">โหลดรายการกิจกรรมไม่สำเร็จ</h3>
                        <p className="max-w-md text-sm text-denim-muted">{loadError}</p>
                        <button type="button" onClick={loadData} className={OUTLINE_BUTTON}>
                            ลองใหม่
                        </button>
                    </div>
                ) : totalCount > 0 || !hasAnyItem ? (
                    <div className="flex flex-col gap-10">
                        {draftMatches && draft && (
                            <section aria-label="ฉบับร่าง" className="flex flex-col gap-4">
                                <ManageSectionHeading>ฉบับร่าง</ManageSectionHeading>
                                <div className={ACTIVITY_GRID}>
                                    <ManageCard
                                        tone="draft"
                                        categories={[]}
                                        code="DRAFT"
                                        coverIcon={FileEdit}
                                        badge={{ label: "ฉบับร่าง", dotClassName: "bg-denim-dash" }}
                                        chip={DRAFT_CHIP}
                                        name={draftDisplayName(draft.payload)}
                                        description="งานที่ยังสร้างไม่เสร็จ — กลับไปทำต่อจากจุดเดิมได้ทุกเมื่อ"
                                        stats={[{ label: "LAST SAVED", value: formatDraftTime(draft.updatedAt) }]}
                                        action={{ href: "/organizer/create", label: "ดำเนินการต่อ", icon: Pencil }}
                                        menu={
                                            <ActionMenu
                                                items={[
                                                    {
                                                        label: "ลบฉบับร่าง",
                                                        icon: Trash2,
                                                        tone: "danger",
                                                        onClick: () =>
                                                            setDeleteTarget({ kind: "draft", name: draftDisplayName(draft.payload) }),
                                                    },
                                                ]}
                                                label="ตัวเลือกของฉบับร่าง"
                                                className={CARD_MENU_TRIGGER}
                                            />
                                        }
                                    />
                                </div>
                            </section>
                        )}

                        {showEventsGrid && (
                            <div className={ACTIVITY_GRID}>
                                {filteredEvents.map(({ ev, bucket }) => (
                                    <ManageCard
                                        key={`event-${ev.id}`}
                                        tone={bucket === "open" ? "open" : "closed"}
                                        categories={eventCategories(ev)}
                                        imageUrl={eventImagePath(ev)}
                                        code={referenceCode("EVT", ev.id)}
                                        dateMs={earliestDate(ev)}
                                        badge={ev.isPublic ? PUBLISHED_BADGE : UNPUBLISHED_BADGE}
                                        chip={STATUS_CHIP[bucket]}
                                        name={ev.name}
                                        description={ev.description}
                                        stats={[
                                            { label: "DATE", value: formatCompactDateSpan(earliestDate(ev), latestDate(ev)) },
                                            registeredStat(ev.activities),
                                        ]}
                                        action={{ href: `/organizer/events/${ev.id}`, label: "รายละเอียดเพิ่มเติม", icon: ClipboardList }}
                                        menu={
                                            <ActionMenu
                                                items={eventMenuItems(ev)}
                                                label={`ตัวเลือกของ ${ev.name}`}
                                                className={CARD_MENU_TRIGGER}
                                            />
                                        }
                                    />
                                ))}
                                {!createTileInStandalone && <CreateActivityTile />}
                            </div>
                        )}

                        {filteredStandalone.length > 0 && (
                            <section aria-label="กิจกรรมเดี่ยว" className="flex flex-col gap-4">
                                <ManageSectionHeading>กิจกรรมเดี่ยว (ไม่ผูกกับงาน)</ManageSectionHeading>
                                <div className={ACTIVITY_GRID}>
                                    {filteredStandalone.map(({ a, bucket }) => (
                                        <ManageCard
                                            key={`activity-${a.id}`}
                                            tone={bucket === "open" ? "open" : "closed"}
                                            categories={a.categories}
                                            imageUrl={a.imageUrl}
                                            code={referenceCode("ACT", a.id)}
                                            dateMs={new Date(a.date).getTime()}
                                            badge={APPROVAL_BADGE[a.approvalStatus] ?? APPROVAL_BADGE.pending_approval}
                                            chip={STATUS_CHIP[bucket]}
                                            name={a.name}
                                            description={a.description}
                                            stats={[
                                                { label: "DATE", value: formatCompactDateSpan(a.date, a.date) },
                                                registeredStat([a]),
                                            ]}
                                            action={{
                                                href: `/organizer/activities/${a.id}`,
                                                label: "รายละเอียดเพิ่มเติม",
                                                icon: ClipboardList,
                                            }}
                                            menu={
                                                <ActionMenu
                                                    items={activityMenuItems(a)}
                                                    label={`ตัวเลือกของ ${a.name}`}
                                                    className={CARD_MENU_TRIGGER}
                                                />
                                            }
                                        />
                                    ))}
                                    <CreateActivityTile />
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-denim-dash bg-white px-6 py-16 text-center">
                        <span className="grid size-12 place-items-center rounded-full bg-denim-chip">
                            <Search className="size-6 text-denim" aria-hidden="true" />
                        </span>
                        <h3 className="font-display text-lg font-bold text-denim-deep">ไม่พบกิจกรรมในแท็บนี้</h3>
                        <p className="max-w-sm text-sm text-denim-muted">ลองดูแท็บสถานะอื่น หรือกลับไปที่แท็บเริ่มต้น</p>
                        <button type="button" onClick={resetToDefaultTab} className={OUTLINE_BUTTON}>
                            กลับไปแท็บเริ่มต้น
                        </button>
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

            <ConfirmDialog
                open={!!statusConfirm}
                onOpenChange={(open) => !open && setStatusConfirm(null)}
                title={statusConfirm?.title ?? ""}
                description={statusConfirm?.description}
                confirmLabel={statusConfirm?.confirmLabel}
                loading={statusActing}
                onConfirm={runStatusConfirm}
            />

            <Toast open={toast.open} message={toast.message} description={toast.description} />
        </div>
    )
}
