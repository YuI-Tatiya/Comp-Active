"use client"

import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import { ImageCropUpload } from "@/components/ui/image-crop-upload"
import { Dropzone } from "@/components/ui/dropzone"
import { DynamicQuestionBuilder } from "@/components/ui/dynamic-question-builder"
import { CATEGORIES } from "@/lib/categories"
import { SOFT_SKILLS, SOFT_SKILL_TIERS, MAX_SOFT_SKILLS_PER_ACTIVITY, maxSoftSkillLevel } from "@/lib/soft-skills"
import { SoftSkillRubricLink } from "@/components/activity/soft-skill-rubric-link"
import { cn, toggleInArray } from "@/lib/utils"
import { Paperclip, X } from "lucide-react"
import type { ActivityFormState, ActivityFormErrors } from "./types"

const QUESTION_TYPE_OPTIONS = [
    { value: "text", label: "คำตอบแบบข้อความ" },
    { value: "single_choice", label: "เลือกตอบข้อเดียว" },
    { value: "multi_choice", label: "เลือกตอบได้หลายข้อ" },
]

const REGISTRATION_TYPE_OPTIONS: { value: ActivityFormState["registrationType"]; label: string; desc: string }[] = [
    { value: "participant", label: "ผู้เข้าร่วมทั่วไป", desc: "ลงทะเบียนเข้าร่วมกิจกรรมตามปกติ" },
    { value: "staff_volunteer", label: "สตาฟฟ์ · จิตอาสา", desc: "ช่วยงานหรือปฏิบัติหน้าที่ในกิจกรรม" },
    { value: "contestant", label: "ผู้สมัครแข่งขัน", desc: "สมัครเพื่อเข้าแข่งขันในกิจกรรม" },
]

function splitLines(text: string): string[] {
    return text.split("\n").map((s) => s.trim()).filter(Boolean)
}

interface Props {
    activity: ActivityFormState
    errors: ActivityFormErrors
    /** กิจกรรมนี้เป็นส่วนหนึ่งของโครงการหลายกิจกรรมหรือไม่ — ใช้ปลดล็อกเพดาน Soft Skills ระดับสูงสุด (ดู maxSoftSkillLevel) */
    isProject?: boolean
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

export function ActivityTabForm({ activity, errors, isProject, onChange, onFieldBlur }: Props) {
    const hoursPreview = computeHoursPreview(activity.startAt, activity.endAt)
    const durationHours = hoursPreview ? parseFloat(hoursPreview) : null
    const softSkillCap = maxSoftSkillLevel(durationHours ?? 0, activity.registrationType, !!isProject)
    const selectedSkillCount = Object.keys(activity.softSkillRates).length
    const atMaxSkills = selectedSkillCount >= MAX_SOFT_SKILLS_PER_ACTIVITY

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

    return (
        <Tabs defaultValue="info">
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface p-1">
                <TabsTrigger value="info">ข้อมูลกิจกรรม</TabsTrigger>
                <TabsTrigger value="datetime">วันเวลา/สถานที่</TabsTrigger>
                <TabsTrigger value="conditions">เงื่อนไขการรับสมัคร</TabsTrigger>
                <TabsTrigger value="eval">การประเมินผล</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-6 space-y-6">
                <FormField name="name" label="ชื่อกิจกรรม" required error={errors.name}>
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
                                            onChange({ categories: toggleInArray(activity.categories, c.value) })
                                            onFieldBlur("categories")
                                        }}
                                    />
                                    <span className={`size-2 rounded-full ${c.dot}`} aria-hidden="true" />
                                    {c.label}
                                </label>
                            )
                        })}
                    </div>
                </FormField>

                <FormField name="description" label="รายละเอียดกิจกรรม" required error={errors.description}>
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
            </TabsContent>

            <TabsContent value="datetime" className="mt-6 space-y-6">
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
            </TabsContent>

            <TabsContent value="conditions" className="mt-6 space-y-6">
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
                    <div>
                        <Label>ประเภทการรับสมัคร</Label>
                        <p className="mt-0.5 text-xs text-fg-muted">เลือกรูปแบบผู้เข้าร่วมของกิจกรรมนี้</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {REGISTRATION_TYPE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onChange({ registrationType: opt.value })}
                                aria-pressed={activity.registrationType === opt.value}
                                className={cn(
                                    "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                                    activity.registrationType === opt.value
                                        ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/20"
                                        : "border-border bg-bg text-fg-muted hover:border-border-strong hover:bg-surface"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {activity.registrationType === "staff_volunteer" && (
                        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
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
                            <FormField name="dutyShiftOptions" label="ตัวเลือกรอบ/กะเวลา (ถ้ามี, บรรทัดละ 1 ตัวเลือก)">
                                <Textarea
                                    value={activity.dutyShiftOptions.join("\n")}
                                    onChange={(e) => onChange({ dutyShiftOptions: splitLines(e.target.value) })}
                                    className="min-h-[80px]"
                                    placeholder={"เช่น\nกะเช้า 08:00-12:00\nกะบ่าย 13:00-17:00"}
                                />
                            </FormField>
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
                            <FormField name="competitionCategoryOptions" label="ตัวเลือกประเภท/รุ่นการแข่งขัน (ถ้ามี, บรรทัดละ 1 ตัวเลือก)">
                                <Textarea
                                    value={activity.competitionCategoryOptions.join("\n")}
                                    onChange={(e) => onChange({ competitionCategoryOptions: splitLines(e.target.value) })}
                                    className="min-h-[80px]"
                                />
                            </FormField>
                            <p className="text-xs text-fg-subtle">นักศึกษาจะกรอกชื่อทีมและลิงก์ผลงานตอนลงทะเบียน</p>
                        </div>
                    )}
                </div>

                <div className="space-y-6 border-t border-border pt-6">
                    {/* ใบรับรองจิตอาสา */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Label>ออกใบรับรองจิตอาสา</Label>
                            <p className="mt-0.5 text-xs text-fg-muted">
                                ระบบตั้งชั่วโมงจิตอาสาเริ่มต้นให้อัตโนมัติจากวันเวลาข้างต้น — ปรับเป็นรายบุคคลได้ภายหลังตอนออกใบรับรองให้แต่ละคน
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
            </TabsContent>

            <TabsContent value="eval" className="mt-6 space-y-6">
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
                                    ? "กรอกวันเวลาเริ่ม-สิ้นสุดในแท็บ \"วันเวลา/สถานที่\" ก่อน เพื่อคำนวณระดับสูงสุดที่ปลดล็อกได้"
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
            </TabsContent>
        </Tabs>
    )
}
