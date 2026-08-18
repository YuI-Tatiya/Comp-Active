"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DynamicQuestionBuilder } from "@/components/ui/dynamic-question-builder"
import { Eye, Star } from "lucide-react"
import type { EventFormState } from "./types"

const SURVEY_TYPE_OPTIONS = [
    { value: "rating", label: "ให้คะแนน" },
    { value: "text", label: "คำตอบแบบข้อความ" },
]

interface Props {
    event: EventFormState
    onChange: (patch: Partial<EventFormState>) => void
}

export function SectionSurvey({ event, onChange }: Props) {
    const [previewOpen, setPreviewOpen] = useState(false)

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-fg">แบบสำรวจความพึงพอใจ</h2>
                    <p className="mt-1 text-sm text-fg-muted">
                        นักศึกษาจะได้ตอบแบบสำรวจนี้หลังเช็คอินเข้าร่วมกิจกรรมแล้ว — แก้ไขคำถามเริ่มต้นหรือเพิ่มคำถามใหม่ได้ตามต้องการ
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                    <Eye className="size-4" />
                    ดูตัวอย่าง
                </Button>
            </div>

            <DynamicQuestionBuilder
                questions={event.surveyQuestions}
                onChange={(surveyQuestions) => onChange({ surveyQuestions })}
                typeOptions={SURVEY_TYPE_OPTIONS}
                scaleTypes={["rating"]}
                addLabel="เพิ่มคำถามแบบสำรวจ"
                emptyLabel="ยังไม่มีคำถามแบบสำรวจ — นักศึกษาจะไม่เห็นแบบสำรวจสำหรับงานนี้"
            />

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ตัวอย่างแบบสำรวจที่นักศึกษาจะเห็น</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        {event.surveyQuestions.length === 0 ? (
                            <p className="text-sm text-fg-subtle">ยังไม่มีคำถามแบบสำรวจ</p>
                        ) : (
                            event.surveyQuestions.map((q, i) => (
                                <div key={i} className="space-y-2">
                                    <Label>{q.label || `คำถามข้อที่ ${i + 1}`}</Label>
                                    {q.type === "rating" ? (
                                        <div className="flex gap-1">
                                            {Array.from({ length: q.scaleMax ?? 5 }).map((_, s) => (
                                                <Star key={s} className="size-6 text-warning" aria-hidden="true" />
                                            ))}
                                        </div>
                                    ) : (
                                        <Textarea disabled className="min-h-[70px]" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
