"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, CalendarClock, CheckCheck, CheckCircle2, Clock, Users } from "lucide-react"
import { ShareMenu } from "@/components/ui/share-menu"
import { AMBER_BUTTON } from "@/components/denim/denim-ui"
import type { ActionTone, ActionView, SeatInfo } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

/* แถบกรมท่าท้ายการ์ดหัวเรื่องของหน้ารายละเอียดกิจกรรม (ดู ActivityDetailHero) */

const BAR = "bg-denim-deep text-white"
const BAR_ROW = "flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
const DIVIDER = "hidden h-9 border-l border-dashed border-amber/40 sm:block"

/** ปุ่มแชร์วงกลมเส้นขอบขาวบนพื้นกรมท่า */
const SHARE_ON_DENIM = "size-11 rounded-full border-[1.5px] border-white/35 text-white hover:bg-white/10 hover:text-white"

const HEADLINE_TONE: Record<ActionTone, string> = {
    brand: "text-denim-on-muted",
    success: "text-emerald-300",
    warning: "text-amber",
    info: "text-sky-200",
    neutral: "text-denim-on-muted",
}

const HEADLINE_ICON: Partial<Record<ActionView["kind"], LucideIcon>> = {
    registered: CheckCircle2,
    pending: Clock,
    attended: CheckCheck,
}

const SEAT_TONE: Record<SeatInfo["level"], string> = {
    ok: "text-denim-on",
    low: "text-amber",
    full: "text-red-300",
}

interface RegistrationBarProps {
    view: ActionView
    seat: SeatInfo
    /** ชื่อรอบ/กิจกรรมที่กำลังจะสมัคร */
    sessionName: string
    /** ป้ายเหนือชื่อเมื่อไม่มีสถานะของฉัน: "กำลังสมัคร" ตอนเปิดรับ, อย่างอื่นตามที่ผู้เรียกกำหนด */
    idleLabel: string
    shareUrl: string
    shareTitle: string
    onShareCopied?: () => void
    onRegister: () => void
    onCancel: () => void
    onSeeAlternatives?: () => void
    myRegistrationsHref: string
}

/**
 * แถบสมัคร — ทุกสถานะของการสมัคร (describeAction) อยู่ในแถบเดียว: สมัครได้ = ปุ่มอำพัน, สมัครแล้ว/รอยืนยัน =
 * หัวข้อสีตามสถานะ + ยกเลิก + ลิงก์ไปกิจกรรมของฉัน, เต็ม/ปิดรับ = ปุ่มปิดใช้งานที่บอกเหตุผล
 * ข้อมูลรอง (วันปิดรับพร้อมนับถอยหลัง, คำอธิบายสถานะ, ชวนดูรอบอื่น) อยู่แถวล่างของแถบ
 */
export function RegistrationBar({
    view,
    seat,
    sessionName,
    idleLabel,
    shareUrl,
    shareTitle,
    onShareCopied,
    onRegister,
    onCancel,
    onSeeAlternatives,
    myRegistrationsHref,
}: RegistrationBarProps) {
    const HeadlineIcon = HEADLINE_ICON[view.kind]
    const hasNotes = Boolean(view.deadline || view.detail || (view.alternativesHint && onSeeAlternatives))

    return (
        <div className={BAR}>
            <div className={BAR_ROW}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2" aria-live="polite">
                    <div className="min-w-0">
                        <p className={cn("flex items-center gap-1.5 text-xs font-semibold", view.headline ? HEADLINE_TONE[view.tone] : "text-denim-on-muted")}>
                            {HeadlineIcon && <HeadlineIcon className="size-3.5 shrink-0" aria-hidden="true" />}
                            {view.headline ?? idleLabel}
                        </p>
                        <p className="truncate font-display text-base font-bold">{sessionName}</p>
                    </div>
                    <span className={DIVIDER} aria-hidden="true" />
                    <p className={cn("flex items-center gap-1.5 text-sm", SEAT_TONE[seat.level])}>
                        <Users className="size-4 shrink-0" aria-hidden="true" />
                        ที่นั่งคงเหลือ: {seat.label}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <ShareMenu url={shareUrl} title={shareTitle} onCopied={onShareCopied} variant="ghost" size="icon" className={SHARE_ON_DENIM} />
                    {view.canCancel && view.cancelLabel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-white/35 px-4 text-sm font-semibold text-white transition-colors hover:border-red-300/70 hover:bg-red-400/10 hover:text-red-100 focus-visible:outline-white"
                        >
                            {view.cancelLabel}
                        </button>
                    )}
                    {view.link && (
                        <Link
                            href={myRegistrationsHref}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-denim-deep transition-colors hover:bg-denim-on focus-visible:outline-white"
                        >
                            {view.link.label}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    )}
                    {view.primary &&
                        (view.primary.disabled ? (
                            // ปิดใช้งานแต่ยัง "อ่านออก" — บอกเหตุผลว่าทำไมสมัครไม่ได้ ไม่ใช่ปุ่มจางที่ดูเหมือนพัง
                            <button
                                type="button"
                                disabled
                                className="inline-flex min-h-12 cursor-not-allowed items-center rounded-[14px] bg-white/10 px-5 text-sm font-semibold text-denim-on"
                            >
                                {view.primary.label}
                            </button>
                        ) : (
                            <button type="button" onClick={onRegister} className={cn(AMBER_BUTTON, "min-h-12 px-5 text-[15px]")}>
                                {view.primary.label}
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </button>
                        ))}
                </div>
            </div>

            {hasNotes && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-white/10 px-5 py-3 text-xs text-denim-on sm:px-6">
                    {view.deadline && (
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                            {view.deadline}
                        </span>
                    )}
                    {view.detail && <span>{view.detail}</span>}
                    {view.alternativesHint && onSeeAlternatives && (
                        <button
                            type="button"
                            onClick={onSeeAlternatives}
                            className="font-semibold text-amber underline-offset-4 hover:underline focus-visible:outline-white"
                        >
                            {view.alternativesHint}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

interface PreviewBarProps {
    label: string
    sessionName: string
    seat: SeatInfo
    shareUrl: string
    shareTitle: string
    onShareCopied?: () => void
}

/** แถบของมุมมองผู้จัด (ดูอย่างเดียว) — จำนวนผู้ลงทะเบียน + แถบความคืบหน้า + แชร์ แทนปุ่มสมัคร */
export function PreviewBar({ label, sessionName, seat, shareUrl, shareTitle, onShareCopied }: PreviewBarProps) {
    const fill = seat.level === "full" ? "bg-red-400" : seat.level === "low" ? "bg-amber" : "bg-emerald-400"
    return (
        <div className={BAR}>
            <div className={BAR_ROW}>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-denim-on-muted">{label}</p>
                        <p className="truncate font-display text-base font-bold">{sessionName}</p>
                    </div>
                    <span className={DIVIDER} aria-hidden="true" />
                    <div className="min-w-[200px] flex-1 sm:max-w-xs">
                        <p className={cn("flex items-center gap-1.5 text-sm", SEAT_TONE[seat.level])}>
                            <Users className="size-4 shrink-0" aria-hidden="true" />
                            ผู้ลงทะเบียน {seat.registered}
                            {seat.unlimited ? " คน (ไม่จำกัด)" : `/${seat.capacity} คน`}
                        </p>
                        {!seat.unlimited && (
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                                <div className={cn("h-full rounded-full", fill)} style={{ width: `${seat.percent}%` }} />
                            </div>
                        )}
                    </div>
                </div>
                <ShareMenu url={shareUrl} title={shareTitle} onCopied={onShareCopied} variant="ghost" size="icon" className={SHARE_ON_DENIM} />
            </div>
        </div>
    )
}
