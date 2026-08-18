"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Toggle } from "@/components/ui/toggle"
import { categoryLabel } from "@/lib/categories"
import { softSkillLabel } from "@/lib/soft-skills"
import { PROGRAMS } from "@/lib/programs"
import { cn } from "@/lib/utils"
import { Calendar, MapPin, Users, Award } from "lucide-react"
import type { EventFormState, ActivityFormState } from "./types"

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6]

interface Props {
    event: EventFormState
    activities: ActivityFormState[]
    onChangeEvent: (patch: Partial<EventFormState>) => void
}

function formatDateTimeLocal(value: string): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

export function SectionPublish({ event, activities, onChangeEvent }: Props) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-lg font-bold text-fg">เผยแพร่และตรวจสอบ</h2>
                <p className="mt-1 text-sm text-fg-muted">ตรวจสอบข้อมูลก่อนสร้างงานจริง</p>
            </div>

            <div className="space-y-6 border-b border-border pb-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Label>เผยแพร่แบบสาธารณะ</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            เปิดไว้ = นักศึกษาทุกคนเห็นและลงทะเบียนได้ทันทีที่อนุมัติ
                        </p>
                    </div>
                    <Toggle checked={event.isPublic} onCheckedChange={(v) => onChangeEvent({ isPublic: v })} />
                </div>

                <div className="max-w-xs space-y-2">
                    <Label>วันปิดรับสมัคร (ถ้ามี)</Label>
                    <Input
                        type="datetime-local"
                        value={event.registrationCloseAt}
                        onChange={(e) => onChangeEvent({ registrationCloseAt: e.target.value })}
                    />
                </div>

                <div className="space-y-3">
                    <div>
                        <Label>การมองเห็น</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            เฉพาะกลุ่มที่กำหนด = เห็นเฉพาะนักศึกษาที่ตรงเงื่อนไขสาขา/ชั้นปี/รหัสนักศึกษาด้านล่าง
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {(["everyone", "restricted"] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => onChangeEvent({ visibility: v })}
                                aria-pressed={event.visibility === v}
                                className={cn(
                                    "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                                    event.visibility === v
                                        ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/20"
                                        : "border-border bg-bg text-fg-muted hover:border-border-strong hover:bg-surface"
                                )}
                            >
                                {v === "everyone" ? "ทุกคน" : "เฉพาะกลุ่มที่กำหนด"}
                            </button>
                        ))}
                    </div>
                </div>

                {event.visibility === "restricted" && (
                    <div className="space-y-5 rounded-lg border border-border bg-surface p-4">
                        <div className="space-y-2">
                            <Label>สาขาที่มีสิทธิ์เห็น (ว่าง = ทุกสาขา)</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {PROGRAMS.map((p) => {
                                    const checked = event.visibilityPrograms.includes(p.code)
                                    return (
                                        <label key={p.code} className="flex items-center gap-2 text-sm text-fg-muted">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    const next = e.target.checked
                                                        ? [...event.visibilityPrograms, p.code]
                                                        : event.visibilityPrograms.filter((c) => c !== p.code)
                                                    onChangeEvent({ visibilityPrograms: next })
                                                }}
                                                className="size-4 shrink-0 rounded border-border bg-bg text-brand-600 focus:ring-brand-500"
                                            />
                                            {p.label}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>ชั้นปีที่มีสิทธิ์เห็น (ว่าง = ทุกชั้นปี)</Label>
                            <div className="flex flex-wrap gap-2">
                                {YEAR_OPTIONS.map((year) => {
                                    const checked = event.visibilityYears.includes(year)
                                    return (
                                        <button
                                            key={year}
                                            type="button"
                                            aria-pressed={checked}
                                            onClick={() => {
                                                const next = checked
                                                    ? event.visibilityYears.filter((y) => y !== year)
                                                    : [...event.visibilityYears, year]
                                                onChangeEvent({ visibilityYears: next })
                                            }}
                                            className={cn(
                                                "rounded-full border px-4 py-1.5 text-sm font-bold transition-colors",
                                                checked
                                                    ? "border-brand-600 bg-brand-600 text-white"
                                                    : "border-border bg-bg text-fg-muted hover:border-border-strong"
                                            )}
                                        >
                                            ปี {year}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>ตัวกรองรหัสนักศึกษาเพิ่มเติม (ถ้ามี)</Label>
                            <Textarea
                                value={event.visibilityStudentIdFilter}
                                onChange={(e) => onChangeEvent({ visibilityStudentIdFilter: e.target.value })}
                                className="min-h-[70px] font-mono text-xs"
                            />
                            <p className="text-xs text-fg-subtle">
                                พิมพ์รหัสเดี่ยวหรือช่วงรหัส คั่นด้วยจุลภาคหรือขึ้นบรรทัดใหม่ เช่น 653380123-4 หรือ
                                653380001-1..653380100-5
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-fg">สรุปข้อมูลงาน</h3>
                <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="font-bold text-fg">{event.name || "-"}</div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-fg-muted">{event.description || "-"}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-fg">กิจกรรมย่อย ({activities.length})</h3>
                <div className="space-y-3">
                    {activities.map((a, i) => (
                        <div key={a.key} className="rounded-lg border border-border p-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-bold text-fg">{`${i + 1}. ${a.name || "-"}`}</div>
                                {a.category && <Badge variant="outline">{categoryLabel(a.category)}</Badge>}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-fg-muted">
                                <div className="flex items-center gap-2">
                                    <Calendar className="size-3.5 shrink-0" />
                                    {formatDateTimeLocal(a.startAt)} — {formatDateTimeLocal(a.endAt)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="size-3.5 shrink-0" />
                                    {a.location || "-"}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="size-3.5 shrink-0" />
                                    {a.capacityEnabled ? `รับ ${a.capacity || "-"} คน` : "ไม่จำกัดจำนวน"}
                                </div>
                                {a.certEnabled && (
                                    <div className="flex items-center gap-2">
                                        <Award className="size-3.5 shrink-0" />
                                        ออกใบจิตอาสา — {a.volunteerRole || "-"}
                                    </div>
                                )}
                            </div>
                            {a.softSkillsEnabled && Object.keys(a.softSkillRates).length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {Object.entries(a.softSkillRates).map(([skillType, rate]) => (
                                        <Badge key={skillType} variant="outline" className="text-xs">
                                            {softSkillLabel(skillType)} · {rate}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
