"use client"

import { useEffect, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import { ImageCropUpload } from "@/components/ui/image-crop-upload"
import { Dropzone } from "@/components/ui/dropzone"
import { DynamicQuestionBuilder } from "@/components/ui/dynamic-question-builder"
import { CATEGORIES } from "@/lib/categories"
import { SOFT_SKILLS, SOFT_SKILL_TIERS, MAX_SOFT_SKILLS_PER_ACTIVITY, maxSoftSkillLevel } from "@/lib/soft-skills"
import { SoftSkillRubricLink } from "@/components/activity/soft-skill-rubric-link"
import { cn, toggleInArray } from "@/lib/utils"
import { Paperclip, Plus, Trash2, X } from "lucide-react"
import { createEmptyShiftRow, deriveVolunteerRole, type DutyShiftRow } from "@/lib/duty-shift"
import { REGISTRATION_TYPE_OPTIONS, type ActivityFormState, type ActivityFormErrors } from "./types"

const QUESTION_TYPE_OPTIONS = [
    { value: "text", label: "คำตอบแบบข้อความ" },
    { value: "single_choice", label: "เลือกตอบข้อเดียว" },
    { value: "multi_choice", label: "เลือกตอบได้หลายข้อ" },
]

function splitLines(text: string): string[] {
    return text.split("\n").map((s) => s.trim()).filter(Boolean)
}

/** หัวข้อย่อยของฟอร์มกิจกรรม — เดิมแยกเป็น 4 แท็บ ตามที่ผู้ใช้ขอให้รวมมาอยู่หน้าเดียวกัน จึงเหลือแค่หัวข้อ+เส้นคั่น */
function FormSection({ title, first, children }: { title: string; first?: boolean; children: ReactNode }) {
    return (
        <section className={cn("space-y-6", !first && "border-t border-border pt-8")}>
            <h3 className="text-base font-bold text-fg">{title}</h3>
            {children}
        </section>
    )
}

interface Props {
    activity: ActivityFormState
    errors: ActivityFormErrors
    /** กิจกรรมนี้เป็นส่วนหนึ่งของโครงการหลายกิจกรรมหรือไม่ — ใช้ปลดล็อกเพดาน Soft Skills ระดับสูงสุด (ดู maxSoftSkillLevel) */
    isProject?: boolean
    /** งานประเภท "หลายกิจกรรมย่อย" (event.type !== "single") — กิจกรรมสตาฟฟ์/จิตอาสาในโหมดนี้ใช้ฟอร์ม "1 บทบาทต่อแท็บ" (ดู isNewRoleMode ด้านล่าง) */
    isMultiActivity?: boolean
    onChange: (patch: Partial<ActivityFormState>) => void
    /**
     * patch: ใช้เมื่อเรียกจากตัว onChange เดียวกัน (เช่น checkbox หมวดหมู่) ไม่ใช่ event blur จริง —
     * ส่งค่าที่เพิ่งเปลี่ยนไปด้วย กัน parent validate กับ activity เก่าที่ state ยัง commit ไม่ทัน
     */
    onFieldBlur: (field: keyof ActivityFormErrors, patch?: Partial<ActivityFormState>) => void
}

/** พรีวิวชั่วโมงจิตอาสาฝั่ง client เท่านั้น — server คำนวณค่าจริงจาก startAt/endAt เองเสมอ ห้ามส่งค่านี้ไป backend */
function computeHoursPreview(startAt: string, endAt: string): string | null {
    if (!startAt || !endAt) return null
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null
    return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2)
}

/** รวมวันที่ + เวลา (HH:mm) เป็น <input type="datetime-local"> value — ว่างถ้าขาดอย่างใดอย่างหนึ่ง */
function toDateTimeLocal(date: string, time: string): string {
    return date && time ? `${date}T${time}` : ""
}

/**
 * โหมดบทบาทต่อแท็บ: คำนวณ startAt/endAt จากวันที่ปฏิบัติหน้าที่ + เวลา — โหมดเดี่ยว (ไม่แบ่งกะ) ใช้แถวเดียวใน
 * dutyShiftRows[0] เป็นที่เก็บเวลาเริ่ม/สิ้นสุด (ไม่ส่งไป backend เป็นกะจริง — buildDutyShiftOptions คืน [] เสมอตอน
 * โหมด "single"); โหมดแบ่งกะใช้ช่วงรวมของทุกกะ (เร็วสุด-ช้าสุด)
 */
function computeDutyDates(dutyDate: string, mode: ActivityFormState["dutyShiftMode"], rows: ActivityFormState["dutyShiftRows"]): { startAt: string; endAt: string } {
    if (!dutyDate) return { startAt: "", endAt: "" }
    if (mode === "single") {
        const row = rows[0]
        if (!row?.startTime || !row?.endTime) return { startAt: "", endAt: "" }
        return { startAt: toDateTimeLocal(dutyDate, row.startTime), endAt: toDateTimeLocal(dutyDate, row.endTime) }
    }
    const valid = rows.filter((r) => r.startTime && r.endTime)
    if (valid.length === 0) return { startAt: "", endAt: "" }
    const earliestStart = valid.reduce((min, r) => (r.startTime < min ? r.startTime : min), valid[0].startTime)
    const latestEnd = valid.reduce((max, r) => (r.endTime > max ? r.endTime : max), valid[0].endTime)
    return { startAt: toDateTimeLocal(dutyDate, earliestStart), endAt: toDateTimeLocal(dutyDate, latestEnd) }
}

export function ActivityTabForm({ activity, errors, isProject, isMultiActivity, onChange, onFieldBlur }: Props) {
    const hoursPreview = computeHoursPreview(activity.startAt, activity.endAt)
    const durationHours = hoursPreview ? parseFloat(hoursPreview) : null
    const softSkillCap = maxSoftSkillLevel(durationHours ?? 0, activity.registrationType, !!isProject)
    const selectedSkillCount = Object.keys(activity.softSkillRates).length
    const atMaxSkills = selectedSkillCount >= MAX_SOFT_SKILLS_PER_ACTIVITY

    // งานปฏิบัติหน้าที่หลายวันจริง (กรอกมาก่อนหน้านี้ด้วยฟอร์มวันเวลาเต็ม) ยังต้องแก้ด้วยฟอร์มเดิมได้ —
    // โหมดวันเดียว+เวลาปฏิบัติหน้าที่ใหม่รองรับได้แค่ "1 วัน" ไม่งั้นจะย่อช่วงวันที่ของจริงหายไปเงียบๆ ตอนบันทึก
    const spansMultipleDays = !!activity.startAt && !!activity.endAt && activity.startAt.slice(0, 10) !== activity.endAt.slice(0, 10)
    const isNewRoleMode = activity.registrationType === "staff_volunteer" && !!isMultiActivity && !spansMultipleDays
    // งานประเภทแข่งขันแบบหลายประเภทการแข่งขัน — เปลี่ยนคำว่า "กิจกรรม" เป็น "การแข่งขัน" ในฟอร์ม (ดู SectionActivities)
    const isContestantMultiMode = activity.registrationType === "contestant" && !!isMultiActivity

    // โหมดบทบาทต่อแท็บ: วันที่เปลี่ยน/โหมดกะเปลี่ยน/เวลาในแถวเปลี่ยน → คำนวณ startAt/endAt ใหม่เสมอ
    // ข้อมูลเดิมโหมด "single" ที่ยังไม่เคยมีแถวเวลา (แก้ไขกิจกรรมเก่าก่อนมีฟีเจอร์นี้) ดึงเวลาจาก startAt/endAt
    // เดิมมาตั้งเป็นแถวแรกก่อน แทนที่จะคำนวณด้วยแถวว่างแล้วเคลียร์ค่าที่มีอยู่ทิ้ง
    useEffect(() => {
        if (!isNewRoleMode) return
        if (activity.dutyShiftMode === "single" && activity.dutyShiftRows.length === 0 && activity.startAt && activity.endAt) {
            const startTime = activity.startAt.slice(11, 16)
            const endTime = activity.endAt.slice(11, 16)
            if (startTime && endTime) {
                onChange({ dutyShiftRows: [{ ...createEmptyShiftRow(), startTime, endTime }] })
                return
            }
        }
        const { startAt, endAt } = computeDutyDates(activity.dutyDate, activity.dutyShiftMode, activity.dutyShiftRows)
        if (startAt !== activity.startAt || endAt !== activity.endAt) onChange({ startAt, endAt })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNewRoleMode, activity.dutyDate, activity.dutyShiftMode, activity.dutyShiftRows, activity.startAt, activity.endAt])

    // เพดานลดลง (เช่น แก้วันเวลาให้สั้นลงทีหลัง) ต้องลดค่าที่เลือกไว้แล้วลงมาด้วย ไม่ปล่อยให้ค้างเกินเพดาน
    useEffect(() => {
        const entries = Object.entries(activity.softSkillRates)
        const clamped = entries.filter(([, rate]) => rate > softSkillCap)
        if (clamped.length === 0) return
        const next = { ...activity.softSkillRates }
        for (const [skillType] of clamped) next[skillType] = softSkillCap
        onChange({ softSkillRates: next })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [softSkillCap])

    function toggleSoftSkill(skillType: string, checked: boolean) {
        const next = { ...activity.softSkillRates }
        if (checked) {
            if (Object.keys(next).length >= MAX_SOFT_SKILLS_PER_ACTIVITY) return
            // 2 คือระดับต่ำสุดที่ใช้ได้เสมอไม่ว่าเพดานของกิจกรรมนี้จะเท่าไร
            next[skillType] = next[skillType] ?? 2
        } else {
            delete next[skillType]
        }
        onChange({ softSkillRates: next })
    }

    function setSoftSkillRate(skillType: string, rate: number) {
        onChange({ softSkillRates: { ...activity.softSkillRates, [skillType]: rate } })
    }

    function updateShiftRow(index: number, patch: Partial<DutyShiftRow>) {
        onChange({ dutyShiftRows: activity.dutyShiftRows.map((r, i) => (i === index ? { ...r, ...patch } : r)) })
    }

    function addShiftRow() {
        onChange({ dutyShiftRows: [...activity.dutyShiftRows, createEmptyShiftRow()] })
    }

    function removeShiftRow(index: number) {
        onChange({ dutyShiftRows: activity.dutyShiftRows.filter((_, i) => i !== index) })
    }

    return (
        <div className="space-y-8">
            <FormSection title="ข้อมูลกิจกรรม" first>
                <FormField name="name" label={isContestantMultiMode ? "ชื่อการแข่งขัน" : "ชื่อกิจกรรม"} required error={errors.name}>
                    <Input
                        value={activity.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        onBlur={() => onFieldBlur("name")}
                        className={fieldInputClass(errors.name)}
                    />
                </FormField>

                <FormField name="categories" label="หมวดหมู่ (เลือกได้มากกว่า 1)" required error={errors.categories}>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => {
                            const selected = activity.categories.includes(c.value)
                            return (
                                <label
                                    key={c.value}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                        selected
                                            ? "border-brand-500 bg-brand-50 text-brand-700"
                                            : "border-border bg-bg text-fg hover:bg-surface"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="size-4 rounded border-border text-brand-600 focus:ring-brand-500"
                                        checked={selected}
                                        onChange={() => {
                                            const nextCategories = toggleInArray(activity.categories, c.value)
                                            onChange({ categories: nextCategories })
                                            // ส่งค่าใหม่ตรงๆ ให้ validate — onFieldBlur เรียกในบรรทัดเดียวกับ onChange
                                            // (ไม่ใช่ event blur จริง) ถ้าปล่อยให้พ่อแม่ไปอ่านค่า activity จาก state
                                            // เองจะได้ค่าเก่าก่อนติ๊ก (setState ยัง commit ไม่ทัน) แล้วขึ้น error ค้างทั้งที่เลือกแล้ว
                                            onFieldBlur("categories", { categories: nextCategories })
                                        }}
                                    />
                                    <span className={`size-2 rounded-full ${c.dot}`} aria-hidden="true" />
                                    {c.label}
                                </label>
                            )
                        })}
                    </div>
                </FormField>

                <FormField name="description" label={isContestantMultiMode ? "รายละเอียดการแข่งขัน" : "รายละเอียดกิจกรรม"} required error={errors.description}>
                    <Textarea
                        value={activity.description}
                        onChange={(e) => onChange({ description: e.target.value })}
                        onBlur={() => onFieldBlur("description")}
                        className={`min-h-[100px] ${fieldInputClass(errors.description)}`}
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
                        <Dropzone
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                            onFileSelected={(file) => onChange({ attachmentFile: file, attachmentName: file.name })}
                            hasFile={!!activity.attachmentName}
                            hint="รองรับ PDF, Word, PowerPoint, Excel, ZIP"
                        >
                            {activity.attachmentName && (
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
                            )}
                        </Dropzone>
                    </div>
                </div>
            </FormSection>

            {/* โหมดบทบาทต่อแท็บ (isNewRoleMode) ย้ายวันที่+เวลาไปรวมกับ "รูปแบบเวลาปฏิบัติหน้าที่" และสถานที่ไปแทนช่อง
                ตัวเลือกบทบาท/หน้าที่ ในหัวข้อ "เงื่อนไขการรับสมัคร" ด้านล่างแทน — ดูเหตุผลที่ isNewRoleMode */}
            {!isNewRoleMode && (
                <FormSection title="วันเวลา/สถานที่">
                    <p className="text-sm text-fg-muted">ระบุวันเวลาเริ่มกิจกรรมและสิ้นสุดกิจกรรม</p>
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
                </FormSection>
            )}

            <FormSection title="เงื่อนไขการรับสมัคร">
                <div className="space-y-3">
                    <Label>จำนวนผู้เข้าร่วม</Label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-fg">
                            <input
                                type="radio"
                                name={`${activity.key}-capacity-mode`}
                                checked={activity.capacityEnabled}
                                onChange={() => onChange({ capacityEnabled: true })}
                                className="size-4 shrink-0 border-border text-brand-600 focus:ring-brand-500"
                            />
                            จำกัดจำนวนผู้เข้าร่วม (ระบุจำนวน)
                        </label>
                        <label className="flex items-center gap-2 text-sm text-fg">
                            <input
                                type="radio"
                                name={`${activity.key}-capacity-mode`}
                                checked={!activity.capacityEnabled}
                                onChange={() => onChange({ capacityEnabled: false })}
                                className="size-4 shrink-0 border-border text-brand-600 focus:ring-brand-500"
                            />
                            ไม่จำกัดจำนวน
                        </label>
                    </div>
                    {activity.capacityEnabled ? (
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
                    ) : (
                        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
                            รับสมัครได้ไม่จำกัดจำนวน
                        </p>
                    )}
                </div>

                <div className="space-y-3 border-t border-border pt-6">
                    {/*
                      เลือกครั้งเดียวที่ขั้นตอนที่ 1 (ข้อมูลพื้นฐาน) แล้วใช้เหมือนกันทุกกิจกรรมย่อยในงานนี้ — กันไม่ให้
                      งานเดียวมีกิจกรรมย่อยปนกันหลายรูปแบบ ที่นี่แสดงผลอย่างเดียว แก้ไขไม่ได้ (ดู REGISTRATION_TYPE_OPTIONS)
                    */}
                    <div>
                        <Label>ประเภทการรับสมัคร</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            ตั้งค่าไว้ที่ขั้นตอนที่ 1 (ข้อมูลพื้นฐาน) ใช้เหมือนกันทุกกิจกรรมย่อยในงานนี้
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
                        {REGISTRATION_TYPE_OPTIONS.find((o) => o.value === activity.registrationType)?.label}
                    </div>

                    {activity.registrationType === "staff_volunteer" && (
                        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
                            {isNewRoleMode ? (
                                <FormField name="location" label="สถานที่" required error={errors.location}>
                                    <Input
                                        value={activity.location}
                                        onChange={(e) => onChange({ location: e.target.value })}
                                        onBlur={() => onFieldBlur("location")}
                                        className={fieldInputClass(errors.location)}
                                    />
                                </FormField>
                            ) : (
                                <FormField
                                    name="dutyRoleOptions"
                                    label="ตัวเลือกบทบาท/หน้าที่ (บรรทัดละ 1 ตัวเลือก)"
                                    required
                                    error={errors.dutyRoleOptions}
                                >
                                    <Textarea
                                        value={activity.dutyRoleOptions.join("\n")}
                                        onChange={(e) => onChange({ dutyRoleOptions: splitLines(e.target.value) })}
                                        onBlur={() => onFieldBlur("dutyRoleOptions")}
                                        className={`min-h-[80px] ${fieldInputClass(errors.dutyRoleOptions)}`}
                                        placeholder={"เช่น\nลงทะเบียนหน้างาน\nดูแลอุปกรณ์"}
                                    />
                                </FormField>
                            )}
                            <div className="space-y-3">
                                {isNewRoleMode && (
                                    <FormField name="dutyDate" label="วันที่ปฏิบัติหน้าที่" required error={errors.dutyDate}>
                                        <Input
                                            type="date"
                                            value={activity.dutyDate}
                                            onChange={(e) => onChange({ dutyDate: e.target.value })}
                                            onBlur={() => onFieldBlur("dutyDate")}
                                            className={`max-w-[200px] ${fieldInputClass(errors.dutyDate)}`}
                                        />
                                    </FormField>
                                )}
                                <Label>รูปแบบเวลาปฏิบัติหน้าที่</Label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm text-fg">
                                        <input
                                            type="radio"
                                            name={`${activity.key}-shift-mode`}
                                            checked={activity.dutyShiftMode === "single"}
                                            onChange={() => onChange({ dutyShiftMode: "single" })}
                                            className="size-4 shrink-0 border-border text-brand-600 focus:ring-brand-500"
                                        />
                                        ตลอดทั้งกิจกรรม (ไม่แบ่งกะ)
                                    </label>
                                    {isNewRoleMode && activity.dutyShiftMode === "single" && (
                                        <div className="ml-6 flex flex-wrap items-end gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-normal text-fg-muted">เวลาเริ่ม</Label>
                                                <Input
                                                    type="time"
                                                    value={activity.dutyShiftRows[0]?.startTime ?? ""}
                                                    onChange={(e) => {
                                                        const row = activity.dutyShiftRows[0] ?? createEmptyShiftRow()
                                                        onChange({ dutyShiftRows: [{ ...row, startTime: e.target.value }] })
                                                    }}
                                                    onBlur={() => onFieldBlur("startAt")}
                                                    className="w-[120px]"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-normal text-fg-muted">เวลาสิ้นสุด</Label>
                                                <Input
                                                    type="time"
                                                    value={activity.dutyShiftRows[0]?.endTime ?? ""}
                                                    onChange={(e) => {
                                                        const row = activity.dutyShiftRows[0] ?? createEmptyShiftRow()
                                                        onChange({ dutyShiftRows: [{ ...row, endTime: e.target.value }] })
                                                    }}
                                                    onBlur={() => onFieldBlur("endAt")}
                                                    className="w-[120px]"
                                                />
                                            </div>
                                            {errors.endAt && <p className="text-xs text-danger">{errors.endAt}</p>}
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 text-sm text-fg">
                                        <input
                                            type="radio"
                                            name={`${activity.key}-shift-mode`}
                                            checked={activity.dutyShiftMode === "shifts"}
                                            onChange={() =>
                                                onChange({
                                                    dutyShiftMode: "shifts",
                                                    dutyShiftRows: activity.dutyShiftRows.length
                                                        ? activity.dutyShiftRows
                                                        : [createEmptyShiftRow()],
                                                })
                                            }
                                            className="size-4 shrink-0 border-border text-brand-600 focus:ring-brand-500"
                                        />
                                        แบ่งเป็นกะ (เช่น กะเช้า/กะบ่าย)
                                    </label>
                                </div>

                                {activity.dutyShiftMode === "shifts" && (
                                    <div className="space-y-2">
                                        {activity.dutyShiftRows.map((row, i) => (
                                            <div
                                                key={row.id}
                                                className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-bg p-3"
                                            >
                                                <div className="min-w-[140px] flex-1 space-y-1">
                                                    <Label className="text-xs font-normal text-fg-muted">ชื่อกะ</Label>
                                                    <Input
                                                        value={row.label}
                                                        onChange={(e) => updateShiftRow(i, { label: e.target.value })}
                                                        placeholder="เช่น กะเช้า"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-normal text-fg-muted">เริ่ม</Label>
                                                    <Input
                                                        type="time"
                                                        value={row.startTime}
                                                        onChange={(e) => updateShiftRow(i, { startTime: e.target.value })}
                                                        className="w-[120px]"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-normal text-fg-muted">สิ้นสุด</Label>
                                                    <Input
                                                        type="time"
                                                        value={row.endTime}
                                                        onChange={(e) => updateShiftRow(i, { endTime: e.target.value })}
                                                        className="w-[120px]"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeShiftRow(i)}
                                                    aria-label={`ลบ${row.label || "กะนี้"}`}
                                                    className="flex size-9 items-center justify-center rounded-lg text-fg-subtle hover:bg-danger/10 hover:text-danger"
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addShiftRow}
                                            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-fg-muted hover:border-border-strong hover:bg-surface"
                                        >
                                            <Plus className="size-4" aria-hidden="true" /> เพิ่มกะ
                                        </button>
                                        {errors.dutyShiftRows && (
                                            <p className="text-xs text-danger">{errors.dutyShiftRows}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ใบรับรองจิตอาสา — เฉพาะประเภทนี้ที่มีตัวเลือกบทบาท/หน้าที่ให้อ้างอิง */}
                            <div className="space-y-4 border-t border-border pt-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Label>ออกใบรับรองจิตอาสา</Label>
                                        <p className="mt-0.5 text-xs text-fg-muted">
                                            ระบบตั้งชั่วโมงจิตอาสาเริ่มต้นให้อัตโนมัติจากวันเวลาข้างต้น — ปรับเป็นรายบุคคลได้ภายหลังตอนออกใบรับรองให้แต่ละคน
                                        </p>
                                    </div>
                                    <Toggle checked={activity.certEnabled} onCheckedChange={(v) => onChange({ certEnabled: v })} />
                                </div>
                                {activity.certEnabled && (
                                    <div className="space-y-1 text-sm text-fg-muted">
                                        <p>
                                            บทบาทบนใบรับรอง:{" "}
                                            <span className="font-bold text-fg">
                                                {isNewRoleMode
                                                    ? activity.name || "กรุณาระบุชื่อบทบาท/หน้าที่ด้านบนก่อน"
                                                    : deriveVolunteerRole(activity.dutyRoleOptions) || "กรุณาระบุตัวเลือกบทบาท/หน้าที่ด้านบนก่อน"}
                                            </span>{" "}
                                            {isNewRoleMode
                                                ? "(อ้างอิงจากชื่อกิจกรรมด้านบน ไม่ต้องกรอกซ้ำ)"
                                                : "(อ้างอิงจากตัวเลือกบทบาท/หน้าที่ด้านบน ไม่ต้องกรอกซ้ำ)"}
                                        </p>
                                        <p>
                                            ชั่วโมงจิตอาสาโดยประมาณ:{" "}
                                            <span className="font-bold text-brand-600">
                                                {hoursPreview ? `${hoursPreview} ชั่วโมง` : "กรุณาระบุวันเวลาเริ่ม-สิ้นสุดก่อน"}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activity.registrationType === "contestant" && (
                        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
                            <div className="flex max-w-sm gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label>จำนวนสมาชิกทีมขั้นต่ำ</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={activity.teamSizeMin}
                                        onChange={(e) => onChange({ teamSizeMin: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label>จำนวนสมาชิกทีมสูงสุด</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={activity.teamSizeMax}
                                        onChange={(e) => onChange({ teamSizeMax: e.target.value })}
                                        onBlur={() => onFieldBlur("teamSizeMax")}
                                        className={fieldInputClass(errors.teamSizeMax)}
                                    />
                                </div>
                            </div>
                            {errors.teamSizeMax && <p className="text-xs text-danger">{errors.teamSizeMax}</p>}
                            {/* แต่ละแท็บ = 1 การแข่งขันอยู่แล้วในโหมดนี้ (isContestantMultiMode) ไม่ต้องมีตัวเลือกประเภท/รุ่นย่อยซ้อนอีกชั้น
                                เหมือนกับที่ตัวเลือกบทบาท/หน้าที่ถูกตัดออกในโหมดบทบาทต่อแท็บ — โหมดกิจกรรมเดี่ยวยังมีช่องนี้ตามปกติ */}
                            {!isContestantMultiMode && (
                                <FormField name="competitionCategoryOptions" label="ตัวเลือกประเภท/รุ่นการแข่งขัน (ถ้ามี, บรรทัดละ 1 ตัวเลือก)">
                                    <Textarea
                                        value={activity.competitionCategoryOptions.join("\n")}
                                        onChange={(e) => onChange({ competitionCategoryOptions: splitLines(e.target.value) })}
                                        className="min-h-[80px]"
                                    />
                                </FormField>
                            )}
                            <p className="text-xs text-fg-subtle">นักศึกษาจะกรอกชื่อทีมและลิงก์ผลงานตอนลงทะเบียน</p>
                        </div>
                    )}
                </div>

                <div className="space-y-6 border-t border-border pt-6">
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
            </FormSection>

            <FormSection title="การประเมินผล">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Label>ทักษะที่กิจกรรมนี้ช่วยพัฒนา</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            เลือกได้สูงสุด {MAX_SOFT_SKILLS_PER_ACTIVITY} ทักษะต่อกิจกรรม — ผู้เข้าร่วมทุกคนที่เช็คอินจะได้รับระดับนี้เท่ากันโดยอัตโนมัติ
                        </p>
                    </div>
                    <Toggle
                        checked={activity.softSkillsEnabled}
                        onCheckedChange={(v) => onChange({ softSkillsEnabled: v })}
                    />
                </div>
                {activity.softSkillsEnabled && (
                    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
                        <div className="space-y-1 text-xs text-fg-muted">
                            <p className="font-medium text-fg">
                                เลือกแล้ว {selectedSkillCount}/{MAX_SOFT_SKILLS_PER_ACTIVITY} ทักษะ — ระดับสูงสุดที่ให้ได้ขึ้นกับระยะเวลากิจกรรม
                            </p>
                            <p>
                                {durationHours == null
                                    ? isNewRoleMode
                                        ? "กรอกวันที่และเวลาปฏิบัติหน้าที่ในหัวข้อ \"เงื่อนไขการรับสมัคร\" ด้านบนก่อน เพื่อคำนวณระดับสูงสุดที่ปลดล็อกได้"
                                        : "กรอกวันเวลาเริ่ม-สิ้นสุดในหัวข้อ \"วันเวลา/สถานที่\" ด้านบนก่อน เพื่อคำนวณระดับสูงสุดที่ปลดล็อกได้"
                                    : softSkillCap === 2
                                        ? `กิจกรรมนี้ (${durationHours} ชม.) ให้ได้สูงสุดระดับ "ผ่าน" — กิจกรรมที่ยาวขึ้นจะปลดล็อกระดับสูงกว่านี้`
                                        : softSkillCap === 3
                                            ? `กิจกรรมนี้ (${durationHours} ชม.) ให้ได้สูงสุดระดับ "ดี"`
                                            : `กิจกรรมนี้ (${durationHours} ชม., สตาฟฟ์/จิตอาสา) ให้ได้ถึงระดับ "ดีเยี่ยม"`}
                            </p>
                            <SoftSkillRubricLink />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {SOFT_SKILLS.map((skill) => {
                                const checked = skill.value in activity.softSkillRates
                                const rate = activity.softSkillRates[skill.value]
                                return (
                                    <div key={skill.value} className="flex flex-wrap items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id={`${activity.key}-skill-${skill.value}`}
                                            checked={checked}
                                            disabled={!checked && atMaxSkills}
                                            onChange={(e) => toggleSoftSkill(skill.value, e.target.checked)}
                                            className="size-4 cursor-pointer rounded border-border bg-bg text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                                        />
                                        <Label
                                            htmlFor={`${activity.key}-skill-${skill.value}`}
                                            className={cn(
                                                "min-w-[220px] flex-1 text-sm font-normal",
                                                !checked && atMaxSkills ? "cursor-not-allowed text-fg-subtle" : "cursor-pointer"
                                            )}
                                        >
                                            {skill.label}
                                        </Label>
                                        {checked && (
                                            <div className="flex gap-1.5">
                                                {SOFT_SKILL_TIERS.map((tier) => {
                                                    const locked = tier.value > softSkillCap
                                                    return (
                                                        <button
                                                            key={tier.value}
                                                            type="button"
                                                            title={locked ? "กิจกรรมนี้ยังไม่ปลดล็อกระดับนี้" : tier.hint}
                                                            disabled={locked}
                                                            onClick={() => setSoftSkillRate(skill.value, tier.value)}
                                                            aria-pressed={rate === tier.value}
                                                            className={cn(
                                                                "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                                                                locked
                                                                    ? "cursor-not-allowed border-border bg-surface text-fg-subtle opacity-50"
                                                                    : rate === tier.value
                                                                        ? "border-brand-600 bg-brand-600 text-white"
                                                                        : "border-border bg-bg text-fg-muted hover:border-border-strong"
                                                            )}
                                                        >
                                                            {tier.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </FormSection>
        </div>
    )
}
