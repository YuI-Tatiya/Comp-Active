"use client"

import { useId, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
    ArrowRight,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    HeartHandshake,
    Info,
    MapPin,
    Star,
    Users,
    X,
    XCircle,
} from "lucide-react"
import { Container } from "@/components/layout/container"
import { TerminalPrompt, coverPattern, PHOTO_SCRIM, PHOTO_TEXT_SHADOW, useUploadImage } from "@/components/denim/denim-ui"
import { formatEventDate } from "@/components/ui/event-card"
import { QrCheckInButton } from "@/components/student/qr-checkin-button"
import { RegistrationEvaluation } from "@/components/student/registration-evaluation"
import type { SkillScores } from "@/lib/api"
import { categoriesBadgeLabel } from "@/lib/categories"
import { isCancelledByOrganizer, registrationBucket, type RegistrationBucket } from "@/lib/registration-bucket"
import { cn } from "@/lib/utils"

/* หน้า "กิจกรรมของฉัน" (/student/my-registrations) ธีม Denim Varsity — แถบหัวหน้าพร้อมมาสคอตโผล่หลังการ์ด,
   การ์ด pipeline 4 สถานะ (กดเพื่อกรอง) และการ์ดรายการลงทะเบียนแบบแนวนอน สถานะ/ข้อมูลอยู่ที่ page.tsx */

/**
 * ผลประเมินรายกิจกรรม — backend สร้างอัตโนมัติตอนเช็คอิน (registrations.service.ts checkIn())
 * โดยคัดลอกคะแนนจาก ActivitySoftSkill.rate ของกิจกรรมนั้น ทักษะที่ไม่ได้กำหนดไว้จะเป็น 0
 */
export interface RegistrationEvaluationData extends SkillScores {
    comment?: string | null
    createdAt: string
    /** pending_approval = รอผู้จัดอนุมัติ (กิจกรรมประเมินรอบด้าน) — server ปิดคะแนนเป็น 0 ไว้แล้ว */
    status?: string
}

export interface MyRegistration {
    id: number
    status: string
    attendance: string
    registerDate: string
    /** เวลาเช็คอินจริง — backend เขียนพร้อมสร้าง evaluation ในธุรกรรมเดียวกัน */
    checkInTime?: string | null
    evaluation?: RegistrationEvaluationData | null
    activity: {
        id: number
        publicId?: string
        name: string
        date: string
        startTime: string
        endTime: string
        location: string
        categories: string[]
        imageUrl?: string
        status?: string
        approvalStatus?: string
        cancellationReason?: string | null
        /** Prisma Decimal ส่งมาเป็น string เสมอ — ไม่ใช่ number */
        volunteerHours?: string | null
        volunteerRole?: string | null
        /** ผู้จัดเปิดโหมดประเมินรอบด้าน (ตนเอง + เพื่อน) ไว้หรือไม่ */
        peerAssessmentEnabled?: boolean
    }
}

/* ── แถบหัวหน้า ──────────────────────────────────────────────────────────── */

/**
 * พื้นยีนส์เรียบ (ไม่มีกรอบเส้นประ/แถบหมากรุกแบบ PageHeader) — การ์ด pipeline ดึงขึ้นมาทับขอบล่าง 96px (-mt-24)
 * มาสคอตวางชิดขวาให้ครึ่งล่างหลบอยู่หลังการ์ด เห็นแค่ผมถึงแว่น เหมือนแอบมองรายการของผู้ใช้
 */
export function MyRegistrationsHero() {
    return (
        <section className="denim-weave relative overflow-hidden">
            <Container className="relative pb-32 pt-10 sm:pt-12">
                <div className="flex max-w-2xl flex-col gap-3">
                    <TerminalPrompt>~/comp-active/student $ ls --mine</TerminalPrompt>
                    <h1 className="font-display text-[34px] font-bold leading-[1.15] tracking-[-0.01em] text-white sm:text-[44px]">
                        กิจกรรมของฉัน
                    </h1>
                    <p className="text-[15px] leading-relaxed text-denim-on sm:text-base">ติดตามสถานะการเข้าร่วมและการประเมินผลของคุณ</p>
                </div>
                <Image
                    src="/mascot-head.png"
                    alt=""
                    width={520}
                    height={502}
                    sizes="150px"
                    priority
                    className="pointer-events-none absolute bottom-11 right-10 hidden h-[140px] w-auto drop-shadow-[0_14px_22px_rgb(0_0_0/0.3)] md:block lg:right-16"
                />
            </Container>
        </section>
    )
}

/* ── การ์ด pipeline (ตัวกรองสถานะ) ───────────────────────────────────────── */

const PIPELINE: { key: RegistrationBucket; title: string; body: string; note: string }[] = [
    {
        key: "pending",
        title: "รอยืนยัน",
        body: "คุณกดลงทะเบียนแล้ว กำลังรอผู้จัดกิจกรรมยืนยันที่นั่งให้",
        note: "ยกเลิกได้",
    },
    {
        key: "confirmed",
        title: "ยืนยันแล้ว",
        body: "ผู้จัดยืนยันที่นั่งแล้ว ให้ไปเช็คอินหน้างานในวันจัดกิจกรรม",
        note: "ยกเลิกได้จนกว่าจะเช็คอิน",
    },
    {
        key: "evaluated",
        title: "ประเมินแล้ว",
        body: "เช็คอินสำเร็จ ระบบบันทึกคะแนน Soft Skills และชั่วโมงจิตอาสาให้คุณ",
        note: "ยกเลิกไม่ได้แล้ว",
    },
    {
        key: "cancelled",
        title: "ยกเลิกแล้ว",
        body: "ยกเลิกเอง หรือผู้จัดยกเลิกทั้งงาน ที่นั่งจะถูกปล่อยคืน",
        note: "ดูเหตุผลในการ์ด",
    },
]

export const BUCKET_LABEL: Record<RegistrationBucket, string> = {
    pending: "รอยืนยัน",
    confirmed: "ยืนยันแล้ว",
    evaluated: "ประเมินแล้ว",
    cancelled: "ยกเลิกแล้ว",
}

interface PipelineCardProps {
    value: RegistrationBucket
    counts: Record<RegistrationBucket, number>
    loading: boolean
    onChange: (bucket: RegistrationBucket) => void
}

export function PipelineCard({ value, counts, loading, onChange }: PipelineCardProps) {
    const [helpOpen, setHelpOpen] = useState(false)
    const helpId = useId()

    return (
        <section aria-labelledby="pipeline-heading" className="relative z-[1] -mt-24">
            <Container>
                <div className="rounded-[24px] border border-denim-line bg-white p-4 shadow-[0_24px_60px_-30px_rgb(18_34_61/0.45)] sm:p-5">
                    <h2 id="pipeline-heading" className="font-code text-[11px] text-denim-accent sm:text-xs">
                        {"// pipeline: ลงทะเบียน → ยืนยัน → เช็คอิน & ประเมิน"}
                    </h2>

                    {/* การ์ดสถานะ = ตัวกรองของรายการด้านล่าง — มือถือ 2x2 และซ่อนคำอธิบาย (ไปอ่านในส่วน "หน้านี้ใช้ทำอะไร" แทน)
                        ไม่งั้น 4 ใบพร้อมคำอธิบายดันรายการกิจกรรมตกจอแรก */}
                    <div role="group" aria-label="กรองตามสถานะ" className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {PIPELINE.map((step, i) => {
                            const active = value === step.key
                            const isCancel = step.key === "cancelled"
                            return (
                                <button
                                    key={step.key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onChange(step.key)}
                                    className={cn(
                                        "flex min-w-0 flex-col rounded-2xl border-[1.5px] p-3 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim sm:p-4",
                                        active
                                            ? "border-denim-deep bg-denim-deep text-white shadow-[0_14px_28px_-16px_rgb(18_34_61/0.8)]"
                                            : cn(
                                                  "bg-white hover:bg-denim-paper",
                                                  isCancel
                                                      ? "border-dashed border-denim-field hover:border-denim-dash"
                                                      : "border-denim-line hover:border-denim-dash"
                                              )
                                    )}
                                >
                                    {/* มือถือ (2 คอลัมน์ ~130px) ย่อวง/ตัวเลข/ช่องไฟ ให้ชื่อสถานะ "ประเมินแล้ว" ไม่ถูกตัดเป็น "ประเมิน…" */}
                                    <span className="flex w-full items-center gap-2 sm:gap-2.5">
                                        <span
                                            className={cn(
                                                "grid size-6 shrink-0 place-items-center rounded-full font-code text-xs font-semibold sm:size-7",
                                                isCancel
                                                    ? "bg-red-100 text-red-600"
                                                    : active
                                                      ? "bg-amber text-denim-deep"
                                                      : "bg-denim-chip text-denim"
                                            )}
                                            aria-hidden="true"
                                        >
                                            {isCancel ? <X className="size-3.5" strokeWidth={3} /> : i + 1}
                                        </span>
                                        <span
                                            className={cn(
                                                "min-w-0 flex-1 truncate text-sm font-semibold sm:text-[15px]",
                                                active ? "text-white" : "text-denim-deep"
                                            )}
                                        >
                                            {step.title}
                                        </span>
                                        <span
                                            className={cn(
                                                "font-display text-[22px] font-bold leading-none tabular-nums sm:text-[26px]",
                                                active ? "text-white" : "text-denim-deep"
                                            )}
                                        >
                                            {loading ? "–" : counts[step.key]}
                                            <span className="sr-only"> รายการ</span>
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            "mt-2 hidden text-[13px] leading-relaxed sm:block",
                                            active ? "text-denim-on" : "text-denim-muted"
                                        )}
                                    >
                                        {step.body}
                                    </span>
                                    <span
                                        className={cn(
                                            "mt-2 font-code text-[11px]",
                                            isCancel
                                                ? active
                                                    ? "text-red-300"
                                                    : "text-red-600"
                                                : active
                                                  ? "text-amber"
                                                  : "text-denim-muted"
                                        )}
                                    >
                                        {step.note}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="mt-4 border-t border-dashed border-denim-line pt-3">
                        <button
                            type="button"
                            aria-expanded={helpOpen}
                            aria-controls={helpId}
                            onClick={() => setHelpOpen((v) => !v)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-denim-deep transition-colors hover:text-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                        >
                            <Info className="size-4 text-denim-accent" aria-hidden="true" />
                            หน้านี้ใช้ทำอะไร และสถานะเปลี่ยนอย่างไร
                            <ChevronDown className={cn("size-4 transition-transform", helpOpen && "rotate-180")} aria-hidden="true" />
                        </button>

                        {helpOpen && (
                            <div id={helpId} className="mt-2 grid gap-3 pb-1 text-sm leading-relaxed text-denim-ink md:grid-cols-2">
                                <p className="md:col-span-2">
                                    ทุกกิจกรรมที่คุณลงทะเบียนจะมาอยู่ที่นี่ และย้ายสถานะไปเองตามลำดับ{" "}
                                    <strong className="font-semibold text-denim-deep">รอยืนยัน → ยืนยันแล้ว → ประเมินแล้ว</strong>{" "}
                                    กดการ์ดสถานะด้านบนเพื่อดูเฉพาะรายการในสถานะนั้น
                                </p>
                                <div className="rounded-xl bg-denim-paper p-3.5">
                                    <p className="font-semibold text-denim-deep">ยืนยันแล้ว → ประเมินแล้ว</p>
                                    <p className="mt-1 text-denim-muted">
                                        เกิดตอนเช็คอินหน้างาน (สแกน QR ที่ผู้จัดแสดง หรือให้ผู้จัดเช็คอินให้) หลังจากนั้นยกเลิกรายการนี้ไม่ได้แล้ว
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber/15 p-3.5">
                                    <p className="font-semibold text-denim-deep">กิจกรรมประเมินรอบด้าน</p>
                                    <p className="mt-1 text-denim-muted">
                                        บางกิจกรรมต้องประเมินตนเองและเพื่อนหลังจบงาน คะแนนจะแสดงเมื่อผู้จัดอนุมัติ ระหว่างนั้นการ์ดมีป้าย
                                        &quot;รออนุมัติผล&quot;
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </section>
    )
}

/* ── การ์ดรายการลงทะเบียน ─────────────────────────────────────────────────── */

const STEPS = ["รอยืนยัน", "ยืนยันแล้ว", "ประเมินแล้ว"] as const

/** ลำดับสถานะบนการ์ด — ขั้นที่ถึงแล้ว (รวมขั้นปัจจุบัน) เป็นวงเข้มมีเครื่องหมายถูก ขั้นถัดไปเป็นเลขบนวงจาง */
function StatusStepper({ bucket }: { bucket: RegistrationBucket }) {
    if (bucket === "cancelled") {
        return (
            <p className="flex items-center gap-2 text-[13px] font-semibold text-red-600">
                <span className="grid size-6 place-items-center rounded-full bg-red-100" aria-hidden="true">
                    <X className="size-3.5" strokeWidth={3} />
                </span>
                ยกเลิกแล้ว
            </p>
        )
    }
    const current = bucket === "evaluated" ? 2 : bucket === "confirmed" ? 1 : 0
    return (
        // มือถือย่อช่องไฟ/เส้นเชื่อม/ป้าย ให้ 3 ขั้นอยู่บรรทัดเดียวที่ความกว้าง ~320px (ไม่งั้นขั้นที่ 3 หล่นลงบรรทัดใหม่)
        <ol aria-label="ลำดับสถานะ" className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 sm:gap-x-2">
            {STEPS.map((label, i) => {
                const reached = i <= current
                return (
                    <li key={label} aria-current={i === current ? "step" : undefined} className="flex items-center gap-1.5 sm:gap-2">
                        <span
                            className={cn(
                                "grid size-6 shrink-0 place-items-center rounded-full font-code text-[11px] font-semibold",
                                reached ? "bg-denim-deep text-white" : "bg-denim-chip text-denim-muted"
                            )}
                            aria-hidden="true"
                        >
                            {reached ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={cn("text-xs sm:text-[13px]", reached ? "font-semibold text-denim-deep" : "text-denim-muted")}>
                            {label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "w-3 border-t-2 sm:w-9",
                                    i < current ? "border-denim-deep" : "border-dashed border-denim-field"
                                )}
                            />
                        )}
                    </li>
                )
            })}
        </ol>
    )
}

/** ป้ายสถานะมุมขวาบน — บอกว่ากำลังรออะไรอยู่ (ลำดับสถานะทางซ้ายบอกแค่ว่าอยู่ขั้นไหน) */
function statusPill(reg: MyRegistration, bucket: RegistrationBucket): { label: string; className: string } {
    if (bucket === "cancelled") {
        return isCancelledByOrganizer(reg.activity.approvalStatus)
            ? { label: "ผู้จัดยกเลิกกิจกรรม", className: "bg-red-50 text-red-700" }
            : { label: "คุณยกเลิกแล้ว", className: "bg-red-50 text-red-700" }
    }
    if (bucket === "evaluated") {
        return reg.evaluation?.status === "pending_approval"
            ? { label: "รออนุมัติผล", className: "bg-amber/20 text-amber-ink" }
            : // ไม่ใช้ "ได้รับคะแนนแล้ว" — กิจกรรมที่ไม่ได้กำหนดทักษะไว้ก็มีผลประเมิน (คะแนน 0 ทุกด้าน)
              { label: "เข้าร่วมสำเร็จ", className: "bg-emerald-50 text-emerald-700" }
    }
    // จบงานไปแล้วแต่ยังไม่ได้เช็คอิน — ไม่ต้องรออะไรต่อแล้ว
    if (reg.activity.status === "completed") return { label: "กิจกรรมจบแล้ว", className: "bg-slate-100 text-slate-600" }
    if (bucket === "confirmed") return { label: "รอเช็คอินหน้างาน", className: "bg-denim-chip text-denim-deep" }
    return { label: "รอผู้จัดยืนยัน", className: "bg-amber/20 text-amber-ink" }
}

/** วันที่ตัวใหญ่บนแผงซ้าย — "18" + "ต.ค. 2569" ตามเวลาไทย */
function panelDate(iso: string): { day: string; monthYear: string } | null {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return {
        day: new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "Asia/Bangkok" }).format(d),
        monthYear: new Intl.DateTimeFormat("th-TH", { month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(d),
    }
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" })
}

/** แผงวันที่ซ้ายมือ — รูปที่ผู้จัดแนบ (ถ้ามี) ไม่งั้นลายปกตามหมวดหมู่ ยกเลิกแล้วเป็นปกเทา (กติกาเดียวกับ CardCover) */
function DatePanel({ reg, cancelled }: { reg: MyRegistration; cancelled: boolean }) {
    const image = useUploadImage(reg.activity.imageUrl)
    const date = panelDate(reg.activity.date)
    const badge = categoriesBadgeLabel(reg.activity.categories)
    return (
        <div
            className={cn(
                "relative flex h-32 shrink-0 flex-col justify-between overflow-hidden p-4 sm:h-auto sm:w-44 md:w-[200px]",
                coverPattern(cancelled ? "closed" : "open", reg.activity.categories)
            )}
        >
            {image.show && (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลดเสิร์ฟจาก backend (/uploads) ไม่ได้ผ่านตัวย่อรูปของ Next */}
                    <img
                        src={image.src!}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={image.onError}
                        className={cn("absolute inset-0 size-full object-cover", cancelled && "grayscale")}
                    />
                    <div className={PHOTO_SCRIM} aria-hidden="true" />
                </>
            )}
            <div className="relative">
                {badge && (
                    <span className="inline-block max-w-full truncate rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-denim-deep">
                        {badge}
                    </span>
                )}
            </div>
            {date && (
                <p className={cn("relative font-display font-bold leading-none text-white", image.show && PHOTO_TEXT_SHADOW)}>
                    <span className="block text-[44px] sm:text-[52px]">{date.day}</span>
                    <span className="mt-1.5 block text-sm font-semibold tracking-[0.04em] text-white/80">{date.monthYear}</span>
                </p>
            )}
        </div>
    )
}

/** ชิปข้อมูลบนการ์ด (วัน เวลา สถานที่ ...) — กว้างตามเนื้อหา ยาวเกินตัดท้าย */
function InfoChip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
    return (
        <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-denim-line bg-denim-paper px-3 py-1.5 text-[13px] text-denim-ink">
            <Icon className="size-4 shrink-0 text-denim-accent" aria-hidden="true" />
            <span className="min-w-0 truncate">{children}</span>
        </span>
    )
}

/** ปุ่มรองบนแถบล่างของการ์ด (พื้นขาว เส้นขอบกรมท่าอ่อน) */
const CARD_ACTION =
    "inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border-[1.5px] border-denim-field bg-white px-3.5 text-sm font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"

interface RegistrationCardProps {
    reg: MyRegistration
    evaluationOpen: boolean
    onToggleEvaluation: () => void
    onOpenSurvey: () => void
    onOpenAssessment: () => void
    onCancel: () => void
}

export function RegistrationCard({
    reg,
    evaluationOpen,
    onToggleEvaluation,
    onOpenSurvey,
    onOpenAssessment,
    onCancel,
}: RegistrationCardProps) {
    const bucket = registrationBucket(reg)
    const pill = statusPill(reg, bucket)
    const cancelledByOrganizer = isCancelledByOrganizer(reg.activity.approvalStatus)
    const attended = reg.attendance === "attended"
    const evalPanelId = `reg-${reg.id}-evaluation`

    return (
        <article className="flex flex-col overflow-hidden rounded-[20px] border border-denim-line bg-white shadow-[0_14px_34px_-24px_rgb(18_34_61/0.5)] sm:flex-row">
            <DatePanel reg={reg} cancelled={bucket === "cancelled"} />

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
                        <StatusStepper bucket={bucket} />
                        <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", pill.className)}>{pill.label}</span>
                    </div>

                    <h3 className="mt-3 font-display text-xl font-bold leading-snug text-denim-deep sm:text-[22px]">{reg.activity.name}</h3>

                    {/* เหตุผลที่ผู้จัดยกเลิก — "ดูเหตุผลในการ์ด" บนการ์ดสถานะชี้มาที่นี่ */}
                    {cancelledByOrganizer && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm">
                            <p className="font-semibold text-red-700">ผู้จัดยกเลิกกิจกรรมนี้</p>
                            <p className="mt-0.5 text-denim-ink">
                                {reg.activity.cancellationReason ? `เหตุผล: ${reg.activity.cancellationReason}` : "ผู้จัดไม่ได้ระบุเหตุผล"}
                            </p>
                        </div>
                    )}

                    <div className="mt-3.5 flex flex-wrap gap-2">
                        <InfoChip icon={Calendar}>{formatEventDate(reg.activity.date)}</InfoChip>
                        <InfoChip icon={Clock}>
                            {reg.activity.startTime} – {reg.activity.endTime}
                        </InfoChip>
                        <InfoChip icon={MapPin}>{reg.activity.location}</InfoChip>
                        {reg.checkInTime && <InfoChip icon={CheckCircle2}>เช็คอิน {formatDateTime(reg.checkInTime)}</InfoChip>}
                        {/* ชั่วโมงจิตอาสา — นับสะสมจริงเมื่อเช็คอินแล้วเท่านั้น */}
                        {reg.activity.volunteerHours && (
                            <InfoChip icon={HeartHandshake}>
                                จิตอาสา {Number(reg.activity.volunteerHours)} ชม.
                                {reg.activity.volunteerRole ? ` · ${reg.activity.volunteerRole}` : ""}
                            </InfoChip>
                        )}
                    </div>

                    {/* ผลประเมินของกิจกรรมนี้ — กางในการ์ด ไม่ใช่กระโดดไปหน้าโปรไฟล์ที่แสดงค่าเฉลี่ยรวม */}
                    {reg.evaluation && evaluationOpen && (
                        <div id={evalPanelId}>
                            <RegistrationEvaluation scores={reg.evaluation} comment={reg.evaluation.comment} status={reg.evaluation.status} />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-denim-line bg-denim-paper/70 px-5 py-3 sm:px-6">
                    <Link
                        href={`/student/activities/${reg.activity.publicId}`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-denim-deep px-4 text-sm font-semibold text-white transition-colors hover:bg-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                    >
                        ดูรายละเอียดกิจกรรม
                        <ArrowRight className="size-4 text-amber" aria-hidden="true" />
                    </Link>

                    {bucket === "confirmed" && !attended && reg.activity.publicId && (
                        <QrCheckInButton activityId={reg.activity.publicId} activityName={reg.activity.name} />
                    )}

                    {attended && (
                        <button type="button" className={CARD_ACTION} onClick={onOpenSurvey}>
                            <Star className="size-4" aria-hidden="true" />
                            ให้คะแนนกิจกรรม
                        </button>
                    )}

                    {attended && reg.activity.status === "completed" && reg.activity.peerAssessmentEnabled && (
                        <button type="button" className={CARD_ACTION} onClick={onOpenAssessment}>
                            <Users className="size-4" aria-hidden="true" />
                            ประเมินตนเองและเพื่อน
                        </button>
                    )}

                    {reg.evaluation && (
                        <button
                            type="button"
                            className={CARD_ACTION}
                            aria-expanded={evaluationOpen}
                            aria-controls={evaluationOpen ? evalPanelId : undefined}
                            onClick={onToggleEvaluation}
                        >
                            <ChevronDown className={cn("size-4 transition-transform", evaluationOpen && "rotate-180")} aria-hidden="true" />
                            {evaluationOpen ? "ซ่อนผลประเมิน" : "ดูผลประเมินกิจกรรมนี้"}
                        </button>
                    )}

                    {reg.evaluation && (
                        <Link
                            href="/student/profile"
                            className="inline-flex min-h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-denim underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                        >
                            ดูภาพรวมทักษะ
                        </Link>
                    )}

                    {/* ยกเลิกได้เฉพาะก่อนเช็คอิน และกิจกรรมยังไม่ถูกผู้จัดยกเลิกทั้งงาน */}
                    {(bucket === "pending" || bucket === "confirmed") && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                        >
                            <XCircle className="size-4" aria-hidden="true" />
                            ยกเลิกกิจกรรม
                        </button>
                    )}
                </div>
            </div>
        </article>
    )
}

export function RegistrationCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-denim-line bg-white sm:flex-row" aria-hidden="true">
            <div className="h-32 animate-pulse bg-denim-chip sm:h-auto sm:w-44 md:w-[200px]" />
            <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="h-5 w-64 max-w-full animate-pulse rounded-md bg-denim-paper" />
                <div className="h-7 w-3/4 animate-pulse rounded-md bg-denim-chip" />
                <div className="flex gap-2">
                    <div className="h-8 w-32 animate-pulse rounded-lg bg-denim-paper" />
                    <div className="h-8 w-28 animate-pulse rounded-lg bg-denim-paper" />
                </div>
                <div className="mt-2 h-10 w-48 animate-pulse rounded-[10px] bg-denim-paper" />
            </div>
        </div>
    )
}
