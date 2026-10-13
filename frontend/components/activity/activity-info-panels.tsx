"use client"

import { Badge } from "@/components/ui/badge"
import { API_BASE_URL, capacityLabel, isCancelledByOrganizer, type Activity } from "@/lib/api"
import { categoryLabel } from "@/lib/categories"
import { BenefitsSection } from "@/components/activity/benefits-section"
import type { ScheduleLabel } from "@/lib/activity-view"
import {
    AlertTriangle,
    CalendarClock,
    CalendarDays,
    CheckSquare,
    FileDown,
    Info,
    ListChecks,
    Tag,
    Target,
    UserCircle,
    Users,
} from "lucide-react"

/**
 * แผงเนื้อหากิจกรรมที่ organizer และ student ต้องเห็น "ตรงกัน"
 *
 * เดิมสองหน้าเขียน JSX แยกกันเอง ทำให้ template ไม่ตรงกันและข้อมูลที่ organizer
 * กรอกตอนสร้าง (ไฟล์แนบ / ใบจิตอาสา / น้ำหนัก Soft Skill / วันปิดรับสมัคร)
 * ตกหล่นคนละชุด — รวมมาไว้ที่เดียวเพื่อไม่ให้หลุดอีก
 *
 * ไม่มีแผง "สิทธิประโยชน์" เพราะ wizard สร้างงานไม่เคยเก็บฟิลด์นี้ (ดู
 * frontend/app/organizer/create/_components/activity-tab-form.tsx) — backend ยังเก็บ
 * คอลัมน์ไว้เหมือนเดิม ถ้าวันหน้าเพิ่มช่องกรอกค่อยเพิ่มแผงกลับมาได้ "เงื่อนไข" (conditions)
 * กลับมาแล้วที่ ActivityAboutPanel ด้านล่าง — wizard ปัจจุบันก็ไม่เก็บฟิลด์นี้เหมือนกัน แต่
 * schema/backend ยังอ่าน-เขียนได้ปกติ (กิจกรรมเก่า/ที่กรอกผ่านช่องทางอื่นจึงมีข้อมูลแสดงได้จริง)
 *
 * `bare`: คอมโพเนนต์ปกติห่อการ์ดของตัวเอง (PANEL_CLASS) — แต่หน้ารายละเอียดกิจกรรมที่ merge
 * เป็นการ์ดเดียว (รายละเอียด+กำหนดการ+การลงทะเบียน) ต้องการแค่เนื้อหาไม่มีการ์ดห่อซ้ำ จึงส่ง
 * bare ผ่านมาข้ามการห่อการ์ดของตัวเอง ให้หน้าห่อการ์ดเดียวจากข้างนอกแทน
 */

/** ส่งออกให้หน้าที่ merge หลายแผง (bare) เป็นการ์ดเดียวใช้ class เดียวกันเป๊ะๆ ไม่พิมพ์ซ้ำเอง */
export const PANEL_CLASS = "bg-bg p-5 rounded-2xl border border-border shadow-xs space-y-4"

function EmptyNote({ children }: { children: React.ReactNode }) {
    return (
        <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border">
            <p className="text-fg-muted">{children}</p>
        </div>
    )
}

function PanelHeading({ icon: Icon, tone, children }: {
    icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
    tone: string
    children: React.ReactNode
}) {
    return (
        <h3 className="text-xl font-bold text-fg flex items-center gap-2">
            <Icon className={`w-5 h-5 ${tone}`} aria-hidden={true} /> {children}
        </h3>
    )
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * แถบแจ้งสถานะกิจกรรมให้ผู้อ่านรู้ว่าเกิดอะไรขึ้น
 * เดิม organizer พิมพ์เหตุผลยกเลิกเก็บลง DB แล้วไม่มีใครเห็นเลยทั้งระบบ
 */
export function ActivityStatusNotice({ activity }: { activity: Activity }) {
    if (isCancelledByOrganizer(activity.approvalStatus)) {
        return (
            <div className="rounded-xl border border-danger bg-danger-bg p-4">
                <div className="flex items-center gap-2 font-semibold text-danger">
                    <AlertTriangle className="size-4" aria-hidden="true" /> กิจกรรมนี้ถูกยกเลิก
                </div>
                <p className="mt-1.5 text-sm text-fg-muted">
                    {activity.cancellationReason
                        ? `เหตุผล: ${activity.cancellationReason}`
                        : "ผู้จัดไม่ได้ระบุเหตุผล"}
                </p>
            </div>
        )
    }

    if (activity.status === "completed") {
        return (
            <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2 font-semibold text-fg">
                    <CheckSquare className="size-4 text-success" aria-hidden="true" /> กิจกรรมนี้จบแล้ว
                </div>
                <p className="mt-1.5 text-sm text-fg-muted">
                    ผู้ที่เช็คอินเข้าร่วมสามารถทำแบบสำรวจได้ที่หน้า “กิจกรรมของฉัน”
                </p>
            </div>
        )
    }

    return null
}

interface AboutPanelProps {
    activity: Activity
    /**
     * แสดงรูปของกิจกรรมย่อยตัวนี้ด้วย
     *
     * เปิดในหน้ารายละเอียด "งาน" เพราะรูปด้านบนสุดของหน้าเป็นรูปปกงาน ไม่ใช่ของกิจกรรมย่อย
     * (resolveEventImageUrl ให้รูปปกงานชนะเสมอ) รูปที่ผู้จัดอัปโหลดให้กิจกรรมย่อยแต่ละตัว
     * จึงไม่เคยแสดงที่ไหนเลย — ปิดในหน้ากิจกรรมเดี่ยวเพราะรูปด้านบนเป็นรูปของกิจกรรมนั้นอยู่แล้ว
     */
    showActivityImage?: boolean
    /** ซ่อนบรรทัดหมวดหมู่/ผู้จัด — หน้าลงทะเบียนของนักศึกษาแสดงสองอย่างนี้ใน Hero แล้ว ไม่ให้ซ้ำ */
    hideMeta?: boolean
    /** ข้ามการห่อการ์ด PANEL_CLASS ของตัวเอง — ดูหมายเหตุ "bare" ด้านบนไฟล์ */
    bare?: boolean
}

/** แผง "รายละเอียด" — รูปกิจกรรม, คำอธิบาย, คุณสมบัติผู้เข้าร่วม, หมวดหมู่, ผู้จัด, ไฟล์แนบ, tags */
export function ActivityAboutPanel({ activity, showActivityImage = false, hideMeta = false, bare = false }: AboutPanelProps) {
    const conditions = activity.conditions ?? []
    const content = (
        <>
            <ActivityStatusNotice activity={activity} />

            {showActivityImage && activity.imageUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`${API_BASE_URL}${activity.imageUrl}`}
                        alt={activity.name}
                        className="size-full object-cover"
                    />
                </div>
            )}

            <div>
                <PanelHeading icon={Info} tone="text-brand-600">เกี่ยวกับกิจกรรมนี้</PanelHeading>
                <p className="mt-4 text-fg-muted leading-relaxed whitespace-pre-line">
                    {activity.description || "ไม่มีรายละเอียด"}
                </p>
            </div>

            {/* คุณสมบัติผู้เข้าร่วม/สิ่งที่ต้องเตรียมมา — มาจาก activity.conditions (ฟิลด์เดิมที่ wizard ไม่ได้เก็บแล้ว
                แต่ backend ยังอ่าน-เขียนได้ปกติ) แสดงเฉพาะกิจกรรมที่มีข้อมูลจริง ไม่ fallback เป็นข้อความเปล่า */}
            {conditions.length > 0 && (
                <div>
                    <PanelHeading icon={Target} tone="text-brand-600">คุณสมบัติผู้เข้าร่วม / สิ่งที่ต้องเตรียมมา</PanelHeading>
                    <ul className="mt-4 list-inside list-disc space-y-1.5 text-fg-muted">
                        {conditions.map((c, i) => (
                            <li key={i}>{c.conditionText}</li>
                        ))}
                    </ul>
                </div>
            )}

            {!hideMeta && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
                    <span>
                        <strong className="text-fg">หมวดหมู่:</strong> {activity.categories.map((c) => categoryLabel(c)).join(", ")}
                    </span>
                    {activity.organizer?.name && (
                        <span className="flex items-center gap-1.5">
                            <UserCircle className="size-4 text-fg-subtle" aria-hidden="true" />
                            <strong className="text-fg">ผู้จัด:</strong> {activity.organizer.name}
                        </span>
                    )}
                </div>
            )}

            {/* ไฟล์แนบ — organizer อัปโหลดได้ตอนสร้าง แต่เดิมไม่เคยแสดงที่ไหนเลย */}
            {activity.attachmentUrl && (
                <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold mb-3 text-fg">เอกสารแนบ</h4>
                    <a
                        href={`${API_BASE_URL}${activity.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-50"
                    >
                        <FileDown className="size-4" aria-hidden="true" />
                        ดาวน์โหลดเอกสารแนบ
                    </a>
                </div>
            )}

            {activity.tags && activity.tags.length > 0 && (
                <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold mb-3 text-fg">Tags</h4>
                    <div className="flex gap-2 flex-wrap">
                        {activity.tags.map((tag) => (
                            <Badge key={tag.tagName} variant="neutral" className="px-3 py-1">
                                <Tag className="w-3 h-3 mr-1" aria-hidden="true" /> {tag.tagName}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </>
    )

    return bare ? content : <div className={PANEL_CLASS}>{content}</div>
}

/**
 * แผง "สิ่งที่จะได้รับ" — ทักษะ (เป็นระดับ ผ่าน/ดี/ดีเยี่ยม) และชั่วโมงจิตอาสา
 * ใช้ BenefitsSection ตัวเดียวกับหน้าลงทะเบียนของนักศึกษา เพื่อให้ผู้จัดเห็นข้อความเดียวกับที่นักศึกษาเห็น
 */
export function ActivityRewardsPanel({ activity }: { activity: Activity }) {
    return <BenefitsSection activity={activity} />
}

interface RegistrationPanelProps {
    activity: Activity
    /** วันเปิดรับสมัครระดับงาน (Event) — กิจกรรมเดี่ยวรุ่นเก่าไม่มีค่านี้ */
    registrationOpenAt?: string | null
    /** วันปิดรับสมัครระดับงาน (Event) — กิจกรรมเดี่ยวรุ่นเก่าไม่มีค่านี้ */
    registrationCloseAt?: string | null
    /**
     * ซ่อนจำนวนที่รับ/วันปิดรับสมัคร — หน้าลงทะเบียนของนักศึกษาแสดงสองอย่างนี้ที่อื่นแล้ว
     * (ที่นั่งในการ์ดรายละเอียด, วันปิดรับสมัครในการ์ดสมัคร) ไม่ให้ซ้ำ
     */
    hideLogistics?: boolean
    /** ข้ามการห่อการ์ด PANEL_CLASS ของตัวเอง — ดูหมายเหตุ "bare" ที่ ActivityAboutPanel ด้านบน */
    bare?: boolean
}

/** ข้อมูลที่ต้องกรอกเพิ่มตอนสมัคร ตามประเภทการรับสมัคร (สตาฟฟ์/แข่งขัน) — ผู้เข้าร่วมทั่วไปไม่มี */
export function typeRequirements(activity: Activity): { label: string; value: string }[] {
    if (activity.registrationType === "staff_volunteer") {
        const items: { label: string; value: string }[] = []
        if (activity.dutyRoleOptions?.length) items.push({ label: "เลือกฝ่ายที่ต้องการ", value: activity.dutyRoleOptions.join(" / ") })
        if (activity.dutyShiftOptions?.length) items.push({ label: "เลือกกะ (ถ้ามี)", value: activity.dutyShiftOptions.join(" / ") })
        return items
    }
    if (activity.registrationType === "contestant") {
        const items = [{ label: "ชื่อทีม", value: "ระบุตอนลงทะเบียน" }]
        const { teamSizeMin: min, teamSizeMax: max } = activity
        if (min != null || max != null) {
            items.push({ label: "จำนวนสมาชิกทีม", value: min != null && max != null ? `${min}–${max} คน` : min != null ? `อย่างน้อย ${min} คน` : `ไม่เกิน ${max} คน` })
        }
        if (activity.competitionCategoryOptions?.length) items.push({ label: "ประเภท/รุ่นการแข่งขัน", value: activity.competitionCategoryOptions.join(" / ") })
        return items
    }
    return []
}

/** แผง "การลงทะเบียน" — จำนวนที่รับ, วันปิดรับสมัคร, คำถามที่ต้องตอบ */
export function ActivityRegistrationPanel({
    activity,
    registrationOpenAt,
    registrationCloseAt,
    hideLogistics = false,
    bare = false,
}: RegistrationPanelProps) {
    const questions = activity.questions ?? []
    const requirements = typeRequirements(activity)

    const content = (
        <>
            <PanelHeading icon={ListChecks} tone="text-brand-600">{hideLogistics ? "ต้องเตรียมอะไรบ้าง" : "การลงทะเบียน"}</PanelHeading>

            {!hideLogistics && (
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Users className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <div className="text-xs text-fg-muted">จำนวนที่รับ</div>
                        <div className="font-medium text-fg">{capacityLabel(activity.capacity)}</div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <CalendarClock className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <div className="text-xs text-fg-muted">เปิดรับสมัคร</div>
                        <div className="font-medium text-fg">
                            {registrationOpenAt ? formatDateTime(registrationOpenAt) : "เปิดทันที"}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <CalendarClock className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <div className="text-xs text-fg-muted">ปิดรับสมัคร</div>
                        <div className="font-medium text-fg">
                            {registrationCloseAt ? formatDateTime(registrationCloseAt) : "ไม่กำหนด"}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {requirements.length > 0 && (
                <div className={hideLogistics ? "" : "pt-4 border-t border-border"}>
                    <h4 className="text-sm font-semibold mb-3 text-fg">ข้อมูลที่ต้องกรอกเพิ่มตอนลงทะเบียน</h4>
                    <dl className="space-y-2 text-sm">
                        {requirements.map((r) => (
                            <div key={r.label} className="flex flex-wrap gap-x-2">
                                <dt className="text-fg-muted">{r.label}:</dt>
                                <dd className="font-medium text-fg">{r.value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}

            <div className={hideLogistics && requirements.length === 0 ? "" : "pt-4 border-t border-border"}>
                <h4 className="text-sm font-semibold mb-3 text-fg">
                    คำถามที่ต้องตอบตอนลงทะเบียน
                </h4>
                {questions.length > 0 ? (
                    <ol className="space-y-2">
                        {questions.map((q, i) => (
                            <li key={q.id} className="flex gap-3 text-sm text-fg-muted">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-fg-muted">
                                    {i + 1}
                                </span>
                                <span>
                                    {q.label}
                                    {q.required && <span className="ml-1 text-danger">*</span>}
                                    {q.options?.length > 0 && (
                                        <span className="block text-xs text-fg-subtle">
                                            ตัวเลือก: {q.options.map((o) => o.label).join(" / ")}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <EmptyNote>ไม่มีคำถามเพิ่มเติม — ลงทะเบียนได้ทันที</EmptyNote>
                )}
            </div>
        </>
    )

    return bare ? content : <div className={PANEL_CLASS}>{content}</div>
}

export interface AgendaSession {
    id: number
    name: string
    schedule: ScheduleLabel
}

/**
 * แผง "กำหนดการกิจกรรมย่อย" — เฉพาะงานที่มีมากกว่า 1 กิจกรรมย่อย (sessions.length <= 1 ไม่มีอะไรให้บอกเพิ่ม
 * จากวันเวลาที่โชว์อยู่บน Hero แล้ว) ไม่มี field "วาระ/run-of-show" แยกต่างหากในระบบ จึงไม่ใส่ข้อมูลสมมติ —
 * ใช้วัน-เวลาจริงของแต่ละกิจกรรมย่อย (เรียงตามลำดับที่ผู้จัดสร้างไว้ เหมือนตัวเลือกกิจกรรมบน Hero) แทน
 */
export function ActivityAgendaPanel({ sessions }: { sessions: AgendaSession[] }) {
    if (sessions.length <= 1) return null

    return (
        <div>
            <PanelHeading icon={CalendarDays} tone="text-brand-600">กำหนดการกิจกรรมย่อย</PanelHeading>
            <ul className="mt-4 space-y-2.5">
                {sessions.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-semibold text-fg">
                            {s.schedule.dateLabel}
                            {s.schedule.timeLabel && ` (${s.schedule.timeLabel})`}
                        </span>
                        <span className="text-fg-muted">{s.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
