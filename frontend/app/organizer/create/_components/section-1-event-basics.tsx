// frontend/app/organizer/create/_components/section-1-event-basics.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import { ImageCropUpload } from "@/components/ui/image-crop-upload"
import { cn } from "@/lib/utils"
import type { EventFormState, EventFormErrors } from "./types"

interface Props {
    data: EventFormState
    errors: EventFormErrors
    onChange: (patch: Partial<EventFormState>) => void
    onFieldBlur: (field: keyof EventFormErrors) => void
}

export function SectionEventBasics({ data, errors, onChange, onFieldBlur }: Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-fg">ข้อมูลภาพรวมของงาน</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    ตั้งชื่อและอธิบายภาพรวมของงาน — งานหนึ่งสามารถมีกิจกรรมย่อยได้หลายกิจกรรมในขั้นตอนถัดไป
                </p>
            </div>

            <div className="space-y-2">
                <p className="text-sm font-bold text-fg">ประเภทงาน</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(["single", "project"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onChange({ type: t })}
                            aria-pressed={data.type === t}
                            className={cn(
                                "rounded-xl border-2 p-4 text-left transition-colors",
                                data.type === t ? "border-brand-600 bg-brand-50" : "border-border hover:border-border-strong"
                            )}
                        >
                            <div className="font-bold text-fg">{t === "single" ? "กิจกรรมเดี่ยว" : "งานที่มีหลายกิจกรรมย่อย"}</div>
                            <p className="mt-1 text-sm text-fg-muted">
                                {t === "single"
                                    ? "งานนี้มีกิจกรรมเดียว กรอกรายละเอียดเป็นฟอร์มเดียวในขั้นตอนถัดไป"
                                    : "งานนี้มีได้หลายกิจกรรมย่อย แต่ละกิจกรรมมีรายละเอียด/เงื่อนไขของตัวเอง"}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            <FormField name="name" label="ชื่องาน" required error={errors.name}>
                <Input
                    value={data.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    onBlur={() => onFieldBlur("name")}
                    className={fieldInputClass(errors.name)}
                />
            </FormField>

            <FormField name="description" label="รายละเอียด" required error={errors.description}>
                <Textarea
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    onBlur={() => onFieldBlur("description")}
                    className={`min-h-[120px] ${fieldInputClass(errors.description)}`}
                />
            </FormField>

            <div className="space-y-2">
                <FormField name="imageFile" label="รูปภาพหน้าปกงาน">
                    <ImageCropUpload
                        label="รูปภาพหน้าปกงาน"
                        preview={data.imagePreview}
                        onChange={(file, preview) => onChange({ imageFile: file, imagePreview: preview })}
                        onClear={() => onChange({ imageFile: null, imagePreview: null })}
                    />
                </FormField>
            </div>
        </div>
    )
}
