"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Ban, Calendar, CalendarClock, CheckCheck, CheckCircle2, Clock, Layers, MapPin, Share2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SessionSelector, type SessionItem } from "@/components/activity/session-selector"
import { categoryLabel } from "@/lib/categories"
import { cn } from "@/lib/utils"
import type { ActionTone, ActionView, ScheduleLabel, SeatInfo } from "@/lib/activity-view"

const BANNER_TONE: Record<Exclude<ActionTone, "brand">, string> = {
    success: "border-success/30 bg-success-bg text-success-fg",
    warning: "border-warning/30 bg-warning-bg text-warning",
    info: "border-info/30 bg-info-bg text-info",
    neutral: "border-border bg-surface-2 text-fg-muted",
}

const BANNER_ICON: Partial<Record<ActionView["kind"], LucideIcon>> = {
    registered: CheckCircle2,
    pending: Clock,
    attended: CheckCheck,
    full: Ban,
    closed: Ban,
}

const STATUS_PILL_TONE: Record<ActionTone, string> = {
    brand: "bg-success text-white",
    success: "bg-success text-white",
    warning: "bg-warning text-white",
    info: "bg-info text-white",
    neutral: "bg-black/70 text-white",
}

/** ปุ่มหลักที่ปิดใช้งานแต่ยัง "อ่านออก" — บอกเหตุผลว่าทำไมสมัครไม่ได้ ไม่ใช่ปุ่มจางที่ดูเหมือนพัง */
const DISABLED_PRIMARY = "disabled:opacity-100 disabled:bg-surface-2 disabled:text-fg-muted disabled:border disabled:border-border"

interface ActivityRegistrationHeroProps {
    id?: string
    imageUrl: string
    title: string
    categories: string[]
    organizerName?: string | null
    isProject: boolean
    sessions: SessionItem[]
    activeId: number | null
    onSelectActivity: (id: number) => void
    schedule: ScheduleLabel
    location: string
    seat: SeatInfo
    view: ActionView
    /** ชื่อกิจกรรมที่กำลังจะสมัคร — แสดงเมื่องานมีหลายกิจกรรมเพื่อให้รู้ว่ากดสมัครอะไรอยู่ */
    sessionName?: string | null
    onRegister: () => void
    onCancel: () => void
    onShare: () => void
    onSeeAlternatives?: () => void
    myRegistrationsHref: string
}

/**
 * การ์ดหลักของหน้าลงทะเบียน — รวมรูป/หมวดหมู่/ชื่อ/วันเวลา-สถานที่/เลือกกิจกรรม (ถ้ามีหลายกิจกรรม)/
 * สถานะ+ปุ่มสมัคร ไว้ในการ์ดเดียว แทนที่เดิมที่แยกเป็น 3 ส่วน (รูปพื้นหลังเต็ม+ข้อความทับ, หัวข้อ
 * "เลือกกิจกรรม" แยกต่างหาก, การ์ดสมัคร sticky ทางขวา) ดีไซน์อิงแนวเดียวกับ ActivityHeroCard
 * ฝั่งผู้จัด เพื่อให้สองมุมมองดูเป็นตระกูลเดียวกัน แต่ไม่ใช้คอมโพเนนต์ร่วมกันตรงๆ เพราะหน้านี้ต้องมี
 * ตัวเลือกกิจกรรมหลายรายการ + สถานะการสมัครที่ซับซ้อนกว่าแถวปุ่มจัดการทั่วไปของฝั่งผู้จัด
 *
 * สถานะ "เปิดรับสมัครปกติ ไม่มีอะไรต้องแจ้งเป็นพิเศษ" แสดงแถวที่นั่ง+ปุ่มสมัครแนวนอนกะทัดรัด
 * ส่วนสถานะอื่น (รอยืนยัน/ลงทะเบียนแล้ว/เช็คอินแล้ว/เต็ม/ปิดรับ/ยังไม่เปิด) ใช้ชุด banner+ปุ่มแบบเต็ม
 * เหมือนการ์ดสมัครเดิม (RegistrationActionCard) ที่ยุบรวมมาไว้ในไฟล์นี้ เพราะไม่มีที่ใช้ซ้ำที่อื่นแล้ว
 */
export function ActivityRegistrationHero({
    id,
    imageUrl,
    title,
    categories,
    organizerName,
    isProject,
    sessions,
    activeId,
    onSelectActivity,
    schedule,
    location,
    seat,
    view,
    sessionName,
    onRegister,
    onCancel,
    onShare,
    onSeeAlternatives,
    myRegistrationsHref,
}: ActivityRegistrationHeroProps) {
    const byline = [categories.map((c) => categoryLabel(c)).join(", "), organizerName && `จัดโดย ${organizerName}`]
        .filter(Boolean)
        .join(" · ")

    const statusText = view.kind === "open" ? "เปิดรับสมัคร" : (view.headline ?? view.primary?.label ?? "")
    const BannerIcon = BANNER_ICON[view.kind]
    // แถวย่อ (ที่นั่ง+ปุ่ม) เฉพาะตอนเปิดรับสมัครปกติไม่มีอะไรต้องแจ้งพิเศษ — สถานะอื่นทั้งหมดใช้ชุดเต็มด้านล่าง
    const simple = view.kind === "open" && !view.headline

    const seatToneClass = seat.level === "full" ? "text-danger-fg" : seat.level === "low" ? "text-warning" : "text-fg-muted"

    return (
        <Card id={id} className="overflow-hidden border-border shadow-sm">
            <div className="flex flex-col gap-4 p-4 md:flex-row">
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 md:w-80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={title} className="size-full object-cover" />
                    {statusText && (
                        <span className={cn("absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold", STATUS_PILL_TONE[view.tone])}>
                            {statusText}
                        </span>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                    {byline && <p className="text-sm font-medium text-brand-600">{byline}</p>}
                    {/* pt-1 pb-0.5 + leading-snug กันสระ/วรรณยุกต์ไทยโดนตัดขอบบน-ล่าง (leading-tight แน่นเกินไปสำหรับฟอนต์ไทย) */}
                    <h1 className="pb-0.5 pt-1 text-xl font-black leading-snug text-fg md:text-2xl">{title}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5">
                            <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                            {schedule.dateLabel}
                            {schedule.timeLabel && ` (${schedule.timeLabel})`}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5">
                            <MapPin className="size-3.5 shrink-0" aria-hidden="true" /> {location || "-"}
                        </span>
                    </div>

                    {isProject && (
                        <div className="space-y-2 pt-1">
                            <p className="text-sm font-semibold text-fg">เลือกรอบกิจกรรม:</p>
                            <SessionSelector sessions={sessions} activeId={activeId} onSelect={onSelectActivity} />
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-border p-4">
                {sessionName && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                        <Layers className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">
                            กำลังสมัคร: <strong className="font-bold">{sessionName}</strong>
                        </span>
                    </div>
                )}

                {simple ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <span className={cn("text-sm font-semibold", seatToneClass)}>
                            <Users className="mr-1.5 inline size-4 align-text-bottom" aria-hidden="true" />
                            ที่นั่งคงเหลือ: {seat.label}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl" onClick={onShare} aria-label="แชร์กิจกรรมนี้">
                                <Share2 className="size-4" aria-hidden="true" />
                            </Button>
                            {view.primary && (
                                <Button size="xl" className="rounded-xl font-bold" onClick={onRegister}>
                                    {view.primary.label}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div aria-live="polite">
                            {view.headline && view.tone !== "brand" && (
                                <div className={cn("rounded-xl border px-4 py-3", BANNER_TONE[view.tone as Exclude<ActionTone, "brand">])}>
                                    <div className="flex items-center gap-2 text-base font-bold">
                                        {BannerIcon && <BannerIcon className="size-5 shrink-0" aria-hidden="true" />}
                                        {view.headline}
                                    </div>
                                    {view.detail && <p className="mt-1 text-sm opacity-90">{view.detail}</p>}
                                </div>
                            )}
                        </div>

                        {view.primary && (
                            <Button
                                size="xl"
                                className={cn("w-full rounded-xl font-bold sm:w-auto", view.primary.disabled && DISABLED_PRIMARY)}
                                disabled={view.primary.disabled}
                                onClick={onRegister}
                            >
                                {view.primary.label}
                            </Button>
                        )}

                        {!view.headline && view.detail && <p className="text-sm text-fg-muted">{view.detail}</p>}

                        {view.deadline && (
                            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-fg-muted">
                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                {view.deadline}
                            </div>
                        )}

                        {view.alternativesHint && onSeeAlternatives && (
                            <button
                                type="button"
                                onClick={onSeeAlternatives}
                                className="text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
                            >
                                {view.alternativesHint}
                            </button>
                        )}

                        {view.link && (
                            <Link href={myRegistrationsHref} className="block text-sm font-medium text-brand-600 underline-offset-4 hover:underline">
                                {view.link.label}
                            </Link>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                            {view.canCancel && view.cancelLabel && (
                                <Button
                                    variant="outline"
                                    className="rounded-xl text-fg-muted hover:border-danger/30 hover:bg-danger-bg hover:text-danger-fg"
                                    onClick={onCancel}
                                >
                                    {view.cancelLabel}
                                </Button>
                            )}
                            <Button variant="ghost" className="rounded-xl" onClick={onShare}>
                                <Share2 className="size-4" aria-hidden="true" /> แชร์กิจกรรมนี้
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
