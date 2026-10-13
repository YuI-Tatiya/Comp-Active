"use client"

import { useId } from "react"
import { X } from "lucide-react"
import { Select } from "@/components/ui/select"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { CATEGORIES } from "@/lib/categories"
import {
    STATUS_OPTIONS,
    RANGE_OPTIONS,
    SORT_OPTIONS,
    SORT_HELP,
    RANGE_HELP,
    INITIAL_FILTERS,
    type EventsFilterValues,
    type FacetCounts,
} from "@/lib/events-filter"
import { cn, toggleInArray } from "@/lib/utils"

export type { EventsFilterValues }

/** ตัวกรองในแผงที่ผู้ใช้เปลี่ยนจากค่าเริ่มต้นแล้ว — ไม่นับคำค้นหา (อยู่ในแถบหัวหน้า) และการเรียงลำดับ */
export function activePanelFilterCount(values: EventsFilterValues): number {
    return values.categories.length + values.statuses.length + (values.certOnly ? 1 : 0) + (values.range ? 1 : 0)
}

interface EventsFilterSidebarProps {
    values: EventsFilterValues
    onChange: (values: EventsFilterValues) => void
    /** จำนวนการ์ดข้างตัวเลือก (facetCounts) — ไม่ส่งมาก็ไม่แสดงตัวเลข */
    counts?: FacetCounts
    /** false = ไม่แสดงหัว "ตัวกรอง" (ใน Dialog บนมือถือที่มี DialogTitle อยู่แล้ว) */
    heading?: boolean
    className?: string
}

const FIELD =
    "h-11 rounded-xl border-[1.5px] border-denim-field bg-white pl-3.5 text-sm text-denim-deep hover:border-denim-dash focus-visible:border-denim focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"

/** หัวกลุ่มตัวเลือก + เส้นประคั่นจากกลุ่มก่อนหน้า */
function Group({ label, help, htmlFor, children }: { label: string; help?: string; htmlFor?: string; children: React.ReactNode }) {
    const id = useId()
    const labelClass = "text-xs font-semibold tracking-[0.06em] text-denim-muted"
    // กลุ่มช่องติ๊ก = role="group" ชื่อมาจากหัวกลุ่ม · กลุ่มที่มีช่องเดียว (select) ใช้ <label htmlFor> ตรงๆ
    return (
        <div role={htmlFor ? undefined : "group"} aria-labelledby={htmlFor ? undefined : id} className="border-t border-dashed border-denim-line pt-4">
            <div className="mb-2 flex items-center gap-1">
                {htmlFor ? (
                    <label htmlFor={htmlFor} className={labelClass}>
                        {label}
                    </label>
                ) : (
                    <p id={id} className={labelClass}>
                        {label}
                    </p>
                )}
                {help && <InfoTooltip text={help} label={`คำอธิบาย${label}`} />}
            </div>
            {children}
        </div>
    )
}

/** แถวช่องติ๊ก — จุดสี (หมวดหมู่) + ป้าย + จำนวนชิดขวา ทั้งแถวกดได้ */
function CheckRow({
    checked,
    onToggle,
    label,
    dot,
    count,
}: {
    checked: boolean
    onToggle: () => void
    label: string
    dot?: string
    count?: number
}) {
    const empty = count === 0 && !checked
    return (
        <label
            className={cn(
                "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-sm transition-colors hover:bg-denim-paper",
                empty ? "text-denim-muted" : "text-denim-ink"
            )}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={onToggle}
                className="size-4 shrink-0 cursor-pointer rounded accent-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
            />
            {dot && <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden="true" />}
            <span className={cn("min-w-0 flex-1 leading-snug", checked && "font-semibold text-denim-deep")}>{label}</span>
            {count !== undefined && (
                <span className="font-code text-xs tabular-nums text-denim-muted">
                    {count}
                    <span className="sr-only"> รายการ</span>
                </span>
            )}
        </label>
    )
}

/** แผงตัวกรองแนวตั้ง — ใช้ทั้งเป็น sidebar บนจอกว้าง และเนื้อหาใน Dialog บนมือถือ (ช่องค้นหาอยู่ที่แถบหัวหน้าของหน้า) */
export function EventsFilterSidebar({ values, onChange, counts, heading = true, className }: EventsFilterSidebarProps) {
    const activeCount = activePanelFilterCount(values)
    // ล้างเฉพาะตัวกรองในแผงนี้ — คำค้นหาที่พิมพ์ไว้ในแถบหัวหน้าคงไว้
    const reset = () => onChange({ ...INITIAL_FILTERS, search: values.search })
    const rangeId = useId()
    const sortId = useId()

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {(heading || activeCount > 0) && (
                <div className="flex min-h-8 items-center justify-between gap-3">
                    {heading ? <h2 className="font-display text-lg font-bold text-denim-deep">ตัวกรอง</h2> : <span />}
                    {activeCount > 0 && (
                        <button
                            type="button"
                            onClick={reset}
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-denim transition-colors hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"
                        >
                            <X className="size-3.5" aria-hidden="true" />
                            ล้างตัวกรอง ({activeCount})
                        </button>
                    )}
                </div>
            )}

            <Group label="หมวดหมู่">
                <div className="flex flex-col">
                    {CATEGORIES.map((c) => (
                        <CheckRow
                            key={c.value}
                            label={c.label}
                            dot={c.dot}
                            count={counts?.categories[c.value]}
                            checked={values.categories.includes(c.value)}
                            onToggle={() => onChange({ ...values, categories: toggleInArray(values.categories, c.value) })}
                        />
                    ))}
                </div>
            </Group>

            <Group label="สถานะรับสมัคร">
                <div className="flex flex-col">
                    {STATUS_OPTIONS.map((o) => (
                        <CheckRow
                            key={o.value}
                            label={o.label}
                            count={counts?.statuses[o.value]}
                            checked={values.statuses.includes(o.value)}
                            onToggle={() => onChange({ ...values, statuses: toggleInArray(values.statuses, o.value) })}
                        />
                    ))}
                </div>
            </Group>

            <Group label="ใบรับรอง">
                <CheckRow
                    label="มีใบรับรองจิตอาสา"
                    checked={values.certOnly}
                    onToggle={() => onChange({ ...values, certOnly: !values.certOnly })}
                />
            </Group>

            <Group label="ช่วงเวลา" help={RANGE_HELP} htmlFor={rangeId}>
                <Select id={rangeId} className={FIELD} value={values.range} onChange={(e) => onChange({ ...values, range: e.target.value })}>
                    {RANGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </Select>
            </Group>

            <Group label="เรียงลำดับ" help={SORT_HELP} htmlFor={sortId}>
                <Select id={sortId} className={FIELD} value={values.sort} onChange={(e) => onChange({ ...values, sort: e.target.value })}>
                    {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </Select>
            </Group>
        </div>
    )
}
