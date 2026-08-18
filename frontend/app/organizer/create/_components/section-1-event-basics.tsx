"use client"

import type { ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { EventFormState } from "./types"

interface Props {
    data: EventFormState
    onChange: (patch: Partial<EventFormState>) => void
}

export function SectionEventBasics({ data, onChange }: Props) {
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

            <div className="space-y-2">
                <Label>ชื่องาน <span className="text-danger">*</span></Label>
                <Input value={data.name} onChange={(e) => onChange({ name: e.target.value })} />
            </div>

            <div className="space-y-2">
                <Label>รายละเอียด <span className="text-danger">*</span></Label>
                <Textarea
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className="min-h-[120px]"
                />
            </div>

            <div className="space-y-2">
                <Label>รูปภาพหน้าปกงาน</Label>
                <Input type="file" accept="image/*" onChange={handleImageChange} />
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
