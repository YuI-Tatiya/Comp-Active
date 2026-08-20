// frontend/app/organizer/create/_components/section-1-event-basics.tsx
"use client"

import type { ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, fieldInputClass } from "@/components/ui/form-field"
import type { EventFormState, EventFormErrors } from "./types"

interface Props {
    data: EventFormState
    errors: EventFormErrors
    onChange: (patch: Partial<EventFormState>) => void
    onFieldBlur: (field: keyof EventFormErrors) => void
}

export function SectionEventBasics({ data, errors, onChange, onFieldBlur }: Props) {
    function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => onChange({ imageFile: file, imagePreview: reader.result as string })
        reader.readAsDataURL(file)
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-fg">ข้อมูลพื้นฐานของงาน</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    ตั้งชื่อและอธิบายภาพรวมของงาน — งานหนึ่งสามารถมีกิจกรรมย่อยได้หลายกิจกรรมในขั้นตอนถัดไป
                </p>
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
                    <Input type="file" accept="image/*" onChange={handleImageChange} />
                </FormField>
                {data.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={data.imagePreview}
                        alt="Preview"
                        className="mt-2 w-full max-w-sm rounded-lg border border-border"
                    />
                )}
            </div>
        </div>
    )
}
