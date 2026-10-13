"use client"

import { Award, HeartHandshake, Sparkles } from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { getSoftSkill } from "@/lib/soft-skills"
import { SOFT_SKILL_TIERS } from "@/lib/soft-skill-tiers"
import { THREE_SIXTY_NOTE, describeSkillBenefits, describeVolunteer } from "@/lib/activity-view"
import { cn } from "@/lib/utils"
import type { Activity } from "@/lib/api"

const TIER_HELP = SOFT_SKILL_TIERS.map((t) => `${t.label}: ${t.hint}`).join(" · ")

/** ระดับ 3 จุด (●○○ ผ่าน · ●●○ ดี · ●●● ดีเยี่ยม) — อ่านได้ทันทีโดยไม่ต้องรู้ว่าเลข 2/3/5 คืออะไร */
export function LevelDots({ dots }: { dots: number }) {
    return (
        <span className="inline-flex gap-1" aria-hidden="true">
            {[1, 2, 3].map((i) => (
                <span key={i} className={cn("size-2 rounded-full", i <= dots ? "bg-brand-600" : "bg-border-strong")} />
            ))}
        </span>
    )
}

interface BenefitsSectionProps {
    activity: Pick<Activity, "softSkills" | "volunteerRole" | "volunteerHours" | "peerAssessmentEnabled">
    /** false = ไม่แสดงการ์ดชั่วโมงจิตอาสา (หน้าลงทะเบียนของนักศึกษาไม่แสดงเรื่องจิตอาสา) */
    showVolunteer?: boolean
}

/**
 * "สิ่งที่คุณจะได้รับ" — ทักษะ (เป็นระดับที่เข้าใจได้ ไม่ใช่ "น้ำหนัก 5/5") และชั่วโมงจิตอาสา (บอกเงื่อนไขชัดทั้งกรณีแจกและไม่แจก)
 * ข้อความและตรรกะทั้งหมดอยู่ใน lib/activity-view.ts (มีเทสต์) คอมโพเนนต์นี้แค่แสดงผล
 */
export function BenefitsSection({ activity, showVolunteer = true }: BenefitsSectionProps) {
    const skills = describeSkillBenefits(activity.softSkills)
    const volunteer = describeVolunteer(activity)
    const threeSixty = !!activity.peerAssessmentEnabled

    return (
        <section aria-labelledby="benefits-heading" className="space-y-4">
            <h3 id="benefits-heading" className="flex items-center gap-2 text-lg font-bold text-fg">
                <Sparkles className="size-5 text-brand-600" aria-hidden="true" /> สิ่งที่คุณจะได้รับ
            </h3>

            <div className={cn("grid gap-4", showVolunteer && "sm:grid-cols-2")}>
                <div className="rounded-2xl border border-border bg-bg p-5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                        ทักษะที่จะได้พัฒนา
                        <InfoTooltip text={`ระดับของทักษะ — ${TIER_HELP}`} label="ระดับทักษะหมายถึงอะไร" />
                    </div>

                    {skills.length === 0 ? (
                        <p className="mt-3 text-sm text-fg-muted">กิจกรรมนี้ไม่ได้ระบุทักษะที่จะได้รับ</p>
                    ) : (
                        <>
                            <p className="mt-1 text-xs text-fg-muted">เมื่อเข้าร่วมและเช็คอินเรียบร้อย</p>
                            <ul className="mt-3 space-y-2.5">
                                {skills.map((skill) => {
                                    const meta = getSoftSkill(skill.skillType)
                                    const Icon = meta?.icon
                                    return (
                                        <li key={skill.skillType} className="flex items-center justify-between gap-3">
                                            <span className="flex min-w-0 items-center gap-2 text-sm text-fg">
                                                {Icon && <Icon className="size-4 shrink-0 text-brand-500" aria-hidden="true" />}
                                                <span className="truncate">{meta?.label ?? skill.skillType}</span>
                                            </span>
                                            {!threeSixty && skill.levelLabel && (
                                                <span className="flex shrink-0 items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                                                    <LevelDots dots={skill.dots} />
                                                    ระดับ{skill.levelLabel}
                                                </span>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                            {threeSixty && (
                                <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-fg-muted">{THREE_SIXTY_NOTE}</p>
                            )}
                        </>
                    )}
                </div>

                {!showVolunteer ? null : volunteer.gives ? (
                    <div className="rounded-2xl border border-success/30 bg-success-bg p-5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-success-fg">
                            <Award className="size-4" aria-hidden="true" /> ชั่วโมงจิตอาสา
                        </div>
                        {volunteer.hoursLabel && (
                            <div className="mt-2 text-3xl font-black text-success-fg">{volunteer.hoursLabel}</div>
                        )}
                        {volunteer.role && <div className="mt-1 text-sm font-medium text-fg">{volunteer.role}</div>}
                        <p className="mt-2 text-xs text-fg-muted">{volunteer.condition}</p>
                        {volunteer.loanNote && <p className="mt-1 text-xs text-fg-muted">{volunteer.loanNote}</p>}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-surface p-5">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
                            <HeartHandshake className="size-4" aria-hidden="true" /> ชั่วโมงจิตอาสา
                        </div>
                        <p className="mt-2 text-sm text-fg-muted">{volunteer.condition}</p>
                    </div>
                )}
            </div>
        </section>
    )
}
