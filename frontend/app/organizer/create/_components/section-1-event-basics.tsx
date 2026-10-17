// frontend/app/organizer/create/_components/section-1-event-basics.tsx
"use client"

import { AlertCircle, Check, LayoutGrid, Square, type LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/ui/form-field"
import { ImageCropUpload } from "@/components/ui/image-crop-upload"
import { DENIM_FORM_INPUT } from "@/components/denim/denim-ui"
import { cn } from "@/lib/utils"
import { REGISTRATION_TYPE_OPTIONS, type EventFormState, type EventFormErrors } from "./types"
import { EVENT_DESCRIPTION_MAX_LENGTH, EVENT_DESCRIPTION_MIN_LENGTH, EVENT_NAME_MAX_LENGTH } from "./validation"
import { WizardBlock, WizardRequiredNote, WizardSectionHeader } from "./wizard-ui"

interface Props {
    data: EventFormState
    errors: EventFormErrors
    onChange: (patch: Partial<EventFormState>) => void
    onFieldBlur: (field: keyof EventFormErrors) => void
}

const EVENT_TYPE_OPTIONS: { value: EventFormState["type"]; code: string; title: string; desc: string; icon: LucideIcon }[] = [
    {
        value: "single",
        code: "type: single",
        title: "กิจกรรมเดี่ยว",
        desc: "งานนี้มีกิจกรรมเดียว กรอกรายละเอียดเป็นฟอร์มเดียวในขั้นตอนถัดไป",
        icon: Square,
    },
    {
        value: "project",
        code: "type: multi",
        title: "งานที่มีหลายกิจกรรมย่อย",
        desc: "มีได้หลายกิจกรรมย่อย แต่ละกิจกรรมมีรายละเอียดและเงื่อนไขของตัวเอง",
        icon: LayoutGrid,
    },
]

const BLOCK_LABEL = "text-sm font-semibold text-denim-deep"
const COUNTER = "font-code text-xs text-denim-muted"

export function SectionEventBasics({ data, errors, onChange, onFieldBlur }: Props) {
    const registration = REGISTRATION_TYPE_OPTIONS.find((o) => o.value === data.registrationType) ?? REGISTRATION_TYPE_OPTIONS[0]

    return (
        <>
            <WizardSectionHeader
                step={1}
                title="ข้อมูลภาพรวมของงาน"
                description="ตั้งชื่อและอธิบายภาพรวมของงาน — กิจกรรมย่อยจะเพิ่มได้ในขั้นตอนถัดไป"
                aside={<WizardRequiredNote />}
            />

            <WizardBlock>
                <p id="event-type-label" className={BLOCK_LABEL}>
                    ประเภทงาน
                </p>
                <div role="group" aria-labelledby="event-type-label" className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {EVENT_TYPE_OPTIONS.map(({ value, code, title, desc, icon: Icon }) => {
                        const selected = data.type === value
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onChange({ type: value })}
                                aria-pressed={selected}
                                className={cn(
                                    "relative flex items-start gap-4 rounded-[18px] border-[1.5px] p-5 pr-12 text-left transition-[background-color,border-color,box-shadow]",
                                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim",
                                    selected
                                        ? "border-denim-deep bg-denim-deep shadow-[0_4px_0_rgb(8_16_31)]"
                                        : "border-denim-field bg-white hover:border-denim-dash"
                                )}
                            >
                                <span
                                    className={cn(
                                        "grid size-11 shrink-0 place-items-center rounded-xl",
                                        selected ? "bg-amber text-denim-deep" : "border border-denim-line bg-denim-paper text-denim-deep"
                                    )}
                                    aria-hidden="true"
                                >
                                    <Icon className="size-5" />
                                </span>
                                <span className="min-w-0">
                                    <span className={cn("block font-code text-xs", selected ? "text-amber" : "text-denim-accent")} aria-hidden="true">
                                        {code}
                                    </span>
                                    <span className={cn("mt-0.5 block font-display text-[17px] font-bold", selected ? "text-white" : "text-denim-deep")}>
                                        {title}
                                    </span>
                                    <span className={cn("mt-1 block text-[13px] leading-relaxed", selected ? "text-denim-on" : "text-denim-muted")}>
                                        {desc}
                                    </span>
                                </span>
                                <span className="absolute right-4 top-4" aria-hidden="true">
                                    {selected ? (
                                        <span className="grid size-6 place-items-center rounded-full bg-amber text-denim-deep">
                                            <Check className="size-3.5" strokeWidth={3} />
                                        </span>
                                    ) : (
                                        <span className="block size-6 rounded-full border-[1.5px] border-denim-field" />
                                    )}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </WizardBlock>

            <WizardBlock>
                <p id="registration-type-label" className={BLOCK_LABEL}>
                    ประเภทการรับสมัคร
                </p>
                <div role="group" aria-labelledby="registration-type-label" className="mt-3 flex flex-wrap gap-2.5">
                    {REGISTRATION_TYPE_OPTIONS.map((opt) => {
                        const selected = data.registrationType === opt.value
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onChange({ registrationType: opt.value })}
                                aria-pressed={selected}
                                className={cn(
                                    "min-h-11 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-[background-color,border-color,box-shadow]",
                                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim",
                                    selected
                                        ? "border-amber bg-amber text-denim-deep shadow-[0_3px_0_var(--color-amber-deep)]"
                                        : "border-denim-field bg-white text-denim-ink hover:border-denim-dash"
                                )}
                            >
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
                {/* คำอธิบายของตัวที่เลือกอยู่ — เดิมอยู่ใน title (hover เท่านั้น มือถือ/คีย์บอร์ดไม่เห็น) */}
                <div className="mt-4 flex gap-3 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-[13px] leading-relaxed text-amber-ink">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-deep" aria-hidden="true" />
                    <div>
                        <p>
                            <strong className="font-semibold">{registration.label}</strong> — {registration.desc}
                        </p>
                        <p>ต้องเลือกก่อนเพิ่มกิจกรรมย่อย ทุกกิจกรรมย่อยในงานนี้จะใช้ประเภทเดียวกัน (เช่น ไม่ปนกิจกรรมรับจิตอาสากับกิจกรรมรับผู้แข่งขัน)</p>
                    </div>
                </div>
            </WizardBlock>

            <WizardBlock className="space-y-5">
                <FormField
                    name="name"
                    label="ชื่องาน"
                    required
                    error={errors.name}
                    htmlFor="event-name"
                    labelClassName={BLOCK_LABEL}
                    messageId="event-name-message"
                    aside={
                        <span className={COUNTER} aria-hidden="true">
                            {data.name.length}/{EVENT_NAME_MAX_LENGTH}
                        </span>
                    }
                >
                    <Input
                        id="event-name"
                        value={data.name}
                        maxLength={EVENT_NAME_MAX_LENGTH}
                        placeholder="เช่น Comp Camp 2026 ค่ายพี่พาน้องเขียนโค้ด"
                        onChange={(e) => onChange({ name: e.target.value })}
                        onBlur={() => onFieldBlur("name")}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "event-name-message" : undefined}
                        className={DENIM_FORM_INPUT}
                    />
                </FormField>

                <FormField
                    name="description"
                    label="รายละเอียด"
                    required
                    error={errors.description}
                    htmlFor="event-description"
                    labelClassName={BLOCK_LABEL}
                    messageId="event-description-message"
                    hint={`อย่างน้อย ${EVENT_DESCRIPTION_MIN_LENGTH} ตัวอักษร — บอกว่างานนี้เกี่ยวกับอะไร ใครควรมา และได้อะไรกลับไป`}
                    aside={
                        <span className={COUNTER} aria-hidden="true">
                            {data.description.length}/{EVENT_DESCRIPTION_MAX_LENGTH}
                        </span>
                    }
                >
                    <Textarea
                        id="event-description"
                        value={data.description}
                        maxLength={EVENT_DESCRIPTION_MAX_LENGTH}
                        placeholder="งานนี้เกี่ยวกับอะไร ใครควรเข้าร่วม และจะได้อะไรกลับไป..."
                        onChange={(e) => onChange({ description: e.target.value })}
                        onBlur={() => onFieldBlur("description")}
                        aria-invalid={!!errors.description}
                        aria-describedby="event-description-message"
                        className={cn(DENIM_FORM_INPUT, "h-auto min-h-[132px] resize-y py-3 leading-relaxed")}
                    />
                </FormField>
            </WizardBlock>

            <WizardBlock>
                <FormField
                    name="imageFile"
                    label="รูปภาพหน้าปกงาน"
                    labelClassName={BLOCK_LABEL}
                    aside={<span className="text-xs text-denim-muted">ไม่บังคับ</span>}
                >
                    <ImageCropUpload
                        label="รูปภาพหน้าปกงาน"
                        preview={data.imagePreview}
                        onChange={(file, preview) => onChange({ imageFile: file, imagePreview: preview })}
                        onClear={() => onChange({ imageFile: null, imagePreview: null })}
                        dropzoneClassName="min-h-[220px]"
                    />
                </FormField>
            </WizardBlock>
        </>
    )
}
