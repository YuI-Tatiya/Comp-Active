"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Layers } from "lucide-react"
import { Container } from "@/components/layout/container"
import {
    ActivityAboutPanel,
    ActivityAgendaPanel,
    ActivityRegistrationPanel,
    PANEL_CLASS,
    type AgendaSession,
} from "@/components/activity/activity-info-panels"
import { ActivityRegistrationHero } from "@/components/activity/activity-registration-hero"
import { BenefitsSection } from "@/components/activity/benefits-section"
import { MobileActionBar } from "@/components/activity/mobile-action-bar"
import { type SessionItem } from "@/components/activity/session-selector"
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
    /** ลิงก์สาธารณะของกิจกรรมนี้ — ส่งต่อให้ ShareMenu ใน ActivityRegistrationHero (ต้องเป็นลิงก์ /events/... เสมอ ไม่ว่าหน้านี้จะถูกเรียกจาก role ไหน) */
    shareUrl: string
    /** เรียกหลังผู้ใช้คัดลอกลิงก์สำเร็จ — ให้หน้าที่เรียกโชว์ Toast เอง */
    onShareCopied?: () => void
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
 * โครงหน้า: การ์ดเดียวด้านบนรวมรูป/ชื่อ/วันเวลา-สถานที่/เลือกกิจกรรม/สถานะ+ปุ่มสมัครไว้ด้วยกัน
 * (ดู ActivityRegistrationHero) ตามด้วย 2 คอลัมน์ด้านล่าง: รายละเอียดกิจกรรม (ซ้าย) + สิ่งที่จะได้รับ (ขวา)
 * ไม่แสดงการ์ดชั่วโมงจิตอาสาในส่วน "สิ่งที่จะได้รับ" ที่นี่ (showVolunteer={false}) — หน้าลงทะเบียนไม่ใช่ที่ที่ควรบอกเรื่องนี้
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
    shareUrl,
    onShareCopied,
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

    // กำหนดการกิจกรรมย่อย — เฉพาะงานที่มีหลายกิจกรรมย่อย ดู ActivityAgendaPanel
    const agendaSessions: AgendaSession[] = rows.map((r) => ({
        id: r.activity.id,
        name: r.activity.name,
        schedule: formatActivitySchedule(r.activity),
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

    return (
        <div className="min-h-screen bg-surface pb-28 lg:pb-12">
            <Container className="py-8">
                <div className="mb-6">
                    <Link href={backHref} className="inline-flex items-center text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> กลับ
                    </Link>
                </div>

                <div className="space-y-4">
                    {view && active && (
                        <ActivityRegistrationHero
                            id="registration-card"
                            imageUrl={imageUrl}
                            title={title}
                            categories={categories}
                            organizerName={organizerName}
                            isProject={isProject}
                            sessions={sessions}
                            activeId={activeId}
                            onSelectActivity={onSelectActivity}
                            schedule={formatActivitySchedule(active.activity)}
                            location={active.activity.location}
                            seat={active.seat}
                            view={view}
                            sessionName={isProject ? active.activity.name : null}
                            onRegister={onRegister}
                            onCancel={onCancel}
                            shareUrl={shareUrl}
                            onShareCopied={onShareCopied}
                            onSeeAlternatives={() => scrollTo("registration-card")}
                            myRegistrationsHref="/student/my-registrations"
                        />
                    )}

                    {intro && <ExpandableText text={intro} />}

                    {active && (
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
                            <div className="min-w-0 space-y-4">
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

                                {/* การ์ดเดียวรวมรายละเอียด+กำหนดการ+ต้องเตรียมอะไรบ้าง แทนที่เดิมแยกเป็นการ์ดละอัน
                                    ให้เนื้อหาซ้ายทั้งหมดอยู่ในกรอบเดียวกัน ลดพื้นที่ว่างระหว่างการ์ด */}
                                <div className={PANEL_CLASS}>
                                    <ActivityAboutPanel activity={active.activity} showActivityImage={showActivityImage} hideMeta bare />
                                    {agendaSessions.length > 1 && (
                                        <>
                                            <hr className="border-border" />
                                            <ActivityAgendaPanel sessions={agendaSessions} />
                                        </>
                                    )}
                                    <hr className="border-border" />
                                    <ActivityRegistrationPanel activity={active.activity} hideLogistics bare />
                                </div>
                            </div>

                            <div className="min-w-0">
                                <div className={PANEL_CLASS}>
                                    <BenefitsSection activity={active.activity} showVolunteer={false} />
                                </div>
                            </div>
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
