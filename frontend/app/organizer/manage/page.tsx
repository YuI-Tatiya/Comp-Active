"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { EventCard, EventCardBadge, formatEventDate } from "@/components/ui/event-card"
import { EVENT_CARD_GRID } from "@/components/ui/event-card-layout"
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Toast } from "@/components/ui/toast"
import { eventsAPI, activitiesAPI, EventSummary, Activity, type EventDraftResponse } from "@/lib/api"
import { uploadPathFromPreview } from "@/lib/api-base"
import { closedReason, type RegistrationWindow } from "@/lib/activity-view"
import { cn } from "@/lib/utils"
import {
    Loader2,
    Search,
    Plus,
    CalendarPlus,
    Layers,
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
    CalendarDays,
    User,
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

/** EventCard ต่อ API_BASE_URL ให้เองจาก path สัมพัทธ์ แต่ imagePreview ในฉบับร่างอาจเก็บเป็น URL เต็ม (ดู handleSaveDraft) ต้องแปลงกลับเป็น path ก่อนส่งต่อ */
function draftImageUrl(payload: unknown): string | undefined {
    if (payload && typeof payload === "object") {
        return uploadPathFromPreview((payload as { event?: { imagePreview?: string | null } }).event?.imagePreview)
    }
    return undefined
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

/** สถานะการอนุมัติของกิจกรรมย่อย — ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma */
const APPROVAL_META: Record<string, { label: string; className: string; dotClassName: string }> = {
    approved: { label: "อนุมัติแล้ว", className: "bg-success/75", dotClassName: "bg-success" },
    pending_approval: { label: "รออนุมัติ", className: "bg-warning/75", dotClassName: "bg-warning" },
    cancelled: { label: "ยกเลิกแล้ว", className: "bg-danger/75", dotClassName: "bg-danger" },
    // ค่าเก่าก่อนแยก enum — backend ไม่เขียนค่านี้อีกแล้วแต่คงไว้เผื่อข้อมูลเก่า
    rejected: { label: "ยกเลิกแล้ว", className: "bg-danger/75", dotClassName: "bg-danger" },
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

/** วันที่จัดงาน (แถวแรกใต้ชื่อการ์ด) — event ใช้กิจกรรมย่อยที่ใกล้ที่สุด */
function eventDateLabel(ev: EventSummary): string {
    const fa = firstActivity(ev)
    return fa ? formatEventDate(fa.date) : "ยังไม่ระบุวันที่"
}

/**
 * ยอดลงทะเบียน (แถวสอง) — งานที่มีกิจกรรมย่อยเดียวโชว์ "X/Y คน" ของกิจกรรมนั้นตรงๆ
 * งานที่มีหลายกิจกรรมย่อยรวมยอดลงทะเบียนทั้งหมด แต่ไม่รวมที่นั่ง (จำนวนที่นั่งแต่ละกิจกรรมย่อยไม่เท่ากัน
 * รวมกันแล้วไม่สื่อความหมาย) ไว้ให้กดเข้าไปดูรายละเอียดราย กิจกรรมย่อยแทน
 */
function eventSeatsLabel(ev: EventSummary): string {
    if (ev.activities.length === 1) return activitySeatsLabel(ev.activities[0])
    return `ลงทะเบียนรวม ${eventRegisteredCount(ev)} คน`
}

function activitySeatsLabel(a: Activity): string {
    return a.capacity != null ? `${a.registeredCount ?? 0}/${a.capacity} คน` : `${a.registeredCount ?? 0} คน (ไม่จำกัด)`
}

/**
 * แถววันที่ + ยอดลงทะเบียน — 2 แถวแยกแบบข้อความเปล่า ไม่มีกล่องพื้นหลัง (ตามภาพอ้างอิงที่ผู้ใช้ส่งมา)
 * มีเส้นคั่นบางๆ ใต้แถวสุดท้ายก่อนถึงปุ่ม ที่ EVENT_CARD_HEIGHT 420px พอมีที่ให้ 2 แถวนี้แล้ว (เดิม 380px ไม่พอ)
 */
function CardInfoRow({ dateLabel, seatsLabel }: { dateLabel: string; seatsLabel: string }) {
    return (
        <div className="space-y-1.5 border-b border-border pb-2.5">
            <div className="flex items-center gap-2 text-xs text-fg-muted">
                <CalendarDays className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                <span className="truncate">{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-fg-muted">
                <User className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                <span className="truncate">{seatsLabel}</span>
            </div>
        </div>
    )
}

/** วันจัดกิจกรรมย่อยที่เร็วที่สุด — ใช้เรียงลำดับ "ใกล้จัดงาน" และกรองช่วงเวลา */
function earliestDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
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

// ไม่มีแท็บ "ทั้งหมด" แล้ว (ดู STATUS_TABS) ค่าเริ่มต้นจึงต้องเป็นแท็บแรกจริงๆ ไม่ใช่ "" เฉยๆ
// ไม่งั้นตอนโหลดหน้าครั้งแรก/กดกลับไปแท็บเริ่มต้น จะไม่มีแท็บไหนถูกไฮไลต์ว่าเลือกอยู่เลย
const DEFAULT_STATUS = "open"

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

    const filteredEvents = useMemo(() => {
        const now = new Date()
        const list = events.filter((ev) => matchesStatusFilter(eventStatus(ev, now), status))

        return [...list].sort((a, b) =>
            compareBySort(
                "newest",
                { createdAt: new Date(a.createdAt).getTime(), eventDate: earliestDate(a), registered: eventRegisteredCount(a), name: a.name },
                { createdAt: new Date(b.createdAt).getTime(), eventDate: earliestDate(b), registered: eventRegisteredCount(b), name: b.name }
            )
        )
    }, [events, status])

    const filteredStandalone = useMemo(() => {
        const now = new Date()
        const list = standaloneActivities.filter((a) => {
            // กิจกรรมเดี่ยวไม่มี registrationCloseAt ของตัวเอง (ฟิลด์นี้อยู่ระดับ Event เท่านั้น)
            const bucket = statusBucket({ status: a.status, approvalStatus: a.approvalStatus, registrationCloseAt: null }, now)
            return matchesStatusFilter(bucket, status)
        })

        return [...list].sort((a, b) =>
            compareBySort(
                "newest",
                { createdAt: new Date(a.createdAt ?? a.date).getTime(), eventDate: new Date(a.date).getTime(), registered: a.registeredCount ?? 0, name: a.name },
                { createdAt: new Date(b.createdAt ?? b.date).getTime(), eventDate: new Date(b.date).getTime(), registered: b.registeredCount ?? 0, name: b.name }
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
            const bucket = statusBucket({ status: a.status, approvalStatus: a.approvalStatus, registrationCloseAt: null }, now)
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
                        className="w-full gap-2 rounded-lg font-bold shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 md:w-auto"
                    >
                        <Link href="/organizer/create">
                            <CalendarPlus className="size-5" aria-hidden="true" />
                            สร้างงานใหม่
                        </Link>
                    </Button>
                </div>

                {/* แท็บสถานะทรงแคปซูล — กดสลับได้ทันทีโดยไม่ต้องเปิด dropdown เหมือนเมนู pill บน AppHeader */}
                <div className="mb-6 overflow-x-auto">
                    <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
                        {STATUS_TABS.map((tab) => {
                            const active = status === tab.value
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setStatus(tab.value)}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors",
                                        active ? "bg-bg font-semibold text-brand-600 shadow-xs" : "text-fg-muted hover:text-fg"
                                    )}
                                >
                                    {tab.label}
                                    <span
                                        className={cn(
                                            "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                                            active ? "bg-brand-50 text-brand-600" : "bg-border text-fg-subtle"
                                        )}
                                    >
                                        {statusCounts[tab.value] ?? 0}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมของคุณ...</p>
                    </div>
                ) : loadError ? (
                    <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-border bg-bg px-6 py-20 text-center">
                        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-danger-bg text-danger" aria-hidden="true">
                            <AlertTriangle className="size-6" />
                        </span>
                        <h3 className="mb-1 text-lg font-semibold text-fg">โหลดรายการกิจกรรมไม่สำเร็จ</h3>
                        <p className="mb-6 max-w-md text-sm text-fg-muted">{loadError}</p>
                        <Button variant="outline" onClick={loadData}>
                            ลองใหม่
                        </Button>
                    </div>
                ) : totalCount > 0 ? (
                    <div className="space-y-12">
                        {draftMatches && draft && (
                            <div>
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-fg">
                                    <FileEdit className="size-5 text-brand-600" aria-hidden="true" />
                                    ฉบับร่าง
                                </h2>
                                <div className={EVENT_CARD_GRID}>
                                    <EventCard
                                        // จางลงเหมือนเป็นแค่ hint ว่ามีฉบับร่างค้างอยู่ — ยังไม่ใช่กิจกรรมจริง ไม่ใช่ hover:-translate-y-1
                                        // เหมือนการ์ดจริงเพราะจะทำให้ดูเหมือนกดดูได้ปกติทั้งที่มันคือทางลัดกลับไปทำต่อเท่านั้น
                                        className="opacity-60 hover:translate-y-0 hover:opacity-100"
                                        activity={{ name: draftDisplayName(draft.payload), imageUrl: draftImageUrl(draft.payload) }}
                                        description={`บันทึกล่าสุดเมื่อ ${formatDraftTime(draft.updatedAt)}`}
                                        badgeLeft={
                                            <EventCardBadge variant="glass" className="bg-fg/60" dotClassName="bg-fg-subtle">
                                                ฉบับร่าง
                                            </EventCardBadge>
                                        }
                                        actions={
                                            <>
                                                <Link href="/organizer/create" className="flex-1">
                                                    <Button variant="secondary" size="sm" className="w-full gap-1.5 rounded-lg text-xs font-medium">
                                                        <Pencil className="size-3.5" aria-hidden="true" />
                                                        ดำเนินการต่อ
                                                    </Button>
                                                </Link>
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
                                                    className="size-9 shrink-0 rounded-lg bg-surface-2 hover:bg-border"
                                                />
                                            </>
                                        }
                                    />
                                </div>
                            </div>
                        )}

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
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <EventCardBadge
                                                        variant="glass"
                                                        className={ev.isPublic ? "bg-success/75" : "bg-fg/60"}
                                                        dotClassName={ev.isPublic ? "bg-success" : "bg-fg-subtle"}
                                                    >
                                                        {ev.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}
                                                    </EventCardBadge>
                                                    {ev.activities.length > 1 && (
                                                        <EventCardBadge variant="light">
                                                            <Layers className="mr-1 inline size-3" aria-hidden="true" />
                                                            {ev.activities.length} กิจกรรมย่อย
                                                        </EventCardBadge>
                                                    )}
                                                </div>
                                            }
                                            actions={
                                                <>
                                                    <Link href={`/organizer/events/${ev.id}`} className="flex-1">
                                                        <Button variant="secondary" size="sm" className="w-full gap-1.5 rounded-lg text-xs font-medium">
                                                            <ClipboardList className="size-3.5" aria-hidden="true" />
                                                            รายละเอียดเพิ่มเติม
                                                        </Button>
                                                    </Link>
                                                    <ActionMenu
                                                        items={eventMenuItems(ev)}
                                                        label={`ตัวเลือกของ ${ev.name}`}
                                                        className="size-9 shrink-0 rounded-lg bg-surface-2 hover:bg-border"
                                                    />
                                                </>
                                            }
                                        >
                                            <CardInfoRow dateLabel={eventDateLabel(ev)} seatsLabel={eventSeatsLabel(ev)} />
                                        </EventCard>
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
                                                badgeLeft={
                                                    <EventCardBadge variant="glass" className={ap.className} dotClassName={ap.dotClassName}>
                                                        {ap.label}
                                                    </EventCardBadge>
                                                }
                                                actions={
                                                    <>
                                                        <Link href={`/organizer/activities/${a.id}`} className="flex-1">
                                                            <Button variant="secondary" size="sm" className="w-full gap-1.5 rounded-lg text-xs font-medium">
                                                                <ClipboardList className="size-3.5" aria-hidden="true" />
                                                                รายละเอียดเพิ่มเติม
                                                            </Button>
                                                        </Link>
                                                        <ActionMenu
                                                            items={activityMenuItems(a)}
                                                            label={`ตัวเลือกของ ${a.name}`}
                                                            className="size-9 shrink-0 rounded-lg bg-surface-2 hover:bg-border"
                                                        />
                                                    </>
                                                }
                                            >
                                                <CardInfoRow dateLabel={formatEventDate(a.date)} seatsLabel={activitySeatsLabel(a)} />
                                            </EventCard>
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
                                <Button asChild className="mt-6 gap-2 rounded-lg px-8 shadow-lg shadow-brand-500/30">
                                    <Link href="/organizer/create">
                                        <CalendarPlus className="size-4" aria-hidden="true" />
                                        สร้างงานใหม่
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ไม่พบกิจกรรมในแท็บนี้</h3>
                                <p className="text-fg-muted">ลองดูแท็บสถานะอื่น หรือกลับไปที่แท็บเริ่มต้น</p>
                                <Button
                                    variant="outline"
                                    className="mt-6 rounded-full px-8"
                                    onClick={resetToDefaultTab}
                                >
                                    กลับไปแท็บเริ่มต้น
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
