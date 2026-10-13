"use client"

import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react"
import { Container } from "@/components/layout/container"
import { LevelDots } from "@/components/activity/benefits-section"
import { SoftSkillRubricTable } from "@/components/activity/soft-skill-rubric-table"
import { RUBRIC_LEVELS } from "@/lib/soft-skill-rubric"

const DOTS = { pass: 1, good: 2, excellent: 3 } as const

const HOW_TO_USE = [
    "ตัดสินจากพฤติกรรมที่เห็นจริงในกิจกรรมนี้ ไม่ใช่ความรู้สึกโดยรวม ความสนิท หรือชื่อเสียงเดิมของนักศึกษา",
    "ระดับสูงรวมพฤติกรรมของระดับต่ำไว้แล้ว: จะเลือก \"ดี\" ได้ต้องทำได้ตามเกณฑ์ \"ผ่าน\" ครบด้วย และ \"ดีเยี่ยม\" ต้องครบทั้งสองระดับก่อนหน้า",
    "ต้องยกเหตุการณ์จริงเป็นหลักฐานได้อย่างน้อย 1 เหตุการณ์ ถ้านึกไม่ออกให้เลือกระดับที่ต่ำกว่า",
    "ประเมินแยกทีละทักษะ นักศึกษาคนหนึ่งอาจ \"ดีเยี่ยม\" ด้านหนึ่งแต่ \"ผ่าน\" อีกด้านหนึ่งได้",
    "ระดับที่เกินเพดานของกิจกรรมเลือกไม่ได้ (ระบบล็อกไว้ให้) ดูเงื่อนไขของแต่ละระดับในตารางด้านบน",
]

const REASON_EXAMPLES = [
    {
        weak: "รับผิดชอบเกินหน้าที่",
        strong: "รับหน้าที่แทนฝ่ายอุปกรณ์ที่ขาดคน 2 ใน 4 วัน และนำทีมเก็บของเสร็จก่อนเวลา 30 นาที",
    },
    {
        weak: "ขาดงาน",
        strong: "ไม่มาวันที่ 3 โดยไม่แจ้งล่วงหน้า ทำให้ฝ่ายต้องหาคนมาแทนกลางงาน",
    },
]

/**
 * หน้า "เกณฑ์การประเมินระดับ Soft Skills" สำหรับผู้จัด — นิยาม 3 ระดับ, หลักการใช้, ตารางพฤติกรรม 12 ทักษะ, ตัวอย่างการเขียนเหตุผล
 * ข้อความตารางอยู่ใน lib/soft-skill-rubric.ts ที่เดียว
 */
export function SoftSkillRubricGuide() {
    return (
        <div className="min-h-screen bg-surface pb-16">
            <Container className="max-w-6xl space-y-10 py-8">
                <header className="space-y-2">
                    <h1 className="text-2xl font-black text-fg sm:text-3xl">เกณฑ์การประเมินระดับ Soft Skills</h1>
                    <p className="max-w-3xl text-fg-muted">
                        ตารางพฤติกรรมสำหรับผู้จัดใช้อ้างอิงเวลาเลือกระดับของแต่ละทักษะ ทั้งตอนสร้างกิจกรรม การประเมินรายฝ่าย และการอนุมัติผลรอบด้าน
                    </p>
                </header>

                <section aria-labelledby="levels-heading" className="space-y-3">
                    <h2 id="levels-heading" className="text-lg font-bold text-fg">
                        3 ระดับหมายถึงอะไร และให้ได้เมื่อไร
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-border bg-bg shadow-xs">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr className="bg-surface text-left text-xs font-semibold text-fg-muted">
                                    <th scope="col" className="px-4 py-3">ระดับ</th>
                                    <th scope="col" className="border-l border-border px-4 py-3">ค่าที่ระบบเก็บ</th>
                                    <th scope="col" className="border-l border-border px-4 py-3">ความหมาย</th>
                                    <th scope="col" className="border-l border-border px-4 py-3">กิจกรรมแบบไหนให้ระดับนี้ได้</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RUBRIC_LEVELS.map((level) => (
                                    <tr key={level.key} className="align-top">
                                        <th scope="row" className="border-t border-border px-4 py-3 text-left">
                                            <span className="flex items-center gap-2 font-bold text-fg">
                                                <LevelDots dots={DOTS[level.key]} />
                                                {level.label}
                                            </span>
                                        </th>
                                        <td className="border-l border-t border-border px-4 py-3 tabular-nums text-fg-muted">{level.value}</td>
                                        <td className="border-l border-t border-border px-4 py-3 text-fg">{level.meaning}</td>
                                        <td className="border-l border-t border-border px-4 py-3 text-fg-muted">{level.whenAllowed}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section aria-labelledby="howto-heading" className="space-y-3">
                    <h2 id="howto-heading" className="flex items-center gap-2 text-lg font-bold text-fg">
                        <ListChecks className="size-5 text-brand-600" aria-hidden="true" /> หลักการใช้ตาราง
                    </h2>
                    <ol className="space-y-2 rounded-2xl border border-border bg-bg p-5 shadow-xs">
                        {HOW_TO_USE.map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-fg">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                                    {i + 1}
                                </span>
                                <span className="leading-relaxed">{item}</span>
                            </li>
                        ))}
                    </ol>
                </section>

                <section aria-labelledby="table-heading" className="space-y-3">
                    <h2 id="table-heading" className="text-lg font-bold text-fg">พฤติกรรมที่สังเกตได้ของแต่ละทักษะ</h2>
                    <p className="text-sm text-fg-muted">
                        แต่ละช่องเขียนเฉพาะสิ่งที่ &quot;เพิ่มขึ้น&quot; จากระดับก่อนหน้า บนมือถือเลื่อนตารางไปทางขวาเพื่อดูครบทุกระดับ
                    </p>
                    <SoftSkillRubricTable />
                </section>

                <section aria-labelledby="reason-heading" className="space-y-3">
                    <h2 id="reason-heading" className="text-lg font-bold text-fg">
                        เขียนเหตุผลข้อยกเว้นให้ตรวจสอบย้อนหลังได้
                    </h2>
                    <p className="text-sm text-fg-muted">
                        เหตุผลที่ดีเล่าเหตุการณ์และผลที่เกิดขึ้นจริง คนอื่นอ่านแล้วเห็นภาพโดยไม่ต้องถามผู้จัดอีก
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {REASON_EXAMPLES.map((ex) => (
                            <div key={ex.weak} className="space-y-3 rounded-2xl border border-border bg-bg p-5 shadow-xs">
                                <div className="flex gap-2 text-sm">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                                    <div>
                                        <div className="text-xs font-semibold text-fg-muted">คลุมเครือ</div>
                                        <div className="text-fg">&quot;{ex.weak}&quot;</div>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-sm">
                                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-fg" aria-hidden="true" />
                                    <div>
                                        <div className="text-xs font-semibold text-success-fg">ชัดเจน ตรวจสอบได้</div>
                                        <div className="text-fg">&quot;{ex.strong}&quot;</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </Container>
        </div>
    )
}
