"use client"

import { MessageSquareQuote } from "lucide-react"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import type { SkillScores } from "@/lib/api"

/** คะแนนเต็มต่อทักษะ — ตรงกับสเกลที่ผู้จัดตั้งไว้ใน ActivitySoftSkill.rate */
const MAX_SCORE = 5

interface RegistrationEvaluationProps {
    scores: SkillScores
    comment?: string | null
    /** pending_approval = กิจกรรมประเมินรอบด้านที่ผู้จัดยังไม่อนุมัติ — server ปิดคะแนนเป็น 0 ไว้แล้ว ห้ามแสดงเป็น "ไม่ได้กำหนดคะแนน" */
    status?: string
}

/**
 * ผลประเมิน Soft Skills ของกิจกรรมเดียว
 *
 * แสดงเฉพาะทักษะที่ได้คะแนน > 0 ต่างจาก <SkillScoreList> ที่ไล่ครบ 12 ด้าน — เพราะกิจกรรมหนึ่ง
 * มักให้คะแนนแค่ไม่กี่ทักษะ ถ้าโชว์ครบจะมีแถว 0 รกเต็มการ์ด
 */
export function RegistrationEvaluation({ scores, comment, status }: RegistrationEvaluationProps) {
    if (status === "pending_approval") {
        return (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                <h4 className="mb-2 text-sm font-bold text-fg">ผลประเมิน Soft Skills ของกิจกรรมนี้</h4>
                <p className="text-sm text-fg-muted">
                    ผู้จัดกำลังรวมผลประเมินรอบด้าน (ผู้จัด ตนเอง และเพื่อน) — คะแนนจะแสดงที่นี่และเข้าโปรไฟล์ของคุณหลังผู้จัดอนุมัติ
                </p>
            </div>
        )
    }

    const awarded = SOFT_SKILLS.filter((skill) => (scores[skill.field] ?? 0) > 0)

    return (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <h4 className="mb-3 text-sm font-bold text-fg">ผลประเมิน Soft Skills ของกิจกรรมนี้</h4>

            {awarded.length === 0 ? (
                <p className="text-sm text-fg-muted">
                    กิจกรรมนี้ไม่ได้กำหนดคะแนน Soft Skills ไว้ จึงไม่มีคะแนนเข้าโปรไฟล์ของคุณ
                </p>
            ) : (
                <dl className="space-y-2.5">
                    {awarded.map((skill) => {
                        const value = scores[skill.field]
                        const Icon = skill.icon
                        return (
                            <div key={skill.field} className="flex items-center gap-3">
                                <dt className="flex min-w-0 flex-1 items-center gap-2 text-sm text-fg-muted">
                                    <Icon className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
                                    <span className="truncate">{skill.label}</span>
                                </dt>
                                <dd className="flex w-32 shrink-0 items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                                        <div
                                            className="h-full rounded-full bg-brand-600"
                                            style={{ width: `${Math.min((value / MAX_SCORE) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-fg">
                                        {value}
                                    </span>
                                </dd>
                            </div>
                        )
                    })}
                </dl>
            )}

            {comment && (
                <div className="mt-4 flex gap-2 rounded-lg border border-border bg-bg p-3">
                    <MessageSquareQuote className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
                    <div>
                        <p className="text-xs font-semibold text-fg-muted">ความเห็นจากผู้จัดกิจกรรม</p>
                        <p className="mt-1 text-sm text-fg">{comment}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
