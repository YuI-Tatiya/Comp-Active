"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ActivityTabForm } from "./activity-tab-form"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActivityFormState, ActivityFormErrors } from "./types"

interface Props {
    activities: ActivityFormState[]
    activeKey: string
    errorsByKey: Record<string, ActivityFormErrors>
    isSingleMode?: boolean
    onActiveKeyChange: (key: string) => void
    onChangeActivity: (key: string, patch: Partial<ActivityFormState>) => void
    onFieldBlur: (key: string, field: keyof ActivityFormErrors, patch?: Partial<ActivityFormState>) => void
    onAdd: () => void
    onRemove: (key: string) => void
}

export function SectionActivities({
    activities,
    activeKey,
    errorsByKey,
    isSingleMode,
    onActiveKeyChange,
    onChangeActivity,
    onFieldBlur,
    onAdd,
    onRemove,
}: Props) {
    // "ทำโครงการ" สำหรับปลดล็อกเพดาน Soft Skills ระดับสูง — ต้องตรงกับ isProject ฝั่ง backend
    // (EventsService.create/update ใช้ dto.activities.length > 1 เป๊ะ)
    const isProject = activities.length > 1

    if (isSingleMode) {
        const a = activities[0]
        if (!a) return null
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-fg">รายละเอียดกิจกรรม</h2>
                    <p className="mt-1 text-sm text-fg-muted">
                        กรอกรายละเอียด วันเวลา เงื่อนไขการรับสมัคร และการประเมินผลของกิจกรรมนี้
                    </p>
                </div>
                <ActivityTabForm
                    activity={a}
                    errors={errorsByKey[a.key] ?? {}}
                    isProject={isProject}
                    onChange={(patch) => onChangeActivity(a.key, patch)}
                    onFieldBlur={(field, patch) => onFieldBlur(a.key, field, patch)}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-fg">กิจกรรมย่อยในงานนี้</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    งานหนึ่งมีได้หลายกิจกรรม แต่ละกิจกรรมมีเวลาและเงื่อนไขของตัวเอง
                </p>
            </div>

            <Tabs value={activeKey} onValueChange={onActiveKeyChange}>
                {/*
                  แถวแท็บเลื่อนในแนวนอนแทนการตัดบรรทัด (flex-nowrap + overflow-x-auto) — ปุ่ม "เพิ่มกิจกรรม"
                  อยู่ท้ายแถวเดียวกัน เพิ่มกิจกรรมใหม่กี่ครั้งก็เลื่อนตามไปเรื่อยๆ ไม่ดันหัวข้อข้างบนให้สูงขึ้น
                */}
                <TabsList className="h-auto w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {activities.map((a, i) => {
                        const hasError = Object.values(errorsByKey[a.key] ?? {}).some(Boolean)
                        return (
                            <div key={a.key} className="relative shrink-0">
                                <TabsTrigger value={a.key} className={cn("whitespace-nowrap", activities.length > 1 && "pr-7")}>
                                    {hasError && (
                                        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-danger" aria-label="มีข้อมูลที่ต้องกรอกให้ครบถ้วน" />
                                    )}
                                    {`กิจกรรมที่ ${i + 1}`}{a.name ? `: ${a.name}` : ""}
                                </TabsTrigger>
                                {activities.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRemove(a.key)
                                        }}
                                        aria-label="ลบกิจกรรมนี้"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-fg-subtle hover:bg-danger-bg hover:text-danger"
                                    >
                                        <X className="size-3" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border border-dashed border-border-strong px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        เพิ่มกิจกรรม
                    </button>
                </TabsList>

                {activities.map((a) => (
                    <TabsContent key={a.key} value={a.key} className="mt-6">
                        <ActivityTabForm
                            activity={a}
                            errors={errorsByKey[a.key] ?? {}}
                            isProject={isProject}
                            onChange={(patch) => onChangeActivity(a.key, patch)}
                            onFieldBlur={(field, patch) => onFieldBlur(a.key, field, patch)}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
