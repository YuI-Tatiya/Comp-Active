"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ActivityTabForm } from "./activity-tab-form"
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu"
import { Plus, Copy, Trash2 } from "lucide-react"
import type { ActivityFormState, ActivityFormErrors } from "./types"
import { WizardBlock, WizardRequiredNote, WizardSectionHeader } from "./wizard-ui"

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
    onDuplicate: (key: string) => void
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
    onDuplicate,
}: Props) {
    // registrationType เลือกครั้งเดียวระดับงาน เหมือนกันทุกกิจกรรมย่อยเสมอ — เช็คจากตัวแรกตัวเดียวพอ
    const isStaffVolunteer = activities[0]?.registrationType === "staff_volunteer"
    const isContestant = activities[0]?.registrationType === "contestant"

    if (isSingleMode) {
        const a = activities[0]
        if (!a) return null
        return (
            <>
                <WizardSectionHeader
                    step={2}
                    title="รายละเอียดกิจกรรม"
                    description="กรอกรายละเอียด วันเวลา เงื่อนไขการรับสมัคร และการประเมินผลของกิจกรรมนี้"
                    aside={<WizardRequiredNote />}
                />
                <WizardBlock>
                    <ActivityTabForm
                        activity={a}
                        errors={errorsByKey[a.key] ?? {}}
                        isMultiActivity={false}
                        onChange={(patch) => onChangeActivity(a.key, patch)}
                        onFieldBlur={(field, patch) => onFieldBlur(a.key, field, patch)}
                    />
                </WizardBlock>
            </>
        )
    }

    return (
        <>
            <WizardSectionHeader
                step={2}
                title={isStaffVolunteer ? "บทบาทหน้าที่" : isContestant ? "ประเภทการแข่งขันในงานนี้" : "กิจกรรมย่อยในงานนี้"}
                description={
                    isStaffVolunteer
                        ? "บทบาทหน้าที่ ที่จะเปิดรับสมัคร"
                        : isContestant
                            ? "งานหนึ่งมีได้หลายประเภทการแข่งขัน แต่ละการแข่งขันมีเวลาและเงื่อนไขของตัวเอง"
                            : "งานหนึ่งมีได้หลายกิจกรรม แต่ละกิจกรรมมีเวลาและเงื่อนไขของตัวเอง"
                }
                aside={<WizardRequiredNote />}
            />

            <WizardBlock>
                <Tabs value={activeKey} onValueChange={onActiveKeyChange}>
                    {/*
                      แถวแท็บเลื่อนในแนวนอนแทนการตัดบรรทัด (flex-nowrap + overflow-x-auto) — ปุ่ม "เพิ่มกิจกรรม"
                      อยู่ท้ายแถวเดียวกัน เพิ่มกิจกรรมใหม่กี่ครั้งก็เลื่อนตามไปเรื่อยๆ ไม่ดันหัวข้อข้างบนให้สูงขึ้น
                    */}
                    <TabsList className="h-auto w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {activities.map((a, i) => {
                            const hasError = Object.values(errorsByKey[a.key] ?? {}).some(Boolean)
                            const itemLabel = isStaffVolunteer ? "บทบาท/หน้าที่" : isContestant ? "การแข่งขัน" : "กิจกรรม"
                            const menuItems: ActionMenuItem[] = [
                                { label: "ทำซ้ำกิจกรรมเดิม", icon: Copy, onClick: () => onDuplicate(a.key) },
                                { label: "เพิ่มกิจกรรม", icon: Plus, onClick: onAdd },
                                {
                                    label: `ลบ${itemLabel}นี้`,
                                    icon: Trash2,
                                    tone: "danger",
                                    disabled: activities.length <= 1,
                                    onClick: () => onRemove(a.key),
                                },
                            ]
                            return (
                                <div key={a.key} className="relative shrink-0">
                                    <TabsTrigger value={a.key} className="whitespace-nowrap pr-7">
                                        {hasError && (
                                            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-danger" aria-label="มีข้อมูลที่ต้องกรอกให้ครบถ้วน" />
                                        )}
                                        {isStaffVolunteer ? `บทบาท/หน้าที่ ${i + 1}` : isContestant ? `การแข่งขันที่ ${i + 1}` : `กิจกรรมที่ ${i + 1}`}{a.name ? `: ${a.name}` : ""}
                                    </TabsTrigger>
                                    <ActionMenu
                                        items={menuItems}
                                        label={`ตัวเลือกของ${itemLabel} ${i + 1}`}
                                        className="absolute right-1 top-1/2 size-6 -translate-y-1/2 border-0 bg-transparent p-0 text-fg-subtle shadow-none hover:bg-surface-2 hover:text-fg"
                                        iconClassName="size-3.5"
                                    />
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
                                isMultiActivity
                                onChange={(patch) => onChangeActivity(a.key, patch)}
                                onFieldBlur={(field, patch) => onFieldBlur(a.key, field, patch)}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </WizardBlock>
        </>
    )
}
