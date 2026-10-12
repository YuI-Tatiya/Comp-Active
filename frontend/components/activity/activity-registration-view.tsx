"use client"

import Link from "next/link"
<<<<<<< HEAD
import { ArrowLeft, ChevronRight, Layers } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { ActivityAboutPanel, ActivityRegistrationPanel } from "@/components/activity/activity-info-panels"
import { BenefitsSection } from "@/components/activity/benefits-section"
import { KeyDetailsCard } from "@/components/activity/key-details-card"
=======
import { ArrowLeft } from "lucide-react"
import { Container } from "@/components/layout/container"
import { TerminalPrompt } from "@/components/denim/denim-ui"
import { ActivityDetailHero, type DetailStatusTone } from "@/components/activity/activity-detail-hero"
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
>>>>>>> organize
import { MobileActionBar } from "@/components/activity/mobile-action-bar"
import { RegistrationActionCard } from "@/components/activity/registration-action-card"
import { SessionSelector, type SessionItem } from "@/components/activity/session-selector"
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
import { categoryLabel } from "@/lib/categories"
import type { Activity } from "@/lib/api"

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
<<<<<<< HEAD
 * Layout: ซ้าย 70% (เนื้อหา) / ขวา 30% (การ์ดสมัคร sticky) — Hero อยู่ในคอลัมน์ซ้ายเพื่อให้การ์ดสมัครเริ่มที่ระดับเดียวกัน
 * (ปุ่มสมัครอยู่ในจอแรก) บนจอเล็กเรียงเป็นคอลัมน์เดียวโดยการ์ดสมัครอยู่ต่อจากตัวเลือกกิจกรรม + แถบสมัครติดขอบล่าง
 * ข้อมูลแต่ละอย่างอยู่ที่เดียว: ที่นั่ง/วัน-เวลา/สถานที่ → Key Details, วันปิดรับสมัคร → การ์ดสมัคร, ทักษะ → Benefits
=======
 * โครงหน้า: แถบยีนส์ด้านบน (ปุ่มกลับ + บรรทัดคำสั่ง) → การ์ดหัวเรื่องซ้อนขอบแถบ (ปก/ชื่อ/วันเวลา-สถานที่/เลือกรอบ/
 * แถบสมัคร) → 2 คอลัมน์: การ์ดรายละเอียดแบ่งหัวข้อ 01-03 (ซ้าย) + สิ่งที่จะได้รับและผู้จัด (ขวา)
>>>>>>> organize
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
            { status: activity.status, approvalStatus: activity.approvalStatus, registrationCloseAt },
            now
        )
        // มุมมองผู้จัดไม่ใช่ผู้ลงทะเบียน — ไม่มี "ของฉัน" ป้ายสถานะจึงเป็นของรอบนั้นล้วนๆ
        const mine = preview ? undefined : pickMyRegistration(myRegistrations, activity.id)
        return { activity, seat, closed, mine, tag: sessionTag({ seat, closed, mine }) }
    })
    const activeIndex = rows.findIndex((r) => r.activity.id === activeId)
    const active = activeIndex >= 0 ? rows[activeIndex] : null

<<<<<<< HEAD
    const sessions: SessionItem[] = rows.map((r) => ({
        id: r.activity.id,
        name: r.activity.name,
        tag: r.tag,
        schedule: formatScheduleShort(r.activity),
        seats: r.seat.shortLabel,
    }))

=======
>>>>>>> organize
    const view = active
        ? describeAction({
              registrationType: active.activity.registrationType,
              seat: active.seat,
              closed: active.closed,
              mine: active.mine,
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

<<<<<<< HEAD
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
=======
    // ป้ายของรอบที่เลือกเหนือคำอธิบายของมันเอง — งานหลายรอบบอกเสมอว่าเป็นของรอบไหน, งานรอบเดียวบอกเฉพาะเมื่อชื่อต่างจากชื่องาน
    const sessionLabel = active
        ? isProject
            ? `${roundLabel(activeIndex)} · ${active.activity.name}`
            : active.activity.name.trim() !== title.trim()
              ? active.activity.name
              : null
        : null
>>>>>>> organize

    return (
        // ไม่ใส่ min-h-screen — layout ของแต่ละพอร์ทัลดัน footer ลงล่างเองอยู่แล้ว
        <div className={preview ? "bg-surface pb-16" : "bg-surface pb-28 lg:pb-16"}>
            <section className="denim-weave">
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

<<<<<<< HEAD
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
                            <BenefitsSection activity={active.activity} showVolunteer={false} />
                            <ActivityAboutPanel activity={active.activity} showActivityImage={showActivityImage} hideMeta />
                            <ActivityRegistrationPanel activity={active.activity} hideLogistics />
=======
            <Container className="-mt-14 space-y-8 sm:-mt-16">
                {notice}

                {view && active && (
                    <ActivityDetailHero
                        id="registration-card"
                        title={title}
                        categories={categories}
                        organizerName={organizerName}
                        schedule={formatActivitySchedule(active.activity)}
                        location={active.activity.location}
                        cover={{
                            imagePath,
                            // ลายปกบอกสถานะของรอบเอง (ปิดรับ/จบ/เต็ม = เทา) ไม่ขึ้นกับว่าฉันสมัครแล้วหรือยัง
                            tone: active.closed || active.seat.level === "full" ? "closed" : "open",
                            statusLabel: coverStatus(view).label,
                            statusTone: coverStatus(view).tone,
                            code,
                            date: coverDateParts(active.activity),
                        }}
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
>>>>>>> organize
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
