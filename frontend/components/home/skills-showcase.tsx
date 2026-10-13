"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Container } from "@/components/layout/container"
import { RoundIconButton } from "@/components/denim/denim-ui"
import { SOFT_SKILLS } from "@/lib/soft-skills"

const PER_PAGE = 4
const pad = (n: number) => String(n).padStart(2, "0")

/**
 * 12 ทักษะ (ธีม Denim) — ทีละหน้าละ 4 ใบ เลื่อนด้วยปุ่มซ้าย/ขวาแบบวนรอบ
 * ป้ายคอมเมนต์ "// skills[01–04] of 12" บอกตำแหน่งหน้าปัจจุบันตามดีไซน์ (เปลี่ยนตามหน้าที่เลื่อนไป)
 */
export function SkillsShowcase() {
    const [page, setPage] = useState(0)
    const pages = Math.ceil(SOFT_SKILLS.length / PER_PAGE)
    const start = page * PER_PAGE
    const shown = SOFT_SKILLS.slice(start, start + PER_PAGE)

    const go = (step: number) => setPage((p) => (p + step + pages) % pages)

    return (
        <section aria-labelledby="skills-heading" className="bg-denim-paper">
            <Container className="grid gap-8 py-16 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-center lg:gap-12">
                <div className="flex flex-col gap-4">
                    <span className="font-code text-[13px] text-denim-accent" aria-hidden="true">
                        {`// skills[${pad(start + 1)}–${pad(start + shown.length)}] of ${SOFT_SKILLS.length}`}
                    </span>
                    <h2
                        id="skills-heading"
                        className="font-display text-[30px] font-bold leading-[1.2] text-denim-deep sm:text-[32px]"
                    >
                        {/* ตัดบรรทัดได้เฉพาะรอยต่อวลี — ไม่งั้นตัวตัดคำไทยแยก "การเข้า / ร่วม" กลางคำ */}
                        <span className="text-denim-accent">{SOFT_SKILLS.length}</span> ทักษะที่คุณ
                        <span className="whitespace-nowrap">สามารถสะสมได้จาก</span>
                        <span className="whitespace-nowrap">การเข้าร่วมกิจกรรม</span>
                    </h2>
                    <p className="text-[15px] leading-relaxed text-denim-muted">
                        เพียงคุณเข้าร่วมกิจกรรมและทำกิจกรรมให้สำเร็จ แล้วคะแนนจะสะสมเข้าโปรไฟล์ของคุณอัตโนมัติ
                    </p>
                    <div className="flex items-center gap-3">
                        <RoundIconButton label="ทักษะก่อนหน้า" icon={ChevronLeft} onClick={() => go(-1)} />
                        <RoundIconButton label="ทักษะถัดไป" icon={ChevronRight} onClick={() => go(1)} />
                        <span className="sr-only" aria-live="polite">
                            {`ทักษะที่ ${start + 1} ถึง ${start + shown.length} จาก ${SOFT_SKILLS.length}`}
                        </span>
                    </div>
                </div>

                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {shown.map((skill, i) => (
                        <li
                            key={skill.value}
                            className="flex flex-col gap-3 rounded-[18px] border border-denim-line bg-white p-5 shadow-[0_4px_0_var(--color-denim-line)]"
                        >
                            <div className="flex items-center justify-between">
                                <span className="grid size-10 place-items-center rounded-xl bg-denim-chip">
                                    <skill.icon className="size-5 text-denim" aria-hidden="true" />
                                </span>
                                <span className="font-code text-xs text-denim-accent">{pad(start + i + 1)}</span>
                            </div>
                            <h3 className="font-display text-[15px] font-bold leading-snug text-denim-deep">{skill.label}</h3>
                            <p className="text-sm leading-relaxed text-denim-muted">{skill.desc}</p>
                        </li>
                    ))}
                </ul>
            </Container>
        </section>
    )
}
