"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Ban, CalendarClock, CheckCheck, CheckCircle2, Clock, Layers, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ActionKind, ActionTone, ActionView } from "@/lib/activity-view"
import { cn } from "@/lib/utils"

const BANNER_TONE: Record<Exclude<ActionTone, "brand">, string> = {
    success: "border-success/30 bg-success-bg text-success-fg",
    warning: "border-warning/30 bg-warning-bg text-warning",
    info: "border-info/30 bg-info-bg text-info",
    neutral: "border-border bg-surface-2 text-fg-muted",
}

const BANNER_ICON: Record<ActionKind, LucideIcon | null> = {
    open: null,
    registered: CheckCircle2,
    pending: Clock,
    attended: CheckCheck,
    full: Ban,
    closed: Ban,
}

/** ปุ่มหลักที่ปิดใช้งานแต่ยัง "อ่านออก" — บอกเหตุผลว่าทำไมสมัครไม่ได้ ไม่ใช่ปุ่มจางที่ดูเหมือนพัง */
const DISABLED_PRIMARY = "disabled:opacity-100 disabled:bg-surface-2 disabled:text-fg-muted disabled:border disabled:border-border"

interface RegistrationActionCardProps {
    view: ActionView
    /** ชื่อกิจกรรมที่กำลังจะสมัคร — แสดงเมื่องานมีหลายกิจกรรมเพื่อให้รู้ว่ากดสมัครอะไรอยู่ */
    sessionName?: string | null
    onRegister: () => void
    onCancel: () => void
    onShare: () => void
    onSeeAlternatives?: () => void
    myRegistrationsHref: string
    id?: string
    className?: string
}

/**
 * การ์ดสมัคร (Side Widget) — สถานะเป็นพระเอก: ปุ่มหลักโดดเด่นเฉพาะตอนสมัครได้จริง,
 * ลงทะเบียนสำเร็จเป็นแบนเนอร์เขียว และ "ยกเลิก" เป็นปุ่มรองสีเทา ไม่แย่งความเด่นจากสถานะ
 * ไม่แสดงวันเวลา/สถานที่/ที่นั่ง (อยู่ในการ์ดรายละเอียดที่เดียว) — เหลือเฉพาะวันปิดรับสมัคร
 */
export function RegistrationActionCard({
    view,
    sessionName,
    onRegister,
    onCancel,
    onShare,
    onSeeAlternatives,
    myRegistrationsHref,
    id,
    className,
}: RegistrationActionCardProps) {
    const BannerIcon = BANNER_ICON[view.kind]

    return (
        <Card id={id} className={cn("overflow-hidden rounded-2xl border-border shadow-sm", className)}>
            <div className="space-y-4 p-5 sm:p-6">
                {sessionName && (
                    <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                        <Layers className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">
                            กำลังสมัคร: <strong className="font-bold">{sessionName}</strong>
                        </span>
                    </div>
                )}

                {/* aria-live: อ่านสถานะใหม่ให้ผู้ใช้โปรแกรมอ่านหน้าจอเมื่อสมัคร/ยกเลิกสำเร็จ */}
                <div aria-live="polite">
                    {view.headline && view.tone !== "brand" && (
                        <div className={cn("rounded-xl border px-4 py-3", BANNER_TONE[view.tone])}>
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
                        className={cn("h-12 w-full rounded-xl text-base font-bold", view.primary.disabled && DISABLED_PRIMARY)}
                        disabled={view.primary.disabled}
                        onClick={onRegister}
                    >
                        {view.primary.label}
                    </Button>
                )}

                {!view.headline && view.detail && <p className="text-center text-xs text-fg-muted">{view.detail}</p>}

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
                        className="w-full text-center text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
                    >
                        {view.alternativesHint}
                    </button>
                )}

                {view.link && (
                    <Link href={myRegistrationsHref} className="block text-center text-sm font-medium text-brand-600 underline-offset-4 hover:underline">
                        {view.link.label}
                    </Link>
                )}

                <div className="space-y-2 border-t border-border pt-4">
                    {view.canCancel && view.cancelLabel && (
                        <Button
                            variant="outline"
                            className="w-full rounded-xl text-fg-muted hover:border-danger/30 hover:bg-danger-bg hover:text-danger-fg"
                            onClick={onCancel}
                        >
                            {view.cancelLabel}
                        </Button>
                    )}
                    <Button variant="ghost" className="w-full rounded-xl" onClick={onShare}>
                        <Share2 className="size-4" aria-hidden="true" /> แชร์กิจกรรมนี้
                    </Button>
                </div>
            </div>
        </Card>
    )
}
