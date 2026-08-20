"use client"

import type { ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import { ImageCropUpload } from "@/components/ui/image-crop-upload"
import { DynamicQuestionBuilder } from "@/components/ui/dynamic-question-builder"
import { CATEGORIES } from "@/lib/categories"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { Paperclip, X } from "lucide-react"
import type { ActivityFormState, ActivityFormErrors } from "./types"

const QUESTION_TYPE_OPTIONS = [
    { value: "text", label: "คำตอบแบบข้อความ" },
    { value: "single_choice", label: "เลือกตอบข้อเดียว" },
    { value: "multi_choice", label: "เลือกตอบได้หลายข้อ" },
]

interface Props {
    activity: ActivityFormState
    errors: ActivityFormErrors
    onChange: (patch: Partial<ActivityFormState>) => void
    onFieldBlur: (field: keyof ActivityFormErrors) => void
}

/** พรีวิวชั่วโมงจิตอาสาฝั่ง client เท่านั้น — server คำนวณค่าจริงจาก startAt/endAt เองเสมอ ห้ามส่งค่านี้ไป backend */
function computeHoursPreview(startAt: string, endAt: string): string | null {
    if (!startAt || !endAt) return null
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null
    return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2)
}

export function ActivityTabForm({ activity, errors, onChange, onFieldBlur }: Props) {
    const hoursPreview = computeHoursPreview(activity.startAt, activity.endAt)

    function handleAttachmentChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        onChange({ attachmentFile: file, attachmentName: file.name })
    }

    function toggleSoftSkill(skillType: string, checked: boolean) {
        const next = { ...activity.softSkillRates }
        if (checked) {
            next[skillType] = next[skillType] ?? 5
        } else {
            delete next[skillType]
        }
        onChange({ softSkillRates: next })
    }

    function setSoftSkillRate(skillType: string, rate: number) {
        onChange({ softSkillRates: { ...activity.softSkillRates, [skillType]: rate } })
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField name="name" label="ชื่อกิจกรรม" required error={errors.name}>
                    <Input
                        value={activity.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        onBlur={() => onFieldBlur("name")}
                        className={fieldInputClass(errors.name)}
                    />
                </FormField>
                <FormField name="category" label="หมวดหมู่" required error={errors.category}>
                    <select
                        className={`h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldInputClass(errors.category)}`}
                        value={activity.category}
                        onChange={(e) => onChange({ category: e.target.value })}
                        onBlur={() => onFieldBlur("category")}
                    >
                        <option value="">เลือกหมวดหมู่</option>
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </FormField>
            </div>

            <FormField name="description" label="รายละเอียดกิจกรรม" required error={errors.description}>
                <Textarea
                    value={activity.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    onBlur={() => onFieldBlur("description")}
                    className={`min-h-[100px] ${fieldInputClass(errors.description)}`}
                />
            </FormField>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField name="startAt" label="วันเวลาเริ่ม" required error={errors.startAt}>
                    <Input
                        type="datetime-local"
                        value={activity.startAt}
                        onChange={(e) => onChange({ startAt: e.target.value })}
                        onBlur={() => onFieldBlur("startAt")}
                        className={fieldInputClass(errors.startAt)}
                    />
                </FormField>
                <FormField name="endAt" label="วันเวลาสิ้นสุด" required error={errors.endAt}>
                    <Input
                        type="datetime-local"
                        value={activity.endAt}
                        onChange={(e) => onChange({ endAt: e.target.value })}
                        onBlur={() => onFieldBlur("endAt")}
                        className={fieldInputClass(errors.endAt)}
                    />
                </FormField>
            </div>

            <FormField name="location" label="สถานที่" required error={errors.location}>
                <Input
                    value={activity.location}
                    onChange={(e) => onChange({ location: e.target.value })}
                    onBlur={() => onFieldBlur("location")}
                    className={fieldInputClass(errors.location)}
                />
            </FormField>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <FormField name="imageFile" label="รูปภาพกิจกรรม">
                        <ImageCropUpload
                            label="รูปภาพกิจกรรม"
                            preview={activity.imagePreview}
                            onChange={(file, preview) => onChange({ imageFile: file, imagePreview: preview })}
                            onClear={() => onChange({ imageFile: null, imagePreview: null })}
                        />
                    </FormField>
                </div>
                <div className="space-y-2">
                    <Label>ไฟล์แนบ (ถ้ามี)</Label>
                    {activity.attachmentName ? (
                        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                            <Paperclip className="size-4 shrink-0 text-fg-subtle" />
                            <span className="flex-1 truncate">{activity.attachmentName}</span>
                            <button
                                type="button"
                                onClick={() => onChange({ attachmentFile: null, attachmentName: null })}
                            >
                                <X className="size-4 text-fg-subtle hover:text-danger" />
                            </button>
                        </div>
                    ) : (
                        <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                            onChange={handleAttachmentChange}
                        />
                    )}
                </div>
            </div>

            <div className="space-y-6 border-t border-border pt-6">
                {/* จำกัดจำนวนผู้เข้าร่วม */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Label>จำกัดจำนวนผู้เข้าร่วม</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">ปิดไว้ = รับสมัครไม่จำกัดจำนวน</p>
                    </div>
                    <Toggle
                        checked={activity.capacityEnabled}
                        onCheckedChange={(v) => onChange({ capacityEnabled: v })}
                    />
                </div>
                {activity.capacityEnabled && (
                    <FormField name="capacity" label="จำนวนที่รับ (คน)" required error={errors.capacity} className="max-w-[200px]">
                        <Input
                            type="number"
                            min={1}
                            value={activity.capacity}
                            onChange={(e) => onChange({ capacity: e.target.value })}
                            onBlur={() => onFieldBlur("capacity")}
                            className={fieldInputClass(errors.capacity)}
                        />
                    </FormField>
                )}

                {/* ใบรับรองจิตอาสา */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Label>ออกใบรับรองจิตอาสา</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            ระบบคำนวณชั่วโมงจิตอาสาให้อัตโนมัติจากวันเวลาเริ่ม-สิ้นสุดด้านบน
                        </p>
                    </div>
                    <Toggle
                        checked={activity.certEnabled}
                        onCheckedChange={(v) => onChange({ certEnabled: v })}
                    />
                </div>
                {activity.certEnabled && (
                    <div className="space-y-4">
                        <FormField name="volunteerRole" label="ชื่อบทบาท/การทำงาน" required error={errors.volunteerRole} className="max-w-sm">
                            <Input
                                value={activity.volunteerRole}
                                onChange={(e) => onChange({ volunteerRole: e.target.value })}
                                onBlur={() => onFieldBlur("volunteerRole")}
                                className={fieldInputClass(errors.volunteerRole)}
                            />
                        </FormField>
                        <p className="text-sm text-fg-muted">
                            ชั่วโมงจิตอาสาโดยประมาณ:{" "}
                            <span className="font-bold text-brand-600">
                                {hoursPreview ? `${hoursPreview} ชั่วโมง` : "กรุณาระบุวันเวลาเริ่ม-สิ้นสุดก่อน"}
                            </span>
                        </p>
                    </div>
                )}

                {/* Soft Skills */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Label>ให้คะแนน Soft Skills</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            เลือกทักษะที่กิจกรรมนี้ฝึกฝน พร้อมกำหนดน้ำหนักคะแนน 1-10
                        </p>
                    </div>
                    <Toggle
                        checked={activity.softSkillsEnabled}
                        onCheckedChange={(v) => onChange({ softSkillsEnabled: v })}
                    />
                </div>
                {activity.softSkillsEnabled && (
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
                        {SOFT_SKILLS.map((skill) => {
                            const checked = skill.value in activity.softSkillRates
                            return (
                                <div key={skill.value} className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id={`${activity.key}-skill-${skill.value}`}
                                        checked={checked}
                                        onChange={(e) => toggleSoftSkill(skill.value, e.target.checked)}
                                        className="size-4 cursor-pointer rounded border-border bg-bg text-brand-600 focus:ring-brand-500"
                                    />
                                    <Label
                                        htmlFor={`${activity.key}-skill-${skill.value}`}
                                        className="flex-1 cursor-pointer text-sm font-normal"
                                    >
                                        {skill.label}
                                    </Label>
                                    {checked && (
                                        <Input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={activity.softSkillRates[skill.value]}
                                            onChange={(e) => setSoftSkillRate(skill.value, Number(e.target.value))}
                                            className="h-8 w-16 text-center"
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* คำถามเพิ่มเติมตอนลงทะเบียน */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Label>คำถามเพิ่มเติมตอนลงทะเบียน</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            ให้ผู้เข้าร่วมตอบคำถามที่กำหนดเองตอนลงทะเบียนกิจกรรมนี้
                        </p>
                    </div>
                    <Toggle
                        checked={activity.questionsEnabled}
                        onCheckedChange={(v) => onChange({ questionsEnabled: v })}
                    />
                </div>
                {activity.questionsEnabled && (
                    <DynamicQuestionBuilder
                        questions={activity.questions}
                        onChange={(questions) => onChange({ questions })}
                        typeOptions={QUESTION_TYPE_OPTIONS}
                        choiceTypes={["single_choice", "multi_choice"]}
                        showRequired
                        addLabel="เพิ่มคำถาม"
                        emptyLabel="ยังไม่มีคำถามเพิ่มเติม"
                    />
                )}
            </div>
        </div>
    )
}
