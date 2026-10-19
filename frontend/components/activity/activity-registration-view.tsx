"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Container } from "@/components/layout/container"
import { TerminalPrompt } from "@/components/denim/denim-ui"
import { ActivityDetailHero, MobileDetailCover, type DetailStatusTone } from "@/components/activity/activity-detail-hero"
import { PreviewBar, RegistrationBar } from "@/components/activity/activity-detail-bars"
import {
    AboutSection,
    DETAIL_DIVIDER,
    DETAIL_PANEL,
    OrganizerCard,
    PrepareSection,
    RewardsCard,
    ScheduleSection,
} from "@/components/activity/activity-detail-sections"
import { MobileActionBar } from "@/components/activity/mobile-action-bar"
import { type SessionItem } from "@/components/activity/session-selector"
import {
    closedReason,
    countOpenAlternatives,
    coverDateParts,
    describeAction,
    formatActivitySchedule,
    formatScheduleShort,
    pickMyRegistration,
    roundLabel,
    seatInfo,
    sessionTag,
    type ActionView,
    type MyRegistrationLike,
} from "@/lib/activity-view"
import type { Activity } from "@/lib/api"
import { cn } from "@/lib/utils"

/** ป้ายสถานะบนปกตามสถานะการสมัครของรอบที่เลือก — ข้อความสั้นพอดีแคปซูล (ข้อความเต็มอยู่ในแถบสมัคร) */
function coverStatus(view: ActionView): { label: string; tone: DetailStatusTone } {
    switch (view.kind) {
        case "open":
            return { label: "เปิดรับสมัคร", tone: "open" }
        case "registered":
            return { label: "ลงทะเบียนแล้ว", tone: "success" }
        case "pending":
            return { label: "รอยืนยัน", tone: "warning" }
        case "attended":
            return { label: "เข้าร่วมแล้ว", tone: "info" }
        case "full":
            return { label: "เต็มแล้ว", tone: "neutral" }
        default:
            return { label: view.primary?.label ?? "ปิดรับสมัคร", tone: "neutral" }
    }
}

export interface ActivityRegistrationViewProps {
    /** ชื่อที่แสดงในการ์ดหัวเรื่อง: งาน = ชื่องาน, กิจกรรมเดี่ยว = ชื่อกิจกรรม */
    title: string
    /** path รูปที่ผู้จัดแนบ (รูปปกงานก่อน แล้วค่อยรูปของรอบที่เลือก) — null = ปกใช้ลายของธีม */
    imagePath?: string | null
    /** รหัสอ้างอิงบนปกและบรรทัดคำสั่ง เช่น EVT-0118 / ACT-0042 (referenceCode) */
    code: string
    organizerName?: string | null
    /** คำอธิบายงานหลัก (เฉพาะหน้า "งาน") */
    intro?: string | null
    activities: Activity[]
    activeId: number | null
    onSelectActivity: (id: number) => void
    registrationOpenAt?: string | null
    registrationCloseAt?: string | null
    /** ลิงก์สาธารณะของกิจกรรมนี้ — ต้องเป็นลิงก์ /events/... เสมอ ไม่ว่าหน้านี้จะถูกเรียกจาก role ไหน */
    shareUrl: string
    /** เรียกหลังผู้ใช้คัดลอกลิงก์สำเร็จ — ให้หน้าที่เรียกแจ้งผลเอง */
    onShareCopied?: () => void
    backHref: string
    /**
     * แสดงรูปของรอบที่เลือกในหัวข้อ "เกี่ยวกับกิจกรรมนี้" — หน้า "งาน" เปิด (รูปบนปกเป็นรูปของงาน รูปของรอบย่อยไม่เคยแสดง
     * ที่อื่น) หน้ากิจกรรมเดี่ยวปิด (รูปบนปกเป็นรูปของกิจกรรมนั้นอยู่แล้ว)
     */
    showActivityImage?: boolean
    /**
     * register = หน้านักศึกษา/บุคคลทั่วไป (แถบสมัคร + แถบสมัครติดขอบล่างบนมือถือ)
     * preview = มุมมองดูอย่างเดียวของผู้จัด (แถบจำนวนผู้ลงทะเบียน, แสดงช่วงรับสมัคร/ชั่วโมงจิตอาสา, ไม่มีการกระทำใดๆ)
     */
    mode?: "register" | "preview"
    myRegistrations?: MyRegistrationLike[]
    onRegister?: () => void
    onCancel?: () => void
    /** แจ้งเตือนเหนือการ์ดหัวเรื่อง เช่น งานยังไม่เผยแพร่ (มุมมองเจ้าของงาน) */
    notice?: React.ReactNode
    /** Dialog/Toast ของหน้า — วางไว้ในต้นไม้เดียวกัน */
    children?: React.ReactNode
}

const noop = () => {}

/**
 * หน้ารายละเอียด/ลงทะเบียนกิจกรรม (ธีม Denim) — ใช้ร่วมทุกมุมมอง: นักศึกษาและบุคคลทั่วไป ทั้งหน้า "งาน" และ
 * "กิจกรรมเดี่ยว" (mode="register") และมุมมองดูอย่างเดียวของผู้จัด (mode="preview") ซึ่งตั้งใจให้หน้าตาเหมือนฝั่ง
 * นักศึกษาทุกส่วน ต่างแค่แถบท้ายการ์ดหัวเรื่องกับข้อมูลที่ผู้จัดต้องเห็นเพิ่ม
 *
 * โครงหน้า: แถบยีนส์ด้านบน (ปุ่มกลับ + บรรทัดคำสั่ง) → การ์ดหัวเรื่องซ้อนขอบแถบ (ปก/ชื่อ/วันเวลา-สถานที่/เลือกรอบ/
 * แถบสมัคร) → 2 คอลัมน์: การ์ดรายละเอียดแบ่งหัวข้อ 01-03 (ซ้าย) + สิ่งที่จะได้รับและผู้จัด (ขวา)
 */
export function ActivityRegistrationView({
    title,
    imagePath,
    code,
    organizerName,
    intro,
    activities,
    activeId,
    onSelectActivity,
    registrationOpenAt,
    registrationCloseAt,
    shareUrl,
    onShareCopied,
    backHref,
    showActivityImage = false,
    mode = "register",
    myRegistrations = [],
    onRegister = noop,
    onCancel = noop,
    notice,
    children,
}: ActivityRegistrationViewProps) {
    const now = new Date()
    const isProject = activities.length > 1
    const preview = mode === "preview"

    // ลำดับรอบคงตามที่ผู้จัดตั้งไว้ (ไม่เรียงใหม่) — อาจตั้งใจเรียง เช่น ห้อง CS2, CS3, จิตอาสา
    const rows = activities.map((activity) => {
        const seat = seatInfo(activity.capacity, activity.registeredCount)
        const closed = closedReason(
            { status: activity.status, approvalStatus: activity.approvalStatus, registrationOpenAt, registrationCloseAt },
            now
        )
        // มุมมองผู้จัดไม่ใช่ผู้ลงทะเบียน — ไม่มี "ของฉัน" ป้ายสถานะจึงเป็นของรอบนั้นล้วนๆ
        const mine = preview ? undefined : pickMyRegistration(myRegistrations, activity.id)
        return { activity, seat, closed, mine, tag: sessionTag({ seat, closed, mine }) }
    })
    const activeIndex = rows.findIndex((r) => r.activity.id === activeId)
    const active = activeIndex >= 0 ? rows[activeIndex] : null

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

    const sessions: SessionItem[] = rows.map((r) => ({
        id: r.activity.id,
        name: r.activity.name,
        tag: r.tag,
        schedule: formatScheduleShort(r.activity),
        seats: r.seat.shortLabel,
    }))

    const categories = [...new Set(activities.flatMap((a) => a.categories ?? []))]
    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })

    // ป้ายของรอบที่เลือกเหนือคำอธิบายของมันเอง — งานหลายรอบบอกเสมอว่าเป็นของรอบไหน, งานรอบเดียวบอกเฉพาะเมื่อชื่อต่างจากชื่องาน
    const sessionLabel = active
        ? isProject
            ? `${roundLabel(activeIndex)} · ${active.activity.name}`
            : active.activity.name.trim() !== title.trim()
              ? active.activity.name
              : null
        : null

    // ปกของการ์ดหัวเรื่อง — ใช้ทั้งปกในการ์ด (จอกว้าง) และปกเต็มจอด้านบน (จอแคบ)
    const cover =
        view && active
            ? {
                  imagePath,
                  // ลายปกบอกสถานะของรอบเอง (ปิดรับ/จบ/เต็ม = เทา) ไม่ขึ้นกับว่าฉันสมัครแล้วหรือยัง
                  tone: active.closed || active.seat.level === "full" ? ("closed" as const) : ("open" as const),
                  statusLabel: coverStatus(view).label,
                  statusTone: coverStatus(view).tone,
                  code,
                  date: coverDateParts(active.activity),
              }
            : null

    return (
        // ไม่ใส่ min-h-screen — layout ของแต่ละพอร์ทัลดัน footer ลงล่างเองอยู่แล้ว
        <div className={preview ? "bg-surface pb-16" : "bg-surface pb-28 lg:pb-16"}>
            {cover && <MobileDetailCover {...cover} categories={categories} title={title} backHref={backHref} />}
            {/* จอแคบมีปกเต็มจอ (ปุ่มกลับอยู่บนปก) แทนแถบนี้ — ยังไม่มีข้อมูลรอบให้วาดปกก็ใช้แถบนี้ทุกจอ */}
            <section className={cn("denim-weave", cover && "max-lg:hidden")}>
                <Container className="flex flex-wrap items-center justify-between gap-3 pb-20 pt-6 sm:pb-24">
                    <Link
                        href={backHref}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border-[1.5px] border-white/40 px-4 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-white"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" /> กลับ
                    </Link>
                    <TerminalPrompt>{`~/events/${code} $ open`}</TerminalPrompt>
                </Container>
            </section>

            <Container className={cn("space-y-8 lg:-mt-16", cover ? "-mt-7" : "-mt-14 sm:-mt-16")}>
                {notice}

                {view && active && cover && (
                    <ActivityDetailHero
                        id="registration-card"
                        title={title}
                        categories={categories}
                        organizerName={organizerName}
                        schedule={formatActivitySchedule(active.activity)}
                        location={active.activity.location}
                        seatsLabel={active.seat.label}
                        cover={cover}
                        rounds={isProject ? { sessions, activeId, activeIndex, onSelect: onSelectActivity } : null}
                        footer={
                            preview ? (
                                <PreviewBar
                                    label={isProject ? "รอบที่เลือก" : "กิจกรรม"}
                                    sessionName={active.activity.name}
                                    seat={active.seat}
                                    shareUrl={shareUrl}
                                    shareTitle={title}
                                    onShareCopied={onShareCopied}
                                />
                            ) : (
                                <RegistrationBar
                                    view={view}
                                    seat={active.seat}
                                    sessionName={active.activity.name}
                                    idleLabel={view.kind === "open" ? "กำลังสมัคร" : isProject ? "รอบที่เลือก" : "สถานะ"}
                                    shareUrl={shareUrl}
                                    shareTitle={title}
                                    onShareCopied={onShareCopied}
                                    onRegister={onRegister}
                                    onCancel={onCancel}
                                    onSeeAlternatives={() => scrollTo("registration-card")}
                                    myRegistrationsHref="/student/my-registrations"
                                />
                            )
                        }
                    />
                )}

                {active && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                        <div className={DETAIL_PANEL}>
                            <div className="space-y-7">
                                <AboutSection
                                    index={1}
                                    intro={intro}
                                    activity={active.activity}
                                    sessionLabel={sessionLabel}
                                    showActivityImage={showActivityImage}
                                />
                                {isProject && (
                                    <>
                                        <hr className={DETAIL_DIVIDER} />
                                        <ScheduleSection
                                            index={2}
                                            rows={rows.map((r) => ({
                                                id: r.activity.id,
                                                name: r.activity.name,
                                                schedule: formatActivitySchedule(r.activity),
                                                tag: r.tag,
                                                seat: r.seat,
                                            }))}
                                            activeId={activeId}
                                            onSelect={onSelectActivity}
                                        />
                                    </>
                                )}
                                <hr className={DETAIL_DIVIDER} />
                                <PrepareSection
                                    index={isProject ? 3 : 2}
                                    activity={active.activity}
                                    logistics={preview ? { registrationOpenAt, registrationCloseAt } : null}
                                />
                            </div>
                        </div>

                        <aside className="space-y-4" aria-label="สิ่งที่จะได้รับและผู้จัด">
                            {/* หน้าลงทะเบียนของนักศึกษาไม่แสดงเรื่องชั่วโมงจิตอาสา — มุมมองผู้จัดแสดงให้ตรวจได้ */}
                            <RewardsCard activity={active.activity} showVolunteer={preview} />
                            {organizerName && <OrganizerCard name={organizerName} />}
                        </aside>
                    </div>
                )}
            </Container>

            {!preview && view && active && (
                <MobileActionBar
                    view={view}
                    sessionName={isProject ? active.activity.name : title}
                    meta={
                        isProject
                            ? `${roundLabel(activeIndex)} · ${formatScheduleShort(active.activity)}`
                            : formatScheduleShort(active.activity)
                    }
                    statusLine={view.headline ?? (view.primary?.disabled ? view.primary.label : active.seat.label)}
                    onRegister={onRegister}
                    onOpenCard={() => scrollTo("registration-card")}
                />
            )}

            {children}
        </div>
    )
}
