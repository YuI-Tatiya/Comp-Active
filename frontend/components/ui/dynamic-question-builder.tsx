"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { Plus, Trash2, X } from "lucide-react"

export interface BuilderQuestion {
    label: string
    type: string
    /** ใช้เฉพาะตอน showRequired */
    required?: boolean
    /** ใช้เฉพาะ type ที่อยู่ใน choiceTypes */
    options?: string[]
    /** ใช้เฉพาะ type ที่อยู่ใน scaleTypes */
    scaleMax?: number
}

interface DynamicQuestionBuilderProps {
    questions: BuilderQuestion[]
    onChange: (questions: BuilderQuestion[]) => void
    typeOptions: { value: string; label: string }[]
    /** ชนิดคำถามที่ต้องมีตัวเลือกคำตอบ เช่น single_choice/multi_choice */
    choiceTypes?: string[]
    /** ชนิดคำถามที่มีคะแนนเต็มปรับได้ เช่น rating */
    scaleTypes?: string[]
    /** แสดงตัวเลือก "บังคับตอบ" หรือไม่ — ใช้กับคำถามลงทะเบียน ไม่ใช้กับแบบสำรวจ */
    showRequired?: boolean
    addLabel?: string
    emptyLabel?: string
}

/** ตัวสร้าง/แก้ไขรายการคำถามแบบไดนามิก — ใช้ร่วมกันทั้งคำถามลงทะเบียนรายกิจกรรม และแบบสำรวจหลังงาน */
export function DynamicQuestionBuilder({
    questions,
    onChange,
    typeOptions,
    choiceTypes = [],
    scaleTypes = [],
    showRequired = false,
    addLabel = "เพิ่มคำถาม",
    emptyLabel = "ยังไม่มีคำถาม",
}: DynamicQuestionBuilderProps) {
    function addQuestion() {
        onChange([...questions, { label: "", type: typeOptions[0]?.value ?? "", required: false, options: [] }])
    }

    function updateQuestion(index: number, patch: Partial<BuilderQuestion>) {
        onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)))
    }

    function removeQuestion(index: number) {
        onChange(questions.filter((_, i) => i !== index))
    }

    function addOption(index: number) {
        updateQuestion(index, { options: [...(questions[index].options ?? []), ""] })
    }

    function updateOption(qIndex: number, oIndex: number, value: string) {
        const options = [...(questions[qIndex].options ?? [])]
        options[oIndex] = value
        updateQuestion(qIndex, { options })
    }

    function removeOption(qIndex: number, oIndex: number) {
        updateQuestion(qIndex, { options: (questions[qIndex].options ?? []).filter((_, i) => i !== oIndex) })
    }

    return (
        <div className="space-y-4">
            {questions.length === 0 && <p className="text-sm text-fg-subtle">{emptyLabel}</p>}

            {questions.map((q, index) => {
                const isChoiceType = choiceTypes.includes(q.type)
                const isScaleType = scaleTypes.includes(q.type)

                return (
                    <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                                <Label>คำถามข้อที่ {index + 1}</Label>
                                <Input value={q.label} onChange={(e) => updateQuestion(index, { label: e.target.value })} />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="mt-6"
                                onClick={() => removeQuestion(index)}
                            >
                                <Trash2 className="size-4 text-fg-subtle hover:text-danger" />
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <select
                                className="h-9 rounded-md border border-border bg-bg px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={q.type}
                                onChange={(e) => updateQuestion(index, { type: e.target.value })}
                            >
                                {typeOptions.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>

                            {showRequired && (
                                <label className="flex items-center gap-2 text-sm text-fg-muted">
                                    <Toggle
                                        checked={q.required ?? false}
                                        onCheckedChange={(v) => updateQuestion(index, { required: v })}
                                    />
                                    บังคับตอบ
                                </label>
                            )}

                            {isScaleType && (
                                <label className="flex items-center gap-2 text-sm text-fg-muted">
                                    จำนวนดาวเต็ม
                                    <Input
                                        type="number"
                                        min={2}
                                        max={10}
                                        value={q.scaleMax ?? 5}
                                        onChange={(e) => updateQuestion(index, { scaleMax: Number(e.target.value) })}
                                        className="h-8 w-16 text-center"
                                    />
                                </label>
                            )}
                        </div>

                        {isChoiceType && (
                            <div className="space-y-2 border-l-2 border-border pl-3">
                                {(q.options ?? []).map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                        <Input
                                            value={opt}
                                            onChange={(e) => updateOption(index, oIndex, e.target.value)}
                                            className="h-8"
                                        />
                                        <button type="button" onClick={() => removeOption(index, oIndex)}>
                                            <X className="size-4 text-fg-subtle hover:text-danger" />
                                        </button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}>
                                    <Plus className="size-3" />
                                    เพิ่มตัวเลือก
                                </Button>
                            </div>
                        )}
                    </div>
                )
            })}

            <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus className="size-4" />
                {addLabel}
            </Button>
        </div>
    )
}
