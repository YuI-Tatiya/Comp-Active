"use client"

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from "recharts"
import type { SkillsData } from "@/lib/api"
import { SOFT_SKILLS } from "@/lib/soft-skills"

const SKILL_LABELS: { key: keyof SkillsData["average"]; label: string }[] = SOFT_SKILLS.map(
    (s) => ({ key: s.field, label: s.label.replace(/^ทักษะ/, "") })
)

interface SkillRadarProps {
    average?: SkillsData["average"]
    /** ความสูงของกราฟ (px) */
    height?: number
}

export function SkillRadar({ average, height = 280 }: SkillRadarProps) {
    const data = SKILL_LABELS.map(({ key, label }) => ({
        skill: label,
        value: average?.[key] ?? 0,
    }))

    return (
        <div style={{ height }} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} outerRadius="72%">
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis
                        dataKey="skill"
                        tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
                    />
                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                    <Radar
                        dataKey="value"
                        stroke="var(--color-brand-600)"
                        strokeWidth={2}
                        fill="var(--color-brand-600)"
                        fillOpacity={0.15}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}

/** ตารางคะแนนแบบตัวเลข — คู่กับกราฟ เพื่อให้ screen reader อ่านได้ */
export function SkillScoreList({ average }: { average?: SkillsData["average"] }) {
    return (
        <dl className="space-y-2">
            {SKILL_LABELS.map(({ key, label }) => {
                const v = average?.[key] ?? 0
                return (
                    <div key={key} className="flex items-center gap-3">
                        <dt className="w-20 shrink-0 text-xs text-fg-muted">{label}</dt>
                        <dd className="flex flex-1 items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                                <div
                                    className="h-full rounded-full bg-brand-600"
                                    style={{ width: `${Math.min(v * 20, 100)}%` }}
                                />
                            </div>
                            <span className="w-6 shrink-0 text-right text-xs font-medium text-fg tabular-nums">
                                {v.toFixed(1)}
                            </span>
                        </dd>
                    </div>
                )
            })}
        </dl>
    )
}
