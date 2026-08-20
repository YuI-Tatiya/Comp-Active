"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ActivityTabForm } from "./activity-tab-form"
import { Plus, X } from "lucide-react"
import type { ActivityFormState, ActivityFormErrors } from "./types"

interface Props {
    activities: ActivityFormState[]
    activeKey: string
    errorsByKey: Record<string, ActivityFormErrors>
    onActiveKeyChange: (key: string) => void
    onChangeActivity: (key: string, patch: Partial<ActivityFormState>) => void
    onFieldBlur: (key: string, field: keyof ActivityFormErrors) => void
    onAdd: () => void
    onRemove: (key: string) => void
}

export function SectionActivities({
    activities,
    activeKey,
    errorsByKey,
    onActiveKeyChange,
    onChangeActivity,
    onFieldBlur,
    onAdd,
    onRemove,
}: Props) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-fg">กิจกรรมย่อยในงานนี้</h2>
                    <p className="mt-1 text-sm text-fg-muted">
                        งานหนึ่งมีได้หลายกิจกรรม แต่ละกิจกรรมมีเวลาและเงื่อนไขของตัวเอง
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onAdd}>
                    <Plus className="size-4" />
                    เพิ่มกิจกรรม
                </Button>
            </div>

            <Tabs value={activeKey} onValueChange={onActiveKeyChange}>
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface p-1">
                    {activities.map((a, i) => {
                        const hasError = Object.values(errorsByKey[a.key] ?? {}).some(Boolean)
                        return (
                            <div key={a.key} className="relative">
                                <TabsTrigger value={a.key} className={activities.length > 1 ? "pr-7" : ""}>
                                    {hasError && (
                                        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-danger" aria-label="มีฟิลด์ที่ต้องแก้ไข" />
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
                </TabsList>

                {activities.map((a) => (
                    <TabsContent key={a.key} value={a.key} className="mt-6">
                        <ActivityTabForm
                            activity={a}
                            errors={errorsByKey[a.key] ?? {}}
                            onChange={(patch) => onChangeActivity(a.key, patch)}
                            onFieldBlur={(field) => onFieldBlur(a.key, field)}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
