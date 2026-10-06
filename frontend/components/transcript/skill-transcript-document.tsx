// components/transcript/skill-transcript-document.tsx
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import {
    formatThaiDate,
    formatTranscriptCode,
    snapshotToSkillRows,
    type SkillTranscriptSnapshot,
} from "@/lib/transcript"

interface SkillTranscriptDocumentProps {
    snapshot: SkillTranscriptSnapshot
    code: string
    issuedAt: string
    /** URL เต็มของหน้าตรวจสอบ — ฝังใน QR และพิมพ์เป็นข้อความ */
    verifyUrl: string
}

const SKILL_META = SOFT_SKILLS.map((s) => ({ field: s.field as string, label: s.label, labelEn: s.labelEn }))

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border px-4 py-3 text-center">
            <p className="text-xs text-fg-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-900">{value}</p>
        </div>
    )
}

/**
 * เอกสารรับรองผล Soft Skills (A4) — ใช้ทั้งหน้าตรวจสอบสาธารณะและหน้าพิมพ์ จึงหน้าตาตรงกันเสมอ
 * ข้อความทั้งหมดมาจาก snapshot (ไม่ใช่คะแนนปัจจุบัน) และถูก escape โดย React อยู่แล้ว
 */
export function SkillTranscriptDocument({ snapshot, code, issuedAt, verifyUrl }: SkillTranscriptDocumentProps) {
    const rows = snapshotToSkillRows(snapshot, SKILL_META)
    const chartData = rows.map((r) => ({ n: String(r.n), A: r.average }))

    return (
        <article className="transcript-doc relative mx-auto w-full max-w-[210mm] bg-white p-4 text-brand-900 shadow-sm sm:p-8 print:max-w-none print:p-0 print:shadow-none [print-color-adjust:exact]">
            {/* ลายน้ำ */}
            <p
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[96px] font-black tracking-tight text-brand-900/[0.04] -rotate-[24deg]"
            >
                Comp Active
            </p>

            <div className="relative">
                {/* หัวเอกสาร */}
                <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b-2 border-brand-900 pb-4">
                    {/* computing-logo-dark.png = ตัวอักษรสีเข้มสำหรับพื้นสว่าง (ไฟล์ computing-logo.png ตัวอักษรขาว มองไม่เห็นบนกระดาษ)
                        priority = โหลดทันทีไม่ lazy, unoptimized = เสิร์ฟไฟล์ตรง ไม่ผ่านตัวย่อภาพ → พร้อมก่อนสั่งพิมพ์ */}
                    <Image
                        src="/computing-logo-dark.png"
                        alt="วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                        width={305}
                        height={89}
                        priority
                        unoptimized
                        className="h-12 w-auto"
                    />
                    <div>
                        <p className="text-sm text-fg-muted">วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น</p>
                        <h1 className="text-2xl font-bold leading-tight">เอกสารรับรองผลการพัฒนาทักษะ</h1>
                        <p className="text-sm font-medium text-brand-600">Soft Skills Transcript</p>
                    </div>
                </header>

                {/* ผู้ถือเอกสาร */}
                <section className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 print:grid-cols-2">
                    <p>
                        <span className="text-fg-muted">ชื่อ-สกุล: </span>
                        <span className="font-semibold">{snapshot.holder.name}</span>
                    </p>
                    <p>
                        <span className="text-fg-muted">รหัสนักศึกษา: </span>
                        <span className="font-semibold">{snapshot.holder.studentId ?? "—"}</span>
                    </p>
                    <p>
                        <span className="text-fg-muted">เลขที่เอกสาร: </span>
                        <span className="font-mono font-semibold">{formatTranscriptCode(code)}</span>
                    </p>
                    <p>
                        <span className="text-fg-muted">ออกเมื่อ: </span>
                        <span className="font-semibold">{formatThaiDate(issuedAt)}</span>
                    </p>
                </section>

                {/* สรุป */}
                <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3">
                    <Summary label="แต้มสะสม" value={snapshot.summary.totalScore.toLocaleString("th-TH")} />
                    <Summary label="กิจกรรมที่เข้าร่วม" value={String(snapshot.summary.activityCount)} />
                    <Summary label="ค่าเฉลี่ยรวม (เต็ม 5)" value={snapshot.summary.overallAverage.toFixed(2)} />
                </section>

                {/* กราฟ + ตารางทักษะ */}
                <section className="mt-5 grid grid-cols-1 items-start gap-5 sm:grid-cols-[300px_1fr] print:grid-cols-[300px_1fr]">
                    <div className="flex justify-center">
                        <RadarChart width={300} height={300} cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                            <PolarGrid stroke="#cbd5e1" />
                            <PolarAngleAxis dataKey="n" tick={{ fill: "#1a365d", fontSize: 12, fontWeight: 700 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                            <Radar dataKey="A" stroke="#2b6cb0" strokeWidth={2} fill="#3182ce" fillOpacity={0.35} isAnimationActive={false} />
                        </RadarChart>
                    </div>

                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-brand-900 text-left">
                                <th className="w-6 py-1">#</th>
                                <th className="py-1">ทักษะ</th>
                                <th className="w-12 py-1 text-right">เฉลี่ย</th>
                                <th className="w-20 py-1 pl-2">ระดับ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.field} className="border-b border-border print:break-inside-avoid">
                                    <td className="py-1 font-semibold">{r.n}</td>
                                    <td className="py-1">
                                        <span className="block leading-tight">{r.label}</span>
                                        <span className="block text-[10px] leading-tight text-fg-muted">{r.labelEn}</span>
                                    </td>
                                    <td className="py-1 text-right font-semibold">{r.average.toFixed(2)}</td>
                                    <td className="py-1 pl-2">
                                        <span className="block h-1.5 w-full rounded-full bg-border">
                                            <span className="block h-1.5 rounded-full bg-brand-600" style={{ width: `${r.percent}%` }} />
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* ประวัติกิจกรรม */}
                <section className="mt-6">
                    <h2 className="mb-2 text-base font-bold">ประวัติกิจกรรมที่ได้รับการประเมิน</h2>
                    <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full min-w-[480px] text-sm print:min-w-0">
                        <thead>
                            <tr className="border-b border-brand-900 text-left">
                                <th className="w-10 py-1.5">ลำดับ</th>
                                <th className="py-1.5">กิจกรรม</th>
                                <th className="w-36 py-1.5">วันที่</th>
                                <th className="w-20 py-1.5 text-right">คะแนนรวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.activities.map((a, i) => (
                                <tr key={`${a.date}-${i}`} className="border-b border-border align-top print:break-inside-avoid">
                                    <td className="py-1.5">{i + 1}</td>
                                    <td className="break-words py-1.5 pr-3">{a.name}</td>
                                    <td className="py-1.5">{formatThaiDate(a.date)}</td>
                                    <td className="py-1.5 text-right font-semibold">{a.totalScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </section>

                {/* ส่วนท้าย: QR */}
                <footer className="mt-8 flex flex-col gap-4 border-t-2 border-brand-900 pt-4 sm:flex-row sm:items-center sm:gap-5 print:flex-row print:items-center print:gap-5 print:break-inside-avoid">
                    <QRCodeSVG value={verifyUrl} size={96} level="M" />
                    <div className="text-xs leading-relaxed text-fg-muted">
                        <p className="text-sm font-semibold text-brand-900">ตรวจสอบความถูกต้องของเอกสาร</p>
                        <p className="break-all">
                            สแกน QR หรือเปิด <span className="font-mono text-brand-900">{verifyUrl}</span>
                        </p>
                        <p>
                            เอกสารออกโดยระบบ Comp Active ข้อมูล ณ วันที่ออกเอกสาร ไม่มีลายมือชื่อ
                            ความถูกต้องยืนยันผ่านการตรวจสอบด้วย QR / เลขที่เอกสารข้างต้นเท่านั้น
                        </p>
                    </div>
                </footer>
            </div>
        </article>
    )
}
