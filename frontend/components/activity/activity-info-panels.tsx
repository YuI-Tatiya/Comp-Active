"use client"

import { Badge } from "@/components/ui/badge"
import { API_BASE_URL, capacityLabel, type Activity } from "@/lib/api"
import { categoryLabel } from "@/lib/categories"
import { softSkillLabel } from "@/lib/soft-skills"
import {
    AlertTriangle,
    Award,
    CalendarClock,
    CheckSquare,
    FileDown,
    Info,
    ListChecks,
    Tag,
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
 * ไม่มีแผง "เงื่อนไข" และ "สิทธิประโยชน์" เพราะ wizard สร้างงานไม่เคยเก็บสองฟิลด์นี้
 * (ดู frontend/app/organizer/create/_components/activity-tab-form.tsx) — backend
 * ยังเก็บคอลัมน์ไว้เหมือนเดิม ถ้าวันหน้าเพิ่มช่องกรอกค่อยเพิ่มแผงกลับมาได้
 */

const PANEL_CLASS = "bg-bg p-6 rounded-xl border border-border shadow-xs space-y-6"

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
        <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
            <Icon className={`w-5 h-5 ${tone}`} aria-hidden={true} /> {children}
        </h3>
    )
}

/** แปลงชั่วโมงจิตอาสา — Prisma Decimal มาเป็น string เสมอ */
function formatHours(hours: string | null | undefined): string {
    if (hours == null) return "-"
    const n = Number(hours)
    return Number.isNaN(n) ? String(hours) : String(n)
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
    if (activity.approvalStatus === "rejected") {
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

/** แผง "รายละเอียด" — คำอธิบาย, หมวดหมู่, ผู้จัด, ไฟล์แนบ, tags */
export function ActivityAboutPanel({ activity }: { activity: Activity }) {
    return (
        <div className={PANEL_CLASS}>
            <ActivityStatusNotice activity={activity} />
            <div>
                <PanelHeading icon={Info} tone="text-brand-600">เกี่ยวกับกิจกรรมนี้</PanelHeading>
                <p className="mt-4 text-fg-muted leading-relaxed whitespace-pre-line">
                    {activity.description || "ไม่มีรายละเอียด"}
                </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
                <span>
                    <strong className="text-fg">หมวดหมู่:</strong> {categoryLabel(activity.category)}
                </span>
                {activity.organizer?.name && (
                    <span className="flex items-center gap-1.5">
                        <UserCircle className="size-4 text-fg-subtle" aria-hidden="true" />
                        <strong className="text-fg">ผู้จัด:</strong> {activity.organizer.name}
                    </span>
                )}
            </div>

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
        </div>
    )
}

/** แผง "สิ่งที่จะได้รับ" — Soft Skills พร้อมน้ำหนัก และใบรับรองจิตอาสา */
export function ActivityRewardsPanel({ activity }: { activity: Activity }) {
    const hasSkills = !!activity.softSkills?.length
    const hasCert = !!activity.volunteerRole

    return (
        <div className={PANEL_CLASS}>
            <div>
                <PanelHeading icon={CheckSquare} tone="text-brand-600">Soft Skills ที่จะได้รับ</PanelHeading>
                <div className="mt-4">
                    {hasSkills ? (
                        <div className="flex flex-wrap gap-3">
                            {activity.softSkills!.map((skill, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 rounded-xl border border-border bg-brand-50 px-4 py-2.5 font-medium text-brand-700"
                                >
                                    <CheckSquare className="w-4 h-4" aria-hidden="true" />
                                    <span>
                                        {softSkillLabel(skill.skillType)}
                                        {skill.rate !== undefined && (
                                            <span className="ml-1.5 text-brand-600/80">· น้ำหนัก {skill.rate}</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyNote>กิจกรรมนี้ไม่ได้ระบุ Soft Skills</EmptyNote>
                    )}
                </div>
            </div>

            {/* ใบรับรองจิตอาสา — เดิมฝั่ง student ไม่เห็นเลย ทั้งที่เป็นแรงจูงใจหลักในการสมัคร */}
            <div className="pt-4 border-t border-border">
                <PanelHeading icon={Award} tone="text-success">ใบรับรองจิตอาสา</PanelHeading>
                <div className="mt-4">
                    {hasCert ? (
                        <div className="rounded-xl border border-border bg-success-bg/40 p-4">
                            <div className="font-medium text-fg">{activity.volunteerRole}</div>
                            <p className="mt-1 text-sm text-fg-muted">
                                ได้รับ{" "}
                                <span className="font-semibold text-success">
                                    {formatHours(activity.volunteerHours)} ชั่วโมง
                                </span>{" "}
                                เมื่อเข้าร่วมกิจกรรมและเช็คอินเรียบร้อยแล้ว
                            </p>
                        </div>
                    ) : (
                        <EmptyNote>กิจกรรมนี้ไม่ออกใบรับรองจิตอาสา</EmptyNote>
                    )}
                </div>
            </div>
        </div>
    )
}

interface RegistrationPanelProps {
    activity: Activity
    /** วันปิดรับสมัครระดับงาน (Event) — กิจกรรมเดี่ยวรุ่นเก่าไม่มีค่านี้ */
    registrationCloseAt?: string | null
}

/** แผง "การลงทะเบียน" — จำนวนที่รับ, วันปิดรับสมัคร, คำถามที่ต้องตอบ */
export function ActivityRegistrationPanel({ activity, registrationCloseAt }: RegistrationPanelProps) {
    const questions = activity.questions ?? []

    return (
        <div className={PANEL_CLASS}>
            <PanelHeading icon={ListChecks} tone="text-brand-600">การลงทะเบียน</PanelHeading>

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
                        <div className="text-xs text-fg-muted">ปิดรับสมัคร</div>
                        <div className="font-medium text-fg">
                            {registrationCloseAt ? formatDateTime(registrationCloseAt) : "ไม่กำหนด"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-border">
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
        </div>
    )
}
