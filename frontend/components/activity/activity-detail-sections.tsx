"use client"

import { useState } from "react"
import { Award, CalendarClock, FileDown, HeartHandshake, Tag, Users, Zap } from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { ActivityStatusNotice, typeRequirements } from "@/components/activity/activity-info-panels"
import { resolveUploadUrl, capacityLabel, type Activity } from "@/lib/api"
import {
    THREE_SIXTY_NOTE,
    describeSkillBenefits,
    describeVolunteer,
    formatDeadline,
    roundLabel,
    type ScheduleLabel,
    type SeatInfo,
    type SessionTag,
} from "@/lib/activity-view"
import { getSoftSkill } from "@/lib/soft-skills"
import { SOFT_SKILL_TIERS } from "@/lib/soft-skill-tiers"
import { cn } from "@/lib/utils"

/* ส่วนเนื้อหาใต้การ์ดหัวเรื่องของหน้ารายละเอียดกิจกรรม (ธีม Denim) — ซ้ายเป็นการ์ดขาวแบ่งหัวข้อมีเลขกำกับ
   (01 เกี่ยวกับกิจกรรมนี้ / 02 กำหนดการกิจกรรมย่อย / 03 ต้องเตรียมอะไรบ้าง) ขวาเป็นการ์ดสิ่งที่จะได้รับ + ผู้จัด
   ใช้ร่วมทั้งฝั่งนักศึกษา/บุคคลทั่วไป และมุมมองดูอย่างเดียวของผู้จัด (ดู ActivityRegistrationView) */

/** การ์ดขาวทางซ้ายที่รวมทุกหัวข้อไว้ — หัวข้อคั่นกันด้วยเส้นประ */
export const DETAIL_PANEL = "rounded-[22px] border border-denim-line bg-white p-5 sm:p-7"
export const DETAIL_DIVIDER = "border-t border-dashed border-denim-line"

function SectionHeading({ index, id, children }: { index: number; id: string; children: React.ReactNode }) {
    return (
        <h2 id={id} className="flex items-center gap-3 font-display text-xl font-bold text-denim-deep sm:text-[22px]">
            <span className="rounded-md bg-denim-deep px-1.5 py-0.5 font-code text-xs font-semibold text-white" aria-hidden="true">
                {String(index).padStart(2, "0")}
            </span>
            {children}
        </h2>
    )
}

/** เนื้อหายาวพับไว้ 3 บรรทัด — คำอธิบายงานยาวๆ ไม่ควรดันกำหนดการลงไปไกล */
function ExpandableText({ text }: { text: string }) {
    const [open, setOpen] = useState(false)
    const long = text.length > 220 || text.split("\n").length > 3

    return (
        <div>
            <p className={cn("whitespace-pre-line leading-relaxed text-denim-ink", !open && long && "line-clamp-3")}>{text}</p>
            {long && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="mt-1 text-sm font-semibold text-denim underline-offset-4 hover:underline"
                    aria-expanded={open}
                >
                    {open ? "ย่อ" : "อ่านเพิ่ม"}
                </button>
            )}
        </div>
    )
}

/* ── 01 เกี่ยวกับกิจกรรมนี้ ─────────────────────────────────────────────── */

interface AboutSectionProps {
    index: number
    /** คำอธิบายของงาน (Event) — กิจกรรมเดี่ยวไม่มี */
    intro?: string | null
    activity: Activity
    /**
     * ป้ายของกิจกรรมย่อยที่เลือกเหนือคำอธิบายของมันเอง เช่น "ROUND_02 · Track B" — งานหลายรอบต้องบอกว่าคำอธิบาย
     * นี้เป็นของรอบไหน null = ไม่ต้องมีป้าย (กิจกรรมเดี่ยว หรืองานรอบเดียวที่ชื่อเดียวกับงาน)
     */
    sessionLabel?: string | null
    /** แสดงรูปของกิจกรรมย่อยที่เลือก — หน้า "งาน" เปิด เพราะรูปบนปกเป็นรูปของงาน รูปของรอบย่อยไม่เคยแสดงที่อื่น */
    showActivityImage?: boolean
}

export function AboutSection({ index, intro, activity, sessionLabel, showActivityImage = false }: AboutSectionProps) {
    const conditions = activity.conditions ?? []
    const description = activity.description?.trim() || ""
    // คำอธิบายของรอบที่ซ้ำกับคำอธิบายงานไม่ต้องแสดงสองรอบ (งานรอบเดียวมักกรอกเหมือนกัน)
    const showDescription = description !== "" && description !== intro?.trim()

    return (
        <section aria-labelledby="detail-about" className="space-y-4">
            <SectionHeading index={index} id="detail-about">
                เกี่ยวกับกิจกรรมนี้
            </SectionHeading>

            <ActivityStatusNotice activity={activity} />

            {intro?.trim() && <ExpandableText text={intro.trim()} />}

            {(sessionLabel || showDescription) && (
                <div className="space-y-1.5">
                    {sessionLabel && <p className="font-code text-xs font-semibold text-denim-accent">{sessionLabel}</p>}
                    {showDescription && <p className="whitespace-pre-line leading-relaxed text-denim-ink">{description}</p>}
                </div>
            )}

            {!intro?.trim() && !showDescription && <p className="text-denim-muted">ไม่มีรายละเอียด</p>}

            {showActivityImage && activity.imageUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-denim-line bg-denim-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลดเสิร์ฟจาก backend (/uploads) */}
                    <img src={resolveUploadUrl(activity.imageUrl)!} alt={activity.name} className="size-full object-cover" />
                </div>
            )}

            {/* คุณสมบัติผู้เข้าร่วม — ฟิลด์เดิมที่ wizard ไม่เก็บแล้วแต่ backend ยังอ่าน-เขียนได้ แสดงเฉพาะที่มีข้อมูลจริง */}
            {conditions.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-denim-deep">คุณสมบัติผู้เข้าร่วม / สิ่งที่ต้องเตรียมมา</h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-denim-ink">
                        {conditions.map((c, i) => (
                            <li key={i}>{c.conditionText}</li>
                        ))}
                    </ul>
                </div>
            )}

            {activity.attachmentUrl && (
                <a
                    href={resolveUploadUrl(activity.attachmentUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-denim-field bg-white px-4 text-sm font-semibold text-denim transition-colors hover:bg-denim-paper"
                >
                    <FileDown className="size-4" aria-hidden="true" />
                    ดาวน์โหลดเอกสารแนบ
                </a>
            )}

            {activity.tags && activity.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activity.tags.map((tag) => (
                        <span
                            key={tag.tagName}
                            className="inline-flex items-center gap-1 rounded-md bg-denim-chip px-2.5 py-1 text-xs font-semibold text-denim"
                        >
                            <Tag className="size-3" aria-hidden="true" /> {tag.tagName}
                        </span>
                    ))}
                </div>
            )}
        </section>
    )
}

/* ── 02 กำหนดการกิจกรรมย่อย ─────────────────────────────────────────────── */

export interface ScheduleRow {
    id: number
    name: string
    schedule: ScheduleLabel
    tag: SessionTag
    seat: SeatInfo
}

const ROW_STATUS: Partial<Record<SessionTag, string>> = {
    attended: "เข้าร่วมแล้ว",
    registered: "ลงทะเบียนแล้ว",
    pending: "รอยืนยัน",
    full: "เต็มแล้ว",
    closed: "ปิดรับสมัคร",
}

/** กำหนดการทุกรอบ (เฉพาะงานที่มีหลายรอบ) — กดแถวเพื่อเลือกรอบได้เหมือนการ์ดเลือกรอบด้านบน */
export function ScheduleSection({
    index,
    rows,
    activeId,
    onSelect,
}: {
    index: number
    rows: ScheduleRow[]
    activeId: number | null
    onSelect: (id: number) => void
}) {
    return (
        <section aria-labelledby="detail-schedule" className="space-y-4">
            <SectionHeading index={index} id="detail-schedule">
                กำหนดการกิจกรรมย่อย
            </SectionHeading>
            <ul className="space-y-2.5">
                {rows.map((r, i) => {
                    const selected = r.id === activeId
                    const status =
                        ROW_STATUS[r.tag] ?? (r.seat.unlimited ? "ไม่จำกัดที่นั่ง" : `เหลือ ${r.seat.remaining} ที่นั่ง`)
                    return (
                        <li key={r.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(r.id)}
                                aria-pressed={selected}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim sm:gap-5",
                                    selected ? "border-denim-dash bg-denim-chip" : "border-transparent bg-denim-paper hover:border-denim-line"
                                )}
                            >
                                <span className="hidden w-[4.5rem] shrink-0 font-code text-[11px] font-semibold text-denim-accent sm:block">
                                    {roundLabel(i)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-denim-deep">{r.name}</span>
                                    <span className="block text-xs text-denim-muted">
                                        {r.schedule.dateLabel}
                                        {r.schedule.timeLabel && ` · ${r.schedule.timeLabel}`}
                                    </span>
                                </span>
                                {selected ? (
                                    <span className="shrink-0 rounded-full bg-amber px-2.5 py-1 text-[11px] font-bold text-denim-deep">
                                        รอบที่เลือก
                                    </span>
                                ) : (
                                    <span className="shrink-0 text-xs text-denim-muted">{status}</span>
                                )}
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

/* ── 03 ต้องเตรียมอะไรบ้าง ─────────────────────────────────────────────── */

interface PrepareSectionProps {
    index: number
    activity: Activity
    /**
     * จำนวนที่รับ + ช่วงเวลารับสมัคร — มุมมองผู้จัดแสดงที่นี่ ฝั่งนักศึกษาไม่ต้อง
     * (ที่นั่งอยู่บนแถบสมัครของการ์ดหัวเรื่อง และวันปิดรับสมัครอยู่ในแถบเดียวกันตอนเปิดรับ)
     */
    logistics?: { registrationOpenAt?: string | null; registrationCloseAt?: string | null } | null
}

/** ช่องข้อมูลมีไอคอน + ป้ายแบบโค้ด (WHEN / WHERE / CAPACITY …) — ใช้ทั้งในการ์ดหัวเรื่องและหัวข้อ 03 */
export function InfoTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl bg-denim-paper px-3.5 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-denim-line bg-white text-denim">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block font-code text-[10px] tracking-[0.08em] text-denim-muted">{label}</span>
                <span className="block text-sm font-semibold leading-snug text-denim-deep">{value}</span>
            </span>
        </div>
    )
}

export function PrepareSection({ index, activity, logistics }: PrepareSectionProps) {
    const questions = activity.questions ?? []
    const requirements = typeRequirements(activity)

    return (
        <section aria-labelledby="detail-prepare" className="space-y-4">
            <SectionHeading index={index} id="detail-prepare">
                ต้องเตรียมอะไรบ้าง
            </SectionHeading>

            {logistics && (
                <div className="grid gap-3 sm:grid-cols-3">
                    <InfoTile icon={Users} label="CAPACITY" value={capacityLabel(activity.capacity)} />
                    <InfoTile
                        icon={CalendarClock}
                        label="OPENS"
                        value={logistics.registrationOpenAt ? formatDeadline(logistics.registrationOpenAt) : "เปิดทันที"}
                    />
                    <InfoTile
                        icon={CalendarClock}
                        label="CLOSES"
                        value={logistics.registrationCloseAt ? formatDeadline(logistics.registrationCloseAt) : "ไม่กำหนด"}
                    />
                </div>
            )}

            {requirements.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-denim-deep">ข้อมูลที่ต้องกรอกเพิ่มตอนลงทะเบียน</h3>
                    <dl className="mt-2 space-y-1.5 text-sm">
                        {requirements.map((r) => (
                            <div key={r.label} className="flex flex-wrap gap-x-2">
                                <dt className="text-denim-muted">{r.label}:</dt>
                                <dd className="font-semibold text-denim-deep">{r.value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}

            <div>
                <h3 className="text-sm font-semibold text-denim-ink">คำถามที่ต้องตอบตอนลงทะเบียน</h3>
                {questions.length === 0 ? (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-denim-line bg-denim-paper px-4 py-3.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                            <Zap className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-denim-deep">ไม่มีคำถามเพิ่มเติม — ลงทะเบียนได้ทันที</span>
                            <span className="block font-code text-xs text-denim-muted">questions: []</span>
                        </span>
                    </div>
                ) : (
                    <ol className="mt-3 space-y-2.5 rounded-xl border border-denim-line bg-denim-paper p-4">
                        {questions.map((q, i) => (
                            <li key={q.id} className="flex gap-3 text-sm text-denim-ink">
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white font-code text-xs font-semibold text-denim">
                                    {i + 1}
                                </span>
                                <span>
                                    {q.label}
                                    {q.required && <span className="ml-1 text-danger">*</span>}
                                    {q.options?.length > 0 && (
                                        <span className="block text-xs text-denim-muted">ตัวเลือก: {q.options.map((o) => o.label).join(" / ")}</span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    )
}

/* ── ขวา: สิ่งที่จะได้รับ / ผู้จัด ─────────────────────────────────────────── */

const TIER_HELP =
    "คะแนนทักษะที่ได้เมื่อเข้าร่วมและเช็คอินเรียบร้อย ตามระดับที่ผู้จัดตั้งไว้ — " +
    SOFT_SKILL_TIERS.map((t) => `${t.label} +${t.value}: ${t.hint}`).join(" · ")

interface RewardsCardProps {
    activity: Pick<Activity, "softSkills" | "volunteerRole" | "volunteerHours" | "peerAssessmentEnabled">
    /** แสดงชั่วโมงจิตอาสาด้วย — มุมมองผู้จัดแสดง หน้าลงทะเบียนของนักศึกษาไม่แสดง */
    showVolunteer?: boolean
}

/**
 * "สิ่งที่คุณจะได้รับ" — ทักษะพร้อมคะแนนที่จะได้ (+ระดับที่ผู้จัดตั้งไว้ ซึ่งเท่ากับคะแนนที่ระบบบันทึกตอนเช็คอินจริง)
 * กิจกรรมโหมด 360° ไม่บอกตัวเลข เพราะระดับสุดท้ายรู้หลังผู้จัดอนุมัติ
 */
export function RewardsCard({ activity, showVolunteer = false }: RewardsCardProps) {
    const skills = describeSkillBenefits(activity.softSkills)
    const threeSixty = !!activity.peerAssessmentEnabled
    const volunteer = describeVolunteer(activity)

    return (
        <section aria-labelledby="detail-rewards" className="denim-weave rounded-[22px] p-5 text-white">
            <p className="font-code text-xs text-amber">{"// rewards"}</p>
            <h2 id="detail-rewards" className="mt-1 font-display text-xl font-bold">
                สิ่งที่คุณจะได้รับ
            </h2>

            <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-denim-on">
                ทักษะที่จะได้พัฒนา
                <InfoTooltip
                    text={TIER_HELP}
                    label="คะแนนทักษะคิดอย่างไร"
                    className="[&>button]:text-denim-on-muted [&>button:hover]:text-white"
                />
            </div>

            {skills.length === 0 ? (
                <p className="mt-3 text-sm text-denim-on">กิจกรรมนี้ไม่ได้ระบุทักษะที่จะได้รับ</p>
            ) : (
                <ul className="mt-3 space-y-2.5">
                    {skills.map((skill) => {
                        const meta = getSoftSkill(skill.skillType)
                        const Icon = meta?.icon
                        return (
                            <li key={skill.skillType} className="flex items-center gap-3 rounded-xl bg-white p-3 text-denim-deep">
                                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-denim-paper text-denim">
                                    {Icon && <Icon className="size-4" aria-hidden="true" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold leading-snug">{meta?.label ?? skill.skillType}</span>
                                    {meta?.labelEn && <span className="block text-[11px] text-denim-muted">{meta.labelEn}</span>}
                                </span>
                                {!threeSixty && skill.rate != null && (
                                    <span
                                        className="shrink-0 rounded-full bg-amber/15 px-2 py-0.5 text-xs font-bold text-amber-ink"
                                        aria-label={`ได้ ${skill.rate} คะแนน${skill.levelLabel ? ` (ระดับ${skill.levelLabel})` : ""}`}
                                    >
                                        +{skill.rate}
                                    </span>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}

            {threeSixty && skills.length > 0 && <p className="mt-3 text-xs leading-relaxed text-denim-on">{THREE_SIXTY_NOTE}</p>}

            {showVolunteer &&
                (volunteer.gives ? (
                    <div className="mt-3 rounded-xl bg-white p-3.5 text-denim-deep">
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <Award className="size-4 text-emerald-700" aria-hidden="true" /> ชั่วโมงจิตอาสา
                        </div>
                        {volunteer.hoursLabel && <div className="mt-1 font-display text-2xl font-bold">{volunteer.hoursLabel}</div>}
                        {volunteer.role && <div className="text-sm font-medium">{volunteer.role}</div>}
                        <p className="mt-1 text-xs text-denim-muted">{volunteer.condition}</p>
                        {volunteer.loanNote && <p className="mt-0.5 text-xs text-denim-muted">{volunteer.loanNote}</p>}
                    </div>
                ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-denim-on">
                        <HeartHandshake className="size-3.5" aria-hidden="true" /> {volunteer.condition}
                    </p>
                ))}
        </section>
    )
}

/** การ์ดผู้จัด — อักษรแรกของชื่อเป็นรูปโปรไฟล์ (กติกาเดียวกับเมนูผู้ใช้) */
export function OrganizerCard({ name }: { name: string }) {
    return (
        <div className="flex items-center gap-3 rounded-[22px] border border-denim-line bg-white p-4">
            <span
                className="grid size-11 shrink-0 place-items-center rounded-full bg-denim-deep font-display text-lg font-bold text-white"
                aria-hidden="true"
            >
                {name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
                <p className="font-code text-[10px] tracking-[0.12em] text-denim-muted">ORGANIZER</p>
                <p className="truncate font-semibold text-denim-deep">{name}</p>
            </div>
        </div>
    )
}
