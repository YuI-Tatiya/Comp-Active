"use client"

import { LevelDots } from "@/components/activity/benefits-section"
import { RUBRIC_LEVELS, SOFT_SKILL_RUBRIC } from "@/lib/soft-skill-rubric"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { cn } from "@/lib/utils"

const DOTS = { pass: 1, good: 2, excellent: 3 } as const

interface SoftSkillRubricTableProps {
    /** ทักษะที่ให้เน้นแถว (เช่น ทักษะที่กิจกรรมนี้เลือกไว้) */
    highlightSkills?: string[]
}

/**
 * ตารางเกณฑ์พฤติกรรม 12 ทักษะ × 3 ระดับ — คอลัมน์ทักษะตรึงซ้ายเมื่อเลื่อนแนวนอนบนจอแคบ
 * ข้อความอยู่ใน lib/soft-skill-rubric.ts ที่เดียว
 */
export function SoftSkillRubricTable({ highlightSkills = [] }: SoftSkillRubricTableProps) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-border bg-bg shadow-xs">
            <table className="w-full min-w-[860px] border-collapse text-sm">
                <caption className="sr-only">
                    เกณฑ์พฤติกรรมของ Soft Skills 12 ด้าน แยกตามระดับ ผ่าน ดี และดีเยี่ยม
                </caption>
                <thead>
                    <tr className="bg-surface">
                        <th scope="col" className="sticky left-0 z-10 w-[230px] border-b border-border bg-surface px-4 py-3 text-left text-xs font-semibold text-fg-muted">
                            ทักษะ
                        </th>
                        {RUBRIC_LEVELS.map((level) => (
                            <th key={level.key} scope="col" className="border-b border-l border-border px-4 py-3 text-left align-top">
                                <div className="flex items-center gap-2 text-sm font-bold text-fg">
                                    <LevelDots dots={DOTS[level.key]} />
                                    {level.label}
                                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                                        ค่าที่เก็บ {level.value}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs font-normal text-fg-muted">{level.meaning}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {SOFT_SKILLS.map((skill) => {
                        const rubric = SOFT_SKILL_RUBRIC[skill.value]
                        const highlighted = highlightSkills.includes(skill.value)
                        const Icon = skill.icon
                        return (
                            <tr key={skill.value} className={cn("align-top", highlighted && "bg-brand-50/60")}>
                                <th
                                    scope="row"
                                    className={cn(
                                        "sticky left-0 z-10 border-b border-border px-4 py-4 text-left font-normal",
                                        highlighted ? "bg-brand-50" : "bg-bg"
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <Icon className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
                                        <div>
                                            <div className="font-semibold text-fg">{skill.label}</div>
                                            <div className="mt-0.5 text-xs text-fg-muted">{skill.desc}</div>
                                        </div>
                                    </div>
                                </th>
                                {RUBRIC_LEVELS.map((level) => (
                                    <td key={level.key} className="border-b border-l border-border px-4 py-4 leading-relaxed text-fg">
                                        {rubric[level.key]}
                                    </td>
                                ))}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
