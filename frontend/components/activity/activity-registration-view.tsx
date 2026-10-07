"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Layers } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { ActivityAboutPanel, ActivityRegistrationPanel } from "@/components/activity/activity-info-panels"
import { BenefitsSection } from "@/components/activity/benefits-section"
import { KeyDetailsCard } from "@/components/activity/key-details-card"
import { MobileActionBar } from "@/components/activity/mobile-action-bar"
import { RegistrationActionCard } from "@/components/activity/registration-action-card"
import { SessionSelector, type SessionItem } from "@/components/activity/session-selector"
import {
    closedReason,
    countOpenAlternatives,
    describeAction,
    formatActivitySchedule,
    formatScheduleShort,
    pickMyRegistration,
    seatInfo,
    sessionTag,
    type MyRegistrationLike,
} from "@/lib/activity-view"
import { categoryLabel } from "@/lib/categories"
import type { Activity } from "@/lib/api"

/** เนื้อหายาวพับไว้ 2 บรรทัด — คำอธิบายงานหลักไม่ควรดันตัวเลือกกิจกรรมลงไปต่ำกว่าจอแรก */
function ExpandableText({ text }: { text: string }) {
    const [open, setOpen] = useState(false)
    const long = text.length > 160 || text.split("\n").length > 2

    return (
        <div className="max-w-3xl">
            <p className={`whitespace-pre-line leading-relaxed text-fg-muted ${open || !long ? "" : "line-clamp-2"}`}>{text}</p>
            {long && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="mt-1 text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
                    aria-expanded={open}
                >
                    {open ? "ย่อ" : "อ่านเพิ่ม"}
                </button>
            )}
        </div>
    )
}

export interface ActivityRegistrationViewProps {
    /** ชื่อที่แสดงใน Hero: งานที่มีหลายกิจกรรม = ชื่องาน, กิจกรรมเดี่ยว = ชื่อกิจกรรม */
    title: string
    imageUrl: string
    organizerName?: string | null
    /** คำอธิบายงานหลัก (เฉพาะงานที่มีหลายกิจกรรม) */
    intro?: string | null
    activities: Activity[]
    activeId: number | null
    onSelectActivity: (id: number) => void
    registrationOpenAt?: string | null
    registrationCloseAt?: string | null
    myRegistrations: MyRegistrationLike[]
    onRegister: () => void
    onCancel: () => void
    onShare: () => void
    backHref: string
    /**
     * แสดงรูปของกิจกรรมที่เลือกในส่วนรายละเอียด — หน้า "งาน" เปิด (รูปด้านบนเป็นรูปปกงาน รูปของแต่ละกิจกรรมย่อยไม่เคยแสดงที่อื่น)
     * หน้ากิจกรรมเดี่ยวปิด (รูปด้านบนเป็นรูปของกิจกรรมนั้นอยู่แล้ว)
     */
    showActivityImage?: boolean
    /** Dialog ต่างๆ ของหน้า — วางไว้ในต้นไม้เดียวกัน */
    children?: React.ReactNode
}

/**
 * หน้าลงทะเบียน/รายละเอียดกิจกรรมของนักศึกษา (ใช้ร่วมทั้งหน้า "งาน" และ "กิจกรรมเดี่ยว")
 *
 * Layout: ซ้าย 70% (เนื้อหา) / ขวา 30% (การ์ดสมัคร sticky) — Hero อยู่ในคอลัมน์ซ้ายเพื่อให้การ์ดสมัครเริ่มที่ระดับเดียวกัน
 * (ปุ่มสมัครอยู่ในจอแรก) บนจอเล็กเรียงเป็นคอลัมน์เดียวโดยการ์ดสมัครอยู่ต่อจากตัวเลือกกิจกรรม + แถบสมัครติดขอบล่าง
 * ข้อมูลแต่ละอย่างอยู่ที่เดียว: ที่นั่ง/วัน-เวลา/สถานที่ → Key Details, วันปิดรับสมัคร → การ์ดสมัคร, ทักษะ/ชั่วโมงจิตอาสา → Benefits
 */
export function ActivityRegistrationView({
    title,
    imageUrl,
    organizerName,
    intro,
    activities,
    activeId,
    onSelectActivity,
    registrationOpenAt,
    registrationCloseAt,
    myRegistrations,
    onRegister,
    onCancel,
    onShare,
    backHref,
    showActivityImage = false,
    children,
}: ActivityRegistrationViewProps) {
    const now = new Date()
    const isProject = activities.length > 1

    // ลำดับกิจกรรมคงตามที่ผู้จัดตั้งไว้ (ไม่เรียงใหม่) — อาจตั้งใจเรียง เช่น ห้อง CS2, CS3, จิตอาสา
    const rows = activities.map((activity) => {
        const seat = seatInfo(activity.capacity, activity.registeredCount)
        const closed = closedReason(
            { status: activity.status, approvalStatus: activity.approvalStatus, registrationOpenAt, registrationCloseAt },
            now
        )
        const mine = pickMyRegistration(myRegistrations, activity.id)
        return { activity, seat, closed, mine, tag: sessionTag({ seat, closed, mine }) }
    })
    const activeIndex = rows.findIndex((r) => r.activity.id === activeId)
    const active = activeIndex >= 0 ? rows[activeIndex] : null

    const sessions: SessionItem[] = rows.map((r) => ({
        id: r.activity.id,
        name: r.activity.name,
        tag: r.tag,
        schedule: formatScheduleShort(r.activity),
        seats: r.seat.shortLabel,
    }))

    const view = active
        ? describeAction({
              registrationType: active.activity.registrationType,
              seat: active.seat,
              closed: active.closed,
              mine: active.mine,
              openAt: registrationOpenAt,
              closeAt: registrationCloseAt,
              now,
              openAlternatives: countOpenAlternatives(
                  rows.map((r) => ({ id: r.activity.id, tag: r.tag })),
                  active.activity.id
              ),
          })
        : null

    const categories = [...new Set(activities.flatMap((a) => a.categories ?? []))]

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })

    const actionCard = view && active && (
        <RegistrationActionCard
            id="registration-card"
            view={view}
            sessionName={isProject ? active.activity.name : null}
            onRegister={onRegister}
            onCancel={onCancel}
            onShare={onShare}
            onSeeAlternatives={() => scrollTo("session-selector")}
            myRegistrationsHref="/student/my-registrations"
        />
    )

    return (
        <div className="min-h-screen bg-surface pb-28 lg:pb-12">
            <Container className="py-8">
                <div className="mb-6">
                    <Link href={backHref} className="inline-flex items-center text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> กลับ
                    </Link>
                </div>

                {/*
                  ลำดับใน DOM: [A ภาพหน้าปก+ตัวเลือกกิจกรรม] → [การ์ดสมัคร] → [B รายละเอียด]
                  จอเล็กเรียงตามนี้ (การ์ดสมัครต่อจากตัวเลือกกิจกรรม) จอ lg การ์ดสมัครไปคอลัมน์ขวาและกินสองแถว
                */}
                <div className="grid gap-x-8 gap-y-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
                    <div className="min-w-0 space-y-6 lg:col-start-1">
                        {/* Hero — รูปปก 16:9 แท้ ไม่มี max-h มาบังคับทับสัดส่วนที่ครอปไว้ตอนอัปโหลด */}
                        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-sm">
                            <div className="aspect-video w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imageUrl} alt={title} className="size-full object-cover" />
                            </div>
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                            />
                            {isProject && (
                                <div className="absolute left-4 top-4">
                                    <Badge className="gap-1 bg-brand-600 text-white">
                                        <Layers className="size-3.5" aria-hidden="true" /> โครงการ · {activities.length} กิจกรรม
                                    </Badge>
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-8">
                                <h1 className="text-2xl font-black text-white drop-shadow-sm sm:text-3xl md:text-4xl">{title}</h1>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-white/90">
                                    {categories.map((c) => (
                                        <span key={c} className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur">
                                            {categoryLabel(c)}
                                        </span>
                                    ))}
                                    {organizerName && <span>จัดโดย {organizerName}</span>}
                                </div>
                            </div>
                        </div>

                        {intro && <ExpandableText text={intro} />}

                        {isProject && (
                            <section id="session-selector" aria-labelledby="session-heading" className="scroll-mt-24 space-y-3">
                                <h2 id="session-heading" className="flex items-center gap-2 text-lg font-bold text-fg">
                                    <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white" aria-hidden="true">
                                        1
                                    </span>
                                    เลือกกิจกรรมที่ต้องการสมัคร
                                </h2>
                                <SessionSelector sessions={sessions} activeId={activeId} onSelect={onSelectActivity} />
                            </section>
                        )}
                    </div>

                    {actionCard && (
                        <aside className="min-w-0 scroll-mt-24 self-start lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                            {actionCard}
                        </aside>
                    )}

                    {active && (
                        <div className="min-w-0 space-y-8 lg:col-start-1">
                            {/* ชื่อกิจกรรมต้องแสดงเสมอเมื่อต่างจากชื่องาน แม้งานมีกิจกรรมเดียว (เดิมชื่อกิจกรรมหายไปทั้งหน้าในกรณีนี้) */}
                            {(isProject || active.activity.name.trim() !== title.trim()) && (
                                <div>
                                    {isProject && (
                                        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                                            <Layers className="size-3.5" aria-hidden="true" />
                                            กิจกรรมที่เลือก ({activeIndex + 1} จาก {activities.length})
                                            <ChevronRight className="size-3.5" aria-hidden="true" />
                                        </div>
                                    )}
                                    <h2 className="text-xl font-bold text-fg sm:text-2xl">{active.activity.name}</h2>
                                </div>
                            )}

                            <KeyDetailsCard
                                schedule={formatActivitySchedule(active.activity)}
                                location={active.activity.location}
                                seat={active.seat}
                            />
                            <BenefitsSection activity={active.activity} />
                            <ActivityAboutPanel activity={active.activity} showActivityImage={showActivityImage} hideMeta />
                            <ActivityRegistrationPanel activity={active.activity} hideLogistics />
                        </div>
                    )}
                </div>
            </Container>

            {view && active && (
                <MobileActionBar
                    view={view}
                    sessionName={isProject ? active.activity.name : null}
                    statusLine={view.headline ?? (view.primary?.disabled ? view.primary.label : active.seat.label)}
                    onRegister={onRegister}
                    onOpenCard={() => scrollTo("registration-card")}
                />
            )}

            {children}
        </div>
    )
}
